// now-playing-source/builder-2b — Node consumer for the SMTC PowerShell sidecar
//
// Implements contracts/original/now-playing-source--touchbar-renderer.json:
//   - subscribe(onTrack) returns { unsubscribe }
//   - onTrack is called immediately with current state (or null if unknown)
//     and again on every change
//   - TrackState fields: title, artist, isPlaying, sourceAppId
//   - 150ms debounce per contract notes
//   - Filter is delegated to smtc-reader.ps1 (AppleMusic substring)
//
// Uses host.spawnSidecar (host-integration--now-playing-source contract) so
// this section does NOT call child_process directly.

'use strict';

const path = require('path');
const readline = require('readline');

// Resolve the sidecar script path against the plugin root.
function resolveSidecarScript() {
  // Production layout: {plugin-root}/sidecar/smtc-reader.ps1
  return path.resolve(__dirname, '..', 'sidecar', 'smtc-reader.ps1');
}

function createSource(host) {
  if (!host || typeof host.spawnSidecar !== 'function') {
    throw new Error('now-playing-source: host must provide spawnSidecar() per contract');
  }

  const subscribers = new Set();
  let currentState = null;
  let child = null;
  let debounceTimer = null;
  let pendingState = null;

  function emit(state) {
    currentState = state;
    for (const cb of subscribers) {
      try { cb(state); } catch (err) {
        if (host.log) host.log('warn', 'subscriber threw: ' + err.message);
      }
    }
  }

  function scheduleEmit(state) {
    pendingState = state;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      emit(pendingState);
    }, 150);
  }

  function parseLine(line) {
    if (!line || !line.trim()) return;
    let obj;
    try { obj = JSON.parse(line); } catch {
      if (host.log) host.log('warn', 'sidecar emitted non-JSON line: ' + line);
      return;
    }
    if (obj.fatal) {
      if (host.log) host.log('error', 'sidecar fatal: ' + obj.fatal);
      scheduleEmit(null);
      return;
    }
    if (obj.track === null || obj.track === undefined) {
      // Two shapes: {track:null} explicit idle, or our regular shape with
      // empty fields. Treat both as idle (null).
      if (!('title' in obj)) { scheduleEmit(null); return; }
    }
    const title = typeof obj.title === 'string' ? obj.title.trim() : '';
    const artist = typeof obj.artist === 'string' ? obj.artist.trim() : '';
    if (!title && !artist) { scheduleEmit(null); return; }
    scheduleEmit({
      title: title,
      artist: artist,
      isPlaying: !!obj.isPlaying,
      sourceAppId: typeof obj.sourceAppId === 'string' ? obj.sourceAppId : ''
    });
  }

  function start() {
    if (child) return;
    // PowerShell command line — -NoLogo -NoProfile for clean stdout; -File
    // points at the sidecar script. -ExecutionPolicy Bypass is required
    // because end users may have a default Restricted policy; we are running
    // a script bundled inside the plugin, not an arbitrary user-supplied one.
    const args = [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-File', resolveSidecarScript()
    ];
    child = host.spawnSidecar('powershell.exe', args);

    if (!child || !child.stdout) {
      if (host.log) host.log('error', 'spawnSidecar returned no stdout pipe');
      scheduleEmit(null);
      return;
    }

    const rl = readline.createInterface({ input: child.stdout });
    rl.on('line', parseLine);

    if (child.stderr) {
      child.stderr.on('data', d => {
        if (host.log) host.log('warn', 'sidecar stderr: ' + d.toString().trim());
      });
    }

    child.on('exit', (code, signal) => {
      if (host.log) host.log('info', 'sidecar exited code=' + code + ' signal=' + signal);
      child = null;
      // Don't auto-restart aggressively; the host owns plugin lifecycle (A8).
      // If the host re-enables the action, willAppear → renderer → subscribe
      // → start() will recreate the sidecar.
      scheduleEmit(null);
    });
  }

  function stop() {
    if (child) {
      try { child.kill(); } catch { /* ignore */ }
      child = null;
    }
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  }

  function subscribe(onTrack) {
    if (typeof onTrack !== 'function') {
      throw new TypeError('subscribe(onTrack): onTrack must be a function');
    }
    subscribers.add(onTrack);
    if (subscribers.size === 1) {
      start();
    }
    // Call immediately with current known state (contract: 'called immediately
    // with the current state (or null if unknown)').
    try { onTrack(currentState); } catch { /* ignore */ }
    return {
      unsubscribe: () => {
        subscribers.delete(onTrack);
        if (subscribers.size === 0) stop();
      }
    };
  }

  function idleState() {
    // Per contract: MUST return null when Apple Music is closed.
    return null;
  }

  return { subscribe, idleState, _start: start, _stop: stop };
}

module.exports = { createSource };
