import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { StateFsManager, getStateFsManager } from "../state-fs.js";
import * as dbModule from "../../db.js";

// Mock database
const mockDb = {
  prepare: (sql: string) => ({
    run: mock.fn(() => ({ changes: 1 })),
    get: mock.fn(() => null),
    all: mock.fn(() => []),
  }),
};

describe("State Filesystem Manager", () => {
  const testRunId = "test-run-" + Date.now();
  const testWorkflowId = "test-workflow-123";
  const testAgentId = "test-agent-1";
  const testBasePath = path.join(os.tmpdir(), "state-fs-test", testRunId);

  let manager: StateFsManager;

  before(async () => {
    // Mock getDb
    mock.method(dbModule, "getDb", () => mockDb as any);

    // Create manager with custom base path
    manager = new StateFsManager(testRunId, testWorkflowId, testBasePath);
  });

  after(async () => {
    // Clean up test directories
    try {
      await fs.rm(testBasePath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    mock.restoreAll();
  });

  it("initializeDirectories - should create directory structure", async () => {
    await manager.initializeDirectories();

    // Verify directories exist
    const agentsDir = path.join(testBasePath, "agents");
    const workflowsDir = path.join(testBasePath, "workflows", testWorkflowId);
    const tracesDir = path.join(testBasePath, "traces");
    const walletsDir = path.join(testBasePath, "wallets");

    const agentsStat = await fs.stat(agentsDir);
    const workflowsStat = await fs.stat(workflowsDir);
    const tracesStat = await fs.stat(tracesDir);
    const walletsStat = await fs.stat(walletsDir);

    assert.ok(agentsStat.isDirectory());
    assert.ok(workflowsStat.isDirectory());
    assert.ok(tracesStat.isDirectory());
    assert.ok(walletsStat.isDirectory());
  });

  it("createAgentNamespace - should create agent directories", async () => {
    await manager.createAgentNamespace(testAgentId);

    // Verify subdirectories exist
    const agentBase = path.join(testBasePath, "agents", testAgentId);
    const workspaceDir = path.join(agentBase, "workspace");
    const outputsDir = path.join(agentBase, "outputs");
    const logsDir = path.join(agentBase, "logs");
    const memoryPath = path.join(agentBase, "memory.json");

    const workspaceStat = await fs.stat(workspaceDir);
    const outputsStat = await fs.stat(outputsDir);
    const logsStat = await fs.stat(logsDir);
    const memoryStat = await fs.stat(memoryPath);

    assert.ok(workspaceStat.isDirectory());
    assert.ok(outputsStat.isDirectory());
    assert.ok(logsStat.isDirectory());
    assert.ok(memoryStat.isFile());

    // Verify memory.json is initialized as empty object
    const memoryContent = await fs.readFile(memoryPath, "utf-8");
    assert.deepEqual(JSON.parse(memoryContent), {});
  });

  it("writeAgentFile and readAgentFile - should roundtrip correctly", async () => {
    const filePath = "workspace/test.txt";
    const content = "Hello, World!";

    await manager.writeAgentFile(testAgentId, filePath, content);
    const readContent = await manager.readAgentFile(testAgentId, filePath);

    assert.equal(readContent, content);
  });

  it("writeAgentFile - should create nested directories", async () => {
    const filePath = "workspace/nested/deep/file.txt";
    const content = "nested content";

    await manager.writeAgentFile(testAgentId, filePath, content);
    const readContent = await manager.readAgentFile(testAgentId, filePath);

    assert.equal(readContent, content);
  });

  it("writeSharedState and readSharedState - should merge JSON correctly", async () => {
    await manager.writeSharedState("key1", "value1");
    await manager.writeSharedState("key2", "value2");

    const value1 = await manager.readSharedState("key1");
    const value2 = await manager.readSharedState("key2");

    assert.equal(value1, "value1");
    assert.equal(value2, "value2");

    // Verify context.json contains both keys
    const contextPath = path.join(
      testBasePath,
      "workflows",
      testWorkflowId,
      "context.json"
    );
    const contextContent = await fs.readFile(contextPath, "utf-8");
    const context = JSON.parse(contextContent);

    assert.equal(context.key1, "value1");
    assert.equal(context.key2, "value2");
  });

  it("writeSharedState - should override existing keys", async () => {
    await manager.writeSharedState("overrideKey", "initial");
    await manager.writeSharedState("overrideKey", "updated");

    const value = await manager.readSharedState("overrideKey");
    assert.equal(value, "updated");
  });

  it("readSharedState - should return null for non-existent key", async () => {
    const value = await manager.readSharedState("non-existent-key");
    assert.equal(value, null);
  });

  it("appendTrace - should append to JSONL file", async () => {
    const trace1 = { event: "trace1", timestamp: Date.now() };
    const trace2 = { event: "trace2", timestamp: Date.now() };

    await manager.appendTrace(trace1);
    await manager.appendTrace(trace2);

    // Read the JSONL file
    const tracePath = path.join(testBasePath, "traces", `${testRunId}.jsonl`);
    const content = await fs.readFile(tracePath, "utf-8");
    const lines = content.trim().split("\n");

    assert.equal(lines.length, 2);
    assert.deepEqual(JSON.parse(lines[0]), trace1);
    assert.deepEqual(JSON.parse(lines[1]), trace2);
  });

  it("logTransaction - should append to wallet transactions JSONL", async () => {
    const tx1 = { txHash: "0x123", amount: 100, timestamp: Date.now() };
    const tx2 = { txHash: "0x456", amount: 200, timestamp: Date.now() };

    await manager.logTransaction(testAgentId, tx1);
    await manager.logTransaction(testAgentId, tx2);

    // Read the JSONL file
    const txPath = path.join(
      testBasePath,
      "wallets",
      testAgentId,
      "transactions.jsonl"
    );
    const content = await fs.readFile(txPath, "utf-8");
    const lines = content.trim().split("\n");

    assert.equal(lines.length, 2);
    assert.deepEqual(JSON.parse(lines[0]), tx1);
    assert.deepEqual(JSON.parse(lines[1]), tx2);
  });

  it("listAgentFiles - should list all files", async () => {
    await manager.writeAgentFile(testAgentId, "workspace/file1.txt", "content1");
    await manager.writeAgentFile(testAgentId, "workspace/file2.txt", "content2");
    await manager.writeAgentFile(testAgentId, "outputs/output.json", "{}");

    const files = await manager.listAgentFiles(testAgentId);

    assert.ok(files.includes("workspace/file1.txt"));
    assert.ok(files.includes("workspace/file2.txt"));
    assert.ok(files.includes("outputs/output.json"));
    assert.ok(files.includes("memory.json")); // Created during namespace creation
  });

  it("listAgentFiles - should filter by pattern", async () => {
    await manager.writeAgentFile(testAgentId, "workspace/test1.json", "{}");
    await manager.writeAgentFile(testAgentId, "workspace/test2.json", "{}");
    await manager.writeAgentFile(testAgentId, "workspace/test.txt", "text");

    const jsonFiles = await manager.listAgentFiles(testAgentId, "*.json");

    assert.ok(jsonFiles.includes("memory.json"));
    assert.ok(!jsonFiles.includes("workspace/test.txt"));
  });

  it("listAgentFiles - should return empty array for non-existent agent", async () => {
    const files = await manager.listAgentFiles("non-existent-agent");
    assert.equal(files.length, 0);
  });

  it("concurrent access - multiple managers for same runId", async () => {
    const manager1 = new StateFsManager(
      testRunId,
      testWorkflowId,
      testBasePath
    );
    const manager2 = new StateFsManager(
      testRunId,
      testWorkflowId,
      testBasePath
    );

    // Both managers write to shared state
    await manager1.writeSharedState("concurrent1", "value1");
    await manager2.writeSharedState("concurrent2", "value2");

    // Both should be able to read each other's writes
    const value1 = await manager2.readSharedState("concurrent1");
    const value2 = await manager1.readSharedState("concurrent2");

    assert.equal(value1, "value1");
    assert.equal(value2, "value2");
  });

  it("getStateFsManager - should return singleton instance", () => {
    const manager1 = getStateFsManager(testRunId, testWorkflowId);
    const manager2 = getStateFsManager(testRunId, testWorkflowId);

    // Should be the same instance
    assert.strictEqual(manager1, manager2);
  });

  it("getStateFsManager - different runIds should return different instances", () => {
    const manager1 = getStateFsManager("run-1", "workflow-1");
    const manager2 = getStateFsManager("run-2", "workflow-1");

    // Should be different instances
    assert.notStrictEqual(manager1, manager2);
  });

  it("writeAgentFile - should handle empty content", async () => {
    const filePath = "workspace/empty.txt";
    const content = "";

    await manager.writeAgentFile(testAgentId, filePath, content);
    const readContent = await manager.readAgentFile(testAgentId, filePath);

    assert.equal(readContent, content);
  });

  it("writeSharedState - should handle special characters in values", async () => {
    const value = 'Special chars: \n\t"quotes"\\ backslash';
    await manager.writeSharedState("specialKey", value);

    const readValue = await manager.readSharedState("specialKey");
    assert.equal(readValue, value);
  });

  it("appendTrace - should handle large trace objects", async () => {
    const largeTrace = {
      event: "large",
      data: "x".repeat(10000), // 10KB of data
    };

    await manager.appendTrace(largeTrace);

    const tracePath = path.join(testBasePath, "traces", `${testRunId}.jsonl`);
    const content = await fs.readFile(tracePath, "utf-8");
    const lines = content.trim().split("\n");
    const lastLine = JSON.parse(lines[lines.length - 1]);

    assert.equal(lastLine.data.length, 10000);
  });

  it("createAgentNamespace - should not overwrite existing memory.json", async () => {
    const agentId2 = "agent-2";
    await manager.createAgentNamespace(agentId2);

    // Modify memory.json
    const memoryPath = path.join(
      testBasePath,
      "agents",
      agentId2,
      "memory.json"
    );
    await fs.writeFile(memoryPath, JSON.stringify({ key: "value" }), "utf-8");

    // Call createAgentNamespace again
    await manager.createAgentNamespace(agentId2);

    // Verify memory.json was not overwritten
    const memoryContent = await fs.readFile(memoryPath, "utf-8");
    assert.deepEqual(JSON.parse(memoryContent), { key: "value" });
  });
});
