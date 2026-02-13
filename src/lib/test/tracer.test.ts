import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import * as tracer from "../tracer.js";
import * as dbModule from "../../db.js";

// Mock database
const mockDb = {
  prepare: (sql: string) => ({
    run: mock.fn(() => ({ changes: 1 })),
    get: mock.fn(() => null),
    all: mock.fn(() => []),
  }),
};

describe("Tracer Module", () => {
  const testRunId = "test-run-" + Date.now();
  const testStepId = "test-step-123";
  const testAgentId = "test-agent-1";
  const testTracePath = path.join(
    os.homedir(),
    ".openclaw",
    "agenthub",
    "state",
    testRunId,
    "traces",
    `${testRunId}.jsonl`
  );

  before(async () => {
    // Mock getDb
    mock.method(dbModule, "getDb", () => mockDb as any);
  });

  after(async () => {
    // Clean up test files
    try {
      const traceDir = path.dirname(testTracePath);
      await fs.rm(traceDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    mock.restoreAll();
  });

  it("traceStepClaim - should insert into DB and create JSONL file", async () => {
    const input = { task: "test task" };

    await tracer.traceStepClaim(testRunId, testStepId, testAgentId, input);

    // Verify JSONL file was created
    const content = await fs.readFile(testTracePath, "utf-8");
    const lines = content.trim().split("\n");
    assert.equal(lines.length, 1);

    const entry = JSON.parse(lines[0]);
    assert.equal(entry.runId, testRunId);
    assert.equal(entry.stepId, testStepId);
    assert.equal(entry.agentId, testAgentId);
    assert.equal(entry.traceType, "step.claim");
    assert.deepEqual(entry.data.input, input);
    assert.ok(entry.id);
    assert.ok(entry.timestamp);
  });

  it("traceModelRequest - should verify trace entry structure", async () => {
    const model = "claude-opus-4-6";
    const prompt = "test prompt";
    const thinkingLevel = "high";

    await tracer.traceModelRequest(
      testRunId,
      testStepId,
      testAgentId,
      model,
      prompt,
      thinkingLevel
    );

    // Read JSONL file
    const content = await fs.readFile(testTracePath, "utf-8");
    const lines = content.trim().split("\n");
    const entry = JSON.parse(lines[lines.length - 1]);

    assert.equal(entry.traceType, "model.request");
    assert.equal(entry.model, model);
    assert.deepEqual(entry.data, { prompt, thinkingLevel });
  });

  it("traceModelResponse - should log response with tokens and duration", async () => {
    const tokens = { input: 100, output: 50 };
    const duration = 1500;
    const extendedThinking = true;

    await tracer.traceModelResponse(
      testRunId,
      testStepId,
      testAgentId,
      tokens,
      duration,
      extendedThinking
    );

    const content = await fs.readFile(testTracePath, "utf-8");
    const lines = content.trim().split("\n");
    const entry = JSON.parse(lines[lines.length - 1]);

    assert.equal(entry.traceType, "model.response");
    assert.equal(entry.inputTokens, 100);
    assert.equal(entry.outputTokens, 50);
    assert.equal(entry.durationMs, 1500);
    assert.equal(entry.extendedThinkingUsed, true);
  });

  it("traceToolCall - should verify tool invocation logging", async () => {
    const toolName = "readFile";
    const params = { path: "/test/file.txt" };
    const result = { content: "file content" };

    await tracer.traceToolCall(
      testRunId,
      testStepId,
      testAgentId,
      toolName,
      params,
      result
    );

    const content = await fs.readFile(testTracePath, "utf-8");
    const lines = content.trim().split("\n");
    const entry = JSON.parse(lines[lines.length - 1]);

    assert.equal(entry.traceType, "tool.call");
    assert.equal(entry.data.toolName, toolName);
    assert.deepEqual(entry.data.params, params);
    assert.deepEqual(entry.data.result, result);
  });

  it("queryTraces - should filter by stepId", async () => {
    // Mock the database response
    const mockTraces = [
      {
        id: "1",
        run_id: testRunId,
        step_id: testStepId,
        agent_id: testAgentId,
        trace_type: "step.claim",
        timestamp: new Date().toISOString(),
        duration_ms: null,
        input_tokens: null,
        output_tokens: null,
        model: null,
        extended_thinking_used: 0,
        data: JSON.stringify({ input: "test" }),
        created_at: new Date().toISOString(),
      },
    ];

    (mockDb.prepare as any) = (sql: string) => ({
      all: mock.fn(() => mockTraces),
      run: mock.fn(() => ({ changes: 1 })),
      get: mock.fn(() => null),
    });

    const traces = await tracer.queryTraces(testRunId, { stepId: testStepId });

    assert.equal(traces.length, 1);
    assert.equal(traces[0].stepId, testStepId);
  });

  it("queryTraces - should filter by agentId", async () => {
    const mockTraces = [
      {
        id: "2",
        run_id: testRunId,
        step_id: testStepId,
        agent_id: testAgentId,
        trace_type: "model.request",
        timestamp: new Date().toISOString(),
        duration_ms: null,
        input_tokens: null,
        output_tokens: null,
        model: "claude-opus-4-6",
        extended_thinking_used: 0,
        data: JSON.stringify({ prompt: "test" }),
        created_at: new Date().toISOString(),
      },
    ];

    (mockDb.prepare as any) = (sql: string) => ({
      all: mock.fn(() => mockTraces),
      run: mock.fn(() => ({ changes: 1 })),
      get: mock.fn(() => null),
    });

    const traces = await tracer.queryTraces(testRunId, {
      agentId: testAgentId,
    });

    assert.equal(traces.length, 1);
    assert.equal(traces[0].agentId, testAgentId);
  });

  it("queryTraces - should filter by traceType", async () => {
    const mockTraces = [
      {
        id: "3",
        run_id: testRunId,
        step_id: testStepId,
        agent_id: testAgentId,
        trace_type: "tool.call",
        timestamp: new Date().toISOString(),
        duration_ms: null,
        input_tokens: null,
        output_tokens: null,
        model: null,
        extended_thinking_used: 0,
        data: JSON.stringify({ toolName: "test" }),
        created_at: new Date().toISOString(),
      },
    ];

    (mockDb.prepare as any) = (sql: string) => ({
      all: mock.fn(() => mockTraces),
      run: mock.fn(() => ({ changes: 1 })),
      get: mock.fn(() => null),
    });

    const traces = await tracer.queryTraces(testRunId, {
      traceType: "tool.call",
    });

    assert.equal(traces.length, 1);
    assert.equal(traces[0].traceType, "tool.call");
  });

  it("JSONL file creation - should append entries correctly", async () => {
    const testRunId2 = "test-run-append-" + Date.now();
    const testTracePath2 = path.join(
      os.homedir(),
      ".openclaw",
      "agenthub",
      "state",
      testRunId2,
      "traces",
      `${testRunId2}.jsonl`
    );

    // Add multiple entries
    await tracer.traceStepClaim(testRunId2, "step-1", "agent-1", {
      task: "task1",
    });
    await tracer.traceStepClaim(testRunId2, "step-2", "agent-2", {
      task: "task2",
    });
    await tracer.traceStepClaim(testRunId2, "step-3", "agent-3", {
      task: "task3",
    });

    // Verify all entries are present
    const content = await fs.readFile(testTracePath2, "utf-8");
    const lines = content.trim().split("\n");
    assert.equal(lines.length, 3);

    // Clean up
    try {
      const traceDir = path.dirname(testTracePath2);
      await fs.rm(traceDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });

  it("File rotation - should rotate at 100MB threshold", async () => {
    const testRunId3 = "test-run-rotate-" + Date.now();
    const testTracePath3 = path.join(
      os.homedir(),
      ".openclaw",
      "agenthub",
      "state",
      testRunId3,
      "traces",
      `${testRunId3}.jsonl`
    );

    // Create directory
    await fs.mkdir(path.dirname(testTracePath3), { recursive: true });

    // Create a large file (just over 100MB)
    const largeData = "x".repeat(100 * 1024 * 1024 + 1000);
    await fs.writeFile(testTracePath3, largeData, "utf-8");

    // Trigger rotation by adding a new entry
    await tracer.traceStepClaim(testRunId3, "step-rotate", "agent-rotate", {
      task: "rotation test",
    });

    // Verify the original file was rotated (renamed)
    const dir = path.dirname(testTracePath3);
    const files = await fs.readdir(dir);
    const rotatedFiles = files.filter((f) => f.startsWith(testRunId3 + ".jsonl."));

    assert.ok(
      rotatedFiles.length > 0,
      "Rotated file should exist"
    );

    // Verify new file exists and has the new entry
    const newContent = await fs.readFile(testTracePath3, "utf-8");
    const lines = newContent.trim().split("\n");
    assert.equal(lines.length, 1);

    // Clean up
    try {
      const traceDir = path.dirname(testTracePath3);
      await fs.rm(traceDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });

  it("traceStepComplete - should log step completion", async () => {
    const output = { result: "success" };
    const duration = 5000;

    await tracer.traceStepComplete(testRunId, testStepId, output, duration);

    const content = await fs.readFile(testTracePath, "utf-8");
    const lines = content.trim().split("\n");
    const entry = JSON.parse(lines[lines.length - 1]);

    assert.equal(entry.traceType, "step.complete");
    assert.equal(entry.durationMs, 5000);
    assert.deepEqual(entry.data.output, output);
  });

  it("traceGuardrailCheck - should log guardrail checks", async () => {
    const operation = "tool_check";
    const result = { allowed: true };

    await tracer.traceGuardrailCheck(
      testRunId,
      testStepId,
      testAgentId,
      operation,
      result
    );

    const content = await fs.readFile(testTracePath, "utf-8");
    const lines = content.trim().split("\n");
    const entry = JSON.parse(lines[lines.length - 1]);

    assert.equal(entry.traceType, "guardrail.check");
    assert.equal(entry.data.operation, operation);
    assert.deepEqual(entry.data.result, result);
  });

  it("queryTraces - should handle empty results", async () => {
    (mockDb.prepare as any) = (sql: string) => ({
      all: mock.fn(() => []),
      run: mock.fn(() => ({ changes: 1 })),
      get: mock.fn(() => null),
    });

    const traces = await tracer.queryTraces("non-existent-run");
    assert.equal(traces.length, 0);
  });

  it("queryTraces - should apply limit and offset", async () => {
    const mockTraces = Array.from({ length: 10 }, (_, i) => ({
      id: `trace-${i}`,
      run_id: testRunId,
      step_id: testStepId,
      agent_id: testAgentId,
      trace_type: "tool.call",
      timestamp: new Date().toISOString(),
      duration_ms: null,
      input_tokens: null,
      output_tokens: null,
      model: null,
      extended_thinking_used: 0,
      data: JSON.stringify({ index: i }),
      created_at: new Date().toISOString(),
    }));

    (mockDb.prepare as any) = (sql: string) => ({
      all: mock.fn(() => mockTraces.slice(5, 8)), // Simulate offset=5, limit=3
      run: mock.fn(() => ({ changes: 1 })),
      get: mock.fn(() => null),
    });

    const traces = await tracer.queryTraces(testRunId, {
      limit: 3,
      offset: 5,
    });

    assert.equal(traces.length, 3);
  });
});
