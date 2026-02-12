/**
 * Pipeline daemon entry point.
 *
 * Standalone process with PID file management and signal handling.
 * Usage: node dist/pipeline/daemon.js
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PipelineOrchestrator } from './orchestrator.js';
import { logger } from '../lib/logger.js';

const PID_DIR = path.join(os.homedir(), '.openclaw', 'antfarm');
const PID_FILE = path.join(PID_DIR, 'pipeline.pid');

function writePidFile(): void {
  fs.mkdirSync(PID_DIR, { recursive: true });
  fs.writeFileSync(PID_FILE, process.pid.toString(), 'utf-8');
}

function removePidFile(): void {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    // File may not exist
  }
}

function isAlreadyRunning(): boolean {
  try {
    if (!fs.existsSync(PID_FILE)) return false;
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
    // Check if process is alive
    process.kill(pid, 0);
    return true;
  } catch {
    // Process not alive — stale PID file
    removePidFile();
    return false;
  }
}

export function startPipelineDaemon(): PipelineOrchestrator {
  if (isAlreadyRunning()) {
    console.error('[pipeline] daemon is already running');
    process.exit(1);
  }

  writePidFile();

  const orchestrator = new PipelineOrchestrator();

  // Signal handling for graceful shutdown
  const shutdown = () => {
    logger.info('[pipeline] daemon received shutdown signal');
    orchestrator.stop();
    removePidFile();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  process.on('uncaughtException', (error) => {
    logger.error(`[pipeline] uncaught exception: ${error.message}`);
    orchestrator.stop();
    removePidFile();
    process.exit(1);
  });

  orchestrator.start();
  console.log(`[pipeline] daemon started (PID: ${process.pid})`);

  return orchestrator;
}

// Run as standalone process
const isMainModule = process.argv[1]?.endsWith('daemon.js');
if (isMainModule) {
  startPipelineDaemon();
}
