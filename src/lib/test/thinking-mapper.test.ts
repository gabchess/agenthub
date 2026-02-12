import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mapThinkingLevel,
  getDefaultThinkingConfig,
} from "../thinking-mapper.js";
import type { ThinkingConfig } from "../../installer/types.js";

describe("Thinking Mapper Module", () => {
  it("mapThinkingLevel - level=low should return correct params", () => {
    const config: ThinkingConfig = { level: "low" };
    const params = mapThinkingLevel(config);

    assert.equal(params.tokenBudget, 8000);
    assert.equal(params.temperature, 0.3);
    assert.equal(params.topP, 0.9);
    assert.equal(params.extendedThinking, undefined);
  });

  it("mapThinkingLevel - level=medium should return correct params", () => {
    const config: ThinkingConfig = { level: "medium" };
    const params = mapThinkingLevel(config);

    assert.equal(params.tokenBudget, 16000);
    assert.equal(params.temperature, 0.5);
    assert.equal(params.topP, 0.95);
    assert.equal(params.extendedThinking, undefined);
  });

  it("mapThinkingLevel - level=high should enable extended thinking", () => {
    const config: ThinkingConfig = { level: "high" };
    const params = mapThinkingLevel(config);

    assert.equal(params.extendedThinking, true);
    assert.equal(params.tokenBudget, 32000);
    assert.equal(params.temperature, 0.7);
    assert.equal(params.topP, 0.98);
  });

  it("mapThinkingLevel - config.tokenBudget should override default", () => {
    const config: ThinkingConfig = {
      level: "medium",
      tokenBudget: 20000,
    };
    const params = mapThinkingLevel(config);

    assert.equal(params.tokenBudget, 20000); // Override
    assert.equal(params.temperature, 0.5); // Keep default for medium
    assert.equal(params.topP, 0.95); // Keep default for medium
  });

  it("mapThinkingLevel - config.extendedThinking should override default", () => {
    const config: ThinkingConfig = {
      level: "low",
      extendedThinking: true,
    };
    const params = mapThinkingLevel(config);

    assert.equal(params.extendedThinking, true); // Override
    assert.equal(params.tokenBudget, 8000); // Keep default for low
    assert.equal(params.temperature, 0.3); // Keep default for low
  });

  it("mapThinkingLevel - config.extendedThinking=false should override high level", () => {
    const config: ThinkingConfig = {
      level: "high",
      extendedThinking: false,
    };
    const params = mapThinkingLevel(config);

    assert.equal(params.extendedThinking, false); // Override (disable)
    assert.equal(params.tokenBudget, 32000); // Keep high level budget
    assert.equal(params.temperature, 0.7); // Keep high level temp
  });

  it("mapThinkingLevel - both tokenBudget and extendedThinking overrides", () => {
    const config: ThinkingConfig = {
      level: "medium",
      tokenBudget: 40000,
      extendedThinking: true,
    };
    const params = mapThinkingLevel(config);

    assert.equal(params.extendedThinking, true);
    assert.equal(params.tokenBudget, 40000);
    assert.equal(params.temperature, 0.5);
    assert.equal(params.topP, 0.95);
  });

  it("mapThinkingLevel - invalid level should fallback to medium", () => {
    const config: ThinkingConfig = { level: "invalid" as any };
    const params = mapThinkingLevel(config);

    // Should use medium defaults
    assert.equal(params.tokenBudget, 16000);
    assert.equal(params.temperature, 0.5);
    assert.equal(params.topP, 0.95);
    assert.equal(params.extendedThinking, undefined);
  });

  it("getDefaultThinkingConfig - should return medium level", () => {
    const config = getDefaultThinkingConfig();

    assert.equal(config.level, "medium");
  });

  it("mapThinkingLevel - should accept optional model parameter", () => {
    const config: ThinkingConfig = { level: "high" };
    const params = mapThinkingLevel(config, "claude-opus-4-6");

    // Model parameter doesn't affect output in current implementation
    assert.equal(params.extendedThinking, true);
    assert.equal(params.tokenBudget, 32000);
  });

  it("mapThinkingLevel - zero tokenBudget should be respected", () => {
    const config: ThinkingConfig = {
      level: "medium",
      tokenBudget: 0,
    };
    const params = mapThinkingLevel(config);

    assert.equal(params.tokenBudget, 0); // Should override with 0
  });

  it("mapThinkingLevel - all levels should have valid topP values", () => {
    const levels: Array<"low" | "medium" | "high"> = ["low", "medium", "high"];

    for (const level of levels) {
      const config: ThinkingConfig = { level };
      const params = mapThinkingLevel(config);

      assert.ok(params.topP !== undefined, `${level} should have topP`);
      assert.ok(
        params.topP! >= 0 && params.topP! <= 1,
        `${level} topP should be in [0, 1]`
      );
    }
  });

  it("mapThinkingLevel - all levels should have valid temperature values", () => {
    const levels: Array<"low" | "medium" | "high"> = ["low", "medium", "high"];

    for (const level of levels) {
      const config: ThinkingConfig = { level };
      const params = mapThinkingLevel(config);

      assert.ok(
        params.temperature !== undefined,
        `${level} should have temperature`
      );
      assert.ok(
        params.temperature! >= 0 && params.temperature! <= 1,
        `${level} temperature should be in [0, 1]`
      );
    }
  });

  it("mapThinkingLevel - temperature progression low < medium < high", () => {
    const low = mapThinkingLevel({ level: "low" });
    const medium = mapThinkingLevel({ level: "medium" });
    const high = mapThinkingLevel({ level: "high" });

    assert.ok(low.temperature! < medium.temperature!);
    assert.ok(medium.temperature! < high.temperature!);
  });

  it("mapThinkingLevel - tokenBudget progression low < medium < high", () => {
    const low = mapThinkingLevel({ level: "low" });
    const medium = mapThinkingLevel({ level: "medium" });
    const high = mapThinkingLevel({ level: "high" });

    assert.ok(low.tokenBudget! < medium.tokenBudget!);
    assert.ok(medium.tokenBudget! < high.tokenBudget!);
  });
});
