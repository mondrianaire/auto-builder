// derivers-tests.js — pure-function tests for data-derivers.js.
// Run under Node via dynamic import (data-derivers is plain ESM).

const fs = require('fs');
const path = require('path');
const url = require('url');

const DERIVERS_URL = url.pathToFileURL(
  path.resolve(__dirname, '..', '..', '..', 'integration', 'js', 'data-derivers.js')
).href;

const results = [];
function record(id, pass, detail) {
  results.push({ id, result: pass ? 'pass' : 'fail', detail });
}

(async function main() {
  const { computeCurrentStreak, computeMostUsedLanguage, sliceLast90Days } = await import(DERIVERS_URL);

  // --- MCA.data-derivers.1 — empty input ---
  {
    const r = computeCurrentStreak([]);
    record('MCA.data-derivers.1', r.streak_days === 0 && r.anchor_date === null,
      `computeCurrentStreak([]) -> ${JSON.stringify(r)}`);
  }

  // --- MCA.data-derivers.2 — last 5 days all positive, streak >= 5 ---
  {
    const days = [
      { date: '2026-05-12', contribution_count: 1, weekday: 2 },
      { date: '2026-05-13', contribution_count: 1, weekday: 3 },
      { date: '2026-05-14', contribution_count: 1, weekday: 4 },
      { date: '2026-05-15', contribution_count: 1, weekday: 5 },
      { date: '2026-05-16', contribution_count: 1, weekday: 6 }
    ];
    const r = computeCurrentStreak(days);
    record('MCA.data-derivers.2', r.streak_days >= 5,
      `5-positive-day series -> streak_days=${r.streak_days}, anchor_date=${r.anchor_date}`);
  }

  // --- MCA.data-derivers.3 — fork excluded; JS wins ---
  {
    const r = computeMostUsedLanguage([
      { is_fork: false, languages_bytes: { JavaScript: 1000, Python: 500 } },
      { is_fork: true,  languages_bytes: { Ruby: 9999 } }
    ]);
    record('MCA.data-derivers.3', r.language === 'JavaScript',
      `mixed-with-fork -> language=${r.language}, bytes=${r.bytes}, share_pct=${r.share_pct}`);
  }

  // --- MCA.data-derivers.4 — no eligible repos ---
  {
    const r1 = computeMostUsedLanguage([]);
    const r2 = computeMostUsedLanguage([{ is_fork: true, languages_bytes: { X: 1 } }]);
    const r3 = computeMostUsedLanguage([{ is_fork: false, languages_bytes: {} }]);
    const allOK = (r1.language === null && r1.bytes === 0)
               && (r2.language === null && r2.bytes === 0)
               && (r3.language === null && r3.bytes === 0);
    record('MCA.data-derivers.4', allOK,
      `empty=${JSON.stringify(r1)}, all-forks=${JSON.stringify(r2)}, empty-langs=${JSON.stringify(r3)}`);
  }

  // --- MCA.data-derivers.5 — sliceLast90Days always length 90 ---
  {
    const r1 = sliceLast90Days([], '2026-05-16');
    const r2 = sliceLast90Days(
      [{ date: '2026-05-16', contribution_count: 5, weekday: 6 }],
      '2026-05-16'
    );
    const longSeries = [];
    for (let i = 0; i < 365; i++) {
      const d = new Date(Date.UTC(2025, 4, 17 + i));
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      longSeries.push({ date: `${yyyy}-${mm}-${dd}`, contribution_count: i % 5, weekday: d.getUTCDay() });
    }
    const r3 = sliceLast90Days(longSeries, '2026-05-16');
    const allLen90 = r1.length === 90 && r2.length === 90 && r3.length === 90;
    record('MCA.data-derivers.5', allLen90,
      `lengths: empty=${r1.length}, single=${r2.length}, year=${r3.length}`);
  }

  // --- DCA.A6 — today-with-zero does not break the streak ---
  {
    // Last day = 0 contributions, prior 4 days all positive.
    const days = [
      { date: '2026-05-11', contribution_count: 1, weekday: 1 },
      { date: '2026-05-12', contribution_count: 1, weekday: 2 },
      { date: '2026-05-13', contribution_count: 1, weekday: 3 },
      { date: '2026-05-14', contribution_count: 1, weekday: 4 },
      { date: '2026-05-15', contribution_count: 1, weekday: 5 },
      { date: '2026-05-16', contribution_count: 0, weekday: 6 }
    ];
    const r = computeCurrentStreak(days);
    // Per DCA.A6: today-with-zero must not break the streak — anchor falls on prior positive day.
    record('DCA.A6', r.streak_days === 5 && r.anchor_date === '2026-05-15',
      `today-is-zero, 5 positive prior -> ${JSON.stringify(r)}`);
  }

  // --- DCA.A7 — bytes-weighted, forks excluded ---
  {
    const r = computeMostUsedLanguage([
      { is_fork: false, languages_bytes: { Go: 500, TypeScript: 1500 } },
      { is_fork: false, languages_bytes: { TypeScript: 800 } },
      { is_fork: true,  languages_bytes: { Go: 10000 } }
    ]);
    // TypeScript = 1500 + 800 = 2300; Go = 500. TypeScript wins. Fork Go ignored.
    record('DCA.A7', r.language === 'TypeScript' && r.bytes === 2300,
      `bytes-weighted excluding fork -> ${JSON.stringify(r)}`);
  }

  // --- DCA.IP3 — tie-break alphabetical ---
  {
    const r = computeMostUsedLanguage([
      { is_fork: false, languages_bytes: { Zig: 1000, Apple: 1000 } }
    ]);
    record('DCA.IP3', r.language === 'Apple',
      `tie-break alphabetical -> ${JSON.stringify(r)}`);
  }

  // --- DCA.A8 / DCA.PN6 — 90-day slice padding ---
  {
    const r = sliceLast90Days(
      [{ date: '2026-05-16', contribution_count: 7, weekday: 6 }],
      '2026-05-16'
    );
    const lastEntry = r[r.length - 1];
    const firstEntry = r[0];
    const leadingZeros = r.slice(0, 89).every(e => e.contribution_count === 0);
    record('DCA.A8', r.length === 90 && lastEntry.date === '2026-05-16' && lastEntry.contribution_count === 7 && leadingZeros,
      `1-day input padded to 90; last=${lastEntry.date}/${lastEntry.contribution_count}, first=${firstEntry.date}, leading-zeros=${leadingZeros}`);
  }

  const reportPath = path.join(__dirname, 'test-report.partial-derivers.json');
  const summary = {
    total: results.length,
    pass: results.filter(r => r.result === 'pass').length,
    fail: results.filter(r => r.result === 'fail').length
  };
  fs.writeFileSync(reportPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    test_environment: {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      derivers_module: DERIVERS_URL
    },
    results,
    summary
  }, null, 2));

  const failed = results.filter(r => r.result === 'fail');
  if (failed.length) {
    console.log('Derivers tests: FAIL count =', failed.length);
    for (const f of failed) console.log(' -', f.id, '-', f.detail);
    process.exitCode = 1;
  } else {
    console.log(`Derivers tests: ${summary.pass} pass, 0 fail.`);
  }
  console.log('Wrote', reportPath);
})().catch(err => {
  console.error('derivers-tests.js threw:', err);
  process.exit(2);
});
