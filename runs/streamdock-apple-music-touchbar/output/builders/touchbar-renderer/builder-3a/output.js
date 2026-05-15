// touchbar-renderer/builder-3a — Composes TrackState into a drawText payload
//
// Wires now-playing-source.subscribe to host-integration.drawText. Per
// sections-v1.json §section-3 charter, this section lives strictly between
// the source and the host's drawText surface; it never touches the
// WebSocket or child_process directly.

'use strict';

// Heuristic widget width in characters. The N4 Pro Touch Bar's exact pixel
// width is external_source_unreachable (sections-v1.json IP3 chosen_branch).
// We use a character-count proxy that triggers marquee for anything that's
// implausibly long for a single-line touch bar — empirically ~28 chars is
// a conservative limit on a wide aspect strip. The host's actual layout
// decides what's rendered; this hint just tells the host the renderer
// believes the content overflows.
const STATIC_FIT_CHAR_LIMIT = 28;

const IDLE_TEXT = 'Not Playing';

function composePayload(track) {
  if (!track || !track.title || !track.isPlaying === undefined) {
    // Idle: track is null or the source said so
    if (!track) return { title: IDLE_TEXT, artist: '', marquee: false };
  }
  if (track && !track.isPlaying && (!track.title && !track.artist)) {
    return { title: IDLE_TEXT, artist: '', marquee: false };
  }
  const title = (track && track.title) ? String(track.title) : '';
  const artist = (track && track.artist) ? String(track.artist) : '';
  const composed = title + (artist ? ' — ' + artist : '');
  const marquee = composed.length > STATIC_FIT_CHAR_LIMIT;
  return { title, artist, marquee };
}

function start(host, source) {
  if (!host || typeof host.drawText !== 'function') {
    throw new Error('renderer: host must provide drawText() per contract');
  }
  if (!source || typeof source.subscribe !== 'function') {
    throw new Error('renderer: source must provide subscribe() per contract');
  }

  let lastPayload = null;
  let subscription = null;

  function paintAll(payload) {
    lastPayload = payload;
    const contexts = (typeof host.liveContexts === 'function')
      ? host.liveContexts() : [];
    for (const ctx of contexts) {
      try { host.drawText(ctx, payload); }
      catch (err) {
        if (host.log) host.log('warn', 'drawText threw: ' + err.message);
      }
    }
  }

  function onTrack(track) {
    const payload = composePayload(track);
    paintAll(payload);
  }

  // When a new action context appears (user placed the action on the Touch
  // Bar slot), paint it with the most recent payload so it's not blank.
  host.onWillAppear((context) => {
    if (lastPayload) {
      try { host.drawText(context, lastPayload); } catch { /* ignore */ }
    } else {
      // No track data yet — show idle so the bar isn't empty.
      try { host.drawText(context, composePayload(null)); } catch { /* ignore */ }
    }
  });

  host.onWillDisappear(() => {
    // No-op — host removed the action from view. No state cleanup needed.
  });

  // Subscribe to the source. Calls onTrack immediately with current state.
  subscription = source.subscribe(onTrack);

  return {
    stop: () => {
      if (subscription) { subscription.unsubscribe(); subscription = null; }
    },
    _composePayload: composePayload,  // exposed for tests
    _paintAll: paintAll
  };
}

module.exports = { start, composePayload, IDLE_TEXT, STATIC_FIT_CHAR_LIMIT };
