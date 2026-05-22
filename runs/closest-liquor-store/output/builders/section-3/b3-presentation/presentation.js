/* ============================================================
 * section-3 — Closest-store selection and presentation
 * builder: b3-presentation
 *
 * Given the user's coordinate and a lookup result, computes each
 * store's great-circle distance, selects the single closest, and
 * renders a result card (name, address, distance) plus a directions
 * hand-off link to an external maps service. Renders clear empty /
 * error states. No in-app turn-by-turn navigation (IP4.A2 / S3.A5).
 *
 * Public surface (per contract section-3--section-4):
 *   renderClosestStore({ userLocation, lookupResult, container })
 *     -> { rendered: 'result'|'empty'|'error' }
 *   haversineMeters(lat1, lon1, lat2, lon2)  -> number
 *   selectClosest(userLocation, stores)      -> store record + distanceMeters
 * ============================================================ */
(function (global) {
  'use strict';

  var EARTH_RADIUS_M = 6371000;

  function toRad(deg) { return deg * Math.PI / 180; }

  /* Great-circle (haversine) distance in metres. DCA.3 / S3.A1. */
  function haversineMeters(lat1, lon1, lat2, lon2) {
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_M * c;
  }

  /* Select the single store with the minimum great-circle distance.
   * Returns null if there are no usable stores. */
  function selectClosest(userLocation, stores) {
    if (!userLocation || !Array.isArray(stores) || stores.length === 0) return null;
    var best = null;
    for (var i = 0; i < stores.length; i++) {
      var s = stores[i];
      if (!s || typeof s.lat !== 'number' || typeof s.lon !== 'number') continue;
      var d = haversineMeters(userLocation.lat, userLocation.lon, s.lat, s.lon);
      if (best === null || d < best.distanceMeters) {
        best = {
          name: s.name,
          address: s.address,
          lat: s.lat,
          lon: s.lon,
          distanceMeters: d
        };
      }
    }
    return best;
  }

  /* Human-readable distance — shows both miles and km. */
  function formatDistance(meters) {
    var km = meters / 1000;
    var miles = meters / 1609.344;
    function r(n) { return n < 10 ? Math.round(n * 10) / 10 : Math.round(n); }
    return r(miles) + ' mi (' + r(km) + ' km)';
  }

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  /* Render the closest-store result card. */
  function renderResultCard(container, userLocation, closest) {
    container.innerHTML = '';
    var card = el('div', 'cls-card');

    card.appendChild(el('div', 'cls-card-eyebrow', 'Closest liquor store'));
    card.appendChild(el('h2', 'cls-card-name', closest.name));
    card.appendChild(el('div', 'cls-card-address', closest.address));

    var dist = el('div', 'cls-card-distance');
    dist.appendChild(el('span', 'cls-card-distance-num', formatDistance(closest.distanceMeters)));
    dist.appendChild(el('span', 'cls-card-distance-label', ' from ' +
      ((userLocation && userLocation.label) || 'your location')));
    card.appendChild(dist);

    // IP4.A1 / S3.A3 — directions hand-off: an external maps link
    // prefilled with the chosen store's coordinates. Just a hyperlink,
    // no in-app routing engine (IP4.A2 / S3.A5).
    var coords = closest.lat + ',' + closest.lon;
    var fromCoords = (userLocation && typeof userLocation.lat === 'number')
      ? (userLocation.lat + ',' + userLocation.lon) : '';
    var osmUrl = 'https://www.openstreetmap.org/directions?' +
      (fromCoords ? 'from=' + encodeURIComponent(fromCoords) + '&' : '') +
      'to=' + encodeURIComponent(coords);
    var googleUrl = 'https://www.google.com/maps/dir/?api=1&destination=' +
      encodeURIComponent(coords);

    var actions = el('div', 'cls-card-actions');

    var dirLink = el('a', 'cls-btn cls-btn-primary', 'Get directions');
    dirLink.href = osmUrl;
    dirLink.target = '_blank';
    dirLink.rel = 'noopener noreferrer';

    var mapLink = el('a', 'cls-btn cls-btn-secondary', 'Open in Google Maps');
    mapLink.href = googleUrl;
    mapLink.target = '_blank';
    mapLink.rel = 'noopener noreferrer';

    actions.appendChild(dirLink);
    actions.appendChild(mapLink);
    card.appendChild(actions);

    container.appendChild(card);
  }

  /* Render a clear, human-readable empty/error state — never blank. */
  function renderMessageState(container, kind, headline, detail) {
    container.innerHTML = '';
    var box = el('div', 'cls-msg cls-msg-' + kind);
    box.appendChild(el('div', 'cls-msg-headline', headline));
    if (detail) box.appendChild(el('div', 'cls-msg-detail', detail));
    container.appendChild(box);
  }

  /* Main entry per the section-3--section-4 contract. */
  function renderClosestStore(params) {
    params = params || {};
    var userLocation = params.userLocation;
    var lookupResult = params.lookupResult || {};
    var container = params.container;
    if (!container) return { rendered: 'error' };

    // S3.A4 — error state from upstream.
    if (lookupResult.status === 'error') {
      renderMessageState(container, 'error', 'Something went wrong',
        lookupResult.message || 'The store lookup could not be completed. Please try again.');
      return { rendered: 'error' };
    }

    // S3.A4 — empty state (no stores in the searched radius).
    if (lookupResult.status === 'empty' ||
        !Array.isArray(lookupResult.stores) || lookupResult.stores.length === 0) {
      renderMessageState(container, 'empty', 'No liquor store found nearby',
        lookupResult.message ||
        'There were no liquor stores within the search area. Try a wider search or a different location.');
      return { rendered: 'empty' };
    }

    // S3.A1 / IP3.A1 — pick the single closest store.
    var closest = selectClosest(userLocation, lookupResult.stores);
    if (!closest) {
      renderMessageState(container, 'empty', 'No liquor store found nearby',
        'The nearby stores were missing location data, so a closest store could not be determined.');
      return { rendered: 'empty' };
    }

    // S3.A2 / IP3.A2 — card with name, address, distance.
    renderResultCard(container, userLocation, closest);
    return { rendered: 'result' };
  }

  var api = {
    renderClosestStore: renderClosestStore,
    haversineMeters: haversineMeters,
    selectClosest: selectClosest,
    formatDistance: formatDistance
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.CLS_Presentation = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
