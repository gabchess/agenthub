import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import type { LoopConfig, WorkflowAgent, WorkflowSpec, WorkflowStep } from "./types.js";

export async function loadWorkflowSpec(workflowDir: string): Promise<WorkflowSpec> {
  const filePath = path.join(workflowDir, "workflow.yml");
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = YAML.parse(raw) as WorkflowSpec;
  if (!parsed?.id) {
    throw new Error(`workflow.yml missing id in ${workflowDir}`);
  }
  if (!Array.isArray(parsed.agents) || parsed.agents.length === 0) {
    throw new Error(`workflow.yml missing agents list in ${workflowDir}`);
  }
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error(`workflow.yml missing steps list in ${workflowDir}`);
  }
  validateAgents(parsed.agents, workflowDir);
  // Parse type/loop/on_chain from raw YAML before validation
  for (const step of parsed.steps) {
    const rawStep = step as any;
    if (rawStep.type) {
      step.type = rawStep.type;
    }
    if (rawStep.loop) {
      step.loop = parseLoopConfig(rawStep.loop);
    }
    if (rawStep.on_chain) {
      step.on_chain = parseOnChainConfig(rawStep.on_chain);
    }
  }
  validateSteps(parsed.steps, workflowDir);
  return parsed;
}

function validateAgents(agents: WorkflowAgent[], workflowDir: string) {
  const ids = new Set<string>();
  for (const agent of agents) {
    if (!agent.id?.trim()) {
      throw new Error(`workflow.yml missing agent id in ${workflowDir}`);
    }
    if (ids.has(agent.id)) {
      throw new Error(`workflow.yml has duplicate agent id "${agent.id}" in ${workflowDir}`);
    }
    ids.add(agent.id);
    if (!agent.workspace?.baseDir?.trim()) {
      throw new Error(`workflow.yml missing workspace.baseDir for agent "${agent.id}"`);
    }
    if (!agent.workspace?.files || Object.keys(agent.workspace.files).length === 0) {
      throw new Error(`workflow.yml missing workspace.files for agent "${agent.id}"`);
    }
    if (agent.workspace.skills && !Array.isArray(agent.workspace.skills)) {
      throw new Error(`workflow.yml workspace.skills must be a list for agent "${agent.id}"`);
    }
    if (agent.timeoutSeconds !== undefined && agent.timeoutSeconds <= 0) {
      throw new Error(`workflow.yml agent "${agent.id}" timeoutSeconds must be positive`);
    }
  }
}

function parseLoopConfig(raw: any): LoopConfig {
  return {
    over: raw.over,
    completion: raw.completion,
    freshSession: raw.fresh_session ?? raw.freshSession,
    verifyEach: raw.verify_each ?? raw.verifyEach,
    verifyStep: raw.verify_step ?? raw.verifyStep,
  };
}

function parseOnChainConfig(raw: any) {
  return {
    chain: raw.chain,
    operation: raw.operation,
    contract_address: raw.contract_address,
    expected_state: raw.expected_state,
    wait_for_confirmation: raw.wait_for_confirmation ?? true,
    timeout_ms: raw.timeout_ms ?? 30000,
  };
}

function validateSteps(steps: WorkflowStep[], workflowDir: string) {
  const ids = new Set<string>();
  for (const step of steps) {
    if (!step.id?.trim()) {
      throw new Error(`workflow.yml missing step id in ${workflowDir}`);
    }
    if (ids.has(step.id)) {
      throw new Error(`workflow.yml has duplicate step id "${step.id}" in ${workflowDir}`);
    }
    ids.add(step.id);
    if (!step.agent?.trim()) {
      throw new Error(`workflow.yml missing step.agent for step "${step.id}"`);
    }
    if (!step.input?.trim()) {
      throw new Error(`workflow.yml missing step.input for step "${step.id}"`);
    }
    if (!step.expects?.trim()) {
      throw new Error(`workflow.yml missing step.expects for step "${step.id}"`);
    }
  }

  // Validate loop config references
  for (const step of steps) {
    if (step.type === "loop") {
      if (!step.loop) {
        throw new Error(`workflow.yml step "${step.id}" has type=loop but no loop config`);
      }
      if (step.loop.over !== "stories") {
        throw new Error(`workflow.yml step "${step.id}" loop.over must be "stories"`);
      }
      if (step.loop.completion !== "all_done") {
        throw new Error(`workflow.yml step "${step.id}" loop.completion must be "all_done"`);
      }
      if (step.loop.verifyEach && step.loop.verifyStep) {
        if (!ids.has(step.loop.verifyStep)) {
          throw new Error(`workflow.yml step "${step.id}" loop.verify_step references unknown step "${step.loop.verifyStep}"`);
        }
      }
    }

    // Validate on_chain_verify config
    if (step.type === "on_chain_verify") {
      if (!step.on_chain) {
        throw new Error(`workflow.yml step "${step.id}" has type=on_chain_verify but no on_chain config`);
      }
      if (!step.on_chain.chain) {
        throw new Error(`workflow.yml step "${step.id}" on_chain.chain is required`);
      }
      if (!["monad-testnet", "monad-mainnet"].includes(step.on_chain.chain)) {
        throw new Error(`workflow.yml step "${step.id}" on_chain.chain must be "monad-testnet" or "monad-mainnet"`);
      }
      if (!step.on_chain.operation) {
        throw new Error(`workflow.yml step "${step.id}" on_chain.operation is required`);
      }
      if (!["submit_tx", "read_state", "verify_event"].includes(step.on_chain.operation)) {
        throw new Error(`workflow.yml step "${step.id}" on_chain.operation must be "submit_tx", "read_state", or "verify_event"`);
      }
    }
  }
}
