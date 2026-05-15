// host-integration/builder-1b — process spawning + lifecycle utilities
//
// Per contracts/original/host-integration--now-playing-source.json this is
// the only place in the plugin that calls Node.js's child_process. The
// now-playing-source consumer asks host-integration to spawn its PowerShell
// sidecar so the source section remains testable without an actual host
// present.

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

// Contract surface: spawnSidecar(command, args)
// Returns a ChildProcess-like handle with .stdout / .stderr / .on('exit',cb)
// / .kill(). The child_process spawned with stdio piped so the consumer can
// read line-delimited JSON from .stdout (per the PowerShell sidecar protocol
// documented in section-2's charter).
function spawnSidecar(command, args, opts) {
  registerShutdownCleanup();

  // Resolve relative command paths against this file's containing plugin
  // directory so the sidecar script can be referenced by relative path.
  let resolvedCommand = command;
  let resolvedArgs = Array.isArray(args) ? args.slice() : [];

  // PowerShell-specific path resolution: callers pass 'powershell.exe' (the
  // system PowerShell present on every Windows host per probe-ip2/C.2.1).
  // We do NOT bundle PowerShell. If the caller passes a relative .ps1 path
  // in args, resolve it against process.cwd() (the host launches the plugin
  // with cwd set to the .sdPlugin directory).
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
  // For tests / introspection
  _liveChildren: () => Array.from(childProcesses)
};
