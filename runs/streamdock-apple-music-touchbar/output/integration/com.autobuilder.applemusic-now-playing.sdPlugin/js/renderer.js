// touchbar-renderer/builder-3a — Composes TrackState into a drawText payload

'use strict';

const STATIC_FIT_CHAR_LIMIT = 28;
const IDLE_TEXT = 'Not Playing';

function composePayload(track) {
  if (!track) return { title: IDLE_TEXT, artist: '', marquee: false };
  if (!track.isPlaying && (!track.title && !track.artist)) {
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

  host.onWillAppear((context) => {
    if (lastPayload) {
      try { host.drawText(context, lastPayload); } catch { /* ignore */ }
    } else {
      try { host.drawText(context, composePayload(null)); } catch { /* ignore */ }
    }
  });

  host.onWillDisappear(() => { /* no-op */ });

  subscription = source.subscribe(onTrack);

  return {
    stop: () => {
      if (subscription) { subscription.unsubscribe(); subscription = null; }
    },
    _composePayload: composePayload,
    _paintAll: paintAll
  };
}

module.exports = { start, composePayload, IDLE_TEXT, STATIC_FIT_CHAR_LIMIT };
