import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import {
  saveAgentGuardrails,
  loadAgentGuardrails,
  checkToolAllowed,
  checkSpendingLimit,
} from "../guardrails.js";
import type { GuardrailConfig } from "../types.js";
import * as dbModule from "../../db.js";

describe("Guardrails System", () => {
  const testAgentId = "test-agent-" + Date.now();
  const testRunId = "test-run-" + Date.now();

  // Mock database
  let mockDbData = new Map<string, any>();
  let mockTraces: any[] = [];

  const mockDb = {
    prepare: (sql: string) => {
      if (sql.includes("INSERT INTO agent_guardrails")) {
        return {
          run: (...args: any[]) => {
            mockDbData.set(args[1], {
              id: args[0],
              agent_id: args[1],
              tool_allowlist: args[2],
              tool_denylist: args[3],
              max_spend_per_tx: args[4],
              max_spend_per_run: args[5],
              approval_threshold: args[6],
              require_simulation: args[7],
              parallel_allowed: args[8],
              created_at: args[9],
              updated_at: args[10],
            });
            return { changes: 1 };
          },
        };
      } else if (sql.includes("SELECT * FROM agent_guardrails")) {
        return {
          get: (agentId: string) => {
            return mockDbData.get(agentId) || null;
          },
        };
      } else if (sql.includes("SELECT data FROM execution_traces")) {
        return {
          all: () => mockTraces,
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

  it("saveAgentGuardrails and loadAgentGuardrails - should CRUD correctly", () => {
    const config: GuardrailConfig = {
      toolAllowlist: ["readFile", "writeFile"],
      maxSpendPerTx: 1.0,
      maxSpendPerRun: 10.0,
      approvalThreshold: 0.5,
      requireSimulation: true,
      parallelAllowed: false,
    };

    saveAgentGuardrails(testAgentId, config);
    const loaded = loadAgentGuardrails(testAgentId);

    assert.ok(loaded);
    assert.deepEqual(loaded.toolAllowlist, config.toolAllowlist);
    assert.equal(loaded.maxSpendPerTx, config.maxSpendPerTx);
    assert.equal(loaded.maxSpendPerRun, config.maxSpendPerRun);
    assert.equal(loaded.approvalThreshold, config.approvalThreshold);
    assert.equal(loaded.requireSimulation, config.requireSimulation);
    assert.equal(loaded.parallelAllowed, config.parallelAllowed);
  });

  it("loadAgentGuardrails - should return null for non-existent agent", () => {
    const loaded = loadAgentGuardrails("non-existent-agent");
    assert.equal(loaded, null);
  });

  it("checkToolAllowed - allowlist should only allow listed tools", () => {
    const agentId = "agent-allowlist";
    const config: GuardrailConfig = {
      toolAllowlist: ["readFile", "writeFile", "bash"],
    };

    saveAgentGuardrails(agentId, config);

    assert.equal(checkToolAllowed(agentId, "readFile"), true);
    assert.equal(checkToolAllowed(agentId, "writeFile"), true);
    assert.equal(checkToolAllowed(agentId, "bash"), true);
    assert.equal(checkToolAllowed(agentId, "deleteFile"), false);
    assert.equal(checkToolAllowed(agentId, "exec"), false);
  });

  it("checkToolAllowed - denylist should block listed tools", () => {
    const agentId = "agent-denylist";
    const config: GuardrailConfig = {
      toolDenylist: ["exec", "deleteFile"],
    };

    saveAgentGuardrails(agentId, config);

    assert.equal(checkToolAllowed(agentId, "exec"), false);
    assert.equal(checkToolAllowed(agentId, "deleteFile"), false);
    assert.equal(checkToolAllowed(agentId, "readFile"), true);
    assert.equal(checkToolAllowed(agentId, "writeFile"), true);
  });

  it("checkToolAllowed - no guardrails should allow all tools", () => {
    const agentId = "agent-no-guardrails";

    assert.equal(checkToolAllowed(agentId, "readFile"), true);
    assert.equal(checkToolAllowed(agentId, "exec"), true);
    assert.equal(checkToolAllowed(agentId, "anyTool"), true);
  });

  it("checkToolAllowed - empty allowlist should allow nothing", () => {
    const agentId = "agent-empty-allowlist";
    const config: GuardrailConfig = {
      toolAllowlist: [],
    };

    saveAgentGuardrails(agentId, config);

    assert.equal(checkToolAllowed(agentId, "readFile"), false);
    assert.equal(checkToolAllowed(agentId, "anyTool"), false);
  });

  it("checkToolAllowed - empty denylist should allow all", () => {
    const agentId = "agent-empty-denylist";
    const config: GuardrailConfig = {
      toolDenylist: [],
    };

    saveAgentGuardrails(agentId, config);

    assert.equal(checkToolAllowed(agentId, "readFile"), true);
    assert.equal(checkToolAllowed(agentId, "anyTool"), true);
  });

  it("checkSpendingLimit - should allow spending within limits", async () => {
    const agentId = "agent-spending-ok";
    const config: GuardrailConfig = {
      maxSpendPerTx: 1.0,
      maxSpendPerRun: 10.0,
    };

    saveAgentGuardrails(agentId, config);

    // Reset traces
    mockTraces = [];

    const result = await checkSpendingLimit(agentId, testRunId, 0.5);

    assert.equal(result.allowed, true);
    assert.equal(result.requiresApproval, false);
    assert.equal(result.currentSpend, 0);
  });

  it("checkSpendingLimit - should block when exceeding per-tx limit", async () => {
    const agentId = "agent-tx-limit";
    const config: GuardrailConfig = {
      maxSpendPerTx: 1.0,
      maxSpendPerRun: 10.0,
    };

    saveAgentGuardrails(agentId, config);

    mockTraces = [];

    const result = await checkSpendingLimit(agentId, testRunId, 1.5);

    assert.equal(result.allowed, false);
    assert.equal(result.requiresApproval, true);
    assert.ok(result.reason?.includes("per-tx limit"));
  });

  it("checkSpendingLimit - should block when exceeding per-run limit", async () => {
    const agentId = "agent-run-limit";
    const config: GuardrailConfig = {
      maxSpendPerTx: 5.0,
      maxSpendPerRun: 10.0,
    };

    saveAgentGuardrails(agentId, config);

    // Simulate existing spending
    mockTraces = [
      { data: JSON.stringify({ amount: 6.0 }) },
      { data: JSON.stringify({ amount: 3.0 }) },
    ];

    const result = await checkSpendingLimit(agentId, testRunId, 2.0);

    assert.equal(result.allowed, false);
    assert.equal(result.requiresApproval, true);
    assert.ok(result.reason?.includes("run limit"));
    assert.equal(result.currentSpend, 9.0); // 6 + 3
  });

  it("checkSpendingLimit - approval threshold should trigger approval", async () => {
    const agentId = "agent-approval-threshold";
    const config: GuardrailConfig = {
      maxSpendPerTx: 10.0,
      maxSpendPerRun: 100.0,
      approvalThreshold: 5.0,
    };

    saveAgentGuardrails(agentId, config);

    mockTraces = [];

    const result = await checkSpendingLimit(agentId, testRunId, 5.0);

    assert.equal(result.allowed, true); // Still allowed
    assert.equal(result.requiresApproval, true); // But requires approval
    assert.ok(result.reason?.includes("approval threshold"));
  });

  it("checkSpendingLimit - spending below threshold should not require approval", async () => {
    const agentId = "agent-no-approval";
    const config: GuardrailConfig = {
      maxSpendPerTx: 10.0,
      maxSpendPerRun: 100.0,
      approvalThreshold: 5.0,
    };

    saveAgentGuardrails(agentId, config);

    mockTraces = [];

    const result = await checkSpendingLimit(agentId, testRunId, 3.0);

    assert.equal(result.allowed, true);
    assert.equal(result.requiresApproval, false);
  });

  it("checkSpendingLimit - accumulation across multiple transactions", async () => {
    const agentId = "agent-accumulation";
    const config: GuardrailConfig = {
      maxSpendPerTx: 5.0,
      maxSpendPerRun: 15.0,
    };

    saveAgentGuardrails(agentId, config);

    // Simulate multiple transactions
    mockTraces = [
      { data: JSON.stringify({ amount: 4.0 }) },
      { data: JSON.stringify({ amount: 3.0 }) },
      { data: JSON.stringify({ amount: 5.0 }) },
    ];

    const result = await checkSpendingLimit(agentId, testRunId, 4.0);

    // currentSpend = 4 + 3 + 5 = 12
    // newTotal = 12 + 4 = 16 > 15 (maxSpendPerRun)
    assert.equal(result.currentSpend, 12.0);
    assert.equal(result.allowed, false);
    assert.equal(result.requiresApproval, true);
  });

  it("checkSpendingLimit - should handle malformed trace data", async () => {
    const agentId = "agent-malformed";
    const config: GuardrailConfig = {
      maxSpendPerRun: 10.0,
    };

    saveAgentGuardrails(agentId, config);

    // Mix of valid and malformed traces
    mockTraces = [
      { data: JSON.stringify({ amount: 2.0 }) },
      { data: "invalid json" },
      { data: JSON.stringify({ amount: "not a number" }) },
      { data: JSON.stringify({ amount: 3.0 }) },
    ];

    const result = await checkSpendingLimit(agentId, testRunId, 1.0);

    // Should only count valid amounts: 2.0 + 3.0 = 5.0
    assert.equal(result.currentSpend, 5.0);
    assert.equal(result.allowed, true);
  });

  it("checkSpendingLimit - no guardrails should allow unlimited spending", async () => {
    const agentId = "agent-unlimited";

    mockTraces = [];

    const result = await checkSpendingLimit(agentId, testRunId, 1000.0);

    assert.equal(result.allowed, true);
    assert.equal(result.requiresApproval, false);
  });

  it("saveAgentGuardrails - should update existing guardrails", () => {
    const agentId = "agent-update";
    const config1: GuardrailConfig = {
      toolAllowlist: ["tool1"],
      maxSpendPerTx: 1.0,
    };

    saveAgentGuardrails(agentId, config1);

    const config2: GuardrailConfig = {
      toolAllowlist: ["tool1", "tool2"],
      maxSpendPerTx: 2.0,
      maxSpendPerRun: 20.0,
    };

    saveAgentGuardrails(agentId, config2);

    const loaded = loadAgentGuardrails(agentId);

    assert.ok(loaded);
    assert.deepEqual(loaded.toolAllowlist, ["tool1", "tool2"]);
    assert.equal(loaded.maxSpendPerTx, 2.0);
    assert.equal(loaded.maxSpendPerRun, 20.0);
  });

  it("checkSpendingLimit - zero amount should always be allowed", async () => {
    const agentId = "agent-zero";
    const config: GuardrailConfig = {
      maxSpendPerTx: 0.1,
      maxSpendPerRun: 1.0,
    };

    saveAgentGuardrails(agentId, config);

    mockTraces = [];

    const result = await checkSpendingLimit(agentId, testRunId, 0);

    assert.equal(result.allowed, true);
    assert.equal(result.requiresApproval, false);
  });

  it("loadAgentGuardrails - should handle missing optional fields", () => {
    const agentId = "agent-minimal";

    // Directly insert minimal config
    mockDbData.set(agentId, {
      id: "minimal-id",
      agent_id: agentId,
      tool_allowlist: null,
      tool_denylist: null,
      max_spend_per_tx: null,
      max_spend_per_run: null,
      approval_threshold: null,
      require_simulation: 0,
      parallel_allowed: 0,
    });

    const loaded = loadAgentGuardrails(agentId);

    assert.ok(loaded);
    assert.equal(loaded.toolAllowlist, undefined);
    assert.equal(loaded.toolDenylist, undefined);
    assert.equal(loaded.maxSpendPerTx, undefined);
    assert.equal(loaded.maxSpendPerRun, undefined);
    assert.equal(loaded.approvalThreshold, undefined);
    assert.equal(loaded.requireSimulation, false);
    assert.equal(loaded.parallelAllowed, false);
  });
});
