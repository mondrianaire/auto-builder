/* ============================================================
 * section-2 — Liquor-store data lookup
 * builder: b2-storelookup
 *
 * Given a coordinate, queries the public OpenStreetMap Overpass API
 * for shop=alcohol (plus shop=wine / shop=beverages) features within
 * a radius and normalizes them to store records.
 *
 * Public surface (per contracts section-2--section-3/4):
 *   findNearbyLiquorStores(lat, lon, radiusMeters) -> Promise resolving to
 *     { status: 'ok'|'empty'|'error', stores: [...], message: string }
 *   each store record: { name, address, lat, lon }
 *
 * The lookup NEVER throws — failures are reported via status.
 * It does NOT compute distance, rank, or select — that is section-3.
 * It does NOT acquire location — that is section-1.
 * ============================================================ */
(function (global) {
  'use strict';

  /* IP1.A1 — canonical Overpass interpreter endpoint. */
  var OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
  var OVERPASS_TIMEOUT_MS = 25000;

  /* Build the Overpass QL query string.
   * IP1.A2 — filters on the shop=alcohol tag (also shop=wine / shop=beverages).
   * IP1.A3 / S2.A3 — constrains to an around:<radius> filter bound to
   *   the user's lat/lon. nodes + ways + relations; `out center;` so
   *   ways/relations carry coordinates. */
  function buildOverpassQuery(lat, lon, radiusMeters) {
    var r = Math.round(radiusMeters);
    var ll = lat + ',' + lon;
    return '[out:json][timeout:25];' +
      '(' +
        'node["shop"="alcohol"](around:' + r + ',' + ll + ');' +
        'way["shop"="alcohol"](around:' + r + ',' + ll + ');' +
        'relation["shop"="alcohol"](around:' + r + ',' + ll + ');' +
        'node["shop"="wine"](around:' + r + ',' + ll + ');' +
        'way["shop"="wine"](around:' + r + ',' + ll + ');' +
        'node["shop"="beverages"](around:' + r + ',' + ll + ');' +
        'way["shop"="beverages"](around:' + r + ',' + ll + ');' +
      ');' +
      'out center tags;';
  }

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

  /* Compose a human-readable address from OSM addr:* tags. */
  function composeAddress(tags) {
    if (!tags) return 'Address not listed';
    var house = tags['addr:housenumber'];
    var street = tags['addr:street'];
    var city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'];
    var state = tags['addr:state'];
    var postcode = tags['addr:postcode'];

    var line1 = '';
    if (house && street) line1 = house + ' ' + street;
    else if (street) line1 = street;

    var parts = [];
    if (line1) parts.push(line1);
    var cityState = [city, state].filter(Boolean).join(', ');
    if (cityState) parts.push(cityState);
    if (postcode) parts.push(postcode);

    var addr = parts.join(', ');
    return addr || 'Address not listed';
  }

  /* Normalize one Overpass element to a store record, or null if it
   * has no usable coordinate. S2.A2 — every record carries name,
   * address, lat, lon; placeholders substituted, never omitted. */
  function normalizeElement(el) {
    var lat, lon;
    if (typeof el.lat === 'number' && typeof el.lon === 'number') {
      lat = el.lat; lon = el.lon;
    } else if (el.center && typeof el.center.lat === 'number' && typeof el.center.lon === 'number') {
      lat = el.center.lat; lon = el.center.lon;
    } else {
      return null; // no coordinate — cannot be a usable result
    }
    var tags = el.tags || {};
    var name = (tags.name || tags['brand'] || '').trim() || 'Unnamed liquor store';
    return {
      name: name,
      address: composeAddress(tags),
      lat: lat,
      lon: lon
    };
  }

  /* Main lookup. Always resolves (never rejects). */
  function findNearbyLiquorStores(lat, lon, radiusMeters) {
    if (typeof lat !== 'number' || typeof lon !== 'number' ||
        !isFinite(lat) || !isFinite(lon)) {
      return Promise.resolve({
        status: 'error',
        stores: [],
        message: 'No valid location was supplied to the store lookup.'
      });
    }
    var radius = (typeof radiusMeters === 'number' && radiusMeters > 0) ? radiusMeters : 4000;
    var query = buildOverpassQuery(lat, lon, radius);

    return fetchWithTimeout(
      OVERPASS_ENDPOINT,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query)
      },
      OVERPASS_TIMEOUT_MS
    ).then(function (resp) {
      if (!resp.ok) {
        // S2.A4 / IP1.A4 — HTTP error reported, not thrown.
        throw new Error(
          'The store directory service returned an error (HTTP ' + resp.status +
          '). It may be busy — please try again in a moment.'
        );
      }
      return resp.json();
    }).then(function (data) {
      var elements = (data && Array.isArray(data.elements)) ? data.elements : [];
      var stores = [];
      var seen = {};
      for (var i = 0; i < elements.length; i++) {
        var rec = normalizeElement(elements[i]);
        if (!rec) continue;
        var key = rec.lat.toFixed(6) + ',' + rec.lon.toFixed(6);
        if (seen[key]) continue;
        seen[key] = true;
        stores.push(rec);
      }
      if (stores.length === 0) {
        // S2.A5 — empty state; caller can widen the radius and retry.
        return {
          status: 'empty',
          stores: [],
          message: 'No liquor stores found within ' +
            Math.round(radius / 1000 * 10) / 10 + ' km of this location.'
        };
      }
      return {
        status: 'ok',
        stores: stores,
        message: 'Found ' + stores.length + ' liquor store' +
          (stores.length === 1 ? '' : 's') + ' nearby.'
      };
    }).catch(function (err) {
      // S2.A4 / IP1.A4 — offline, timeout, parse error, HTTP error:
      // a clear human-readable message, never a crash.
      var msg;
      if (err && err.message === 'timeout') {
        msg = 'The store directory took too long to respond. Check your connection and try again.';
      } else if (err && /HTTP/.test(err.message || '')) {
        msg = err.message;
      } else if (typeof global.navigator !== 'undefined' && global.navigator &&
                 global.navigator.onLine === false) {
        msg = 'You appear to be offline. Connect to the internet and try again.';
      } else {
        msg = 'Could not reach the store directory service. Check your internet connection and try again.';
      }
      return { status: 'error', stores: [], message: msg };
    });
  }

  var api = {
    findNearbyLiquorStores: findNearbyLiquorStores,
    buildOverpassQuery: buildOverpassQuery,   // exposed for edge-case testing
    OVERPASS_ENDPOINT: OVERPASS_ENDPOINT,
    _normalizeElement: normalizeElement       // exposed for edge-case testing
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.CLS_StoreLookup = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
