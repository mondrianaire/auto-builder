// section-2: Map Renderer with Earthquake Markers
// Contracts: section-1--section-2.json (consumes EarthquakeEvent[]),
//            section-2--section-3.json (exposes mount, magnitudeColor, magnitudeRadius).
//
// Initializes a Leaflet map (vendored), attaches OSM tiles, and renders one
// circle marker per event with size+color encoding magnitude.

(function () {
  'use strict';

  // -- Style functions (single source of truth, also used by the legend) --

  /**
   * Bucketed sequential palette (yellow -> red) by magnitude.
   * 5 distinct buckets across [-1, 9+], satisfies TDIP3.A2 / S2.A4 (>= 3 distinct).
   */
  function magnitudeColor(mag) {
    if (mag == null || !Number.isFinite(mag)) return '#9aa0a6'; // gray for unknown
    if (mag < 2)   return '#ffffb2';
    if (mag < 4)   return '#fed976';
    if (mag < 5)   return '#fd8d3c';
    if (mag < 6)   return '#f03b20';
    return '#bd0026';
  }

  /**
   * Pixel radius monotonic in magnitude. For mag <= 0 we clamp to a small floor;
   * otherwise radius = 3 + 1.6 * mag, clamped to a max so M9 doesn't paint the screen.
   * This satisfies TDIP3.A1 / S2.A3 (monotonic; strictly increasing in unsaturated middle).
   */
  function magnitudeRadius(mag) {
    if (mag == null || !Number.isFinite(mag)) return 3;
    var m = Math.max(0, mag);
    var r = 3 + 1.6 * m;
    if (r > 22) r = 22;
    return r;
  }

  // -- Mount + render --

  /**
   * mount(containerId, events) -> { markerCount }
   * Initializes the Leaflet map in the container and places one circle marker per event.
   */
  function mount(containerId, events) {
    if (typeof L === 'undefined') {
      throw new Error('Leaflet (L) is not loaded. Make sure vendor/leaflet/leaflet.js is included before map.js.');
    }
    var container = document.getElementById(containerId);
    if (!container) {
      throw new Error('Map container #' + containerId + ' not found in DOM.');
    }

    var map = L.map(containerId, {
      center: [20, 0],          // global initial view (covers A7)
      zoom: 2,
      worldCopyJump: true,
      minZoom: 1,
      maxZoom: 10,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    var markerCount = 0;
    var safeEvents = Array.isArray(events) ? events : [];
    for (var i = 0; i < safeEvents.length; i++) {
      var ev = safeEvents[i];
      if (!ev || !Number.isFinite(ev.lat) || !Number.isFinite(ev.lon)) continue;

      var marker = L.circleMarker([ev.lat, ev.lon], {
        radius: magnitudeRadius(ev.magnitude),
        color: '#333',
        weight: 1,
        fillColor: magnitudeColor(ev.magnitude),
        fillOpacity: 0.85,
      });

      marker.bindPopup(buildPopupHtml(ev));
      marker.addTo(map);
      markerCount++;
    }

    return { markerCount: markerCount };
  }

  function buildPopupHtml(ev) {
    var when = Number.isFinite(ev.timeMs) && ev.timeMs > 0
      ? new Date(ev.timeMs).toLocaleString()
      : 'Unknown time';
    var mag = (ev.magnitude == null) ? 'n/a' : String(ev.magnitude);
    var place = ev.place ? escapeHtml(ev.place) : 'Unknown location';
    var depth = Number.isFinite(ev.depth) ? (ev.depth.toFixed(1) + ' km') : 'n/a';
    return (
      '<div class="eq-popup">' +
        '<div class="eq-popup__place">' + place + '</div>' +
        '<div class="eq-popup__row"><strong>Magnitude:</strong> ' + escapeHtml(mag) + '</div>' +
        '<div class="eq-popup__row"><strong>Depth:</strong> ' + escapeHtml(depth) + '</div>' +
        '<div class="eq-popup__row"><strong>Time:</strong> ' + escapeHtml(when) + '</div>' +
      '</div>'
    );
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // Browser-global export.
  if (typeof window !== 'undefined') {
    window.EarthquakeMap = {
      mount: mount,
      magnitudeColor: magnitudeColor,
      magnitudeRadius: magnitudeRadius,
    };
  }
})();
