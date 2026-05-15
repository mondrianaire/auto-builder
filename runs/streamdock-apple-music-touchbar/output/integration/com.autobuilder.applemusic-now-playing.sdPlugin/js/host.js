// host-integration/builder-1a — Stream Dock host WebSocket client
//
// Per probe-ip1 findings (citations C.1.1, C.1.2, C.1.3, C.1.4):
//   - Stream Dock host spawns each plugin as a separate process and supplies a
//     WebSocket port and registration parameters via command-line arguments.
//   - The plugin must open a WebSocket to ws://127.0.0.1:{port}/ and send a
//     JSON `registerPlugin` message containing its UUID before any other
//     messages will be processed.
//   - All host<->plugin communication is JSON over a single WebSocket.
//
// Argument parsing follows the Elgato-derived StreamDock convention (also used
// by MiraboxSpace's own example plugins per probe-ip4/C.4.2 — the
// com.mirabox.streamdock.spotify.sdPlugin reference). Host launches the plugin
// process with:  -port {N} -pluginUUID {UUID} -registerEvent {evt} -info {JSON}
//
// Outbound message field names (setTitle, setImage, setFeedback, logMessage)
// are read from the live MiraboxSpace SDK template at
// github.com/MiraboxSpace/StreamDock-Plugin-SDK; the exact field name for
// updating Touch Bar widget text is external_source_unreachable per
// sections-v1.json IP3.A1 / S1.A3. We use `setTitle` (canonical for widget
// text content across all enumerated Controllers per probe-ip1/C.1.3) and
// `setFeedback` (Knob/secondary-screen text payload — closest analogue
// documented). Both are sent; the host ignores whichever it does not
// recognize for the targeted Action. See inline-deviation dev-001.

'use strict';

const WebSocket = require('ws');
const EventEmitter = require('events');

function parseHostArgs(argv) {
  const args = argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i];
    const v = args[i + 1];
    if (!k || !k.startsWith('-')) continue;
    out[k.slice(1)] = v;
  }
  return {
    port: out.port ? parseInt(out.port, 10) : null,
    pluginUUID: out.pluginUUID || null,
    registerEvent: out.registerEvent || 'registerPlugin',
    info: out.info ? safeJsonParse(out.info) : {}
  };
}

function safeJsonParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}

class StreamDockHost extends EventEmitter {
  constructor() {
    super();
    this._ws = null;
    this._args = null;
    this._connected = false;
    this._actionContexts = new Map();
    this._startupHooks = [];
    this._shutdownHooks = [];
  }

  async connect(argv) {
    this._args = parseHostArgs(argv || process.argv);
    if (!this._args.port || !this._args.pluginUUID) {
      throw new Error(
        'host-integration: missing -port or -pluginUUID in argv; ' +
        'plugin was not launched by the Stream Dock host as documented at ' +
        'https://sdk.key123.vip/en/guide/architecture.html'
      );
    }
    const url = 'ws://127.0.0.1:' + this._args.port + '/';
    this._ws = new WebSocket(url);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('host-integration: WebSocket open timeout (>5s)'));
      }, 5000);

      this._ws.on('open', () => {
        clearTimeout(timer);
        this._ws.send(JSON.stringify({
          event: this._args.registerEvent,
          uuid: this._args.pluginUUID
        }));
        this._connected = true;
        Promise.all(this._startupHooks.map(h => Promise.resolve().then(h)))
          .catch(err => this.log('error', 'startup hook failed: ' + err.message));
        resolve();
      });

      this._ws.on('error', err => {
        clearTimeout(timer);
        reject(err);
      });

      this._ws.on('message', raw => this._onMessage(raw));

      this._ws.on('close', () => {
        this._connected = false;
        Promise.all(this._shutdownHooks.map(h => Promise.resolve().then(h)))
          .catch(() => null)
          .then(() => process.exit(0));
      });
    });
  }

  _onMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    const evt = msg.event;
    if (!evt) return;

    if (evt === 'willAppear') {
      this._actionContexts.set(msg.context, {
        action: msg.action,
        device: msg.device,
        payload: msg.payload
      });
      this.emit('willAppear', msg.context, msg);
    } else if (evt === 'willDisappear') {
      this._actionContexts.delete(msg.context);
      this.emit('willDisappear', msg.context, msg);
    } else if (evt === 'keyDown' || evt === 'keyUp' ||
               evt === 'touchBarTap' || evt === 'touchBarSlide' ||
               evt === 'dialRotate' || evt === 'dialPress') {
      this.emit(evt, msg.context, msg);
    } else if (evt === 'systemDidWakeUp' || evt === 'applicationDidLaunch' ||
               evt === 'applicationDidTerminate') {
      this.emit(evt, msg);
    } else {
      this.emit('message', msg);
    }
  }

  onWillAppear(cb) { this.on('willAppear', cb); }
  onWillDisappear(cb) { this.on('willDisappear', cb); }

  async drawText(context, payload) {
    if (!this._connected || !context) return;
    const composed = this._composeText(payload);

    this._send({
      event: 'setTitle',
      context: context,
      payload: {
        title: composed.text,
        target: 0
      }
    });

    this._send({
      event: 'setFeedback',
      context: context,
      payload: {
        title: payload && payload.title ? String(payload.title) : '',
        value: payload && payload.artist ? String(payload.artist) : '',
        marquee: !!(payload && payload.marquee)
      }
    });
  }

  _composeText(payload) {
    if (!payload) return { text: '' };
    const t = payload.title ? String(payload.title) : '';
    const a = payload.artist ? String(payload.artist) : '';
    if (!t && !a) return { text: '' };
    if (!a) return { text: t };
    if (!t) return { text: a };
    return { text: t + ' — ' + a };
  }

  _send(obj) {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
    try { this._ws.send(JSON.stringify(obj)); }
    catch (err) { /* swallow */ }
  }

  log(level, message) {
    const ts = new Date().toISOString();
    const line = '[' + ts + '][' + (level || 'info') + '] ' + String(message);
    try { process.stderr.write(line + '\n'); } catch { /* ignore */ }
    this._send({
      event: 'logMessage',
      payload: { message: line }
    });
  }

  onStartup(cb) { this._startupHooks.push(cb); }
  onShutdown(cb) { this._shutdownHooks.push(cb); }

  liveContexts() { return Array.from(this._actionContexts.keys()); }
}

const host = new StreamDockHost();
module.exports = host;
module.exports.StreamDockHost = StreamDockHost;
module.exports.parseHostArgs = parseHostArgs;
