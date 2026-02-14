/**
 * E2E Pipeline Test — Full workflow execution lifecycle
 *
 * Tests the complete pipeline:
 *   trigger workflow → agents claim steps → execute → traces stored → hash committed
 *
 * Uses the token-monitor workflow as the test case.
 * All external calls (RPC, price APIs) are mocked for deterministic results.
 */

import { describe, it, before, after, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { getDb } from "../db.js";
import { claimStep, completeStep, failStep } from "../installer/step-ops.js";
import { queryTraces } from "../lib/tracer.js";
import { hashRunTraces, commitRunTraces } from "../chains/trace-commitment.js";

/**
 * Create a token-monitor workflow run directly in the DB.
 * This bypasses the cron/gateway setup (which requires external services)
 * while exercising the real step-ops state machine.
 */
function createTestRun(): { runId: string; stepIds: string[] } {
  const db = getDb();
  const now = new Date().toISOString();
  const runId = crypto.randomUUID();

  const context = {
    task: "E2E test: token-monitor pipeline",
    token_address: "0x1234567890123456789012345678901234567890",
    chain_id: "monad",
    wallet_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  };

  db.prepare(
    "INSERT INTO runs (id, workflow_id, task, status, context, created_at, updated_at) VALUES (?, ?, ?, 'running', ?, ?, ?)"
  ).run(runId, "token-monitor", "E2E test: token-monitor pipeline", JSON.stringify(context), now, now);

  const steps = [
    {
      id: crypto.randomUUID(),
      stepId: "check_balance",
      agentId: "token-monitor/monitor",
      index: 0,
      status: "pending",
      input: "Check the wallet balance for monitoring bot.\nWallet: {{wallet_address}}\n\nOutput in format:\nBALANCE: [value]\nSTATUS: done",
      expects: "STATUS: done",
      type: "on_chain_verify",
    },
    {
      id: crypto.randomUUID(),
      stepId: "fetch_price",
      agentId: "token-monitor/monitor",
      index: 1,
      status: "waiting",
      input: "Fetch current price for token {{token_address}} on {{chain_id}}.\n\nAnalyze the price data and output:\nPRICE_USD: [value]\nVOLUME_24H: [value]\nLIQUIDITY: [value]\nSTATUS: done",
      expects: "STATUS: done",
      type: "on_chain_verify",
    },
    {
      id: crypto.randomUUID(),
      stepId: "check_supply",
      agentId: "token-monitor/monitor",
      index: 2,
      status: "waiting",
      input: "Read total supply of token {{token_address}}.\n\nOutput:\nTOTAL_SUPPLY: [decoded value]\nSTATUS: done",
      expects: "STATUS: done",
      type: "on_chain_verify",
    },
    {
      id: crypto.randomUUID(),
      stepId: "report",
      agentId: "token-monitor/monitor",
      index: 3,
      status: "waiting",
      input: "Generate a monitoring report based on:\n\nBalance: {{check_balance.output}}\nPrice: {{fetch_price.output}}\nSupply: {{check_supply.output}}\n\nCreate a summary report and output:\nREPORT: [your report]\nSTATUS: done",
      expects: "STATUS: done",
      type: "single",
    },
  ];

  const insertStep = db.prepare(
    "INSERT INTO steps (id, run_id, step_id, agent_id, step_index, input_template, expects, status, max_retries, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  for (const step of steps) {
    insertStep.run(
      step.id, runId, step.stepId, step.agentId, step.index,
      step.input, step.expects, step.status, 2, step.type, now, now
    );
  }

  return { runId, stepIds: steps.map((s) => s.id) };
}

/**
 * Simulate an agent completing a step by claiming and completing it.
 */
function simulateAgentExecution(
  agentId: string,
  output: string
): { stepId: string; runId: string; advanced: boolean; runCompleted: boolean } {
  const claim = claimStep(agentId);
  if (!claim.found) {
    throw new Error(`No pending step for agent ${agentId}`);
  }

  const result = completeStep(claim.stepId!, output);
  return { stepId: claim.stepId!, runId: claim.runId!, ...result };
}

describe("E2E Pipeline: token-monitor workflow", () => {
  let runId: string;
  let stepIds: string[];

  before(() => {
    const result = createTestRun();
    runId = result.runId;
    stepIds = result.stepIds;
  });

  after(() => {
    // Clean up test data
    const db = getDb();
    db.prepare("DELETE FROM execution_traces WHERE run_id = ?").run(runId);
    db.prepare("DELETE FROM steps WHERE run_id = ?").run(runId);
    db.prepare("DELETE FROM runs WHERE id = ?").run(runId);
  });

  it("should have created a run with 4 steps", () => {
    const db = getDb();
    const run = db.prepare("SELECT * FROM runs WHERE id = ?").get(runId) as any;
    assert.ok(run, "Run should exist");
    assert.equal(run.status, "running");
    assert.equal(run.workflow_id, "token-monitor");

    const steps = db.prepare(
      "SELECT * FROM steps WHERE run_id = ? ORDER BY step_index ASC"
    ).all(runId) as any[];
    assert.equal(steps.length, 4);
    assert.equal(steps[0].status, "pending", "First step should be pending");
    assert.equal(steps[1].status, "waiting", "Second step should be waiting");
    assert.equal(steps[2].status, "waiting", "Third step should be waiting");
    assert.equal(steps[3].status, "waiting", "Fourth step should be waiting");
  });

  it("step 1: agent claims and completes check_balance", () => {
    const result = simulateAgentExecution(
      "token-monitor/monitor",
      "BALANCE: 42.5 MON\nSTATUS: done"
    );

    assert.equal(result.stepId, stepIds[0]);
    assert.equal(result.advanced, true, "Pipeline should advance after step 1");
    assert.equal(result.runCompleted, false, "Run should not be complete yet");

    // Verify step is done and context updated
    const db = getDb();
    const step = db.prepare("SELECT * FROM steps WHERE id = ?").get(stepIds[0]) as any;
    assert.equal(step.status, "done");
    assert.ok(step.output.includes("BALANCE: 42.5 MON"));

    // Verify run context has merged output
    const run = db.prepare("SELECT context FROM runs WHERE id = ?").get(runId) as any;
    const context = JSON.parse(run.context);
    assert.equal(context.balance, "42.5 MON");
    assert.equal(context.status, "done");

    // Next step should be pending
    const nextStep = db.prepare("SELECT * FROM steps WHERE id = ?").get(stepIds[1]) as any;
    assert.equal(nextStep.status, "pending");
  });

  it("step 2: agent claims and completes fetch_price", () => {
    const result = simulateAgentExecution(
      "token-monitor/monitor",
      "PRICE_USD: 1.23\nVOLUME: 5000000\nLIQUIDITY: 2500000\nSTATUS: done"
    );

    assert.equal(result.stepId, stepIds[1]);
    assert.equal(result.advanced, true);
    assert.equal(result.runCompleted, false);

    const db = getDb();
    const run = db.prepare("SELECT context FROM runs WHERE id = ?").get(runId) as any;
    const context = JSON.parse(run.context);
    assert.equal(context.price_usd, "1.23");
    assert.equal(context.volume, "5000000");
  });

  it("step 3: agent claims and completes check_supply", () => {
    const result = simulateAgentExecution(
      "token-monitor/monitor",
      "TOTAL_SUPPLY: 1000000000\nSTATUS: done"
    );

    assert.equal(result.stepId, stepIds[2]);
    assert.equal(result.advanced, true);
    assert.equal(result.runCompleted, false);

    const db = getDb();
    const run = db.prepare("SELECT context FROM runs WHERE id = ?").get(runId) as any;
    const context = JSON.parse(run.context);
    assert.equal(context.total_supply, "1000000000");
  });

  it("step 4: agent claims and completes report (run finishes)", () => {
    const result = simulateAgentExecution(
      "token-monitor/monitor",
      "REPORT: Token monitor report — Balance: 42.5 MON, Price: $1.23, Supply: 1B. All metrics healthy.\nSTATUS: done"
    );

    assert.equal(result.stepId, stepIds[3]);
    assert.equal(result.advanced, false, "No more steps to advance");
    assert.equal(result.runCompleted, true, "Run should be completed");

    // Verify run status
    const db = getDb();
    const run = db.prepare("SELECT * FROM runs WHERE id = ?").get(runId) as any;
    assert.equal(run.status, "completed");
  });

  it("traces should be stored for all steps", async () => {
    // Give trace writes a moment to flush (they're async)
    await new Promise((r) => setTimeout(r, 100));

    const traces = await queryTraces(runId);
    assert.ok(traces.length >= 4, `Should have at least 4 traces (claim events), got ${traces.length}`);

    // Verify we have step.claim traces for each step
    const claimTraces = traces.filter((t) => t.traceType === "step.claim");
    assert.equal(claimTraces.length, 4, "Should have 4 step.claim traces");

    // Verify we have step.complete traces
    const completeTraces = traces.filter((t) => t.traceType === "step.complete");
    assert.ok(completeTraces.length >= 3, "Should have at least 3 step.complete traces");

    // All traces should reference our run
    for (const trace of traces) {
      assert.equal(trace.runId, runId);
    }
  });

  it("trace hash should be computed deterministically", async () => {
    const result1 = await hashRunTraces(runId);
    const result2 = await hashRunTraces(runId);

    assert.equal(result1.hash, result2.hash, "Hash should be deterministic");
    assert.ok(result1.hash.startsWith("0x"));
    assert.equal(result1.hash.length, 66, "SHA-256 = 32 bytes = 64 hex chars + 0x");
    assert.ok(result1.traceCount >= 4, "Should hash all traces");
  });

  it("trace commitment should store hash in DB", async () => {
    // commitRunTraces is fire-and-forget on run completion, but we call it explicitly here
    const commitment = await commitRunTraces(runId);

    assert.ok(commitment.traceHash, "Should have a trace hash");
    assert.ok(commitment.traceHash.startsWith("0x"));
    assert.ok(commitment.traceCount >= 4, "Should count all traces");
    assert.equal(commitment.status, "hash_only", "Without chain config, should be hash_only");

    // Verify DB has the hash
    const db = getDb();
    const run = db.prepare(
      "SELECT trace_hash, trace_tx_hash, trace_committed_at FROM runs WHERE id = ?"
    ).get(runId) as any;

    assert.ok(run.trace_hash, "trace_hash should be in DB");
    assert.equal(run.trace_hash, commitment.traceHash);
    assert.ok(run.trace_committed_at, "trace_committed_at should be set");
  });

  it("should not find work after run is complete", () => {
    const claim = claimStep("token-monitor/monitor");
    // Should not find a step for this run (it's completed)
    // It may find steps from other runs, but not this one
    if (claim.found) {
      assert.notEqual(claim.runId, runId, "Should not find work from completed run");
    }
  });

  it("step failure should trigger retry logic", () => {
    // Create a separate mini-run to test failure
    const db = getDb();
    const now = new Date().toISOString();
    const failRunId = crypto.randomUUID();
    const failStepId = crypto.randomUUID();

    db.prepare(
      "INSERT INTO runs (id, workflow_id, task, status, context, created_at, updated_at) VALUES (?, ?, ?, 'running', '{}', ?, ?)"
    ).run(failRunId, "test-fail", "Failure test", now, now);

    db.prepare(
      "INSERT INTO steps (id, run_id, step_id, agent_id, step_index, input_template, expects, status, max_retries, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?, 'single', ?, ?)"
    ).run(failStepId, failRunId, "fail-step", "test-agent", 0, "test", "STATUS: done", 2, now, now);

    // First failure: should retry
    const result1 = failStep(failStepId, "RPC timeout");
    assert.equal(result1.retrying, true, "Should retry on first failure");
    assert.equal(result1.runFailed, false);

    // Verify step is back to pending
    const step = db.prepare("SELECT status, retry_count FROM steps WHERE id = ?").get(failStepId) as any;
    assert.equal(step.status, "pending");
    assert.equal(step.retry_count, 1);

    // Set back to running for next fail
    db.prepare("UPDATE steps SET status = 'running' WHERE id = ?").run(failStepId);

    // Second failure: should retry
    const result2 = failStep(failStepId, "RPC timeout again");
    assert.equal(result2.retrying, true);

    // Set back to running for final fail
    db.prepare("UPDATE steps SET status = 'running' WHERE id = ?").run(failStepId);

    // Third failure: max retries exceeded, run fails
    const result3 = failStep(failStepId, "Permanently broken");
    assert.equal(result3.retrying, false);
    assert.equal(result3.runFailed, true);

    const failedRun = db.prepare("SELECT status FROM runs WHERE id = ?").get(failRunId) as any;
    assert.equal(failedRun.status, "failed");

    // Cleanup
    db.prepare("DELETE FROM execution_traces WHERE run_id = ?").run(failRunId);
    db.prepare("DELETE FROM steps WHERE run_id = ?").run(failRunId);
    db.prepare("DELETE FROM runs WHERE id = ?").run(failRunId);
  });
});
