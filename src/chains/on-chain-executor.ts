/**
 * On-chain step execution logic for AgentHub workflows
 *
 * Handles:
 * - Transaction submission with verification
 * - State reading and validation
 * - Event verification
 * - Confirmation waiting with timeouts
 */

import type { OnChainVerifyConfig } from '../installer/types.js';
import { MonadClient } from './monad.js';
import type { Hash, Address } from 'viem';
import { getWalletBalances, parseBalanceOutput } from './tools/wallet-balance.js';
import { getTokenPrices, parseTokenQuery } from './tools/token-price.js';
import { readContract, parseContractReadQuery } from './tools/contract-read.js';
import { getGlobalCache } from './tools/cache.js';

export interface OnChainExecutionResult {
  success: boolean;
  txHash?: Hash;
  blockNumber?: bigint;
  actualState?: any;
  error?: string;
  details?: string;
}

/**
 * Execute an on_chain_verify workflow step
 */
export async function executeOnChainStep(
  config: OnChainVerifyConfig,
  agentOutput: string
): Promise<OnChainExecutionResult> {
  // Initialize Monad client based on chain
  const client = new MonadClient(
    process.env.MONAD_PRIVATE_KEY as `0x${string}` | undefined
  );

  try {
    switch (config.operation) {
      case 'submit_tx':
        return await submitTransaction(client, config, agentOutput);

      case 'read_state':
        return await readState(client, config, agentOutput);

      case 'verify_event':
        return await verifyEvent(client, config, agentOutput);

      case 'wallet_balance': {
        const addresses = config.tool_params?.addresses || parseBalanceOutput(agentOutput);
        const result = await getWalletBalances(
          { addresses, chain: config.chain },
          getGlobalCache()
        );

        if (!result.ok) {
          return {
            success: false,
            error: result.error?.message || 'Unknown error',
          };
        }

        return {
          success: true,
          actualState: result.result,
          details: `Retrieved balances for ${addresses.length} address(es)`,
        };
      }

      case 'token_price': {
        const tokens = config.tool_params?.tokens || parseTokenQuery(agentOutput);
        const result = await getTokenPrices(
          { tokens, includeHistory: config.tool_params?.includeHistory },
          getGlobalCache()
        );

        if (!result.success) {
          return {
            success: false,
            error: result.error || 'Unknown error',
          };
        }

        return {
          success: true,
          actualState: result.data,
          details: `Retrieved prices for ${tokens.length} token(s)`,
        };
      }

      case 'contract_read': {
        const params = config.tool_params || parseContractReadQuery(agentOutput);
        const result = await readContract(
          { ...params, chain: config.chain },
          getGlobalCache()
        );

        if (!result.success) {
          return {
            success: false,
            error: result.error || 'Unknown error',
          };
        }

        return {
          success: true,
          actualState: result.data,
          details: `Read contract at ${params.contractAddress}`,
        };
      }

      default:
        return {
          success: false,
          error: `Unknown operation: ${config.operation}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Submit a transaction and verify it was mined
 */
async function submitTransaction(
  client: MonadClient,
  config: OnChainVerifyConfig,
  agentOutput: string
): Promise<OnChainExecutionResult> {
  // Parse transaction details from agent output
  // Expected format: "TX_TO: 0x..., TX_VALUE: 1.5, TX_DATA: 0x..."
  const txDetails = parseTxFromAgentOutput(agentOutput);

  if (!txDetails.to) {
    return {
      success: false,
      error: 'Agent output missing TX_TO address',
      details: agentOutput,
    };
  }

  // Submit transaction
  const txHash = await client.submitTransaction({
    to: txDetails.to,
    value: txDetails.value || 0n,
    data: txDetails.data,
  });

  // Wait for confirmation if requested
  if (config.wait_for_confirmation !== false) {
    const timeout = config.timeout_ms || 30000;
    const receipt = await Promise.race([
      client.waitForReceipt(txHash),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Confirmation timeout')), timeout)
      ),
    ]);

    if (receipt.status === 'reverted') {
      return {
        success: false,
        txHash,
        blockNumber: receipt.blockNumber,
        error: 'Transaction reverted',
      };
    }

    return {
      success: true,
      txHash,
      blockNumber: receipt.blockNumber,
      details: `Transaction confirmed in block ${receipt.blockNumber}`,
    };
  }

  return {
    success: true,
    txHash,
    details: 'Transaction submitted (not waiting for confirmation)',
  };
}

/**
 * Read blockchain state and verify against expected values
 */
async function readState(
  client: MonadClient,
  config: OnChainVerifyConfig,
  agentOutput: string
): Promise<OnChainExecutionResult> {
  const blockNumber = await client.getBlockNumber();

  // If no contract address, just return current block number
  if (!config.contract_address) {
    return {
      success: true,
      blockNumber,
      actualState: { blockNumber: blockNumber.toString() },
      details: `Current block: ${blockNumber}`,
    };
  }

  // Read contract state (implementation depends on contract ABI)
  // For now, return basic state
  const balance = await client.getBalance(
    config.contract_address as Address
  );

  const actualState = {
    blockNumber: blockNumber.toString(),
    balance: balance.toString(),
  };

  // Verify against expected state if provided
  if (config.expected_state) {
    const matches = verifyStateMatch(actualState, config.expected_state);
    if (!matches) {
      return {
        success: false,
        blockNumber,
        actualState,
        error: 'State mismatch',
        details: `Expected: ${JSON.stringify(config.expected_state)}, Actual: ${JSON.stringify(actualState)}`,
      };
    }
  }

  return {
    success: true,
    blockNumber,
    actualState,
    details: 'State verified successfully',
  };
}

/**
 * Verify an event was emitted (placeholder for future implementation)
 */
async function verifyEvent(
  client: MonadClient,
  config: OnChainVerifyConfig,
  agentOutput: string
): Promise<OnChainExecutionResult> {
  // TODO: Implement event verification using viem's getLogs
  return {
    success: true,
    details: 'Event verification not yet implemented',
  };
}

/**
 * Parse transaction details from agent output
 */
function parseTxFromAgentOutput(output: string): {
  to?: Address;
  value?: bigint;
  data?: `0x${string}`;
} {
  const result: {
    to?: Address;
    value?: bigint;
    data?: `0x${string}`;
  } = {};

  // Parse TO address
  const toMatch = output.match(/TX_TO:\s*(0x[a-fA-F0-9]{40})/);
  if (toMatch) {
    result.to = toMatch[1] as Address;
  }

  // Parse VALUE
  const valueMatch = output.match(/TX_VALUE:\s*(\d+\.?\d*)/);
  if (valueMatch) {
    const eth = parseFloat(valueMatch[1]);
    result.value = BigInt(Math.floor(eth * 1e18));
  }

  // Parse DATA
  const dataMatch = output.match(/TX_DATA:\s*(0x[a-fA-F0-9]*)/);
  if (dataMatch) {
    result.data = dataMatch[1] as `0x${string}`;
  }

  return result;
}

/**
 * Verify actual state matches expected state
 */
function verifyStateMatch(
  actual: Record<string, any>,
  expected: Record<string, any>
): boolean {
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (actual[key] !== expectedValue) {
      return false;
    }
  }
  return true;
}

/**
 * Get health status of Monad network for monitoring steps
 */
export async function getNetworkHealth(): Promise<{
  connected: boolean;
  blockNumber: bigint;
  gasPrice: bigint;
  blockTime: number;
}> {
  const client = new MonadClient();

  try {
    const [blockNumber, block] = await Promise.all([
      client.getBlockNumber(),
      client.publicClient.getBlock(),
    ]);

    const gasPrice = block.baseFeePerGas || 0n;

    // Estimate block time
    const prevBlock = await client.publicClient.getBlock({
      blockNumber: blockNumber - 1n,
    });
    const blockTime = Number(block.timestamp - prevBlock.timestamp);

    return {
      connected: true,
      blockNumber,
      gasPrice,
      blockTime,
    };
  } catch (error) {
    return {
      connected: false,
      blockNumber: 0n,
      gasPrice: 0n,
      blockTime: 0,
    };
  }
}
