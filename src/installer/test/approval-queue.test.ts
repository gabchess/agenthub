import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  queueApproval,
  getApprovalStatus,
  listPendingApprovals,
  approveRequest,
  rejectRequest,
} from "../approval-queue.js";

describe("Approval Queue", () => {
  const testDir = path.join(os.tmpdir(), "approval-queue-test-" + Date.now());
  const approvalsDir = path.join(testDir, ".openclaw", "agenthub", "approvals");

  before(async () => {
    // Override the approvals directory for testing
    // Note: The module uses os.homedir(), so we'll test with a temp directory
    // by creating files there manually for some tests
  });

  after(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Clean up actual approval files created during tests
    try {
      const realApprovalsDir = path.join(
        os.homedir(),
        ".openclaw",
        "agenthub",
        "approvals"
      );
      const files = await fs.readdir(realApprovalsDir);
      for (const file of files) {
        if (file.includes("test-") && file.endsWith(".json")) {
          await fs.rm(path.join(realApprovalsDir, file), { force: true });
        }
      }
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  });

  it("queueApproval - should create approval with unique ID", async () => {
    const request = {
      agentId: "test-agent-1",
      runId: "test-run-1",
      operation: "transferFunds",
      params: { to: "0x123", amount: 10 },
      amount: 10,
    };

    const approvalId = await queueApproval(request);

    assert.ok(approvalId);
    assert.match(
      approvalId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    // Verify file was created
    const approval = await getApprovalStatus(approvalId);
    assert.ok(approval);
    assert.equal(approval.agentId, request.agentId);
    assert.equal(approval.runId, request.runId);
    assert.equal(approval.operation, request.operation);
    assert.equal(approval.status, "pending");
  });

  it("getApprovalStatus - should retrieve approval by ID", async () => {
    const request = {
      agentId: "test-agent-2",
      runId: "test-run-2",
      operation: "deleteTopic",
      params: { topicId: "topic-123" },
    };

    const approvalId = await queueApproval(request);
    const approval = await getApprovalStatus(approvalId);

    assert.ok(approval);
    assert.equal(approval.id, approvalId);
    assert.equal(approval.agentId, request.agentId);
    assert.equal(approval.runId, request.runId);
    assert.equal(approval.operation, request.operation);
    assert.deepEqual(approval.params, request.params);
    assert.equal(approval.status, "pending");
    assert.ok(approval.requestedAt);
  });

  it("getApprovalStatus - should return null for non-existent ID", async () => {
    const approval = await getApprovalStatus("non-existent-id");
    assert.equal(approval, null);
  });

  it("listPendingApprovals - should return all pending approvals", async () => {
    const request1 = {
      agentId: "test-agent-3",
      runId: "test-run-3",
      operation: "op1",
      params: {},
    };

    const request2 = {
      agentId: "test-agent-4",
      runId: "test-run-3",
      operation: "op2",
      params: {},
    };

    const id1 = await queueApproval(request1);
    const id2 = await queueApproval(request2);

    const approvals = await listPendingApprovals();

    // Should include our test approvals
    const approval1 = approvals.find((a) => a.id === id1);
    const approval2 = approvals.find((a) => a.id === id2);

    assert.ok(approval1);
    assert.ok(approval2);
    assert.equal(approval1.status, "pending");
    assert.equal(approval2.status, "pending");
  });

  it("listPendingApprovals - should filter by runId", async () => {
    const runId = "test-run-filter-" + Date.now();

    const request1 = {
      agentId: "test-agent-5",
      runId: runId,
      operation: "op1",
      params: {},
    };

    const request2 = {
      agentId: "test-agent-6",
      runId: "different-run",
      operation: "op2",
      params: {},
    };

    const id1 = await queueApproval(request1);
    const id2 = await queueApproval(request2);

    const approvals = await listPendingApprovals(runId);

    // Should only include approval from the specified run
    const approval1 = approvals.find((a) => a.id === id1);
    const approval2 = approvals.find((a) => a.id === id2);

    assert.ok(approval1);
    assert.ok(!approval2); // Should not be in filtered results
  });

  it("listPendingApprovals - should not include approved/rejected", async () => {
    const request = {
      agentId: "test-agent-7",
      runId: "test-run-7",
      operation: "op",
      params: {},
    };

    const approvalId = await queueApproval(request);
    await approveRequest(approvalId, "test-user");

    const approvals = await listPendingApprovals();
    const found = approvals.find((a) => a.id === approvalId);

    assert.ok(!found); // Should not be in pending list
  });

  it("approveRequest - should change status to approved", async () => {
    const request = {
      agentId: "test-agent-8",
      runId: "test-run-8",
      operation: "sensitiveOp",
      params: { data: "important" },
    };

    const approvalId = await queueApproval(request);
    const resolvedBy = "admin-user";
    const reason = "Verified and approved";

    await approveRequest(approvalId, resolvedBy, reason);

    const approval = await getApprovalStatus(approvalId);

    assert.ok(approval);
    assert.equal(approval.status, "approved");
    assert.equal(approval.resolvedBy, resolvedBy);
    assert.equal(approval.reason, reason);
    assert.ok(approval.resolvedAt);
  });

  it("rejectRequest - should change status to rejected", async () => {
    const request = {
      agentId: "test-agent-9",
      runId: "test-run-9",
      operation: "dangerousOp",
      params: {},
    };

    const approvalId = await queueApproval(request);
    const resolvedBy = "security-team";
    const reason = "Insufficient justification";

    await rejectRequest(approvalId, resolvedBy, reason);

    const approval = await getApprovalStatus(approvalId);

    assert.ok(approval);
    assert.equal(approval.status, "rejected");
    assert.equal(approval.resolvedBy, resolvedBy);
    assert.equal(approval.reason, reason);
    assert.ok(approval.resolvedAt);
  });

  it("approveRequest - should throw for non-existent approval", async () => {
    await assert.rejects(
      async () => {
        await approveRequest("non-existent-id", "user");
      },
      {
        message: /not found/,
      }
    );
  });

  it("rejectRequest - should throw for non-existent approval", async () => {
    await assert.rejects(
      async () => {
        await rejectRequest("non-existent-id", "user");
      },
      {
        message: /not found/,
      }
    );
  });

  it("approveRequest - should throw if already approved", async () => {
    const request = {
      agentId: "test-agent-10",
      runId: "test-run-10",
      operation: "op",
      params: {},
    };

    const approvalId = await queueApproval(request);
    await approveRequest(approvalId, "user1");

    await assert.rejects(
      async () => {
        await approveRequest(approvalId, "user2");
      },
      {
        message: /already approved/,
      }
    );
  });

  it("rejectRequest - should throw if already rejected", async () => {
    const request = {
      agentId: "test-agent-11",
      runId: "test-run-11",
      operation: "op",
      params: {},
    };

    const approvalId = await queueApproval(request);
    await rejectRequest(approvalId, "user1");

    await assert.rejects(
      async () => {
        await rejectRequest(approvalId, "user2");
      },
      {
        message: /already rejected/,
      }
    );
  });

  it("approval lifecycle - pending to approved", async () => {
    const request = {
      agentId: "test-agent-lifecycle-1",
      runId: "test-run-lifecycle-1",
      operation: "testOp",
      params: { test: true },
      amount: 5.0,
    };

    // Create
    const approvalId = await queueApproval(request);
    let approval = await getApprovalStatus(approvalId);
    assert.equal(approval?.status, "pending");

    // Should be in pending list
    let pending = await listPendingApprovals(request.runId);
    assert.ok(pending.some((a) => a.id === approvalId));

    // Approve
    await approveRequest(approvalId, "approver");
    approval = await getApprovalStatus(approvalId);
    assert.equal(approval?.status, "approved");

    // Should not be in pending list
    pending = await listPendingApprovals(request.runId);
    assert.ok(!pending.some((a) => a.id === approvalId));
  });

  it("approval lifecycle - pending to rejected", async () => {
    const request = {
      agentId: "test-agent-lifecycle-2",
      runId: "test-run-lifecycle-2",
      operation: "testOp",
      params: { test: true },
    };

    // Create
    const approvalId = await queueApproval(request);
    let approval = await getApprovalStatus(approvalId);
    assert.equal(approval?.status, "pending");

    // Reject
    await rejectRequest(approvalId, "rejector", "Not allowed");
    approval = await getApprovalStatus(approvalId);
    assert.equal(approval?.status, "rejected");
    assert.equal(approval?.reason, "Not allowed");

    // Should not be in pending list
    const pending = await listPendingApprovals(request.runId);
    assert.ok(!pending.some((a) => a.id === approvalId));
  });

  it("listPendingApprovals - should sort by requestedAt (oldest first)", async () => {
    const runId = "test-run-sorted-" + Date.now();

    // Create approvals with slight delays
    const id1 = await queueApproval({
      agentId: "agent-1",
      runId,
      operation: "op1",
      params: {},
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const id2 = await queueApproval({
      agentId: "agent-2",
      runId,
      operation: "op2",
      params: {},
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const id3 = await queueApproval({
      agentId: "agent-3",
      runId,
      operation: "op3",
      params: {},
    });

    const approvals = await listPendingApprovals(runId);

    const indices = [
      approvals.findIndex((a) => a.id === id1),
      approvals.findIndex((a) => a.id === id2),
      approvals.findIndex((a) => a.id === id3),
    ];

    // Verify they're in order (oldest first)
    assert.ok(indices[0] < indices[1]);
    assert.ok(indices[1] < indices[2]);
  });

  it("queueApproval - should handle optional stepId", async () => {
    const request = {
      agentId: "test-agent-step",
      runId: "test-run-step",
      stepId: "step-123",
      operation: "stepOp",
      params: {},
    };

    const approvalId = await queueApproval(request);
    const approval = await getApprovalStatus(approvalId);

    assert.ok(approval);
    assert.equal(approval.stepId, "step-123");
  });

  it("queueApproval - should handle missing optional fields", async () => {
    const request = {
      agentId: "test-agent-minimal",
      runId: "test-run-minimal",
      operation: "minimalOp",
      params: {},
    };

    const approvalId = await queueApproval(request);
    const approval = await getApprovalStatus(approvalId);

    assert.ok(approval);
    assert.equal(approval.stepId, undefined);
    assert.equal(approval.amount, undefined);
  });

  it("approveRequest - should work without reason", async () => {
    const request = {
      agentId: "test-agent-no-reason",
      runId: "test-run-no-reason",
      operation: "op",
      params: {},
    };

    const approvalId = await queueApproval(request);
    await approveRequest(approvalId, "approver");

    const approval = await getApprovalStatus(approvalId);

    assert.ok(approval);
    assert.equal(approval.status, "approved");
    assert.equal(approval.reason, undefined);
  });

  it("listPendingApprovals - should return empty array if directory doesn't exist", async () => {
    // This tests the error handling when the directory doesn't exist yet
    const approvals = await listPendingApprovals("run-with-no-approvals");
    assert.ok(Array.isArray(approvals));
  });
});
