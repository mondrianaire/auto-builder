// host-integration/builder-1b — process spawning + lifecycle utilities

'use strict';

const { spawn } = require('child_process');
const path = require('path');

const childProcesses = new Set();
let shutdownRegistered = false;

function registerShutdownCleanup() {
  if (shutdownRegistered) return;
  shutdownRegistered = true;
  const cleanup = () => {
    for (const p of childProcesses) {
      try { p.kill(); } catch { /* ignore */ }
    }
    childProcesses.clear();
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
}

function spawnSidecar(command, args, opts) {
  registerShutdownCleanup();

  let resolvedCommand = command;
  let resolvedArgs = Array.isArray(args) ? args.slice() : [];

  resolvedArgs = resolvedArgs.map(a => {
    if (typeof a === 'string' && a.endsWith('.ps1') && !path.isAbsolute(a)) {
      return path.resolve(process.cwd(), a);
    }
    return a;
  });

  const child = spawn(resolvedCommand, resolvedArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    ...(opts || {})
  });

  childProcesses.add(child);
  child.on('exit', () => childProcesses.delete(child));
  child.on('error', () => childProcesses.delete(child));

  return child;
}

module.exports = {
  spawnSidecar,
  _liveChildren: () => Array.from(childProcesses)
};
