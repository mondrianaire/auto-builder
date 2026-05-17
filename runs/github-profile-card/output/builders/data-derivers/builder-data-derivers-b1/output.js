// data-derivers.js — pure metric-derivation functions for the profile card.
// No I/O, no DOM, no fetch, no timers. Fully deterministic.

/**
 * computeCurrentStreak(days)
 * days: Array<{date: string YYYY-MM-DD, contribution_count: number, weekday?: number}>
 *       ascending by date.
 * Returns: {streak_days: number, anchor_date: string|null}.
 *
 * Logic: starting from the last day in `days`, walk backward. If the most
 * recent day has 0 contributions but the day before has >=1, "today-with-zero"
 * does NOT break the streak — set the anchor at the prior positive day and
 * count from there. If `days` is empty or no day has any contributions,
 * return {streak_days: 0, anchor_date: null}.
 */
export function computeCurrentStreak(days) {
  if (!Array.isArray(days) || days.length === 0) {
    return { streak_days: 0, anchor_date: null };
  }
  // Find the most-recent index with contribution_count > 0.
  let anchorIdx = -1;
  for (let i = days.length - 1; i >= 0; i--) {
    if ((days[i].contribution_count ?? 0) > 0) {
      anchorIdx = i;
      break;
    }
  }
  if (anchorIdx === -1) {
    return { streak_days: 0, anchor_date: null };
  }
  // Count consecutive positive days ending at anchorIdx (walking backward).
  let count = 0;
  for (let i = anchorIdx; i >= 0; i--) {
    if ((days[i].contribution_count ?? 0) > 0) {
      count += 1;
    } else {
      break;
    }
  }
  return { streak_days: count, anchor_date: days[anchorIdx].date };
}

/**
 * computeMostUsedLanguage(repos)
 * repos: Array<{is_fork: boolean, languages_bytes: Object<string, number>}>
 * Returns: {language: string|null, bytes: number, share_pct: number}.
 *
 * Sums bytes per language across all non-fork repos. Returns the language
 * with the largest byte total (ties broken alphabetically) and its share
 * of total bytes (rounded to 1 decimal). No eligible repos => language null.
 */
export function computeMostUsedLanguage(repos) {
  if (!Array.isArray(repos) || repos.length === 0) {
    return { language: null, bytes: 0, share_pct: 0 };
  }
  const totals = Object.create(null);
  let grandTotal = 0;
  for (const repo of repos) {
    if (!repo || repo.is_fork === true) continue;
    const langs = repo.languages_bytes;
    if (!langs || typeof langs !== 'object') continue;
    for (const [lang, bytes] of Object.entries(langs)) {
      const n = Number(bytes);
      if (!Number.isFinite(n) || n <= 0) continue;
      totals[lang] = (totals[lang] || 0) + n;
      grandTotal += n;
    }
  }
  const langs = Object.keys(totals);
  if (langs.length === 0 || grandTotal === 0) {
    return { language: null, bytes: 0, share_pct: 0 };
  }
  // Sort: highest bytes first; tie-break alphabetical ascending.
  langs.sort((a, b) => {
    const db = totals[b] - totals[a];
    if (db !== 0) return db;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const winner = langs[0];
  const wb = totals[winner];
  const share = Math.round((wb / grandTotal) * 1000) / 10;
  return { language: winner, bytes: wb, share_pct: share };
}

/**
 * sliceLast90Days(days, today_utc_yyyy_mm_dd)
 * Returns an array of exactly 90 entries ending at today_utc_yyyy_mm_dd,
 * padding the leading edge with zero-contribution entries if `days` covers
 * fewer than 90 trailing days.
 */
export function sliceLast90Days(days, today_utc_yyyy_mm_dd) {
  if (!today_utc_yyyy_mm_dd || typeof today_utc_yyyy_mm_dd !== 'string') {
    throw new Error('sliceLast90Days requires today_utc_yyyy_mm_dd as YYYY-MM-DD string');
  }
  // Build the trailing 90-day date sequence ending at today_utc.
  const endParts = today_utc_yyyy_mm_dd.split('-').map(Number);
  const end = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));
  const expectedDates = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 24 * 60 * 60 * 1000);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    expectedDates.push(`${yyyy}-${mm}-${dd}`);
  }
  // Index input days for O(1) lookup.
  const byDate = Object.create(null);
  if (Array.isArray(days)) {
    for (const d of days) {
      if (d && typeof d.date === 'string') {
        byDate[d.date] = d;
      }
    }
  }
  return expectedDates.map(date => {
    const found = byDate[date];
    if (found) {
      return {
        date,
        contribution_count: found.contribution_count ?? 0,
        weekday: typeof found.weekday === 'number'
          ? found.weekday
          : new Date(`${date}T00:00:00Z`).getUTCDay()
      };
    }
    return {
      date,
      contribution_count: 0,
      weekday: new Date(`${date}T00:00:00Z`).getUTCDay()
    };
  });
}
