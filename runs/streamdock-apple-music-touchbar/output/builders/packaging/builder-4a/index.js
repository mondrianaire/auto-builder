// index.js — Plugin entry point loaded by the Stream Dock host's built-in
// Node.js 20 runtime (manifest.Nodejs.Version = "20"; host >= 3.10.188.226
// per probe-ip1/C.1.3 manifest doc).
//
// Wires the three sections together:
//   1) host-integration connects to the host's WebSocket and registers.
//   2) now-playing-source spawns the PowerShell SMTC sidecar via the host's
//      spawnSidecar surface.
//   3) touchbar-renderer subscribes the source to the host's drawText.

'use strict';

const host = require('./js/host.js');
const procUtils = require('./js/process-utils.js');
const { createSource } = require('./js/source.js');
const renderer = require('./js/renderer.js');

// Attach process-utils' spawnSidecar to the host singleton so the source
// section can reach it via the contracted single object.
host.spawnSidecar = procUtils.spawnSidecar;

async function main() {
  try {
    await host.connect(process.argv);
    host.log('info', 'Stream Dock host connected; plugin registered.');
  } catch (err) {
    process.stderr.write('Fatal: host connection failed: ' + err.message + '\n');
    process.exit(1);
  }

  const source = createSource(host);

  // The renderer starts inside the host's onStartup hook so the WebSocket is
  // ready to receive drawText messages before any track event fires.
  host.onStartup(async () => {
    renderer.start(host, source);
    host.log('info', 'Renderer started; subscribed to now-playing source.');
  });

  host.onShutdown(async () => {
    host.log('info', 'Plugin shutting down.');
  });

  // The host's onStartup hook fires immediately after connect() resolves
  // because we register before connect's resolve callback completes; if
  // for any reason the hook was missed, kick the renderer manually.
  setImmediate(() => {
    try { renderer.start(host, source); } catch { /* idempotent if already started */ }
  });
}

main().catch(err => {
  process.stderr.write('Unhandled in main(): ' + err.message + '\n');
  process.exit(1);
});
