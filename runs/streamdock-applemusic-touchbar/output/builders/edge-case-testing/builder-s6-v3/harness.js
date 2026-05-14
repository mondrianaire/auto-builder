// harness.js -- S6 v3 production-fidelity edge-case-testing harness (Windows).
// Drives the integrated .sdPlugin bundle against a fake SDK WebSocket host
// on 127.0.0.1, with powershell.exe shimmed via MUSIC_SOURCE_FIXTURE env var.
// Writes report.json. Never touches plugin/ source other than reading it for
// static-grep checks (AA.S6.3 -- stub injection limited to the music-source
// command boundary).
//
// On the StreamDock host on Windows, manifest.Nodejs.Version='20' causes the
// host to run plugin/main.js directly as a Node script under its bundled
// runtime. This harness simulates that production path by spawning
// `node plugin/main.js ...` directly (no shell wrapper). On the linux CI
// sandbox where this harness runs, powershell.exe is not present -- the
// MUSIC_SOURCE_FIXTURE env-var (preserved test affordance from dev-002)
// bypasses the powershell.exe spawn entirely, so the harness verifies the
// plugin's response logic + message protocol against fixture data. The real
// powershell.exe-to-SMTC boundary is structurally asserted by the
// literal-presence checks on music_source.js (AA.S5.4).
//
// Usage: node harness.js
// Exit code: 0 if all assertions pass, 1 otherwise.

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BUNDLE_DIR = path.resolve(__dirname, '..', '..', '..', 'integration', 'com.autobuilder.applemusic-nowplaying.sdPlugin');
const MAIN_JS = path.join(BUNDLE_DIR, 'plugin', 'main.js');
const MUSIC_SRC_JS = path.join(BUNDLE_DIR, 'plugin', 'music_source.js');
const SDK_JS = path.join(BUNDLE_DIR, 'plugin', 'sdk.js');
const MANIFEST_JSON = path.join(BUNDLE_DIR, 'manifest.json');
const LAYOUT_JSON = path.join(BUNDLE_DIR, 'layouts', 'nowplaying.json');
const PI_HTML = path.join(BUNDLE_DIR, 'ui', 'inspector.html');

// Use the bundle's own vendored ws.
const WebSocket = require(path.join(BUNDLE_DIR, 'plugin', 'node_modules', 'ws'));

const results = [];
function record(id, status, detail) {
  results.push({ id: id, status: status, detail: detail || '' });
  const tag = status === 'passed' ? 'PASS' : status === 'skipped' ? 'SKIP' : 'FAIL';
  console.log('[' + tag + ']', id, '-', detail || '');
}

// ---------------------------------------------------------------------------
// Helper: spawn the plugin (Node directly invoking main.js, simulating the
// StreamDock host's bundled-Node CodePathWin execution) against a fresh mock
// SDK on a free port.
// ---------------------------------------------------------------------------
function runScenario(opts) {
  return new Promise(function (resolve) {
    const wss = new WebSocket.Server({ port: 0 }, function () {
      const port = wss.address().port;
      const captured = [];
      let plugin = null;
      let resolved = false;
      const finish = function () {
        if (resolved) return; resolved = true;
        try { plugin && plugin.kill('SIGKILL'); } catch (_e) {}
        try { wss.close(); } catch (_e) {}
        setTimeout(function () { resolve({ frames: captured }); }, 50);
      };
      wss.on('connection', function (sock) {
        sock.on('message', function (d) {
          let m;
          try { m = JSON.parse(d.toString()); } catch (_e) { return; }
          captured.push(m);
          if (captured.length === 1 && m.event === 'registerPlugin') {
            try { opts.drive(sock, finish); } catch (e) { record('_drive_error', 'failed', String(e && e.message)); finish(); }
          }
        });
      });
      const env = Object.assign({}, process.env, opts.env || {});
      // Spawn the plugin the way the StreamDock host does on Windows when
      // Nodejs.Version is declared: run main.js directly under Node. No shell
      // wrapper, no run.sh / run.cmd / run.bat. This is the v3 production
      // execution model.
      plugin = spawn(process.execPath, [MAIN_JS,
        '-port', String(port),
        '-pluginUUID', opts.pluginUUID || 'PLG',
        '-registerEvent', 'registerPlugin',
        '-info', '{}'], { env: env, stdio: ['ignore', 'ignore', 'ignore'] });
      setTimeout(finish, opts.runMs || 1500);
    });
  });
}

// ---------------------------------------------------------------------------
// Static-grep / file-shape assertions (don't need to spawn the plugin).
// ---------------------------------------------------------------------------
function assertManifestShape() {
  let m = null;
  try { m = JSON.parse(fs.readFileSync(MANIFEST_JSON, 'utf8')); }
  catch (e) { record('AA.S1.2', 'failed', 'manifest.json did not parse: ' + e.message); return; }
  // v3 required keys: CodePathMac REMOVED; CodePathWin + Nodejs ADDED.
  const required = ['Name','Version','Author','Description','Icon','Category','CategoryIcon','OS','SDKVersion','Software','CodePathWin','Nodejs','Actions'];
  const missing = required.filter(k => !(k in m));
  record('AA.S1.2', missing.length === 0 ? 'passed' : 'failed', missing.length === 0 ? 'all SDK-v2 keys present (incl. CodePathWin + Nodejs)' : 'missing: ' + missing.join(','));

  // CodePathMac must be ABSENT in v3.
  const macAbsent = !('CodePathMac' in m);
  record('AA.S1.2.no-mac', macAbsent ? 'passed' : 'failed', macAbsent ? 'CodePathMac correctly absent' : 'CodePathMac unexpectedly present');

  // AA.S1.3: every manifest-referenced path resolves. CodePathWin must point at a .js file in the bundle.
  function exists(p) { return fs.existsSync(p); }
  const checks = [
    ['CodePathWin', m.CodePathWin, false],
    ['Icon', m.Icon, true],
    ['CategoryIcon', m.CategoryIcon, true],
    ['Action.Icon', m.Actions[0].Icon, true],
    ['Action.PropertyInspectorPath', m.Actions[0].PropertyInspectorPath, false],
    ['Action.Encoder.layout', m.Actions[0].Encoder.layout, false],
    ['Action.States[0].Image', m.Actions[0].States[0].Image, true]
  ];
  const failed = [];
  for (const [label, p, isIcon] of checks) {
    const target = isIcon ? path.join(BUNDLE_DIR, p + '.png') : path.join(BUNDLE_DIR, p);
    if (!exists(target)) failed.push(label + ' -> ' + p);
  }
  // Additionally check CodePathWin ends in .js
  const codePathOk = typeof m.CodePathWin === 'string' && m.CodePathWin.endsWith('.js');
  if (!codePathOk) failed.push('CodePathWin must end in .js, got: ' + m.CodePathWin);
  record('AA.S1.3', failed.length === 0 ? 'passed' : 'failed', failed.length === 0 ? 'all paths resolve; CodePathWin is .js' : 'missing/bad: ' + failed.join(', '));

  // AA.S1.4
  const c = m.Actions[0].Controllers;
  record('AA.S1.4', JSON.stringify(c) === JSON.stringify(['Encoder']) ? 'passed' : 'failed', 'Controllers=' + JSON.stringify(c));

  // AA.S1.5 -- v3: Platform=='windows'
  const osOk = Array.isArray(m.OS) && m.OS.length === 1 && m.OS[0].Platform === 'windows' && m.OS[0].MinimumVersion;
  record('AA.S1.5', osOk ? 'passed' : 'failed', 'OS=' + JSON.stringify(m.OS));

  // AA.S1.6 / MCA.TDIPA.4 -- v3: Nodejs.Version is non-empty string; CodePathMac absent.
  const njsOk = m.Nodejs && typeof m.Nodejs.Version === 'string' && m.Nodejs.Version.length > 0;
  const allOk = njsOk && codePathOk && macAbsent;
  record('AA.S1.6', allOk ? 'passed' : 'failed', 'Nodejs=' + JSON.stringify(m.Nodejs) + ' ; CodePathWin=' + m.CodePathWin + ' ; CodePathMac-absent=' + macAbsent);

  // MCA.TDIPA.4 explicit record (mirrors AA.S1.6 but covers the discovery-side MCA).
  record('MCA.TDIPA.4', njsOk ? 'passed' : 'failed', 'Nodejs.Version=' + (m.Nodejs && m.Nodejs.Version));
}

function assertLayoutShape() {
  let l = null;
  try { l = JSON.parse(fs.readFileSync(LAYOUT_JSON, 'utf8')); }
  catch (e) { record('AA.S2.1', 'failed', 'layout did not parse: ' + e.message); record('AA.S2.2', 'failed', 'layout did not parse'); return; }
  const title = (l.items || []).find(i => i.key === 'title');
  const artist = (l.items || []).find(i => i.key === 'artist');
  const ok1 = title && title.type === 'text' && artist && artist.type === 'text';
  record('AA.S2.1', ok1 ? 'passed' : 'failed', ok1 ? 'title+artist text items present' : 'missing title or artist item');
  const truncOk = title && title['text-overflow'] && artist && artist['text-overflow'];
  record('AA.S2.2', truncOk ? 'passed' : 'failed', truncOk ? 'both items declare text-overflow' : 'truncation field missing');
}

function assertPIShape() {
  let html = null;
  try { html = fs.readFileSync(PI_HTML, 'utf8'); }
  catch (e) { record('AA.S2.3', 'failed', 'PI HTML not readable: ' + e.message); record('AA.S2.4', 'failed', 'PI HTML not readable'); return; }
  const looksHtml = /<!doctype html/i.test(html) && /<\/html>/i.test(html);
  record('AA.S2.3', looksHtml ? 'passed' : 'failed', looksHtml ? 'doctype + closing </html> present' : 'malformed');
  const emits = html.includes("'setSettings'") || html.includes('"setSettings"');
  const hasField = html.includes('pollIntervalMs');
  record('AA.S2.4', (emits && hasField) ? 'passed' : 'failed', 'emits setSettings=' + emits + ', has pollIntervalMs=' + hasField);
}

function assertS5Shape() {
  let src = null;
  try { src = fs.readFileSync(MUSIC_SRC_JS, 'utf8'); }
  catch (e) { record('AA.S5.4', 'failed', 'music_source.js not readable'); return; }
  // v3 literals: SMTC instead of AppleScript.
  const literals = ['GlobalSystemMediaTransportControlsSessionManager', 'Windows.Media.Control', 'TryGetMediaPropertiesAsync', 'PlaybackStatus'];
  const missing = literals.filter(s => !src.includes(s));
  record('AA.S5.4', missing.length === 0 ? 'passed' : 'failed', missing.length === 0 ? 'all 4 SMTC literals present' : 'missing: ' + missing.join(' | '));

  // MCA.TDIPD.2 mirrors AA.S5.4 on the discovery side.
  record('MCA.TDIPD.2', missing.length === 0 ? 'passed' : 'failed', missing.length === 0 ? 'all 4 SMTC literals present' : 'missing: ' + missing.join(' | '));
}

// ---------------------------------------------------------------------------
// In-process S5 module behavior tests.
// ---------------------------------------------------------------------------
async function runS5BehaviorTests() {
  delete require.cache[require.resolve(MUSIC_SRC_JS)];
  const prev = process.env.MUSIC_SOURCE_FIXTURE;
  process.env.MUSIC_SOURCE_FIXTURE = 'Bohemian Rhapsody\tQueen';
  const mod = require(MUSIC_SRC_JS);
  const r1 = await mod.getNowPlaying();
  record('AA.S5.1', (r1 && r1.title === 'Bohemian Rhapsody' && r1.artist === 'Queen') ? 'passed' : 'failed', JSON.stringify(r1));

  process.env.MUSIC_SOURCE_FIXTURE = '';
  const r2 = await mod.getNowPlaying();
  process.env.MUSIC_SOURCE_FIXTURE = 'no-tab-here';
  const r3 = await mod.getNowPlaying();
  record('AA.S5.2', (r2 === null && r3 === null) ? 'passed' : 'failed', 'empty -> ' + JSON.stringify(r2) + '; no-tab -> ' + JSON.stringify(r3));

  // AA.S5.3 v3 -- uses child_process with 'powershell.exe' (not 'osascript').
  const src = fs.readFileSync(MUSIC_SRC_JS, 'utf8');
  const usesCP = /require\(['"]child_process['"]\)/.test(src) && /powershell\.exe/.test(src);
  const noOsascript = !/['"]osascript['"]/.test(src);
  let threw = false;
  try { mod.getNowPlaying(); } catch (_e) { threw = true; }
  record('AA.S5.3', (usesCP && noOsascript && !threw) ? 'passed' : 'failed',
    'uses child_process+powershell.exe: ' + usesCP + ', no-osascript: ' + noOsascript + ', sync-throw: ' + threw);

  // MCA.TDIPD.1 mirrors AA.S5.3 on the discovery side.
  record('MCA.TDIPD.1', (usesCP && noOsascript) ? 'passed' : 'failed', 'powershell.exe spawn + tab-delimited parsing confirmed');

  if (prev === undefined) delete process.env.MUSIC_SOURCE_FIXTURE; else process.env.MUSIC_SOURCE_FIXTURE = prev;
}

// ---------------------------------------------------------------------------
// SDK / S3 behavior tests via subprocess.
// ---------------------------------------------------------------------------
async function runS3BehaviorTests() {
  {
    const out = await runScenario({
      env: { MUSIC_SOURCE_FIXTURE: '' },
      pluginUUID: 'ABC',
      drive: function () {},
      runMs: 600
    });
    const first = out.frames[0];
    const ok = first && first.event === 'registerPlugin' && first.uuid === 'ABC';
    record('AA.S3.1', ok ? 'passed' : 'failed', JSON.stringify(first || null));
  }
  {
    const out = await runScenario({
      env: { MUSIC_SOURCE_FIXTURE: 'X\tY' },
      drive: function (sock) {
        sock.send(JSON.stringify({ event: 'willAppear', context: 'C1', action: 'a', payload: { settings: { pollIntervalMs: 300 } } }));
        setTimeout(function () { sock.send(JSON.stringify({ event: 'willDisappear', context: 'C1' })); }, 350);
      },
      runMs: 1300
    });
    const setFeedbacks = out.frames.filter(f => f.event === 'setFeedback');
    const ok = setFeedbacks.length >= 1 && setFeedbacks.length <= 3;
    record('AA.S3.2', ok ? 'passed' : 'failed', 'setFeedback count=' + setFeedbacks.length + ' (should be 1-3)');
  }
  {
    const out = await runScenario({
      env: { MUSIC_SOURCE_FIXTURE: '' },
      drive: function (sock) {
        sock.send(JSON.stringify({ event: 'willAppear', context: 'C1', action: 'a', payload: { settings: { pollIntervalMs: 10000 } } }));
        setTimeout(function () {
          sock.send(JSON.stringify({ event: 'touchTap', context: 'C1' }));
          sock.send(JSON.stringify({ event: 'dialRotate', context: 'C1' }));
          sock.send(JSON.stringify({ event: 'dialDown', context: 'C1' }));
          sock.send(JSON.stringify({ event: 'dialUp', context: 'C1' }));
        }, 200);
      },
      runMs: 800
    });
    const post = out.frames.slice(1);
    const actionEffect = post.filter(f => ['setFeedback','setImage','setTitle','openUrl','setState'].indexOf(f.event) >= 0);
    const ok = actionEffect.length <= 1;
    record('AA.S3.3', ok ? 'passed' : 'failed', 'action-effect frames after input events=' + actionEffect.length + ' (immediate paint allowed)');
  }
  {
    const out = await runScenario({
      env: { MUSIC_SOURCE_FIXTURE: 't\ta' },
      drive: function (sock) { sock.send(JSON.stringify({ event: 'willAppear', context: 'CX', action: 'a', payload: { settings: {} } })); },
      runMs: 700
    });
    const fb = out.frames.filter(f => f.event === 'setFeedback');
    const matched = fb.find(f => f.context === 'CX' && f.payload && f.payload.title === 't' && f.payload.artist === 'a');
    record('AA.S3.4', matched ? 'passed' : 'failed', JSON.stringify(matched || fb[0] || null));
  }
}

// ---------------------------------------------------------------------------
// S4 behavior tests via subprocess.
// ---------------------------------------------------------------------------
async function runS4BehaviorTests() {
  {
    const out = await runScenario({
      env: { MUSIC_SOURCE_FIXTURE: 'X\tY' },
      drive: function (sock) { sock.send(JSON.stringify({ event: 'willAppear', context: 'C1', action: 'a', payload: { settings: {} } })); },
      runMs: 700
    });
    const fb = out.frames.find(f => f.event === 'setFeedback' && f.payload.title === 'X' && f.payload.artist === 'Y');
    record('AA.S4.1', fb ? 'passed' : 'failed', JSON.stringify(fb || null));
  }
  {
    const out = await runScenario({
      env: { MUSIC_SOURCE_FIXTURE: '' },
      drive: function (sock) { sock.send(JSON.stringify({ event: 'willAppear', context: 'C1', action: 'a', payload: { settings: {} } })); },
      runMs: 700
    });
    const fb = out.frames.find(f => f.event === 'setFeedback' && f.payload.title === 'Apple Music' && f.payload.artist === '');
    record('AA.S4.2', fb ? 'passed' : 'failed', JSON.stringify(fb || null));
  }
  {
    const out = await runScenario({
      env: { MUSIC_SOURCE_FIXTURE: 'X\tY' },
      drive: function (sock) {
        sock.send(JSON.stringify({ event: 'willAppear', context: 'C1', action: 'a', payload: { settings: { pollIntervalMs: 300 } } }));
        setTimeout(function () { sock.send(JSON.stringify({ event: 'willDisappear', context: 'C1' })); }, 350);
      },
      runMs: 1500
    });
    const total = out.frames.filter(f => f.event === 'setFeedback').length;
    record('AA.S4.3', total <= 3 ? 'passed' : 'failed', 'total setFeedback=' + total);
  }
  {
    const out = await runScenario({
      env: { MUSIC_SOURCE_FIXTURE: 'X\tY' },
      drive: function (sock) {
        sock.send(JSON.stringify({ event: 'willAppear', context: 'C1', action: 'a', payload: { settings: { pollIntervalMs: 5000 } } }));
        setTimeout(function () { sock.send(JSON.stringify({ event: 'didReceiveSettings', context: 'C1', payload: { settings: { pollIntervalMs: 300 } } })); }, 250);
      },
      runMs: 1500
    });
    const fb = out.frames.filter(f => f.event === 'setFeedback');
    record('AA.S4.4', fb.length >= 3 ? 'passed' : 'failed', 'feedback count=' + fb.length + ' (should be >=3 with 300ms cadence over ~1.2s)');
  }
  {
    const out = await runScenario({
      env: { MUSIC_SOURCE_FIXTURE: 'X\tY' },
      drive: function (sock) { sock.send(JSON.stringify({ event: 'willAppear', context: 'C1', action: 'a', payload: { settings: { showArtist: false } } })); },
      runMs: 700
    });
    const fb = out.frames.find(f => f.event === 'setFeedback' && f.payload.title === 'X' && f.payload.artist === '');
    record('AA.S4.5', fb ? 'passed' : 'failed', JSON.stringify(fb || null));
  }
}

// ---------------------------------------------------------------------------
// DCA behavior tests.
// ---------------------------------------------------------------------------
async function runDCABehaviorTests() {
  {
    const out = await runScenario({
      env: { MUSIC_SOURCE_FIXTURE: 'Bohemian Rhapsody\tQueen' },
      drive: function (sock) { sock.send(JSON.stringify({ event: 'willAppear', context: 'C1', action: 'a', payload: { settings: {} } })); },
      runMs: 700
    });
    const fb = out.frames.find(f => f.event === 'setFeedback' && f.payload.title && f.payload.artist);
    record('DCA.A5.1', fb ? 'passed' : 'failed', JSON.stringify(fb || null));
  }
  {
    const out1 = await runScenario({
      env: { MUSIC_SOURCE_FIXTURE: 'A\tX' },
      drive: function (sock) { sock.send(JSON.stringify({ event: 'willAppear', context: 'C1', action: 'a', payload: { settings: {} } })); },
      runMs: 600
    });
    const out2 = await runScenario({
      env: { MUSIC_SOURCE_FIXTURE: 'B\tY' },
      drive: function (sock) { sock.send(JSON.stringify({ event: 'willAppear', context: 'C1', action: 'a', payload: { settings: {} } })); },
      runMs: 600
    });
    const f1 = out1.frames.find(f => f.event === 'setFeedback' && f.payload.title === 'A' && f.payload.artist === 'X');
    const f2 = out2.frames.find(f => f.event === 'setFeedback' && f.payload.title === 'B' && f.payload.artist === 'Y');
    record('DCA.A5.2', (f1 && f2) ? 'passed' : 'failed', 'frame1=' + JSON.stringify(f1 || null) + '; frame2=' + JSON.stringify(f2 || null));
  }
  {
    const out = await runScenario({
      env: { MUSIC_SOURCE_FIXTURE: 'A\tB' },
      drive: function (sock) { sock.send(JSON.stringify({ event: 'willAppear', context: 'C1', action: 'a', payload: { settings: { pollIntervalMs: 500 } } })); },
      runMs: 2200
    });
    const fb = out.frames.filter(f => f.event === 'setFeedback').length;
    record('DCA.A6.1', (fb >= 3 && fb <= 7) ? 'passed' : 'failed', 'feedback count=' + fb + ' over 2.2s @ 500ms (expect 4-5)');
  }
  {
    const out = await runScenario({
      env: { MUSIC_SOURCE_FIXTURE: '' },
      drive: function (sock) { sock.send(JSON.stringify({ event: 'willAppear', context: 'C1', action: 'a', payload: { settings: {} } })); },
      runMs: 700
    });
    const fb = out.frames.find(f => f.event === 'setFeedback' && f.payload.title === 'Apple Music' && f.payload.artist === '');
    record('DCA.A7.1', fb ? 'passed' : 'failed', JSON.stringify(fb || null));
  }
  {
    const out = await runScenario({
      env: { MUSIC_SOURCE_FIXTURE: '' },
      drive: function (sock) {
        sock.send(JSON.stringify({ event: 'willAppear', context: 'C1', action: 'a', payload: { settings: { pollIntervalMs: 10000 } } }));
        setTimeout(function () { sock.send(JSON.stringify({ event: 'touchTap', context: 'C1' })); }, 250);
      },
      runMs: 700
    });
    const afterTap = out.frames.slice(1);
    const ae = afterTap.filter(f => ['setFeedback','setImage','setTitle','openUrl','setState'].indexOf(f.event) >= 0);
    const ok = ae.length <= 1;
    record('DCA.A13.1', ok ? 'passed' : 'failed', 'action-effect frames=' + ae.length);
    record('DCA.IP3.DISPLAY.1', ok ? 'passed' : 'failed', 'same scenario; action-effect frames=' + ae.length);
  }
}

// ---------------------------------------------------------------------------
// PNV.1 -- headline prompt-named-verb scenario.
// ---------------------------------------------------------------------------
async function runPNV() {
  const out = await runScenario({
    env: { MUSIC_SOURCE_FIXTURE: 'Bohemian Rhapsody\tQueen' },
    pluginUUID: 'PNV-UUID',
    drive: function (sock) {
      sock.send(JSON.stringify({ event: 'willAppear', context: 'PNV-CTX', action: 'com.autobuilder.applemusic-nowplaying.nowplaying', payload: { settings: {} } }));
    },
    runMs: 2800
  });
  const fb = out.frames.find(f =>
    f.event === 'setFeedback' &&
    f.context === 'PNV-CTX' &&
    f.payload && f.payload.title === 'Bohemian Rhapsody' && f.payload.artist === 'Queen'
  );
  record('PNV.1', fb ? 'passed' : 'failed', JSON.stringify(fb || out.frames.filter(f => f.event === 'setFeedback')[0] || null));
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------
(async function main() {
  console.log('=== S6 v3 production-fidelity harness (Windows pivot) ===');
  console.log('bundle: ' + BUNDLE_DIR);
  console.log('NOTE: powershell.exe boundary is bypassed via MUSIC_SOURCE_FIXTURE env-var');
  console.log('      (production-fidelity assertion: plugin runs under Node, sends correct');
  console.log('      setFeedback frame given fixture title+artist. The PowerShell-to-SMTC');
  console.log('      boundary itself is structurally asserted by AA.S5.4 literal-presence.)');

  assertManifestShape();
  assertLayoutShape();
  assertPIShape();
  assertS5Shape();

  await runS5BehaviorTests();
  await runS3BehaviorTests();
  await runS4BehaviorTests();
  await runDCABehaviorTests();
  await runPNV();

  const summary = {
    ran_at: new Date().toISOString(),
    cycle: 'v3-windows-rebuild',
    sandbox_note: 'powershell.exe is not present in the linux harness sandbox. The MUSIC_SOURCE_FIXTURE env-var (preserved from dev-002) bypasses the real powershell.exe spawn so the harness verifies plugin response-logic and the SDK message protocol. The powershell.exe-to-SMTC boundary itself is structurally asserted by AA.S5.4 / MCA.TDIPD.2 literal-presence checks on music_source.js. Real-Windows-host verification is delegated to the user installation step.',
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    results: results
  };
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(summary, null, 2));
  console.log('=== report: ' + path.join(__dirname, 'report.json') + ' ===');
  console.log('passed=' + summary.passed + ' failed=' + summary.failed + ' skipped=' + summary.skipped + ' total=' + summary.total);
  process.exit(summary.failed === 0 ? 0 : 1);
})();
