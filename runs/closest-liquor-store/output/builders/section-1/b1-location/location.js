/* ============================================================
 * section-1 — Location acquisition
 * builder: b1-location
 *
 * Owns establishing where the user is. On app use it attempts
 * automatic detection via the browser Geolocation API. If detection
 * is unavailable / denied / slow / errors, a visible manual
 * location-entry control is exposed and the typed location is
 * resolved to coordinates via the OSM Nominatim geocoder.
 *
 * Public surface (per contracts section-1--section-2/3/4):
 *   acquireLocation(callbacks) -> { renderInto(container) }
 *     callbacks.onResolved(location)  location = {lat,lon,label,source}
 *     callbacks.onStatus(statusText)
 *   getResolvedLocation()  -> last resolved location object or null
 *
 * Out of scope: remembering past locations, map rendering, store queries.
 * ============================================================ */
(function (global) {
  'use strict';

  var NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  var GEO_TIMEOUT_MS = 12000;   // how long we wait on the Geolocation API
  var GEOCODE_TIMEOUT_MS = 15000;

  var _resolved = null; // last resolved {lat,lon,label,source}

  /* fetch with a hard timeout — never hangs forever */
  function fetchWithTimeout(url, opts, timeoutMs) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      var timedOut = false;
      var timer = setTimeout(function () {
        timedOut = true;
        reject(new Error('timeout'));
      }, timeoutMs);
      fetch(url, opts).then(function (resp) {
        if (timedOut) return;
        clearTimeout(timer);
        resolve(resp);
      }).catch(function (err) {
        if (timedOut) return;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /* Resolve a typed location string to coordinates via OSM Nominatim. */
  function geocode(query) {
    var url = NOMINATIM_URL + '?format=json&limit=1&q=' + encodeURIComponent(query);
    return fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, GEOCODE_TIMEOUT_MS)
      .then(function (resp) {
        if (!resp.ok) throw new Error('Geocoding service returned HTTP ' + resp.status);
        return resp.json();
      })
      .then(function (data) {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('No place matched "' + query + '". Try a more specific address or a nearby city.');
        }
        var hit = data[0];
        var lat = parseFloat(hit.lat);
        var lon = parseFloat(hit.lon);
        if (!isFinite(lat) || !isFinite(lon)) {
          throw new Error('Could not read coordinates for "' + query + '".');
        }
        return {
          lat: lat,
          lon: lon,
          label: hit.display_name || query,
          source: 'manual'
        };
      });
  }

  /* Attempt browser Geolocation. Resolves with a location object or
   * rejects with an Error carrying a human-readable .message. */
  function detectGeolocation() {
    return new Promise(function (resolve, reject) {
      if (!global.navigator || !global.navigator.geolocation) {
        reject(new Error('This browser does not support automatic location. Enter a location below.'));
        return;
      }
      var settled = false;
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          if (settled) return;
          settled = true;
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            label: 'Your current location',
            source: 'auto'
          });
        },
        function (err) {
          if (settled) return;
          settled = true;
          var msg;
          if (err && err.code === 1) {
            msg = 'Location access was denied. Enter a location below instead.';
          } else if (err && err.code === 2) {
            msg = 'Your location is currently unavailable. Enter a location below instead.';
          } else if (err && err.code === 3) {
            msg = 'Detecting your location timed out. Enter a location below instead.';
          } else {
            msg = 'Could not detect your location automatically. Enter a location below instead.';
          }
          reject(new Error(msg));
        },
        { enableHighAccuracy: false, timeout: GEO_TIMEOUT_MS, maximumAge: 60000 }
      );
    });
  }

  /* Build the location UI + run the flow. Returns { renderInto }. */
  function acquireLocation(callbacks) {
    callbacks = callbacks || {};
    var onResolved = typeof callbacks.onResolved === 'function' ? callbacks.onResolved : function () {};
    var onStatus = typeof callbacks.onStatus === 'function' ? callbacks.onStatus : function () {};

    var els = {}; // filled in renderInto

    function setStatus(text) {
      if (els.status) els.status.textContent = text || '';
      onStatus(text || '');
    }

    function deliver(location) {
      _resolved = location;
      setStatus('Using: ' + location.label);
      onResolved(location);
    }

    function handleManualSubmit() {
      var q = (els.input.value || '').trim();
      if (!q) {
        setStatus('Type a city, address, or place name, then press Find.');
        els.input.focus();
        return;
      }
      els.button.disabled = true;
      setStatus('Looking up "' + q + '"...');
      geocode(q).then(function (loc) {
        els.button.disabled = false;
        deliver(loc);
      }).catch(function (err) {
        els.button.disabled = false;
        setStatus((err && err.message) || 'Could not resolve that location. Try again.');
        els.input.focus();
      });
    }

    function renderInto(container) {
      // Manual-entry control is ALWAYS rendered and visible/usable —
      // it is never hidden, so the user is never stuck (S1.A2 / S1.A5).
      container.innerHTML = '';

      var wrap = document.createElement('div');
      wrap.className = 'cls-loc';

      var row = document.createElement('div');
      row.className = 'cls-loc-row';

      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'cls-loc-input';
      input.placeholder = 'Enter a city, address, or place';
      input.setAttribute('aria-label', 'Enter your location manually');
      input.autocomplete = 'off';

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'cls-loc-btn';
      button.textContent = 'Find';

      var status = document.createElement('div');
      status.className = 'cls-loc-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');

      row.appendChild(input);
      row.appendChild(button);
      wrap.appendChild(row);
      wrap.appendChild(status);
      container.appendChild(wrap);

      els.input = input;
      els.button = button;
      els.status = status;

      button.addEventListener('click', handleManualSubmit);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); handleManualSubmit(); }
      });

      // Kick off automatic detection. On any failure the manual path
      // (already rendered above) stays available — S1.A3 / S1.A5 / IP2.A3.
      setStatus('Detecting your location...');
      detectGeolocation().then(function (loc) {
        deliver(loc);
      }).catch(function (err) {
        setStatus((err && err.message) || 'Enter a location below to continue.');
        els.input.focus();
      });
    }

    return { renderInto: renderInto };
  }

  function getResolvedLocation() {
    return _resolved;
  }

  var api = {
    acquireLocation: acquireLocation,
    getResolvedLocation: getResolvedLocation,
    _geocode: geocode // exposed for edge-case testing only
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.CLS_Location = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
