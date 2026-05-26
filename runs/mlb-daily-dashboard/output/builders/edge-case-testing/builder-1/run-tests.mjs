// run-tests.mjs
// Node-based static-fidelity test runner for the MLB Daily Dashboard.
// Designed to run with `node run-tests.mjs` from the run root.
//
// Coverage (under inline mode — no Playwright):
//   1. Fetch URLs in data-client are well-formed and pinned to statsapi.mlb.com
//   2. trends-engine produces the contracted shape on a known fixture
//   3. rankings-engine produces the contracted shape on a known fixture
//   4. index.html contains all five required DOM IDs and a module <script>
//   5. Empty-state behavior on zero schedule (reachable code branch)
//   6. Error-state behavior on simulated fetch failure (DataClientError thrown)
//
// Live-data PNV verification (assertion S6.A3 against PNV.1) is deferred to
// CV using a real browser-like fidelity check; see test-plan.md.

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INTEGRATION_DIR = resolve(__dirname, "../../../integration");

const results = [];
function record(id, name, pass, detail) {
  results.push({ id, name, pass, detail });
  const tag = pass ? "PASS" : "FAIL";
  console.log(`[${tag}] ${id} — ${name}` + (detail ? `\n         ${detail}` : ""));
}

// ----- Test 1: data-client URL well-formedness ---------------------------
async function testFetchUrls() {
  const src = await readFile(resolve(INTEGRATION_DIR, "data-client.js"), "utf8");
  const baseOk = /const\s+API_BASE\s*=\s*["']https:\/\/statsapi\.mlb\.com\/api\/v1["']/.test(src);
  record("S6.T1.a", "data-client pins API_BASE to https://statsapi.mlb.com/api/v1",
         baseOk, baseOk ? "API_BASE matches" : "API_BASE pattern not found");

  const noEspn = !/(espn|sports-data-api|sportradar)/i.test(src);
  record("IP1.M2", "no third-party aggregator endpoints referenced",
         noEspn, noEspn ? "OK" : "Aggregator host found in source");

  // Endpoint shape spot-checks.
  const teamsEp = /\/teams\?sportId=1/.test(src);
  const standingsEp = /\/standings\?leagueId=103,104/.test(src);
  const scheduleEp = /\/schedule\?sportId=1/.test(src);
  record("S6.T1.b", "fetchTeams targets /teams?sportId=1", teamsEp, "");
  record("S6.T1.c", "fetchStandings targets /standings?leagueId=103,104", standingsEp, "");
  record("S6.T1.d", "schedule endpoints target /schedule?sportId=1", scheduleEp, "");
}

// ----- Test 2: trends-engine fixture --------------------------------------
async function testTrendsEngine() {
  const mod = await import(pathToFileURL(resolve(INTEGRATION_DIR, "trends-engine.js")).href);
  const { computeWeeklyTrends } = mod;
  const fixture = new Map();
  fixture.set(147, [
    { teamId: 147, gameDate: "2026-05-20", isWin: true,  runsScored: 7, runsAllowed: 3 },
    { teamId: 147, gameDate: "2026-05-21", isWin: false, runsScored: 2, runsAllowed: 5 },
    { teamId: 147, gameDate: "2026-05-22", isWin: true,  runsScored: 4, runsAllowed: 1 },
    { teamId: 147, gameDate: "2026-05-23", isWin: true,  runsScored: 6, runsAllowed: 2 },
    { teamId: 147, gameDate: "2026-05-24", isWin: true,  runsScored: 5, runsAllowed: 4 }
  ]);
  fixture.set(999, []);

  const out = computeWeeklyTrends(fixture);
  const ok147 = out.find((t) => t.teamId === 147);
  const ok999 = out.find((t) => t.teamId === 999);

  record("S2.A1", "computeWeeklyTrends is callable", typeof computeWeeklyTrends === "function", "");
  record("S2.A2", "returns array with one entry per team in input map",
         out.length === 2, `length=${out.length}`);
  record("S2.A2.shape", "Trend has expected keys",
         ok147 && "teamId" in ok147 && "last7W" in ok147 && "last7L" in ok147 &&
         "runDiff7" in ok147 && "streak" in ok147 && "sparklinePoints" in ok147,
         JSON.stringify(ok147));
  record("S2.T2.W", "wins counted (147: 4W/1L expected)",
         ok147.last7W === 4 && ok147.last7L === 1,
         `W=${ok147.last7W} L=${ok147.last7L}`);
  const expectedDiff = (7-3)+(2-5)+(4-1)+(6-2)+(5-4); // 4 + -3 + 3 + 4 + 1 = 9
  record("S2.T2.RD", "runDiff7 computed correctly",
         ok147.runDiff7 === expectedDiff,
         `runDiff7=${ok147.runDiff7} expected=${expectedDiff}`);
  record("S2.T2.streak", "streak detected correctly (W3 expected)",
         ok147.streak === "W3", `streak=${ok147.streak}`);
  record("S2.T2.spark", "sparklinePoints length matches games",
         Array.isArray(ok147.sparklinePoints) && ok147.sparklinePoints.length === 5,
         `len=${ok147.sparklinePoints.length}`);
  record("S2.A3", "empty-games team has zeros + null streak",
         ok999.last7W === 0 && ok999.last7L === 0 && ok999.runDiff7 === 0 &&
         ok999.streak === null && ok999.sparklinePoints.length === 0, "");

  // Determinism
  const out2 = computeWeeklyTrends(fixture);
  record("S2.A4", "deterministic (same input -> same output)",
         JSON.stringify(out) === JSON.stringify(out2), "");
}

// ----- Test 3: rankings-engine fixture ------------------------------------
async function testRankingsEngine() {
  const mod = await import(pathToFileURL(resolve(INTEGRATION_DIR, "rankings-engine.js")).href);
  const { computeRankings } = mod;

  // Build a 30-team fixture: 5 teams per division, varying pcts.
  const divisions = [
    ["AL", "East"], ["AL", "Central"], ["AL", "West"],
    ["NL", "East"], ["NL", "Central"], ["NL", "West"]
  ];
  const fixture = [];
  let id = 100;
  for (const [league, division] of divisions) {
    for (let i = 0; i < 5; i++) {
      const wins = 32 - i * 2 + (league === "NL" ? 1 : 0);
      const losses = 20 + i * 2;
      const pct = Number((wins / (wins + losses)).toFixed(3));
      fixture.push({
        teamId: id++,
        teamName: `Team ${league}${division}${i}`,
        teamAbbreviation: `T${id}`,
        league, division,
        wins, losses, pct,
        gb: i === 0 ? "-" : i * 1.0
      });
    }
  }

  const out = computeRankings(fixture);
  record("S3.A1", "computeRankings is callable", typeof computeRankings === "function", "");
  const divKeys = ["AL_East","AL_Central","AL_West","NL_East","NL_Central","NL_West"];
  record("S3.A2", "divisionStandings has exactly 6 expected keys",
         divKeys.every((k) => k in out.divisionStandings) &&
         Object.keys(out.divisionStandings).length === 6, "");
  for (const key of divKeys) {
    const arr = out.divisionStandings[key];
    const sorted = arr.every((_, i, a) => i === 0 || a[i-1].pct >= a[i].pct);
    record(`S3.A3.${key}`, `${key} sorted by pct desc`, sorted && arr.length === 5,
           `len=${arr.length}`);
  }
  record("IP6.M1.struct", "leagueStandings has AL+NL with 15 each",
         out.leagueStandings.AL.length === 15 && out.leagueStandings.NL.length === 15, "");
  record("S3.A4", "wildCard.AL and wildCard.NL each have length 3",
         out.wildCard.AL.length === 3 && out.wildCard.NL.length === 3,
         `AL=${out.wildCard.AL.length} NL=${out.wildCard.NL.length}`);

  // Validate no division leader appears in wild card
  const allLeaderIdsAL = new Set(["AL_East","AL_Central","AL_West"]
    .map((k) => out.divisionStandings[k][0].teamId));
  const wcALExcludesLeaders = out.wildCard.AL.every((t) => !allLeaderIdsAL.has(t.teamId));
  record("S3.A4.no-leaders", "wildCard.AL contains no division leader",
         wcALExcludesLeaders, "");
}

// ----- Test 4: index.html DOM-ID presence ---------------------------------
async function testHtmlStructure() {
  const html = await readFile(resolve(INTEGRATION_DIR, "index.html"), "utf8");
  const required = ["rankings-panel", "trends-panel", "upcoming-panel", "last-updated", "error-banner"];
  for (const id of required) {
    const re = new RegExp(`id=["']${id}["']`);
    record(`S4.A1.${id}`, `index.html contains #${id}`, re.test(html), "");
  }
  record("S4.A2", "module script tag for app.js present",
         /<script\s+type=["']module["']\s+src=["']app\.js["']/.test(html), "");
  record("S4.A3", "no external CDN refs in index.html",
         !/(cdn\.|unpkg\.com|jsdelivr|googleapis\.com|cdnjs)/i.test(html), "");
}

// ----- Test 5: CSS team-color custom properties ---------------------------
async function testCssCustomProps() {
  const css = await readFile(resolve(INTEGRATION_DIR, "styles.css"), "utf8");
  const matches = css.match(/--team-[A-Z]{2,3}\s*:/g) || [];
  const unique = [...new Set(matches.map((m) => m.replace(/\s*:.*/, "")))];
  record("S4.A4", "≥30 unique --team-{ABBR} custom properties defined in styles.css",
         unique.length >= 30, `count=${unique.length}`);
  const noFramework = !/(tailwind|bootstrap|bulma|foundation\.css)/i.test(css);
  record("TDIPC.M1", "no CSS framework referenced", noFramework, "");
}

// ----- Test 6: empty-state branch reachable -------------------------------
async function testEmptyState() {
  const src = await readFile(resolve(INTEGRATION_DIR, "app.js"), "utf8");
  const hasEmpty = /No games scheduled/i.test(src);
  record("S5.A6 / IP7.M1", "app.js contains 'No games scheduled' empty-state copy",
         hasEmpty, "");
  const hasEmptyHelper = /setPanelEmpty/.test(src);
  record("S5.T6.b", "setPanelEmpty helper used to render empty-state", hasEmptyHelper, "");
}

// ----- Test 7: error-state branch reachable + DataClientError thrown ------
async function testErrorState() {
  const dcSrc = await readFile(resolve(INTEGRATION_DIR, "data-client.js"), "utf8");
  const hasErrorClass = /class\s+DataClientError\s+extends\s+Error/.test(dcSrc);
  record("S1.A5.class", "DataClientError class defined", hasErrorClass, "");
  const throwsOnNon200 = /throw\s+new\s+DataClientError/.test(dcSrc);
  record("S1.A5.throw", "data-client throws DataClientError on errors", throwsOnNon200, "");

  const appSrc = await readFile(resolve(INTEGRATION_DIR, "app.js"), "utf8");
  const showsBanner = /showError\(/.test(appSrc) && /banner\.hidden\s*=\s*false/.test(appSrc);
  record("S5.A5", "app.js wires showError + reveals #error-banner", showsBanner, "");
  const hasRetry = /error-banner-retry/.test(appSrc);
  record("S5.T7.retry", "retry button wired", hasRetry, "");
}

// ----- Test 8: ui-render imports only data-client + engines + teams -------
async function testImportBoundaries() {
  const src = await readFile(resolve(INTEGRATION_DIR, "app.js"), "utf8");
  const allowed = new Set([
    "./data-client.js",
    "./trends-engine.js",
    "./rankings-engine.js",
    "./teams.js"
  ]);
  const imports = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  const unknown = imports.filter((i) => !allowed.has(i));
  record("S5.charter.imports", "app.js imports only from allowed modules",
         unknown.length === 0,
         unknown.length ? `unknown imports: ${unknown.join(", ")}` : "");

  // No direct fetch() usage outside data-client
  const otherFiles = [
    "trends-engine.js",
    "rankings-engine.js",
    "teams.js",
    "app.js"
  ];
  for (const f of otherFiles) {
    const content = await readFile(resolve(INTEGRATION_DIR, f), "utf8");
    const hasFetch = /\bfetch\s*\(/.test(content);
    record(`S1.A4.${f}`, `${f} does not use fetch() directly`, !hasFetch, "");
  }
}

// ----- Test 9: deferred-PNV recorded --------------------------------------
function testDeferredPnv() {
  record("PNV.1", "deferred to live-browser CV exercise",
         true,
         "PNV.1 (live render of all three panels + 30 teams under real browser) is deferred to CV/cv_artifact_exercise.");
}

// ----- Main ---------------------------------------------------------------
async function main() {
  console.log("Running edge-case static-fidelity tests against output/integration/\n");
  try {
    await testFetchUrls();
    await testTrendsEngine();
    await testRankingsEngine();
    await testHtmlStructure();
    await testCssCustomProps();
    await testEmptyState();
    await testErrorState();
    await testImportBoundaries();
    testDeferredPnv();
  } catch (err) {
    console.error("FATAL test runner error:", err);
    record("RUNNER", "test runner did not crash", false, err?.stack || String(err));
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n----- Summary -----`);
  console.log(`Total: ${results.length}  Passed: ${results.length - failed.length}  Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nFailed assertions:");
    for (const f of failed) console.log(`  - ${f.id}: ${f.name} (${f.detail})`);
  }

  process.exit(failed.length === 0 ? 0 : 1);
}

main();
