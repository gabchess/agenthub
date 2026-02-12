import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import {
  identifyParallelGroups,
  getParallelStepForAgent,
  canClaimParallelStep,
  claimParallelStep,
  waitForParallelGroupCompletion,
  getParallelGroupSteps,
  getParallelGroupStats,
} from "../parallel-executor.js";
import * as dbModule from "../../db.js";

describe("Parallel Executor", () => {
  const testRunId = "test-run-" + Date.now();

  // Mock database data
  let mockSteps: any[] = [];
  let mockRuns: any[] = [];

  const mockDb = {
    prepare: (sql: string) => {
      if (sql.includes("SELECT id, parallel_group, parallel_sequence")) {
        return {
          all: (runId: string) =>
            mockSteps.filter((s) => s.run_id === runId && s.parallel_group),
        };
      } else if (sql.includes("SELECT id, run_id, input_template")) {
        return {
          get: (agentId: string) =>
            mockSteps.find(
              (s) =>
                s.agent_id === agentId &&
                s.parallel_group &&
                s.status === "waiting"
            ) || null,
        };
      } else if (sql.includes("SELECT run_id, parallel_group, parallel_sequence")) {
        return {
          get: (stepId: string) => mockSteps.find((s) => s.id === stepId) || null,
        };
      } else if (sql.includes("SELECT max_parallel_agents FROM runs")) {
        return {
          get: (runId: string) => mockRuns.find((r) => r.id === runId) || null,
        };
      } else if (sql.includes("COUNT(*) as count") && sql.includes("status = 'running'")) {
        return {
          get: (runId: string, groupName: string) => {
            const count = mockSteps.filter(
              (s) =>
                s.run_id === runId &&
                s.parallel_group === groupName &&
                s.status === "running"
            ).length;
            return { count };
          },
        };
      } else if (sql.includes("UPDATE steps")) {
        return {
          run: (updatedAt: string, stepId: string) => {
            const step = mockSteps.find((s) => s.id === stepId);
            if (step && step.status === "waiting") {
              step.status = "running";
              step.updated_at = updatedAt;
              return { changes: 1 };
            }
            return { changes: 0 };
          },
        };
      } else if (sql.includes("SELECT id, step_id, agent_id, status, parallel_sequence")) {
        return {
          all: (...args: any[]) => {
            const runId = args[0];
            const groupName = args[1];
            const sequence = args[2];

            return mockSteps
              .filter(
                (s) =>
                  s.run_id === runId &&
                  s.parallel_group === groupName &&
                  (sequence === undefined || s.parallel_sequence === sequence)
              )
              .sort((a, b) => {
                if (a.parallel_sequence !== b.parallel_sequence) {
                  return a.parallel_sequence - b.parallel_sequence;
                }
                return a.step_index - b.step_index;
              });
          },
        };
      } else if (sql.includes("SELECT") && sql.includes("COUNT(*) as total")) {
        return {
          get: (runId: string, groupName: string) => {
            const steps = mockSteps.filter(
              (s) => s.run_id === runId && s.parallel_group === groupName
            );
            return {
              total: steps.length,
              waiting: steps.filter((s) => s.status === "waiting").length,
              running: steps.filter((s) => s.status === "running").length,
              done: steps.filter((s) => s.status === "done").length,
              failed: steps.filter((s) => s.status === "failed").length,
            };
          },
        };
      }
      return {
        run: mock.fn(() => ({ changes: 1 })),
        get: mock.fn(() => null),
        all: mock.fn(() => []),
      };
    },
  };

  before(() => {
    mock.method(dbModule, "getDb", () => mockDb as any);
  });

  after(() => {
    mock.restoreAll();
  });

  it("identifyParallelGroups - should group steps correctly", () => {
    mockSteps = [
      {
        id: "step1",
        run_id: testRunId,
        parallel_group: "group-a",
        parallel_sequence: 1,
        step_index: 0,
      },
      {
        id: "step2",
        run_id: testRunId,
        parallel_group: "group-a",
        parallel_sequence: 1,
        step_index: 1,
      },
      {
        id: "step3",
        run_id: testRunId,
        parallel_group: "group-a",
        parallel_sequence: 2,
        step_index: 2,
      },
      {
        id: "step4",
        run_id: testRunId,
        parallel_group: "group-b",
        parallel_sequence: 1,
        step_index: 3,
      },
    ];

    const groups = identifyParallelGroups(testRunId);

    assert.equal(groups.length, 3); // group-a seq 1, group-a seq 2, group-b seq 1

    const groupA1 = groups.find(
      (g) => g.groupName === "group-a" && g.sequence === 1
    );
    const groupA2 = groups.find(
      (g) => g.groupName === "group-a" && g.sequence === 2
    );
    const groupB1 = groups.find(
      (g) => g.groupName === "group-b" && g.sequence === 1
    );

    assert.ok(groupA1);
    assert.equal(groupA1.stepIds.length, 2);
    assert.ok(groupA1.stepIds.includes("step1"));
    assert.ok(groupA1.stepIds.includes("step2"));

    assert.ok(groupA2);
    assert.equal(groupA2.stepIds.length, 1);
    assert.ok(groupA2.stepIds.includes("step3"));

    assert.ok(groupB1);
    assert.equal(groupB1.stepIds.length, 1);
    assert.ok(groupB1.stepIds.includes("step4"));
  });

  it("identifyParallelGroups - should return empty for no parallel steps", () => {
    mockSteps = [
      {
        id: "step-normal",
        run_id: testRunId,
        parallel_group: null,
        parallel_sequence: null,
      },
    ];

    const groups = identifyParallelGroups(testRunId);
    assert.equal(groups.length, 0);
  });

  it("getParallelStepForAgent - should return waiting step for agent", () => {
    const agentId = "agent-1";

    mockSteps = [
      {
        id: "step-a",
        run_id: testRunId,
        agent_id: agentId,
        parallel_group: "group-a",
        status: "waiting",
        input_template: "test input",
        step_index: 0,
      },
      {
        id: "step-b",
        run_id: testRunId,
        agent_id: agentId,
        parallel_group: "group-a",
        status: "running",
        step_index: 1,
      },
    ];

    const step = getParallelStepForAgent(agentId);

    assert.ok(step);
    assert.equal(step.stepId, "step-a");
    assert.equal(step.runId, testRunId);
    assert.equal(step.input, "test input");
  });

  it("getParallelStepForAgent - should return null for no waiting steps", () => {
    const agentId = "agent-2";

    mockSteps = [
      {
        id: "step-c",
        run_id: testRunId,
        agent_id: agentId,
        parallel_group: "group-a",
        status: "done",
      },
    ];

    const step = getParallelStepForAgent(agentId);
    assert.equal(step, null);
  });

  it("canClaimParallelStep - should enforce concurrency limits", () => {
    mockSteps = [
      {
        id: "step-claim",
        run_id: testRunId,
        parallel_group: "group-a",
        parallel_sequence: 1,
        status: "waiting",
      },
      {
        id: "step-running-1",
        run_id: testRunId,
        parallel_group: "group-a",
        status: "running",
      },
      {
        id: "step-running-2",
        run_id: testRunId,
        parallel_group: "group-a",
        status: "running",
      },
    ];

    mockRuns = [
      {
        id: testRunId,
        max_parallel_agents: 3,
      },
    ];

    // Should be able to claim (2 running < 3 max)
    const canClaim = canClaimParallelStep("step-claim");
    assert.equal(canClaim, true);
  });

  it("canClaimParallelStep - should block when max concurrency reached", () => {
    mockSteps = [
      {
        id: "step-blocked",
        run_id: testRunId,
        parallel_group: "group-a",
        parallel_sequence: 1,
        status: "waiting",
      },
      {
        id: "step-r1",
        run_id: testRunId,
        parallel_group: "group-a",
        status: "running",
      },
      {
        id: "step-r2",
        run_id: testRunId,
        parallel_group: "group-a",
        status: "running",
      },
      {
        id: "step-r3",
        run_id: testRunId,
        parallel_group: "group-a",
        status: "running",
      },
    ];

    mockRuns = [
      {
        id: testRunId,
        max_parallel_agents: 3,
      },
    ];

    // Should be blocked (3 running >= 3 max)
    const canClaim = canClaimParallelStep("step-blocked");
    assert.equal(canClaim, false);
  });

  it("canClaimParallelStep - should return false for non-parallel step", () => {
    mockSteps = [
      {
        id: "step-non-parallel",
        run_id: testRunId,
        parallel_group: null,
        status: "waiting",
      },
    ];

    const canClaim = canClaimParallelStep("step-non-parallel");
    assert.equal(canClaim, false);
  });

  it("claimParallelStep - should atomically update status to running", () => {
    mockSteps = [
      {
        id: "step-to-claim",
        run_id: testRunId,
        parallel_group: "group-a",
        parallel_sequence: 1,
        status: "waiting",
      },
    ];

    mockRuns = [
      {
        id: testRunId,
        max_parallel_agents: 5,
      },
    ];

    const claimed = claimParallelStep("step-to-claim");

    assert.equal(claimed, true);

    // Verify status changed
    const step = mockSteps.find((s) => s.id === "step-to-claim");
    assert.equal(step.status, "running");
  });

  it("claimParallelStep - should fail when concurrency limit reached", () => {
    mockSteps = [
      {
        id: "step-cant-claim",
        run_id: testRunId,
        parallel_group: "group-a",
        parallel_sequence: 1,
        status: "waiting",
      },
      {
        id: "step-r1",
        run_id: testRunId,
        parallel_group: "group-a",
        status: "running",
      },
      {
        id: "step-r2",
        run_id: testRunId,
        parallel_group: "group-a",
        status: "running",
      },
    ];

    mockRuns = [
      {
        id: testRunId,
        max_parallel_agents: 2,
      },
    ];

    const claimed = claimParallelStep("step-cant-claim");

    assert.equal(claimed, false);

    // Verify status unchanged
    const step = mockSteps.find((s) => s.id === "step-cant-claim");
    assert.equal(step.status, "waiting");
  });

  it("waitForParallelGroupCompletion - should return true when all complete", async () => {
    mockSteps = [
      {
        id: "step-done-1",
        run_id: testRunId,
        parallel_group: "group-complete",
        status: "done",
      },
      {
        id: "step-done-2",
        run_id: testRunId,
        parallel_group: "group-complete",
        status: "done",
      },
    ];

    const completed = await waitForParallelGroupCompletion(
      testRunId,
      "group-complete",
      1000
    );

    assert.equal(completed, true);
  });

  it("waitForParallelGroupCompletion - should poll until completion", async () => {
    mockSteps = [
      {
        id: "step-poll-1",
        run_id: testRunId,
        parallel_group: "group-polling",
        status: "running",
      },
      {
        id: "step-poll-2",
        run_id: testRunId,
        parallel_group: "group-polling",
        status: "waiting",
      },
    ];

    // Simulate completion after 500ms
    setTimeout(() => {
      mockSteps[0].status = "done";
      mockSteps[1].status = "done";
    }, 500);

    const startTime = Date.now();
    const completed = await waitForParallelGroupCompletion(
      testRunId,
      "group-polling",
      5000
    );
    const elapsed = Date.now() - startTime;

    assert.equal(completed, true);
    assert.ok(elapsed >= 500, "Should have polled for at least 500ms");
  });

  it("waitForParallelGroupCompletion - should timeout", async () => {
    mockSteps = [
      {
        id: "step-timeout",
        run_id: testRunId,
        parallel_group: "group-timeout",
        status: "running",
      },
    ];

    const startTime = Date.now();
    const completed = await waitForParallelGroupCompletion(
      testRunId,
      "group-timeout",
      1500
    );
    const elapsed = Date.now() - startTime;

    assert.equal(completed, false);
    assert.ok(elapsed >= 1500, "Should have timed out after 1500ms");
  });

  it("getParallelGroupSteps - should return all steps in group", () => {
    mockSteps = [
      {
        id: "step-g1",
        step_id: "step-g1",
        run_id: testRunId,
        parallel_group: "group-get",
        parallel_sequence: 1,
        step_index: 0,
        agent_id: "agent-1",
        status: "done",
      },
      {
        id: "step-g2",
        step_id: "step-g2",
        run_id: testRunId,
        parallel_group: "group-get",
        parallel_sequence: 2,
        step_index: 1,
        agent_id: "agent-2",
        status: "running",
      },
    ];

    const steps = getParallelGroupSteps(testRunId, "group-get");

    assert.equal(steps.length, 2);
    assert.equal(steps[0].id, "step-g1");
    assert.equal(steps[1].id, "step-g2");
  });

  it("getParallelGroupSteps - should filter by sequence", () => {
    mockSteps = [
      {
        id: "step-seq1",
        step_id: "step-seq1",
        run_id: testRunId,
        parallel_group: "group-seq",
        parallel_sequence: 1,
        step_index: 0,
        agent_id: "agent-1",
        status: "done",
      },
      {
        id: "step-seq2",
        step_id: "step-seq2",
        run_id: testRunId,
        parallel_group: "group-seq",
        parallel_sequence: 2,
        step_index: 1,
        agent_id: "agent-2",
        status: "waiting",
      },
    ];

    const steps = getParallelGroupSteps(testRunId, "group-seq", 1);

    assert.equal(steps.length, 1);
    assert.equal(steps[0].id, "step-seq1");
  });

  it("getParallelGroupStats - should return correct counts", () => {
    mockSteps = [
      {
        id: "s1",
        run_id: testRunId,
        parallel_group: "group-stats",
        status: "waiting",
      },
      {
        id: "s2",
        run_id: testRunId,
        parallel_group: "group-stats",
        status: "running",
      },
      {
        id: "s3",
        run_id: testRunId,
        parallel_group: "group-stats",
        status: "running",
      },
      {
        id: "s4",
        run_id: testRunId,
        parallel_group: "group-stats",
        status: "done",
      },
      {
        id: "s5",
        run_id: testRunId,
        parallel_group: "group-stats",
        status: "failed",
      },
    ];

    const stats = getParallelGroupStats(testRunId, "group-stats");

    assert.equal(stats.total, 5);
    assert.equal(stats.waiting, 1);
    assert.equal(stats.running, 2);
    assert.equal(stats.done, 1);
    assert.equal(stats.failed, 1);
  });

  it("getParallelGroupStats - should return zeros for non-existent group", () => {
    mockSteps = [];

    const stats = getParallelGroupStats(testRunId, "non-existent");

    assert.equal(stats.total, 0);
    assert.equal(stats.waiting, 0);
    assert.equal(stats.running, 0);
    assert.equal(stats.done, 0);
    assert.equal(stats.failed, 0);
  });

  it("sequence ordering - should respect sequence order", () => {
    mockSteps = [
      {
        id: "seq1-step1",
        run_id: testRunId,
        parallel_group: "ordered-group",
        parallel_sequence: 1,
        step_index: 0,
      },
      {
        id: "seq1-step2",
        run_id: testRunId,
        parallel_group: "ordered-group",
        parallel_sequence: 1,
        step_index: 1,
      },
      {
        id: "seq2-step1",
        run_id: testRunId,
        parallel_group: "ordered-group",
        parallel_sequence: 2,
        step_index: 2,
      },
    ];

    const groups = identifyParallelGroups(testRunId);
    const orderedGroup = groups.filter((g) => g.groupName === "ordered-group");

    // Should have 2 groups (seq 1 and seq 2)
    assert.equal(orderedGroup.length, 2);

    // Sequence 1 should come before sequence 2
    assert.ok(orderedGroup[0].sequence < orderedGroup[1].sequence);

    // Sequence 1 should have 2 steps
    const seq1Group = orderedGroup.find((g) => g.sequence === 1);
    assert.ok(seq1Group);
    assert.equal(seq1Group.stepIds.length, 2);
  });
});
