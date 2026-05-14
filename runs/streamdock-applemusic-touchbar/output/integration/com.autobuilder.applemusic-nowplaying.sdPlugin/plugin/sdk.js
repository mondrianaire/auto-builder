// sdk.js — S3 Stream Deck SDK plugin-side runtime.
// Owns:
//   - CLI arg parsing (-port, -pluginUUID, -registerEvent, -info)
//   - WebSocket connection + registerPlugin handshake
//   - Inbound event dispatch (willAppear / willDisappear / didReceiveSettings;
//     touchTap / dialRotate / dialDown / dialUp are received but produce no
//     action-effect outbound — IP3, AA.S3.3, MCA.TDIPB.3)
//   - Outbound helpers (sendFeedback, log)
// Exposes the API described by C-S3-S4.

'use strict';

const WebSocket = require('ws');

const CONTEXTS = new Map(); // context -> { appearedAt, lastSettings }

const handlers = {
  willAppear: [],
  willDisappear: [],
  didReceiveSettings: []
};

let ws = null;
let parsedArgs = null;

function parseArgs(argv) {
  const out = { port: null, pluginUUID: null, registerEvent: null, info: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    // Support both "-port 1234" and "-port=1234" forms.
    let key = null, val = null;
    if (a.startsWith('-')) {
      const eq = a.indexOf('=');
      if (eq >= 0) { key = a.slice(1, eq); val = a.slice(eq + 1); }
      else { key = a.slice(1); val = argv[++i]; }
    }
    if (key === 'port') out.port = parseInt(val, 10);
    else if (key === 'pluginUUID') out.pluginUUID = val;
    else if (key === 'registerEvent') out.registerEvent = val;
    else if (key === 'info') {
      try { out.info = JSON.parse(val); } catch (_e) { out.info = val; }
    }
  }
  return out;
}

function onWillAppear(h) { handlers.willAppear.push(h); }
function onWillDisappear(h) { handlers.willDisappear.push(h); }
function onDidReceiveSettings(h) { handlers.didReceiveSettings.push(h); }

function _safeSend(obj) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try { ws.send(JSON.stringify(obj)); return true; } catch (_e) { return false; }
}

function sendFeedback(context, payload) {
  if (!context) return;
  if (!payload || typeof payload.title !== 'string' || typeof payload.artist !== 'string') return;
  _safeSend({ event: 'setFeedback', context: context, payload: { title: payload.title, artist: payload.artist } });
}

function log(message) {
  _safeSend({ event: 'logMessage', payload: { message: String(message) } });
}

function _dispatch(msg) {
  if (!msg || typeof msg !== 'object') return;
  switch (msg.event) {
    case 'willAppear': {
      if (msg.context) CONTEXTS.set(msg.context, { appearedAt: Date.now(), lastSettings: (msg.payload && msg.payload.settings) || {} });
      for (const h of handlers.willAppear) { try { h(msg); } catch (_e) {} }
      break;
    }
    case 'willDisappear': {
      if (msg.context) CONTEXTS.delete(msg.context);
      for (const h of handlers.willDisappear) { try { h(msg); } catch (_e) {} }
      break;
    }
    case 'didReceiveSettings': {
      if (msg.context && CONTEXTS.has(msg.context)) {
        CONTEXTS.get(msg.context).lastSettings = (msg.payload && msg.payload.settings) || {};
      }
      for (const h of handlers.didReceiveSettings) { try { h(msg); } catch (_e) {} }
      break;
    }
    // Display-only per IP3: these are accepted and silently logged.
    case 'touchTap':
    case 'dialRotate':
    case 'dialDown':
    case 'dialUp': {
      log('input-event-ignored: ' + msg.event);
      break;
    }
    default:
      // Unknown event; ignore.
      break;
  }
}

function start(opts) {
  return new Promise(function (resolve) {
    const args = opts && opts.argv ? opts.argv : process.argv.slice(2);
    parsedArgs = parseArgs(args);
    if (!parsedArgs.port || !parsedArgs.pluginUUID || !parsedArgs.registerEvent) {
      // Don't throw — be a no-op so the harness can detect the misconfiguration cleanly.
      resolve(parsedArgs);
      return;
    }
    const url = 'ws://127.0.0.1:' + parsedArgs.port;
    ws = new WebSocket(url);
    ws.on('open', function () {
      _safeSend({ event: parsedArgs.registerEvent, uuid: parsedArgs.pluginUUID });
      resolve(parsedArgs);
    });
    ws.on('message', function (data) {
      let msg = null;
      try { msg = JSON.parse(data.toString()); } catch (_e) { return; }
      _dispatch(msg);
    });
    ws.on('error', function () { /* swallow */ });
    ws.on('close', function () { /* nothing */ });
  });
}

// Test hooks — internal, not part of the public C-S3-S4 contract.
function _hasContext(ctx) { return CONTEXTS.has(ctx); }
function _getContexts() { return Array.from(CONTEXTS.keys()); }

module.exports = {
  start,
  onWillAppear,
  onWillDisappear,
  onDidReceiveSettings,
  sendFeedback,
  log,
  _hasContext,
  _getContexts,
  _parseArgs: parseArgs
};
