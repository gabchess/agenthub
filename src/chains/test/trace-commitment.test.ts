import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { hashRunTraces, runIdToBytes32, commitRunTraces } from "../trace-commitment.js";
import { getDb } from "../../db.js";

describe("trace-commitment", () => {
  const testRunId = crypto.randomUUID();
  const testStepId = crypto.randomUUID();

  before(() => {
    const db = getDb();
    const now = new Date().toISOString();

    // Create a test run
    db.prepare(
      "INSERT INTO runs (id, workflow_id, task, status, context, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(testRunId, "test-workflow", "Test trace commitment", "completed", "{}", now, now);

    // Insert some test traces
    for (let i = 0; i < 5; i++) {
      db.prepare(
        `INSERT INTO execution_traces (id, run_id, step_id, agent_id, trace_type, timestamp, duration_ms, input_tokens, output_tokens, model, extended_thinking_used, data, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        crypto.randomUUID(),
        testRunId,
        testStepId,
        "test-agent",
        i < 2 ? "step.claim" : "step.complete",
        new Date(Date.now() + i * 1000).toISOString(),
        100 + i * 50,
        500 + i * 100,
        200 + i * 50,
        "sonnet",
        0,
        JSON.stringify({ index: i, action: `test-action-${i}` }),
        now
      );
    }
  });

  after(() => {
    const db = getDb();
    db.prepare("DELETE FROM execution_traces WHERE run_id = ?").run(testRunId);
    db.prepare("DELETE FROM runs WHERE id = ?").run(testRunId);
  });

  describe("hashRunTraces", () => {
    it("should hash traces for a valid run", async () => {
      const result = await hashRunTraces(testRunId);

      assert.ok(result.hash.startsWith("0x"), "Hash should start with 0x");
      assert.equal(result.hash.length, 66, "SHA-256 hex should be 64 chars + 0x prefix");
      assert.equal(result.traceCount, 5, "Should have 5 traces");
    });

    it("should produce deterministic hash for same traces", async () => {
      const result1 = await hashRunTraces(testRunId);
      const result2 = await hashRunTraces(testRunId);

      assert.equal(result1.hash, result2.hash, "Same traces should produce same hash");
    });

    it("should throw for run with no traces", async () => {
      const emptyRunId = crypto.randomUUID();
      await assert.rejects(
        () => hashRunTraces(emptyRunId),
        /No traces found/
      );
    });
  });

  describe("runIdToBytes32", () => {
    it("should convert UUID to bytes32", () => {
      const bytes32 = runIdToBytes32(testRunId);

      assert.ok(bytes32.startsWith("0x"), "Should start with 0x");
      assert.equal(bytes32.length, 66, "bytes32 should be 64 hex chars + 0x");
    });

    it("should be deterministic", () => {
      const a = runIdToBytes32(testRunId);
      const b = runIdToBytes32(testRunId);
      assert.equal(a, b);
    });

    it("should produce different values for different IDs", () => {
      const a = runIdToBytes32("run-1");
      const b = runIdToBytes32("run-2");
      assert.notEqual(a, b);
    });
  });

  describe("commitRunTraces", () => {
    it("should hash traces and store in DB (without on-chain submission)", async () => {
      // No MONAD_PRIVATE_KEY set, so on-chain commit is skipped
      const result = await commitRunTraces(testRunId);

      assert.ok(result.traceHash.startsWith("0x"), "Should have trace hash");
      assert.equal(result.traceCount, 5, "Should count 5 traces");
      assert.equal(result.txHash, null, "No tx hash without private key");
      assert.equal(result.status, "hash_only", "Should be hash_only without chain config");

      // Verify DB was updated
      const db = getDb();
      const run = db.prepare("SELECT trace_hash, trace_tx_hash, trace_committed_at FROM runs WHERE id = ?").get(testRunId) as {
        trace_hash: string | null;
        trace_tx_hash: string | null;
        trace_committed_at: string | null;
      };

      assert.ok(run.trace_hash, "trace_hash should be stored in DB");
      assert.equal(run.trace_hash, result.traceHash, "DB hash should match returned hash");
      assert.equal(run.trace_tx_hash, null, "No tx hash in DB without chain");
      assert.ok(run.trace_committed_at, "trace_committed_at should be set");
    });
  });
});
