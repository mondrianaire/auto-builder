// main.js — S4 polling orchestrator + paint.
// Wires S3 (sdk.js) to S5 (music_source.js).
// Truncation is layout-native (MCA.TDIPF.1).

'use strict';

const sdk = require('./sdk.js');
const { getNowPlaying } = require('./music_source.js');

const DEFAULT_POLL_MS = 2000;
const DEFAULT_PLACEHOLDER = 'Apple Music';
const DEFAULT_SHOW_ARTIST = true;

const contextState = new Map(); // context -> { settings, intervalHandle }

function applyDefaults(settings) {
  const s = settings || {};
  return {
    pollIntervalMs: (typeof s.pollIntervalMs === 'number' && s.pollIntervalMs >= 250) ? s.pollIntervalMs : DEFAULT_POLL_MS,
    placeholder: (typeof s.placeholder === 'string' && s.placeholder.length > 0) ? s.placeholder : DEFAULT_PLACEHOLDER,
    showArtist: (typeof s.showArtist === 'boolean') ? s.showArtist : DEFAULT_SHOW_ARTIST
  };
}

async function pollAndPaint(context) {
  const entry = contextState.get(context);
  if (!entry) return;
  const settings = entry.settings;
  let np = null;
  try { np = await getNowPlaying(); } catch (_e) { np = null; }
  const title = (np && typeof np.title === 'string' && np.title.length > 0) ? np.title : settings.placeholder;
  let artist = (np && typeof np.artist === 'string') ? np.artist : '';
  if (!settings.showArtist) artist = '';
  sdk.sendFeedback(context, { title: title, artist: artist });
}

function startPolling(context) {
  const entry = contextState.get(context);
  if (!entry) return;
  if (entry.intervalHandle) { clearInterval(entry.intervalHandle); entry.intervalHandle = null; }
  // Immediate paint.
  pollAndPaint(context);
  entry.intervalHandle = setInterval(function () { pollAndPaint(context); }, entry.settings.pollIntervalMs);
}

function stopPolling(context) {
  const entry = contextState.get(context);
  if (!entry) return;
  if (entry.intervalHandle) { clearInterval(entry.intervalHandle); entry.intervalHandle = null; }
}

sdk.onWillAppear(function (event) {
  const ctx = event && event.context;
  if (!ctx) return;
  const settings = applyDefaults(event.payload && event.payload.settings);
  contextState.set(ctx, { settings: settings, intervalHandle: null });
  startPolling(ctx);
});

sdk.onWillDisappear(function (event) {
  const ctx = event && event.context;
  if (!ctx) return;
  stopPolling(ctx);
  contextState.delete(ctx);
});

sdk.onDidReceiveSettings(function (event) {
  const ctx = event && event.context;
  if (!ctx) return;
  const entry = contextState.get(ctx);
  if (!entry) return;
  const oldInterval = entry.settings.pollIntervalMs;
  entry.settings = applyDefaults(event.payload && event.payload.settings);
  if (entry.settings.pollIntervalMs !== oldInterval) {
    startPolling(ctx);
  }
});

// Test hooks (not part of the C-S3-S4 surface, but useful for harness inspection).
function _getContextState(context) { return contextState.get(context); }
function _getAllContexts() { return Array.from(contextState.keys()); }

module.exports = {
  DEFAULT_POLL_MS,
  _getContextState,
  _getAllContexts
};

// Start the SDK when run directly.
if (require.main === module) {
  sdk.start().catch(function () { /* ignored */ });
}
