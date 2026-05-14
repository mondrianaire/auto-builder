// section-3: Page bootstrap. Wires section-1 (data) + section-2 (map) on DOMContentLoaded.

(function () {
  'use strict';

  // The legend buckets MUST line up with the buckets in EarthquakeMap.magnitudeColor.
  // We feed representative magnitudes through the shared style functions so the legend
  // is always consistent with the markers (single source of truth).
  var LEGEND_BUCKETS = [
    { label: 'M < 2',   sample: 1 },
    { label: 'M 2 - 4', sample: 3 },
    { label: 'M 4 - 5', sample: 4.5 },
    { label: 'M 5 - 6', sample: 5.5 },
    { label: 'M 6+',    sample: 7 },
  ];

  function renderLegend() {
    var list = document.getElementById('legend-list');
    if (!list) return;
    if (!window.EarthquakeMap) return;
    list.innerHTML = '';
    for (var i = 0; i < LEGEND_BUCKETS.length; i++) {
      var b = LEGEND_BUCKETS[i];
      var color = window.EarthquakeMap.magnitudeColor(b.sample);
      var radius = window.EarthquakeMap.magnitudeRadius(b.sample);
      var diameter = Math.round(radius * 2);

      var li = document.createElement('li');
      li.className = 'legend__item';

      var swatch = document.createElement('span');
      swatch.className = 'legend__swatch';
      swatch.style.width = diameter + 'px';
      swatch.style.height = diameter + 'px';
      swatch.style.background = color;

      var label = document.createElement('span');
      label.className = 'legend__label';
      label.textContent = b.label;

      li.appendChild(swatch);
      li.appendChild(label);
      list.appendChild(li);
    }
  }

  function showError(message) {
    var banner = document.getElementById('error-banner');
    var text = document.getElementById('error-banner-text');
    if (text) text.textContent = message || 'Could not load earthquake data.';
    if (banner) banner.hidden = false;
  }

  async function bootstrap() {
    renderLegend();

    if (!window.EarthquakeData || typeof window.EarthquakeData.fetchEarthquakes !== 'function') {
      showError('Internal error: data fetcher module missing.');
      return;
    }
    if (!window.EarthquakeMap || typeof window.EarthquakeMap.mount !== 'function') {
      showError('Internal error: map module missing.');
      return;
    }

    var result;
    try {
      result = await window.EarthquakeData.fetchEarthquakes();
    } catch (e) {
      // Defensive: the fetcher contract says it never throws, but if it does we still
      // present a friendly banner instead of a blank page.
      showError('Could not load earthquake data. Please check your internet connection and try again.');
      return;
    }

    if (!result || result.ok !== true) {
      var msg = (result && result.error && result.error.message)
        ? result.error.message
        : 'Could not load earthquake data.';
      showError(msg);
      return;
    }

    try {
      window.EarthquakeMap.mount('map', result.events);
    } catch (e) {
      showError('Could not render the map. ' + (e && e.message ? e.message : ''));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
