/* ============================================================
 * section-4 — App shell, flow, and launch
 * builder: b4-shell
 *
 * Owns the page and the overall flow. Orchestrates:
 *   acquire location (section-1)
 *     -> look up stores (section-2)
 *       -> select + present the closest (section-3)
 * surfacing loading / status / error states throughout.
 *
 * The shell does NOT implement geolocation, geocoding, the Overpass
 * query, distance maths, or card rendering — those belong to
 * sections 1-3. The shell only wires them together and owns the UI
 * skeleton (status banner, loading indicator, result region).
 *
 * Depends on globals: CLS_Location, CLS_StoreLookup, CLS_Presentation.
 * ============================================================ */
(function (global) {
  'use strict';

  // Radius-widening schedule for empty results (section-2 returns
  // 'empty'; the shell owns retry policy per the section-2--section-4
  // contract). Metres.
  var RADIUS_SCHEDULE = [4000, 12000, 30000, 80000];

  function byId(id) { return document.getElementById(id); }

  function setStatus(text, tone) {
    var banner = byId('cls-status');
    if (!banner) return;
    banner.textContent = text || '';
    banner.className = 'cls-status' + (tone ? ' cls-status-' + tone : '');
    banner.style.display = text ? 'block' : 'none';
  }

  function showLoading(text) {
    var ld = byId('cls-loading');
    if (!ld) return;
    ld.querySelector('.cls-loading-text').textContent = text || 'Working...';
    ld.style.display = 'flex';
  }

  function hideLoading() {
    var ld = byId('cls-loading');
    if (ld) ld.style.display = 'none';
  }

  function clearResult() {
    var r = byId('cls-result');
    if (r) r.innerHTML = '';
  }

  /* Run the store lookup for a resolved location, widening the radius
   * when nothing is found, then hand the result to section-3. */
  function runLookup(location) {
    var resultEl = byId('cls-result');
    clearResult();
    setStatus('Location set: ' + location.label, 'ok');

    var attempt = 0;

    function tryRadius() {
      var radius = RADIUS_SCHEDULE[attempt];
      showLoading(attempt === 0
        ? 'Searching for liquor stores nearby...'
        : 'Nothing found nearby — widening the search to ' +
          Math.round(radius / 1000) + ' km...');

      CLS_StoreLookup.findNearbyLiquorStores(location.lat, location.lon, radius)
        .then(function (lookupResult) {
          // 'empty' -> widen and retry if the schedule has more steps.
          if (lookupResult.status === 'empty' && attempt < RADIUS_SCHEDULE.length - 1) {
            attempt++;
            tryRadius();
            return;
          }
          hideLoading();
          if (lookupResult.status === 'error') {
            setStatus('Could not complete the search.', 'error');
          } else if (lookupResult.status === 'empty') {
            setStatus('No liquor stores found, even after widening the search.', 'warn');
          } else {
            setStatus('Showing the closest liquor store to ' + location.label + '.', 'ok');
          }
          // Hand off to section-3 for selection + presentation.
          CLS_Presentation.renderClosestStore({
            userLocation: location,
            lookupResult: lookupResult,
            container: resultEl
          });
        })
        .catch(function (err) {
          // Defensive: the lookup contract says it never rejects, but
          // the shell still degrades gracefully if something slips.
          hideLoading();
          setStatus('An unexpected problem occurred during the search.', 'error');
          CLS_Presentation.renderClosestStore({
            userLocation: location,
            lookupResult: {
              status: 'error',
              stores: [],
              message: 'Unexpected error: ' + ((err && err.message) || 'unknown') +
                '. Please try again.'
            },
            container: resultEl
          });
        });
    }

    tryRadius();
  }

  /* Boot the app — called on DOMContentLoaded. */
  function start() {
    // Guard: if a feature module failed to load, show an honest
    // message instead of a blank or broken screen (S4.A1).
    if (!global.CLS_Location || !global.CLS_StoreLookup || !global.CLS_Presentation) {
      var rootErr = byId('cls-result') || document.body;
      rootErr.innerHTML = '<div class="cls-msg cls-msg-error">' +
        '<div class="cls-msg-headline">The app could not start</div>' +
        '<div class="cls-msg-detail">A required component failed to load. ' +
        'Please re-download the app file and open it again.</div></div>';
      return;
    }

    var locContainer = byId('cls-location');
    hideLoading();
    setStatus('', null);

    // section-1 owns its own UI + the geolocation/geocoding logic.
    var loc = CLS_Location.acquireLocation({
      onStatus: function (text) {
        // Mirror section-1's status into the shell banner area too.
        if (text) setStatus(text, null);
      },
      onResolved: function (location) {
        // Location established by either path — drive the flow.
        runLookup(location);
      }
    });
    loc.renderInto(locContainer);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }

  global.CLS_Shell = { start: start, _runLookup: runLookup };
})(typeof window !== 'undefined' ? window : globalThis);
