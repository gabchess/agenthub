/**
 * x402 Payment Tool
 *
 * Enables agents to pay for x402-enabled APIs using USDC on Base.
 * Uses the x402-fetch library to handle HTTP 402 payment flows automatically.
 * Follows the wallet-balance.ts pattern (direct ToolResult<T> return).
 */

import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { wrapFetchWithPayment } from 'x402-fetch';
import type { ToolResult } from '../types.js';
import { CacheManager } from './cache.js';
import { checkSpendingLimit } from '../../installer/guardrails.js';
import crypto from 'node:crypto';

/**
 * Parameters for x402 payment requests
 */
export interface X402PayParams {
  /** Target URL (may return HTTP 402) */
  url: string;
  /** HTTP method (defaults to GET) */
  method?: 'GET' | 'POST' | 'PUT';
  /** Optional request headers */
  headers?: Record<string, string>;
  /** Optional request body */
  body?: string;
  /** Maximum USDC willing to pay (e.g. "0.01") */
  maxPaymentUsd?: string;
  /** Agent ID for guardrail spending checks */
  agentId?: string;
  /** Run ID for spending tracking */
  runId?: string;
}

/**
 * Result of an x402 payment request
 */
export interface X402PayResult {
  /** HTTP status of the final response */
  status: number;
  /** Response body */
  body: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Whether a 402 payment was made */
  paymentMade: boolean;
  /** Payment details (present only if paymentMade is true) */
  payment?: {
    /** Amount paid in USDC */
    amountUsd: string;
    /** Recipient address */
    payTo: string;
    /** Network used ("base" or "base-sepolia") */
    network: string;
    /** Asset used for payment */
    asset: string;
  };
}

/**
 * Makes an HTTP request that can automatically handle x402 payment challenges.
 *
 * Flow:
 * 1. Validates input (url required)
 * 2. Checks for wallet private key
 * 3. Probes URL with native fetch to detect 402
 * 4. If not 402, returns response directly
 * 5. If 402, parses payment requirements and checks caps/guardrails
 * 6. Uses x402-fetch to retry with signed USDC payment
 * 7. Records wallet.tx trace for dashboard visibility
 *
 * @param params - Request parameters including URL and optional payment caps
 * @param cache - Cache manager (unused for x402 — payments are never cached)
 * @returns Promise resolving to ToolResult with response data or error
 */
export async function x402Pay(
  params: X402PayParams,
  cache?: CacheManager
): Promise<ToolResult<X402PayResult>> {
  const timestamp = new Date().toISOString();

  // 1. Validate: url is required
  if (!params.url) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'URL is required for x402 payment requests',
        details: { params },
      },
      timestamp,
    };
  }

  // 2. Check wallet: need a private key for signing payments
  const privateKey = process.env.X402_PRIVATE_KEY || process.env.MONAD_PRIVATE_KEY;
  if (!privateKey) {
    return {
      ok: false,
      error: {
        code: 'NO_WALLET',
        message: 'No wallet configured. Set X402_PRIVATE_KEY or MONAD_PRIVATE_KEY environment variable.',
      },
      timestamp,
    };
  }

  const networkEnv = process.env.X402_NETWORK || 'base-sepolia';
  const chain = networkEnv === 'base' ? base : baseSepolia;
  const networkName = networkEnv === 'base' ? 'base' : 'base-sepolia';

  try {
    // 3. Probe: native fetch to detect 402 vs direct response
    const probeResponse = await fetch(params.url, {
      method: params.method || 'GET',
      headers: params.headers,
      body: params.body,
    });

    // 4. If not 402: return response directly
    if (probeResponse.status !== 402) {
      const responseBody = await probeResponse.text();
      const responseHeaders: Record<string, string> = {};
      probeResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        ok: true,
        result: {
          status: probeResponse.status,
          body: responseBody,
          headers: responseHeaders,
          paymentMade: false,
        },
        timestamp,
      };
    }

    // 5. Parse 402 payment requirements from headers
    const paymentHeader = probeResponse.headers.get('x-payment') ||
      probeResponse.headers.get('payment-required') || '';
    let paymentAmount = '0';
    let payTo = '';

    try {
      const paymentInfo = JSON.parse(paymentHeader || '{}');
      paymentAmount = paymentInfo.maxAmountRequired || paymentInfo.amount || '0';
      payTo = paymentInfo.payTo || paymentInfo.address || '';
    } catch {
      // Try header-based parsing as fallback
      const amountMatch = paymentHeader.match(/amount[=:]\s*"?(\d+\.?\d*)"?/i);
      const toMatch = paymentHeader.match(/(?:payTo|address)[=:]\s*"?(0x[a-fA-F0-9]{40})"?/i);
      if (amountMatch) paymentAmount = amountMatch[1];
      if (toMatch) payTo = toMatch[1];
    }

    // 6. Cap check: if maxPaymentUsd is set and amount exceeds it
    if (params.maxPaymentUsd && parseFloat(paymentAmount) > parseFloat(params.maxPaymentUsd)) {
      return {
        ok: false,
        error: {
          code: 'PAYMENT_TOO_EXPENSIVE',
          message: `Payment of $${paymentAmount} USDC exceeds maximum of $${params.maxPaymentUsd}`,
          details: { paymentAmount, maxPaymentUsd: params.maxPaymentUsd, payTo },
        },
        timestamp,
      };
    }

    // 7. Guardrails: check spending limit if agentId and runId provided
    if (params.agentId && params.runId) {
      const spendCheck = await checkSpendingLimit(
        params.agentId,
        params.runId,
        parseFloat(paymentAmount)
      );

      if (!spendCheck.allowed) {
        return {
          ok: false,
          error: {
            code: 'SPENDING_LIMIT_EXCEEDED',
            message: spendCheck.reason || 'Spending limit exceeded',
            details: {
              paymentAmount,
              currentSpend: spendCheck.currentSpend,
              requiresApproval: spendCheck.requiresApproval,
            },
          },
          timestamp,
        };
      }
    }

    // 8. Pay: create wallet client and use x402-fetch
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(),
    });

    const paidFetch = wrapFetchWithPayment(fetch, walletClient);

    const paidResponse = await paidFetch(params.url, {
      method: params.method || 'GET',
      headers: params.headers,
      body: params.body,
    });

    const responseBody = await paidResponse.text();
    const responseHeaders: Record<string, string> = {};
    paidResponse.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // 9. Trace: the caller (invokeChainTool) records tool.call/tool.result
    // traces. The wallet.tx trace data is embedded in the result for
    // downstream consumers to record if needed.

    // 10. Return success with payment details
    return {
      ok: true,
      result: {
        status: paidResponse.status,
        body: responseBody,
        headers: responseHeaders,
        paymentMade: true,
        payment: {
          amountUsd: paymentAmount,
          payTo,
          network: networkName,
          asset: 'USDC',
        },
      },
      timestamp,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? { stack: error.stack } : { error };

    return {
      ok: false,
      error: {
        code: 'X402_PAYMENT_FAILED',
        message: `x402 payment request failed: ${errorMessage}`,
        details: errorDetails,
      },
      timestamp,
    };
  }
}

/**
 * Parses agent output to extract x402 payment requests.
 *
 * Matches patterns like:
 * - "X402_FETCH: https://api.example.com/data MAX: 0.05"
 * - "PAY_FETCH: https://api.example.com/data"
 *
 * @param output - Text output from an AI agent
 * @returns Array of partial X402PayParams extracted from the output
 */
export function parseX402PayOutput(output: string): Partial<X402PayParams>[] {
  const pattern = /(?:X402_FETCH|PAY_FETCH):\s*(https?:\/\/\S+)(?:\s+MAX:\s*(\d+\.?\d*))?/gi;
  const results: Partial<X402PayParams>[] = [];
  let match;

  while ((match = pattern.exec(output)) !== null) {
    const params: Partial<X402PayParams> = {
      url: match[1],
    };
    if (match[2]) {
      params.maxPaymentUsd = match[2];
    }
    results.push(params);
  }

  return results;
}
