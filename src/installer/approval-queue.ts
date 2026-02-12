import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";

export interface ApprovalRequest {
  id: string;
  agentId: string;
  runId: string;
  stepId?: string;
  operation: string;
  params: any;
  amount?: number;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  reason?: string;
}

/**
 * Get the directory for storing approval requests
 */
function getApprovalsDir(): string {
  return path.join(os.homedir(), ".openclaw", "antfarm", "approvals");
}

/**
 * Get the file path for an approval request
 */
function getApprovalPath(approvalId: string): string {
  return path.join(getApprovalsDir(), `${approvalId}.json`);
}

/**
 * Ensure the approvals directory exists
 */
async function ensureApprovalsDir(): Promise<void> {
  const dir = getApprovalsDir();
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Queue a new approval request
 */
export async function queueApproval(
  request: Omit<ApprovalRequest, "id" | "status" | "requestedAt">
): Promise<string> {
  await ensureApprovalsDir();

  const approvalId = randomUUID();
  const now = new Date().toISOString();

  const approvalRequest: ApprovalRequest = {
    id: approvalId,
    status: "pending",
    requestedAt: now,
    ...request,
  };

  const filePath = getApprovalPath(approvalId);
  await fs.writeFile(filePath, JSON.stringify(approvalRequest, null, 2), "utf-8");

  return approvalId;
}

/**
 * Get the status of an approval request
 */
export async function getApprovalStatus(
  approvalId: string
): Promise<ApprovalRequest | null> {
  try {
    const filePath = getApprovalPath(approvalId);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as ApprovalRequest;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return null; // Approval not found
    }
    throw error;
  }
}

/**
 * List all pending approval requests, optionally filtered by runId
 */
export async function listPendingApprovals(
  runId?: string
): Promise<ApprovalRequest[]> {
  try {
    await ensureApprovalsDir();
    const dir = getApprovalsDir();
    const files = await fs.readdir(dir);

    const approvals: ApprovalRequest[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      try {
        const filePath = path.join(dir, file);
        const content = await fs.readFile(filePath, "utf-8");
        const approval = JSON.parse(content) as ApprovalRequest;

        // Filter by status
        if (approval.status !== "pending") continue;

        // Filter by runId if provided
        if (runId && approval.runId !== runId) continue;

        approvals.push(approval);
      } catch (e) {
        // Skip malformed files
        continue;
      }
    }

    // Sort by requestedAt (oldest first)
    return approvals.sort(
      (a, b) =>
        new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()
    );
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return []; // Directory doesn't exist yet
    }
    throw error;
  }
}

/**
 * Approve an approval request
 */
export async function approveRequest(
  approvalId: string,
  resolvedBy: string,
  reason?: string
): Promise<void> {
  const approval = await getApprovalStatus(approvalId);
  if (!approval) {
    throw new Error(`Approval ${approvalId} not found`);
  }

  if (approval.status !== "pending") {
    throw new Error(`Approval ${approvalId} is already ${approval.status}`);
  }

  approval.status = "approved";
  approval.resolvedAt = new Date().toISOString();
  approval.resolvedBy = resolvedBy;
  if (reason) {
    approval.reason = reason;
  }

  const filePath = getApprovalPath(approvalId);
  await fs.writeFile(filePath, JSON.stringify(approval, null, 2), "utf-8");
}

/**
 * Reject an approval request
 */
export async function rejectRequest(
  approvalId: string,
  resolvedBy: string,
  reason?: string
): Promise<void> {
  const approval = await getApprovalStatus(approvalId);
  if (!approval) {
    throw new Error(`Approval ${approvalId} not found`);
  }

  if (approval.status !== "pending") {
    throw new Error(`Approval ${approvalId} is already ${approval.status}`);
  }

  approval.status = "rejected";
  approval.resolvedAt = new Date().toISOString();
  approval.resolvedBy = resolvedBy;
  if (reason) {
    approval.reason = reason;
  }

  const filePath = getApprovalPath(approvalId);
  await fs.writeFile(filePath, JSON.stringify(approval, null, 2), "utf-8");
}
