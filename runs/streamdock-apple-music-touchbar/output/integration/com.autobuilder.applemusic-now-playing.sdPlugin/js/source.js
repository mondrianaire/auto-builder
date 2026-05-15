// now-playing-source/builder-2b — Node consumer for the SMTC PowerShell sidecar

'use strict';

const path = require('path');
const readline = require('readline');

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
    try { onTrack(currentState); } catch { /* ignore */ }
    return {
      unsubscribe: () => {
        subscribers.delete(onTrack);
        if (subscribers.size === 0) stop();
      }
    };
  }

  function idleState() {
    return null;
  }

  return { subscribe, idleState, _start: start, _stop: stop };
}

module.exports = { createSource };
