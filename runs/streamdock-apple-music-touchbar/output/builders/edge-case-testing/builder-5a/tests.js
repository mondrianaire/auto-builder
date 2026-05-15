// edge-case-testing/builder-5a — tests for verifier:edge_case_testing assertions
//
// Per sections-v1.json §section-5 charter: production-fidelity environment;
// no substitution of runtime dependencies the artifact loads in production.
// For assertions whose production-fidelity environment is the user's hardware
// (Stream Dock host application, VSD N4 Pro device, Apple Music Desktop
// Application on Windows), this file records 'unverifiable_without_hardware'
// rather than running a hand-rolled stub. See report.json for results.
//
// The renderer-only assertions (S3.A1, S3.A2, S3.A3) ARE exercised here
// because the renderer is pure JavaScript with a single dependency on a
// host.drawText surface and a source.subscribe surface — both of which can
// be exercised by passing in a fake-host and fake-source that match the
// contract exactly. These are NOT substitutions of runtime dependencies
// (the renderer doesn't load child_process / WebSocket / SMTC); they're
// the contracted surfaces themselves, which is what the contract is for.

'use strict';

const path = require('path');
const assert = require('assert');

// Resolve renderer module relative to the integrated artifact
const rendererPath = path.resolve(
  __dirname, '..', '..', '..', 'integration',
  'com.autobuilder.applemusic-now-playing.sdPlugin', 'js', 'renderer.js'
);

let results = [];
function record(id, status, evidence) {
  results.push({ assertion_id: id, status, evidence });
}

// ---------------------------------------------------------------------------
// S3.A1 — renderer.start subscribes to source.subscribe; every onTrack call
// produces a host.drawText call with payload.title and payload.artist.
// ---------------------------------------------------------------------------
function test_S3_A1() {
  try {
    const renderer = require(rendererPath);
    const drawCalls = [];
    let appearCb = null;
    const host = {
      drawText: (ctx, payload) => drawCalls.push({ ctx, payload }),
      onWillAppear: (cb) => { appearCb = cb; },
      onWillDisappear: () => {},
      liveContexts: () => ['ctx-1'],
      log: () => {}
    };
    let onTrack = null;
    const source = {
      subscribe: (cb) => { onTrack = cb; cb(null); return { unsubscribe: () => {} }; }
    };
    renderer.start(host, source);
    // initial null call is fine; now inject a real track
    onTrack({ title: 'X', artist: 'Y', isPlaying: true, sourceAppId: 'AppleMusic' });
    const last = drawCalls[drawCalls.length - 1];
    assert.strictEqual(last.payload.title, 'X');
    assert.strictEqual(last.payload.artist, 'Y');
    record('S3.A1', 'pass',
      'After injecting TrackState{title:X, artist:Y}, drawText was called with payload.title==X and payload.artist==Y. Total drawText calls: ' + drawCalls.length);
  } catch (e) {
    record('S3.A1', 'fail', e.message);
  }
}

// ---------------------------------------------------------------------------
// S3.A2 — null TrackState produces idle payload (no error thrown).
// ---------------------------------------------------------------------------
function test_S3_A2() {
  try {
    const renderer = require(rendererPath);
    const drawCalls = [];
    const host = {
      drawText: (ctx, payload) => drawCalls.push({ ctx, payload }),
      onWillAppear: () => {},
      onWillDisappear: () => {},
      liveContexts: () => ['ctx-1'],
      log: () => {}
    };
    let onTrack = null;
    const source = {
      subscribe: (cb) => { onTrack = cb; return { unsubscribe: () => {} }; }
    };
    renderer.start(host, source);
    onTrack(null);
    const last = drawCalls[drawCalls.length - 1];
    assert.ok(last && last.payload, 'drawText should have been called');
    // Idle payload: title set to renderer's IDLE_TEXT, artist empty, marquee false
    assert.strictEqual(last.payload.title, renderer.IDLE_TEXT);
    assert.strictEqual(last.payload.artist, '');
    assert.strictEqual(last.payload.marquee, false);
    record('S3.A2', 'pass',
      'On null TrackState, payload was {title: "' + renderer.IDLE_TEXT + '", artist: "", marquee: false}. No error thrown.');
  } catch (e) {
    record('S3.A2', 'fail', e.message);
  }
}

// ---------------------------------------------------------------------------
// S3.A3 — long composed text triggers marquee:true.
// ---------------------------------------------------------------------------
function test_S3_A3() {
  try {
    const renderer = require(rendererPath);
    const drawCalls = [];
    const host = {
      drawText: (ctx, payload) => drawCalls.push({ ctx, payload }),
      onWillAppear: () => {},
      onWillDisappear: () => {},
      liveContexts: () => ['ctx-1'],
      log: () => {}
    };
    let onTrack = null;
    const source = {
      subscribe: (cb) => { onTrack = cb; return { unsubscribe: () => {} }; }
    };
    renderer.start(host, source);
    const longTitle = 'A'.repeat(200);
    onTrack({ title: longTitle, artist: 'Queen', isPlaying: true, sourceAppId: 'AppleMusic' });
    const last = drawCalls[drawCalls.length - 1];
    assert.strictEqual(last.payload.marquee, true);
    record('S3.A3', 'pass',
      'Long composed title (200 chars + artist) produced payload.marquee === true.');
  } catch (e) {
    record('S3.A3', 'fail', e.message);
  }
}

// ---------------------------------------------------------------------------
// Hardware-dependent assertions: recorded as unverifiable_without_hardware.
// ---------------------------------------------------------------------------
function record_unverifiable() {
  record('S1.A1', 'unverifiable_without_hardware',
    'WebSocket-connect-within-5s requires the real Stream Dock host process providing -port/-pluginUUID arguments and listening on ws://127.0.0.1:{port}/. Per v1.9 Principle G/H: no substitution of runtime dependencies. The architecture cannot exercise this assertion in CV; the user exercises it as part of the first-contact sequence (DCA.FC.1).');
  record('S1.A2', 'unverifiable_without_hardware',
    'willAppear/willDisappear dispatch requires the host to emit those events; the host is a closed-source desktop application. Production-fidelity exercise lives on the user\'s machine; the section\'s charter explicitly forbids hand-rolled host stubs that diverge from the documented protocol.');
  record('S1.A4', 'unverifiable_without_hardware',
    'Sidecar supervision requires spawning powershell.exe on Windows. The CV environment (build sandbox) is not Windows; even a Windows build host typically does not have the Stream Dock host installed. Code path is exercised by S2.A3-equivalent in production.');
  record('S2.A3', 'unverifiable_without_hardware',
    'onTrack(null) when Apple Music is not running requires a Windows host with the Apple Music Desktop Application installed (Microsoft Store) and the Windows SMTC subsystem. No substitution permitted under Principle G Tier 2.');
  record('DCA.A6', 'unverifiable_without_hardware',
    'Same as S2.A3 — idle state under hardware. Cross-references FC.6.');
  record('DCA.FC.6', 'unverifiable_without_hardware',
    'Same as S2.A3 / DCA.A6 — full first-contact exercise of idle state requires the user\'s hardware.');
}

function main() {
  test_S3_A1();
  test_S3_A2();
  test_S3_A3();
  record_unverifiable();
  return results;
}

// If run directly, print JSON for the report.json producer
if (require.main === module) {
  const out = main();
  process.stdout.write(JSON.stringify(out, null, 2));
}

module.exports = { main, results: () => results.slice() };
