import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import * as dbModule from "../db.js";
import { StateFsManager } from "../lib/state-fs.js";
import { saveAgentGuardrails, checkToolAllowed, checkSpendingLimit } from "../installer/guardrails.js";
import { identifyParallelGroups, claimParallelStep, getParallelGroupStats } from "../installer/parallel-executor.js";
import { traceStepClaim, traceStepComplete, queryTraces } from "../lib/tracer.js";
import { mapThinkingLevel } from "../lib/thinking-mapper.js";
import type { GuardrailConfig, ThinkingConfig, WorkflowSpec } from "../installer/types.js";

describe("Integration Tests", () => {
  const testRunId = "integration-run-" + Date.now();
  const testWorkflowId = "integration-workflow";
  const testBasePath = path.join(os.tmpdir(), "integration-test", testRunId);

  // Mock database state
  let mockSteps: any[] = [];
  let mockRuns: any[] = [];
  let mockTraces: any[] = [];
  let mockGuardrails = new Map<string, any>();

  const mockDb = {
    prepare: (sql: string) => {
      // Steps queries
      if (sql.includes("SELECT id, parallel_group, parallel_sequence")) {
        return {
          all: (runId: string) =>
            mockSteps.filter((s) => s.run_id === runId && s.parallel_group),
        };
      } else if (sql.includes("SELECT max_parallel_agents FROM runs")) {
        return {
          get: (runId: string) => mockRuns.find((r) => r.id === runId) || null,
        };
      } else if (sql.includes("SELECT run_id, parallel_group, parallel_sequence")) {
        return {
          get: (stepId: string) => mockSteps.find((s) => s.id === stepId) || null,
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
      } else if (sql.includes("UPDATE steps") && sql.includes("SET status = 'running'")) {
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
      // Guardrails queries
      else if (sql.includes("INSERT INTO agent_guardrails")) {
        return {
          run: (...args: any[]) => {
            mockGuardrails.set(args[1], {
              agent_id: args[1],
              tool_allowlist: args[2],
              tool_denylist: args[3],
              max_spend_per_tx: args[4],
              max_spend_per_run: args[5],
              approval_threshold: args[6],
              require_simulation: args[7],
              parallel_allowed: args[8],
            });
            return { changes: 1 };
          },
        };
      } else if (sql.includes("SELECT * FROM agent_guardrails")) {
        return {
          get: (agentId: string) => mockGuardrails.get(agentId) || null,
        };
      } else if (sql.includes("SELECT data FROM execution_traces")) {
        return {
          all: () => mockTraces,
        };
      }
      // Trace queries
      else if (sql.includes("INSERT INTO execution_traces")) {
        return {
          run: (...args: any[]) => {
            mockTraces.push({
              id: args[0],
              run_id: args[1],
              step_id: args[2],
              agent_id: args[3],
              trace_type: args[4],
              data: args[11],
            });
            return { changes: 1 };
          },
        };
      } else if (sql.includes("SELECT * FROM execution_traces")) {
        return {
          all: (...params: any[]) => {
            let filtered = mockTraces.filter((t) => t.run_id === params[0]);
            if (params[1]) {
              filtered = filtered.filter((t) => t.step_id === params[1]);
            }
            return filtered;
          },
        };
      }
      // Agent state queries
      else if (sql.includes("INSERT INTO agent_state")) {
        return {
          run: mock.fn(() => ({ changes: 1 })),
        };
      }

      return {
        run: mock.fn(() => ({ changes: 1 })),
        get: mock.fn(() => null),
        all: mock.fn(() => []),
      };
    },
  };

  before(async () => {
    mock.method(dbModule, "getDb", () => mockDb as any);

    // Initialize test workflow data
    mockRuns.push({
      id: testRunId,
      workflow_id: testWorkflowId,
      max_parallel_agents: 3,
      status: "running",
    });
  });

  after(async () => {
    // Clean up
    try {
      await fs.rm(testBasePath, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }

    // Clean up trace files
    try {
      const tracePath = path.join(
        os.homedir(),
        ".openclaw",
        "antfarm",
        "state",
        testRunId
      );
      await fs.rm(tracePath, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }

    mock.restoreAll();
  });

  it("End-to-end workflow: claim → execute → complete with traces", async () => {
    const agentId = "integration-agent-1";
    const stepId = "integration-step-1";

    // Step 1: Claim the step
    await traceStepClaim(testRunId, stepId, agentId, {
      task: "Execute integration test",
    });

    // Verify claim was traced
    const claimTraces = await queryTraces(testRunId, {
      stepId,
      traceType: "step.claim",
    });
    assert.equal(claimTraces.length, 1);
    assert.equal(claimTraces[0].agentId, agentId);

    // Step 2: Execute (simulate model request)
    const thinkingConfig: ThinkingConfig = { level: "medium" };
    const modelParams = mapThinkingLevel(thinkingConfig);

    assert.equal(modelParams.tokenBudget, 16000);
    assert.equal(modelParams.temperature, 0.5);

    // Step 3: Complete the step
    const output = { result: "Integration test completed" };
    const duration = 3000;

    await traceStepComplete(testRunId, stepId, output, duration);

    // Verify completion was traced
    const completeTraces = await queryTraces(testRunId, {
      stepId,
      traceType: "step.complete",
    });
    assert.equal(completeTraces.length, 1);
    assert.equal(completeTraces[0].durationMs, duration);
  });

  it("Guardrails enforcement: tool allowlist and spending limits", async () => {
    const agentId = "integration-agent-2";

    // Configure guardrails
    const guardrails: GuardrailConfig = {
      toolAllowlist: ["readFile", "writeFile"],
      maxSpendPerTx: 1.0,
      maxSpendPerRun: 10.0,
      approvalThreshold: 0.5,
    };

    saveAgentGuardrails(agentId, guardrails);

    // Test tool allowlist
    assert.equal(checkToolAllowed(agentId, "readFile"), true);
    assert.equal(checkToolAllowed(agentId, "writeFile"), true);
    assert.equal(checkToolAllowed(agentId, "bash"), false);

    // Test spending limits
    mockTraces = []; // Reset traces

    const spendResult1 = await checkSpendingLimit(agentId, testRunId, 0.3);
    assert.equal(spendResult1.allowed, true);
    assert.equal(spendResult1.requiresApproval, false);

    // Simulate some spending
    mockTraces.push({
      trace_type: "wallet.tx",
      data: JSON.stringify({ amount: 0.3 }),
    });

    // Test approval threshold
    const spendResult2 = await checkSpendingLimit(agentId, testRunId, 0.6);
    assert.equal(spendResult2.allowed, true);
    assert.equal(spendResult2.requiresApproval, true); // >= 0.5 threshold

    // Test per-tx limit
    const spendResult3 = await checkSpendingLimit(agentId, testRunId, 1.5);
    assert.equal(spendResult3.allowed, false);
    assert.equal(spendResult3.requiresApproval, true);
  });

  it("Parallel execution: coordination and concurrency limits", async () => {
    // Set up parallel steps
    mockSteps = [
      {
        id: "parallel-step-1",
        run_id: testRunId,
        parallel_group: "analysis-group",
        parallel_sequence: 1,
        step_index: 0,
        status: "waiting",
      },
      {
        id: "parallel-step-2",
        run_id: testRunId,
        parallel_group: "analysis-group",
        parallel_sequence: 1,
        step_index: 1,
        status: "waiting",
      },
      {
        id: "parallel-step-3",
        run_id: testRunId,
        parallel_group: "analysis-group",
        parallel_sequence: 1,
        step_index: 2,
        status: "waiting",
      },
    ];

    // Identify parallel groups
    const groups = identifyParallelGroups(testRunId);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].groupName, "analysis-group");
    assert.equal(groups[0].stepIds.length, 3);

    // Check initial stats
    let stats = getParallelGroupStats(testRunId, "analysis-group");
    assert.equal(stats.total, 3);
    assert.equal(stats.waiting, 3);
    assert.equal(stats.running, 0);

    // Claim first step
    const claimed1 = claimParallelStep("parallel-step-1");
    assert.equal(claimed1, true);

    // Verify status updated
    stats = getParallelGroupStats(testRunId, "analysis-group");
    assert.equal(stats.waiting, 2);
    assert.equal(stats.running, 1);

    // Claim second step
    const claimed2 = claimParallelStep("parallel-step-2");
    assert.equal(claimed2, true);

    stats = getParallelGroupStats(testRunId, "analysis-group");
    assert.equal(stats.running, 2);

    // Claim third step
    const claimed3 = claimParallelStep("parallel-step-3");
    assert.equal(claimed3, true);

    stats = getParallelGroupStats(testRunId, "analysis-group");
    assert.equal(stats.running, 3);
    assert.equal(stats.waiting, 0);

    // Try to claim when at max concurrency
    mockSteps.push({
      id: "parallel-step-4",
      run_id: testRunId,
      parallel_group: "analysis-group",
      parallel_sequence: 1,
      step_index: 3,
      status: "waiting",
    });

    const claimed4 = claimParallelStep("parallel-step-4");
    assert.equal(claimed4, false); // Should fail, at max concurrency (3)
  });

  it("Filesystem state management: agent files and shared state", async () => {
    const manager = new StateFsManager(testRunId, testWorkflowId, testBasePath);

    // Initialize directories
    await manager.initializeDirectories();

    // Create agent namespace
    const agentId = "fs-agent-1";
    await manager.createAgentNamespace(agentId);

    // Write and read agent file
    await manager.writeAgentFile(agentId, "workspace/test.txt", "test content");
    const content = await manager.readAgentFile(agentId, "workspace/test.txt");
    assert.equal(content, "test content");

    // Write and read shared state
    await manager.writeSharedState("shared-key", "shared-value");
    const sharedValue = await manager.readSharedState("shared-key");
    assert.equal(sharedValue, "shared-value");

    // Append trace
    await manager.appendTrace({
      event: "test-event",
      data: "trace data",
    });

    // Log transaction
    await manager.logTransaction(agentId, {
      txHash: "0xabc123",
      amount: 5.0,
    });

    // Verify files exist
    const tracePath = path.join(testBasePath, "traces", `${testRunId}.jsonl`);
    const traceContent = await fs.readFile(tracePath, "utf-8");
    assert.ok(traceContent.includes("test-event"));

    const txPath = path.join(
      testBasePath,
      "wallets",
      agentId,
      "transactions.jsonl"
    );
    const txContent = await fs.readFile(txPath, "utf-8");
    assert.ok(txContent.includes("0xabc123"));
  });

  it("Complete workflow: thinking levels, guardrails, and parallel steps", async () => {
    const workflow: Partial<WorkflowSpec> = {
      id: testWorkflowId,
      agents: [
        {
          id: "planner",
          role: "analysis",
          thinking: { level: "high" },
          guardrails: {
            toolAllowlist: ["readFile", "grep", "glob"],
          },
          workspace: { baseDir: "/test", files: {} },
        },
        {
          id: "executor",
          role: "coding",
          thinking: { level: "medium" },
          guardrails: {
            toolAllowlist: ["readFile", "writeFile", "bash"],
            maxSpendPerRun: 5.0,
          },
          workspace: { baseDir: "/test", files: {} },
        },
      ],
      steps: [
        {
          id: "plan",
          agent: "planner",
          input: "Analyze the codebase",
          expects: "analysis report",
        },
        {
          id: "implement",
          agent: "executor",
          input: "Implement the changes",
          expects: "implementation complete",
        },
      ],
    };

    // Configure agents
    for (const agent of workflow.agents!) {
      if (agent.thinking) {
        const params = mapThinkingLevel(agent.thinking);
        // Verify thinking config mapped correctly
        if (agent.id === "planner") {
          assert.equal(params.extendedThinking, true);
          assert.equal(params.tokenBudget, 32000);
        } else if (agent.id === "executor") {
          assert.equal(params.tokenBudget, 16000);
        }
      }

      if (agent.guardrails) {
        saveAgentGuardrails(agent.id, agent.guardrails);
        // Verify guardrails saved
        const saved = mockGuardrails.get(agent.id);
        assert.ok(saved);
      }
    }

    // Simulate step execution
    for (const step of workflow.steps!) {
      const agent = workflow.agents!.find((a: any) => a.id === step.agent)!;

      // Check tool permissions
      if (agent.guardrails?.toolAllowlist) {
        const canRead = checkToolAllowed(agent.id, "readFile");
        assert.equal(canRead, true);

        if (agent.id === "planner") {
          const canWrite = checkToolAllowed(agent.id, "writeFile");
          assert.equal(canWrite, false); // Not in allowlist
        }
      }

      // Trace step
      await traceStepClaim(testRunId, step.id, agent.id, {
        input: step.input,
      });
    }

    // Verify all steps were traced
    const traces = await queryTraces(testRunId);
    assert.ok(traces.length >= 2); // At least plan and implement
  });

  it("Error handling: guardrail violations and parallel conflicts", async () => {
    const agentId = "error-agent";

    // Set up strict guardrails
    saveAgentGuardrails(agentId, {
      toolAllowlist: ["readFile"],
      maxSpendPerRun: 1.0,
    });

    // Test tool violation
    assert.equal(checkToolAllowed(agentId, "bash"), false);

    // Test spending violation
    mockTraces = [
      { trace_type: "wallet.tx", data: JSON.stringify({ amount: 0.8 }) },
    ];

    const result = await checkSpendingLimit(agentId, testRunId, 0.5);
    assert.equal(result.allowed, false); // 0.8 + 0.5 > 1.0

    // Test parallel conflict (trying to claim when at limit)
    mockSteps = Array.from({ length: 3 }, (_, i) => ({
      id: `conflict-step-${i}`,
      run_id: testRunId,
      parallel_group: "conflict-group",
      parallel_sequence: 1,
      step_index: i,
      status: "running",
    }));

    mockSteps.push({
      id: "conflict-step-new",
      run_id: testRunId,
      parallel_group: "conflict-group",
      parallel_sequence: 1,
      step_index: 3,
      status: "waiting",
    });

    const canClaim = claimParallelStep("conflict-step-new");
    assert.equal(canClaim, false); // At max concurrency
  });

  it("Multi-agent coordination: shared state and trace visibility", async () => {
    const manager = new StateFsManager(testRunId, testWorkflowId, testBasePath);
    await manager.initializeDirectories();

    const agent1 = "coord-agent-1";
    const agent2 = "coord-agent-2";

    // Agent 1 writes to shared state
    await manager.writeSharedState("analysis-result", "Found 5 issues");

    // Agent 2 reads shared state
    const result = await manager.readSharedState("analysis-result");
    assert.equal(result, "Found 5 issues");

    // Both agents trace their work
    await traceStepClaim(testRunId, "coord-step-1", agent1, {
      task: "Analyze",
    });
    await traceStepClaim(testRunId, "coord-step-2", agent2, {
      task: "Fix issues",
    });

    // Verify both traces visible
    const agent1Traces = await queryTraces(testRunId, { agentId: agent1 });
    const agent2Traces = await queryTraces(testRunId, { agentId: agent2 });

    assert.equal(agent1Traces.length, 1);
    assert.equal(agent2Traces.length, 1);

    // Verify all traces queryable
    const allTraces = await queryTraces(testRunId);
    assert.ok(
      allTraces.some((t: any) => t.agentId === agent1) &&
        allTraces.some((t: any) => t.agentId === agent2)
    );
  });
});
