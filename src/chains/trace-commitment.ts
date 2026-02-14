/**
 * On-chain trace commitment — hashes workflow run traces and submits
 * the SHA-256 digest to a Solidity contract on Monad testnet.
 *
 * This is AgentHub's "settles on Monad" differentiator: every workflow
 * execution is hashed and anchored on-chain for tamper-proof auditability.
 */

import crypto from "node:crypto";
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  keccak256,
  toHex,
  toBytes,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "./monad.js";
import { getDb } from "../db.js";
import { queryTraces } from "../lib/tracer.js";
import { logger } from "../lib/logger.js";

// ABI for TraceCommitment contract (only the functions we call)
export const TRACE_COMMITMENT_ABI = [
  {
    name: "commitTrace",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "runId", type: "bytes32" },
      { name: "traceHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "verifyTrace",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "runId", type: "bytes32" },
      { name: "traceHash", type: "bytes32" },
    ],
    outputs: [{ name: "valid", type: "bool" }],
  },
  {
    name: "getCommitment",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "runId", type: "bytes32" }],
    outputs: [
      { name: "traceHash", type: "bytes32" },
      { name: "committer", type: "address" },
      { name: "timestamp", type: "uint256" },
      { name: "blockNumber", type: "uint256" },
    ],
  },
  {
    name: "totalCommitments",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "TraceCommitted",
    type: "event",
    inputs: [
      { name: "runId", type: "bytes32", indexed: true },
      { name: "traceHash", type: "bytes32", indexed: false },
      { name: "committer", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

/**
 * Get the deployed TraceCommitment contract address from env.
 * Falls back to a default testnet deployment address.
 */
function getContractAddress(): Address {
  const addr = process.env.TRACE_COMMITMENT_ADDRESS;
  if (addr) return addr as Address;
  // Default: deployed on Monad testnet
  return "0x0000000000000000000000000000000000000000" as Address;
}

/**
 * Hash all execution traces for a run into a single SHA-256 digest.
 *
 * The traces are sorted by timestamp to ensure deterministic ordering,
 * then serialized as a JSON array and hashed.
 */
export async function hashRunTraces(runId: string): Promise<{
  hash: `0x${string}`;
  traceCount: number;
}> {
  const traces = await queryTraces(runId);

  if (traces.length === 0) {
    throw new Error(`No traces found for run ${runId}`);
  }

  // Sort by timestamp for deterministic ordering
  traces.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Serialize to canonical JSON (sorted keys)
  const canonical = JSON.stringify(
    traces.map((t) => ({
      id: t.id,
      runId: t.runId,
      stepId: t.stepId,
      agentId: t.agentId,
      traceType: t.traceType,
      timestamp: t.timestamp,
      durationMs: t.durationMs,
      inputTokens: t.inputTokens,
      outputTokens: t.outputTokens,
      model: t.model,
      data: t.data,
    }))
  );

  // SHA-256 hash
  const hash = crypto.createHash("sha256").update(canonical).digest("hex");

  return {
    hash: `0x${hash}` as `0x${string}`,
    traceCount: traces.length,
  };
}

/**
 * Convert a run UUID string to a bytes32 value for the contract.
 * Uses keccak256 of the string since UUIDs don't fit in bytes32 directly.
 */
export function runIdToBytes32(runId: string): `0x${string}` {
  return keccak256(toBytes(runId));
}

/**
 * Submit a trace hash to the TraceCommitment contract on Monad testnet.
 *
 * Returns the transaction hash or null if submission is skipped
 * (no private key configured, contract not deployed, etc.)
 */
export async function commitTraceOnChain(
  runId: string,
  traceHash: `0x${string}`
): Promise<{
  txHash: Hash;
  contractAddress: Address;
  explorerUrl: string;
} | null> {
  const privateKey = process.env.MONAD_PRIVATE_KEY as
    | `0x${string}`
    | undefined;
  if (!privateKey) {
    logger.warn("MONAD_PRIVATE_KEY not set — skipping on-chain trace commitment", { runId });
    return null;
  }

  const contractAddress = getContractAddress();
  if (contractAddress === "0x0000000000000000000000000000000000000000") {
    logger.warn("TRACE_COMMITMENT_ADDRESS not set — skipping on-chain trace commitment", { runId });
    return null;
  }

  const account = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });

  const runIdBytes32 = runIdToBytes32(runId);

  const data = encodeFunctionData({
    abi: TRACE_COMMITMENT_ABI,
    functionName: "commitTrace",
    args: [runIdBytes32, traceHash as `0x${string}`],
  });

  // Submit transaction
  const txHash = await walletClient.sendTransaction({
    to: contractAddress,
    data,
    account,
  });

  // Wait for receipt (Monad finality: ~800ms)
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });

  if (receipt.status !== "success") {
    throw new Error(`Trace commitment tx reverted: ${txHash}`);
  }

  const explorerUrl = `https://explorer.testnet.monad.xyz/tx/${txHash}`;

  logger.info(`Trace committed on-chain: tx=${txHash} hash=${traceHash} block=${receipt.blockNumber}`, {
    runId,
  });

  return { txHash, contractAddress, explorerUrl };
}

/**
 * Full trace commitment pipeline:
 * 1. Hash all traces for the run
 * 2. Submit hash to Monad testnet
 * 3. Update run metadata in DB
 *
 * This is called when a run completes successfully.
 */
export async function commitRunTraces(runId: string): Promise<{
  traceHash: string;
  traceCount: number;
  txHash: string | null;
  explorerUrl: string | null;
  status: "committed" | "hash_only" | "failed";
}> {
  try {
    // Step 1: Hash traces
    const { hash, traceCount } = await hashRunTraces(runId);

    // Step 2: Try to submit on-chain
    let txHash: string | null = null;
    let explorerUrl: string | null = null;
    let status: "committed" | "hash_only" | "failed" = "hash_only";

    try {
      const result = await commitTraceOnChain(runId, hash);
      if (result) {
        txHash = result.txHash;
        explorerUrl = result.explorerUrl;
        status = "committed";
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`On-chain commitment failed — storing hash only: ${msg}`, { runId });
    }

    // Step 3: Update run metadata
    const db = getDb();
    db.prepare(
      "UPDATE runs SET trace_hash = ?, trace_tx_hash = ?, trace_committed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).run(hash, txHash, runId);

    logger.info(`Trace commitment complete: hash=${hash} count=${traceCount} status=${status}`, { runId });

    return { traceHash: hash, traceCount, txHash, explorerUrl, status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Trace commitment pipeline failed: ${msg}`, { runId });

    return {
      traceHash: "",
      traceCount: 0,
      txHash: null,
      explorerUrl: null,
      status: "failed",
    };
  }
}
