import type { ThinkingLevel, ThinkingConfig } from "../installer/types.js";

export interface ModelParams {
  extendedThinking?: boolean;
  tokenBudget?: number;
  temperature?: number;
  topP?: number;
}

/**
 * Maps a ThinkingConfig to model parameters based on the thinking level.
 *
 * - low: Fast, focused responses (8K budget, temp 0.3, topP 0.9)
 * - medium: Balanced reasoning (16K budget, temp 0.5, topP 0.95)
 * - high: Deep extended thinking (32K budget, temp 0.7, topP 0.98, extendedThinking enabled)
 *
 * Config overrides: If config.extendedThinking or config.tokenBudget are provided,
 * they override the defaults from the level.
 */
export function mapThinkingLevel(
  config: ThinkingConfig,
  model?: string
): ModelParams {
  let params: ModelParams;

  switch (config.level) {
    case "low":
      params = {
        tokenBudget: 8000,
        temperature: 0.3,
        topP: 0.9,
      };
      break;
    case "medium":
      params = {
        tokenBudget: 16000,
        temperature: 0.5,
        topP: 0.95,
      };
      break;
    case "high":
      params = {
        extendedThinking: true,
        tokenBudget: 32000,
        temperature: 0.7,
        topP: 0.98,
      };
      break;
    default:
      // Fallback to medium if invalid level
      params = {
        tokenBudget: 16000,
        temperature: 0.5,
        topP: 0.95,
      };
  }

  // Override with config-specific values
  if (config.extendedThinking !== undefined) {
    params.extendedThinking = config.extendedThinking;
  }
  if (config.tokenBudget !== undefined) {
    params.tokenBudget = config.tokenBudget;
  }

  return params;
}

/**
 * Returns the default thinking configuration (medium level).
 */
export function getDefaultThinkingConfig(): ThinkingConfig {
  return {
    level: "medium",
  };
}
