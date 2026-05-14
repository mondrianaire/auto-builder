// section-1: Earthquake Data Fetcher
// Fetches the USGS past-day GeoJSON feed and returns normalized event records.
// Contract: see contracts/original/section-1--section-2.json (and section-1--section-3.json).
//
// Exposes a single async function fetchEarthquakes() that returns either:
//   { ok: true, events: EarthquakeEvent[] }
//   { ok: false, error: { code: 'network'|'parse'|'http', message: string } }
//
// EarthquakeEvent shape:
//   { id: string, magnitude: number|null, place: string|null,
//     timeMs: integer, lat: number, lon: number, depth: number }

// Single named constant for the feed URL (S1.A5).
const USGS_FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

/**
 * Normalize a single GeoJSON Feature from the USGS feed into our internal shape.
 * The feed shape is documented at:
 *   https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
 * Each feature has:
 *   - id (string)
 *   - properties.mag (number|null)
 *   - properties.place (string|null)
 *   - properties.time (epoch ms integer)
 *   - geometry.coordinates = [lon, lat, depth_km]
 */
function normalizeFeature(feature) {
  const props = (feature && feature.properties) || {};
  const coords = (feature && feature.geometry && feature.geometry.coordinates) || [];
  const lon = typeof coords[0] === 'number' ? coords[0] : NaN;
  const lat = typeof coords[1] === 'number' ? coords[1] : NaN;
  const depth = typeof coords[2] === 'number' ? coords[2] : NaN;
  return {
    id: String(feature && feature.id != null ? feature.id : ''),
    magnitude: typeof props.mag === 'number' ? props.mag : null,
    place: typeof props.place === 'string' ? props.place : null,
    timeMs: Number.isFinite(props.time) ? Math.trunc(props.time) : 0,
    lat: lat,
    lon: lon,
    depth: depth,
  };
}

/**
 * Fetch + normalize the past-day USGS feed.
 * Never throws into the UI: returns a structured { ok: false, error } on any failure.
 */
async function fetchEarthquakes() {
  let response;
  try {
    response = await fetch(USGS_FEED_URL, {
      method: 'GET',
      // No credentials/cookies; the feed is public.
      mode: 'cors',
      cache: 'no-store',
    });
  } catch (e) {
    return {
      ok: false,
      error: {
        code: 'network',
        message: 'Could not reach the earthquake data feed. Check your internet connection and try again.',
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: {
        code: 'http',
        message: 'The earthquake data feed responded with an error (HTTP ' + response.status + ').',
      },
    };
  }

  let payload;
  try {
    payload = await response.json();
  } catch (e) {
    return {
      ok: false,
      error: {
        code: 'parse',
        message: 'The earthquake data feed returned an unreadable response.',
      },
    };
  }

  if (!payload || !Array.isArray(payload.features)) {
    return {
      ok: false,
      error: {
        code: 'parse',
        message: 'The earthquake data feed had an unexpected shape.',
      },
    };
  }

  const events = payload.features.map(normalizeFeature);
  return { ok: true, events: events };
}

// Browser-global export. The integrator loads this file via a plain <script> tag,
// so we attach the function to window. (No module bundler, no ESM imports — keeps
// the file:// deployment trivial per A11.)
if (typeof window !== 'undefined') {
  window.EarthquakeData = {
    fetchEarthquakes: fetchEarthquakes,
    USGS_FEED_URL: USGS_FEED_URL,
  };
}
