#!/usr/bin/env node
/**
 * aggregate.mjs
 *
 * Codex aggregator. Walks `runs/` and `architecture/` from the Auto Builder
 * project root and emits structured JSON into `codex/data/`.
 *
 * Inputs (read-only):
 *   runs/{slug}/run-report.md
 *   runs/{slug}/decisions/discovery/ledger-v1.json
 *   runs/{slug}/decisions/technical-discovery/sections-v{N}.json
 *   runs/{slug}/decisions/editor/review-v{N}.json          (v1.9+, optional)
 *   runs/{slug}/decisions/discovery/demotion-v{N}.json     (v1.9+, optional)
 *   runs/{slug}/output/verification/report.json
 *   runs/{slug}/audit/flags.jsonl
 *   runs/{slug}/state/coordinator/dispatch-log.jsonl
 *   runs/{slug}/history/log.jsonl
 *   architecture/README.md      (version history → amendments)
 *   architecture/principles.md  (principles A–H, optional)
 *
 * Outputs (the only files this script writes):
 *   codex/data/index.json
 *   codex/data/runs/{slug}.json
 *
 * Cardinal rule: this script never edits anything under runs/ or architecture/.
 * It is strictly a derivation pass over the substrate.
 *
 * Run with: node codex/scripts/aggregate.mjs
 * Or via:   build-codex.bat  (from the project root)
 *
 * Tolerance policy:
 *   Missing or malformed source files do not crash the aggregator. Each
 *   parser returns `null` (or zero for counters) on failure and logs a
 *   warning to stderr. The dashboard renders partial data gracefully.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// v0.2 modules: event extraction + role attribution + narrative
import { extractEvents, roleTotals, corpusRoleTotals, firstDeliveryDistribution, extractRevisions, tagEventsWithRevisions } from './events.mjs';
import { generateNarrative } from './narrative.mjs';
import { detectDeliverableKind, composeLiveUrl, loadCodexConfig, walkFileTree } from './deliverable.mjs';
import { writeAllShowcases } from './showcase.mjs';
import { collectHandoffs } from './coordination.mjs';
import { readGitLog } from './readGitLog.mjs';

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..'); // codex/scripts/ -> root
const RUNS_DIR = path.join(PROJECT_ROOT, 'runs');
const ARCH_DIR = path.join(PROJECT_ROOT, 'architecture');
const DATA_DIR = path.join(PROJECT_ROOT, 'codex', 'data');
const DATA_RUNS_DIR = path.join(DATA_DIR, 'runs');
const CURATION_DIR = path.join(DATA_DIR, 'curation');
const SHOWCASE_DIR = path.join(PROJECT_ROOT, 'codex', 'showcase');
const DOCS_DIR = path.join(PROJECT_ROOT, 'codex', 'docs');

const SCHEMA_VERSION = '0.1';
const CODEX_VERSION = '0.1';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function warn(...args) {
  console.error('[codex/aggregate]', ...args);
}

async function exists(p) {
  try { await fs.stat(p); return true; } catch { return false; }
}

async function readJson(p) {
  try {
    const text = await fs.readFile(p, 'utf8');
    return JSON.parse(text);
  } catch (err) {
    if (err.code !== 'ENOENT') warn(`could not parse ${p}: ${err.message}`);
    return null;
  }
}

async function readText(p) {
  try { return await fs.readFile(p, 'utf8'); }
  catch (err) {
    if (err.code !== 'ENOENT') warn(`could not read ${p}: ${err.message}`);
    return null;
  }
}

async function readJsonl(p) {
  const text = await readText(p);
  if (text == null) return [];
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const out = [];
  for (const line of lines) {
    try { out.push(JSON.parse(line)); }
    catch (err) { warn(`bad jsonl line in ${p}: ${err.message}`); }
  }
  return out;
}

async function listDir(p) {
  try { return await fs.readdir(p, { withFileTypes: true }); }
  catch (err) {
    if (err.code !== 'ENOENT') warn(`could not list ${p}: ${err.message}`);
    return [];
  }
}

function truncate(s, n) {
  if (!s) return s;
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

// ---------------------------------------------------------------------------
// Run-report parser
// ---------------------------------------------------------------------------
//
// The run-report.md format is conventional but not strict. We use regex over
// the markdown headings and bullet patterns. Conventions observed across the
// existing nine runs:
//
//   - First H1 is the run title.
//   - `**Prompt:**` line on its own.
//   - `**Date:**` line in YYYY-MM-DD.
//   - `**Architecture version:**` line (v1.x+ runs).
//   - `**Verdict:**` or `**CV verdict:**` line.
//   - `**Deliverable:**` or `**Final artifact:**` line.
//   - `## What worked` and `## What broke (or strained)` (or similar) sections.
//   - `## Phase timing` or `## Phase summary` table.
//   - `v1.10 candidate:` (or vX.Y candidate:) bullets sprinkled in `What broke`.
//
// Anything we can't find is set to null. The dashboard renders nulls as "—".

function parseRunReport(text, slug) {
  if (!text) return null;
  const out = {
    raw_length: text.length,
    title: null,
    prompt: null,
    date: null,
    architecture_version: null,
    dispatch_mode: null,
    verdict: null,
    deliverable: null,
    what_worked: [],
    what_broke: [],
    amendment_candidates: [],
    uncertainty_manifest: [],
    phases: []
  };

  const titleMatch = text.match(/^#\s+(.+)$/m);
  if (titleMatch) out.title = titleMatch[1].trim();

  // Match: **Prompt:** "..."  OR  **Prompt:** ...
  // Tolerates variants: "Build prompt", "Build prompt (excerpt)", "Initial prompt"
  const promptMatch =
        text.match(/\*\*(?:Build\s+|Initial\s+)?Prompt(?:\s*\([^)]*\))?:?\*\*[ \t]*"?([^"\n]+?)"?[ \t]*(?:\n|$)/i);
  if (promptMatch) out.prompt = promptMatch[1].trim();

  const dateMatch = text.match(/\*\*Date:?\*\*[ \t]*([0-9]{4}-[0-9]{2}-[0-9]{2})/i)
                    || text.match(/\*\*Run started:?\*\*[ \t]*([0-9]{4}-[0-9]{2}-[0-9]{2})/i)
                    || text.match(/\*\*Build (?:date|started):?\*\*[ \t]*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  if (dateMatch) out.date = dateMatch[1];

  // Architecture version: tolerate "Architecture version", "Architecture version under build",
  // "Architecture version under build (initial run)", etc. — but require the captured value to
  // begin with a `vN[.N]` token so a bullet like "**Architecture v1.1 refinements held.**" does
  // not get mistaken for a header line.
  let archMatch = null;
  const archCandidates = [
    /\*\*Architecture version(?:\s+under build)?(?:\s*\([^)]*\))?:?\*\*[ \t]*(v[0-9]+(?:\.[0-9]+)?(?:[^\n]*)?)/i,
    /\*\*Arch(?:\.|itecture)?\s+version:?\*\*[ \t]*(v[0-9]+(?:\.[0-9]+)?(?:[^\n]*)?)/i
  ];
  for (const re of archCandidates) {
    const m = text.match(re);
    if (m) { archMatch = m; break; }
  }
  if (archMatch) out.architecture_version = archMatch[1].trim().replace(/\.$/, '');

  const dispatchMatch =
        text.match(/\*\*Dispatch mode(?:\s+chosen)?:?\*\*[ \t]*([^\n]+)/i);
  if (dispatchMatch) out.dispatch_mode = dispatchMatch[1].trim().split(/\s+/)[0].replace(/\.$/, '');

  // Verdict: tolerate prefixes (Original / Final / CV / Reclassified), tolerate suffixes
  // (e.g., "Verdict at CV gate:", "Verdict at v3 delivery:", "Verdict on user installation (v1):"),
  // and also accept "Outcome:" as a synonym used by some run-reports. Prefer the Reclassified or
  // Final line when both are present, since that's the authoritative current state.
  const verdictPatterns = [
    /\*\*Reclassified[^*\n]{0,40}verdict[^*\n]{0,40}:\*\*[ \t]*([^\n]+)/i,
    /\*\*Final[^*\n]{0,40}verdict[^*\n]{0,40}:\*\*[ \t]*([^\n]+)/i,
    /\*\*Verdict[^*\n]{0,40}:\*\*[ \t]*([^\n]+)/i,
    /\*\*CV\s+verdict[^*\n]{0,40}:\*\*[ \t]*([^\n]+)/i,
    /\*\*Outcome:\*\*[ \t]*([^\n]+)/i,
    /\*\*Original[^*\n]{0,40}verdict[^*\n]{0,40}:\*\*[ \t]*([^\n]+)/i
  ];
  for (const re of verdictPatterns) {
    const m = text.match(re);
    if (m) { out.verdict = m[1].trim(); break; }
  }

  const delivMatch = text.match(/\*\*(?:Deliverable|Final artifact):?\*\*[ \t]*`?([^\n`]+?)`?[ \t]*(?:\n|$)/i);
  if (delivMatch) out.deliverable = delivMatch[1].trim();

  // What worked / what broke — split the text into sections by ## headings,
  // then extract top-level bullets from each section.
  const sections = splitMarkdownSections(text);
  for (const sec of sections) {
    const h = sec.heading.toLowerCase();
    if (h.includes('what worked')) {
      out.what_worked = extractBullets(sec.body).map(b => truncate(b, 240));
    } else if (h.includes('what broke') || h.includes('what surfaced') || h.includes('strained')) {
      out.what_broke = extractBullets(sec.body).map(b => truncate(b, 240));
      // Amendment candidates appear inside the what-broke bullets
      const candRe = /(v[0-9]+(?:\.[0-9]+)?\s+candidate:?)[ \t]*([^\n]+)/gi;
      let m;
      while ((m = candRe.exec(sec.body)) !== null) {
        out.amendment_candidates.push({
          version: m[1].replace(/\s+candidate:?$/i, '').trim(),
          text: truncate(m[2].trim(), 240)
        });
      }
    } else if (h.includes('uncertainty manifest')) {
      out.uncertainty_manifest = extractBullets(sec.body).map(b => truncate(b, 240));
    } else if (h.startsWith('phase')) {
      out.phases = parsePhaseTable(sec.body);
    }
  }

  // If dispatch_mode is still null, infer from Phase summary cells when present.
  if (!out.dispatch_mode && out.phases.length > 0) {
    const modes = new Set();
    for (const p of out.phases) if (p.mode) modes.add(p.mode);
    if (modes.size === 1) out.dispatch_mode = [...modes][0];
    else if (modes.size > 1) out.dispatch_mode = 'mixed';
  }

  return out;
}

function splitMarkdownSections(text) {
  // Splits on ## headings (level-2). Returns [{heading, body}, ...].
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      if (current) sections.push(current);
      current = { heading: h[1].trim(), body: '' };
    } else if (current) {
      current.body += line + '\n';
    }
  }
  if (current) sections.push(current);
  return sections;
}

function extractBullets(body) {
  // Recognizes three styles common across the run-report corpus:
  //   1. "- text..." or "* text..." (markdown bullets)
  //   2. "N. text..."             (numbered list)
  //   3. "**Bold lead.** rest..." (paragraph-style bullets used by v1.8+ reports)
  // Continuation lines that are indented are folded into the current bullet.
  // Blank lines end the current bullet.
  const lines = body.split(/\r?\n/);
  const bullets = [];
  let buf = null;
  for (const line of lines) {
    const bulletMatch =
      line.match(/^[-*]\s+(.*)$/)
      || line.match(/^\d+\.\s+(.*)$/);
    const paragraphMatch =
      bulletMatch ? null : line.match(/^\*\*([^*]+)\*\*\s*(.*)$/);
    if (bulletMatch) {
      if (buf != null) bullets.push(buf.trim());
      buf = bulletMatch[1];
    } else if (paragraphMatch) {
      if (buf != null) bullets.push(buf.trim());
      const lead = paragraphMatch[1].replace(/[.:]\s*$/, '');
      const rest = paragraphMatch[2];
      buf = lead + (rest ? ' — ' + rest : '');
    } else if (buf != null) {
      if (line.trim() === '') {
        bullets.push(buf.trim());
        buf = null;
      } else if (/^\s+/.test(line) || /^[A-Za-z0-9]/.test(line.trim())) {
        // continuation: either indented OR an unindented paragraph that
        // immediately follows a bold-lead opener (typical for run-reports
        // that wrap their paragraph-bullets across multiple unindented lines).
        buf += ' ' + line.trim();
      }
    }
  }
  if (buf != null) bullets.push(buf.trim());
  // Final pass: strip residual "**Title.**" prefix that survived (e.g. when
  // the bullet-style branch matched an item whose body had bold lead text).
  return bullets.map(b => b.replace(/^\*\*([^*]+)\*\*\s*/, '$1 — '));
}

function parsePhaseTable(body) {
  // Markdown table whose rows look like: | Phase | Wall-clock | Notes | or | Phase | Mode | Outcome |
  const lines = body.split(/\r?\n/).filter(l => l.trim().startsWith('|'));
  if (lines.length < 2) return [];
  // header row is lines[0], separator is lines[1], data rows are lines[2..]
  const header = lines[0].split('|').map(c => c.trim().toLowerCase()).filter(c => c.length);
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split('|').map(c => c.trim()).filter(c => c.length);
    if (cells.length === 0) continue;
    const row = {};
    for (let j = 0; j < header.length && j < cells.length; j++) {
      row[header[j]] = cells[j];
    }
    // Normalize common headers
    const phase = row['phase'] || cells[0];
    const dur   = row['wall-clock'] || row['duration'] || null;
    const mode  = row['mode'] || null;
    const notes = row['notes'] || row['outcome'] || null;
    if (!phase || phase.toLowerCase() === 'phase') continue;
    rows.push({
      phase: phase.replace(/\*\*/g, '').trim(),
      duration: dur,
      duration_seconds: parseDuration(dur),
      mode: mode ? mode.toLowerCase() : null,
      notes: notes
    });
  }
  return rows;
}

function parseDuration(dur) {
  if (!dur) return null;
  // Accept "~73s", "165s", "22 min", "~22 min", "10m 15s"
  const minMatch = dur.match(/(\d+(?:\.\d+)?)\s*min/i);
  if (minMatch) return Math.round(parseFloat(minMatch[1]) * 60);
  const sMatch = dur.match(/(\d+(?:\.\d+)?)\s*s\b/i);
  if (sMatch) return Math.round(parseFloat(sMatch[1]));
  const compMatch = dur.match(/(\d+)m\s*(\d+)s/i);
  if (compMatch) return parseInt(compMatch[1]) * 60 + parseInt(compMatch[2]);
  return null;
}

// ---------------------------------------------------------------------------
// Verdict normalization
// ---------------------------------------------------------------------------

function normalizeVerdict(raw) {
  if (!raw) return 'unknown';
  const s = raw.toLowerCase();
  // Order matters — most-specific to least-specific.
  if (s.includes('failed → recover') || s.includes('failed -> recover')) return 'failed_recovered';
  if (s.includes('reclassif') && s.includes('fail')) return 'failed_recovered';
  if (s.includes('pass_with_concerns') || s.includes('pass with concerns')) return 'pass_with_concerns';
  if (s.includes('pass_with_recommendations') || s.includes('pass with recommendations')) return 'pass_with_recommendations';
  // "delivered. CV pass" / "delivered. cv verdict: pass"
  if (s.startsWith('delivered') && /\bpass\b/.test(s)) return 'pass';
  if (s.startsWith('delivered')) return 'pass';
  if (s.startsWith('pass')) return 'pass';
  // Plain fail must come AFTER failed_recovered detection.
  if (/^fail/.test(s)) return 'fail';
  if (/\bfail\b/.test(s) && !/\bpass\b/.test(s)) return 'fail';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Per-run aggregation
// ---------------------------------------------------------------------------

async function aggregateRun(slug) {
  const runRoot = path.join(RUNS_DIR, slug);
  const links = {
    run_report:   `runs/${slug}/run-report.md`,
    verification: `runs/${slug}/output/verification/report.json`,
    ledger:       `runs/${slug}/decisions/discovery/ledger-v1.json`,
    sections:     `runs/${slug}/decisions/technical-discovery/sections-v1.json`,
    final_dir:    `runs/${slug}/output/final/`,
    audit_flags:  `runs/${slug}/audit/flags.jsonl`
  };

  // -- run-report.md ------------------------------------------------------
  const reportText = await readText(path.join(runRoot, 'run-report.md'));
  const report = parseRunReport(reportText, slug);

  // -- ledger -------------------------------------------------------------
  const ledger = await readJson(path.join(runRoot, 'decisions', 'discovery', 'ledger-v1.json'));
  const ledgerSummary = ledger ? {
    restatement: truncate(ledger.restatement, 600),
    telos: ledger.telos || null,
    assumption_count: Array.isArray(ledger.assumption_ledger) ? ledger.assumption_ledger.length : 0,
    inflection_count: Array.isArray(ledger.inflection_points) ? ledger.inflection_points.length : 0,
    oos_count: Array.isArray(ledger.out_of_scope) ? ledger.out_of_scope.length : 0,
    proper_nouns: Array.isArray(ledger.proper_nouns) ? ledger.proper_nouns.map(pn => ({
      surface: pn.surface,
      role: pn.role,
      verification_status: pn.verification_status
    })) : [],
    first_contact_requirements: Array.isArray(ledger.first_contact_requirements) ?
      ledger.first_contact_requirements.map(r => ({ description: truncate(r.description, 240) })) : []
  } : null;

  // -- technical-discovery sections file ----------------------------------
  let sections = null;
  const tdDir = path.join(runRoot, 'decisions', 'technical-discovery');
  if (await exists(tdDir)) {
    const tdEntries = await listDir(tdDir);
    const sectionsFile = tdEntries
      .filter(d => d.isFile() && /^sections-v\d+\.json$/.test(d.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .pop();
    if (sectionsFile) {
      const td = await readJson(path.join(tdDir, sectionsFile.name));
      if (td) {
        sections = {
          sections: Array.isArray(td.sections) ? td.sections.map(s => ({
            id: s.id || s.name,
            charter_excerpt: truncate(s.charter, 240),
            acceptance_excerpt: truncate(
              Array.isArray(s.acceptance) ? s.acceptance.join(' · ') : s.acceptance,
              240
            )
          })) : [],
          contracts: [],
          prompt_verb_chosen: td.prompt_verb_analysis ? td.prompt_verb_analysis.chosen_verb : null
        };
      }
    }
  }
  // Contracts: list files in contracts/original/
  const contractsDir = path.join(runRoot, 'contracts', 'original');
  if (await exists(contractsDir)) {
    const contracts = (await listDir(contractsDir))
      .filter(d => d.isFile() && d.name.endsWith('.json'))
      .map(d => d.name.replace(/\.json$/, ''));
    if (sections) sections.contracts = contracts;
    else if (contracts.length) sections = { sections: [], contracts, prompt_verb_chosen: null };
  }

  // -- verification report ------------------------------------------------
  const cv = await readJson(path.join(runRoot, 'output', 'verification', 'report.json'));
  const verification = cv ? {
    verdict: cv.verdict || null,
    assumption_checks_total: Array.isArray(cv.assumption_checks) ? cv.assumption_checks.length : 0,
    assumption_checks_verified: Array.isArray(cv.assumption_checks) ?
      cv.assumption_checks.filter(c => c.verified === true).length : 0,
    out_of_scope_total: Array.isArray(cv.out_of_scope_checks) ? cv.out_of_scope_checks.length : 0,
    out_of_scope_verified: Array.isArray(cv.out_of_scope_checks) ?
      cv.out_of_scope_checks.filter(c => c.verified_absent === true || c.verified === true).length : 0,
    inflection_point_checks_total: Array.isArray(cv.inflection_point_checks) ? cv.inflection_point_checks.length : 0,
    inflection_point_checks_honored: Array.isArray(cv.inflection_point_checks) ?
      cv.inflection_point_checks.filter(c => c.default_branch_honored === true || c.honored === true).length : 0,
    edge_cases_total: cv.edge_case_testing_summary ? cv.edge_case_testing_summary.total : null,
    edge_cases_passing: cv.edge_case_testing_summary ? cv.edge_case_testing_summary.passed : null,
    first_contact_results: Array.isArray(cv.first_contact_results) ? cv.first_contact_results : [],
    principle_h_skips: Array.isArray(cv.principle_h_skips) ? cv.principle_h_skips : [],
    concerns: Array.isArray(cv.concerns) ? cv.concerns.map(c => ({
      topic: c.topic,
      detail: truncate(c.detail, 240)
    })) : []
  } : null;

  // -- audit flags --------------------------------------------------------
  const flags = await readJsonl(path.join(runRoot, 'audit', 'flags.jsonl'));
  const critic = aggregateFlags(flags);

  // -- dispatch log -------------------------------------------------------
  const dispatches = await readJsonl(path.join(runRoot, 'state', 'coordinator', 'dispatch-log.jsonl'));

  // -- history log --------------------------------------------------------
  const history = await readJsonl(path.join(runRoot, 'history', 'log.jsonl'));
  const historySummary = {
    entry_count: history.length,
    earliest: history.length ? (history[0].ts || null) : null,
    latest: history.length ? (history[history.length - 1].ts || null) : null
  };

  // -- editor reviews + demotions (v1.9+) ---------------------------------
  const editorDir = path.join(runRoot, 'decisions', 'editor');
  let editorIterations = 0;
  let editorVerdicts = [];
  if (await exists(editorDir)) {
    const eEntries = (await listDir(editorDir))
      .filter(d => d.isFile() && /^review-v\d+\.json$/.test(d.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    editorIterations = eEntries.length;
    for (const e of eEntries) {
      const review = await readJson(path.join(editorDir, e.name));
      if (review && review.verdict) editorVerdicts.push(review.verdict);
    }
  }

  const discoveryDir = path.join(runRoot, 'decisions', 'discovery');
  let demotionCount = 0;
  if (await exists(discoveryDir)) {
    const dEntries = (await listDir(discoveryDir))
      .filter(d => d.isFile() && /^demotion-v\d+\.json$/.test(d.name));
    demotionCount = dEntries.length;
  }

  // -- counts and timing aggregates ---------------------------------------
  const sectionCount = sections ? sections.sections.length : 0;
  const wallClockMinutes = report && report.phases.length
    ? Math.round(report.phases.reduce((acc, p) => acc + (p.duration_seconds || 0), 0) / 60)
    : null;
  const overseerDispatches = dispatches.filter(d => d.role === 'overseer').length;
  const builderDispatches  = dispatches.filter(d => d.role === 'builder').length;
  const researcherDispatches = dispatches.filter(d => d.role === 'researcher').length;

  // -- rating composition -------------------------------------------------
  const verdict = normalizeVerdict(report ? report.verdict : null);
  const rating = composeRating({
    report, verification, critic, editorVerdicts, ledger,
    demotionCount, verdict
  });

  // -- v0.2: v16-reaudit + root-cause + curation overlay -----------------
  const reAudit = await readJson(path.join(runRoot, 'v16-reaudit.json'));
  const rcaText = await readText(path.join(runRoot, 'root-cause-analysis.md'));
  const curation = await readJson(path.join(CURATION_DIR, slug + '.json')) || {};

  // Synthetic per-run summary just enough for the FDO derivation step
  const synthSummary = { verdict, slug };

  const { events, first_delivery } = extractEvents({
    slug,
    reportText,
    rcaText,
    reAudit,
    flags,
    inlineDeviations: [],
    demotions: [],
    sev0Fixes: [],
    curation,
    summary: synthSummary
  });

  // v0.3: revision lineage with three-way merge (v0.5+).
  // (a) synthesized rev-0 from the run-report
  // (b) git-derived delivery/{slug}* tags (returns [] until retroactive-bootstrap
  //     lands; preserves v0.3 synthesized-rev-0 behavior in the meantime)
  // (c) curation overlay revisions[]
  // events.mjs#extractRevisions handles the field-level merge per the
  // git-integration-proposal §6 closing paragraph + Codex's 2026-05-14 refinement #2.
  const gitRevisions = readGitLog(PROJECT_ROOT, slug);

  const revisionsCtx = {
    curation,
    summary: Object.assign({}, synthSummary, { first_delivery_outcome: first_delivery.outcome, date: report ? report.date : null }),
    reportText,
    gitRevisions
  };
  const revisions = extractRevisions(revisionsCtx);
  tagEventsWithRevisions(events, revisions);

  const eventRoleTotals = roleTotals(events);

  // v0.4: deliverable kind detection. Live URL composition happens at the
  // index level once codex config is loaded; per-run we just classify and
  // record the deliverable index path.
  const finalDir = path.join(runRoot, 'output', 'final');
  const deliverable = await detectDeliverableKind({
    finalDir,
    ledger,
    curation
  });

  // v0.5: file tree extraction for non-web deliverables. Web apps don't
  // need a tree in the showcase page (the artifact itself is the visible
  // content); plugins/cli/library/document/data/other do.
  let fileTree = null;
  if (deliverable.kind !== 'web_app') {
    const treeResult = await walkFileTree(finalDir);
    fileTree = treeResult;
  }

  // -- final summary roll-up ----------------------------------------------
  const summary = {
    slug,
    prompt: report ? report.prompt : null,
    date: report ? report.date : null,
    architecture_version: report ? report.architecture_version : null,
    dispatch_mode: report ? report.dispatch_mode : null,
    verdict,
    raw_verdict: report ? report.verdict : null,
    final_artifact: report ? report.deliverable : null,
    telos: ledgerSummary ? ledgerSummary.telos : null,
    rating,
    counts: {
      dispatches: dispatches.length,
      overseer_dispatches: overseerDispatches,
      builder_dispatches: builderDispatches,
      researcher_dispatches: researcherDispatches,
      wall_clock_minutes: wallClockMinutes,
      sections: sectionCount,
      edge_cases_total: verification ? verification.edge_cases_total : null,
      edge_cases_passing: verification ? verification.edge_cases_passing : null,
      critic_findings_high: critic.by_severity.high,
      critic_findings_medium: critic.by_severity.medium,
      critic_findings_low: critic.by_severity.low,
      sev0_fixes: critic.sev0_fixes,
      escalations_open: critic.escalations_open,
      demotions: demotionCount,
      editor_iterations: editorIterations,
      events_total: events.length,
      revision_count: revisions.length,
      additional_step_count: revisions.filter(r => r.kind === 'additional_step').length
    },
    deliverable_kind: deliverable.kind,
    deliverable_can_run_in_browser: !!deliverable.can_run_in_browser,
    deliverable_index: deliverable.deliverable_index,
    deliverable_manifest: deliverable.manifest,
    showcase_assets: (curation && curation.showcase_assets) || null,
    live_url: null,                    // populated in main() after config load
    live_url_kind: 'none',
    first_delivery_outcome: first_delivery.outcome,
    first_delivery_outcome_source: first_delivery.source,
    re_audit_present: !!reAudit,
    re_audit_reclassified_verdict: reAudit ? reAudit.reclassified_verdict : null,
    rca_present: !!rcaText,
    links
  };

  const detail = {
    schema_version: SCHEMA_VERSION,
    slug,
    summary,
    ledger: ledgerSummary,
    td: sections,
    timeline: report ? report.phases : [],
    verification,
    critic,
    history: historySummary,
    run_report_excerpts: report ? {
      what_worked: report.what_worked,
      what_broke: report.what_broke,
      amendment_candidates: report.amendment_candidates
    } : null,
    uncertainty_manifest: report ? report.uncertainty_manifest : [],
    editor: {
      iterations: editorIterations,
      verdicts: editorVerdicts
    },
    demotion_count: demotionCount,
    events,
    revisions,
    file_tree: fileTree,
    role_attribution_totals: eventRoleTotals,
    first_delivery: first_delivery,
    re_audit: reAudit ? {
      audit_at: reAudit.audit_at,
      audit_under_architecture_version: reAudit.audit_under_architecture_version,
      original_verdict: reAudit.original_verdict,
      reclassified_verdict: reAudit.reclassified_verdict,
      fail_count: reAudit.fail_count || 0,
      pass_count: reAudit.pass_count || 0,
      not_applicable_count: reAudit.not_applicable_count || 0,
      recommendation: reAudit.recommendation || null
    } : null,
    links
  };

  return { summary, detail };
}

function aggregateFlags(flags) {
  const out = {
    by_severity: { high: 0, medium: 0, low: 0 },
    by_principle: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 },
    open: 0,
    resolved: 0,
    sev0_fixes: 0,
    escalations_open: 0
  };
  for (const f of flags) {
    const sev = (f.severity || '').toLowerCase();
    if (sev === 'high') out.by_severity.high++;
    else if (sev === 'medium') out.by_severity.medium++;
    else if (sev === 'low') out.by_severity.low++;
    // principle inference from check name or principle field
    const principle = f.principle || inferPrincipleFromCheck(f.check);
    if (principle && out.by_principle[principle] !== undefined) out.by_principle[principle]++;
    if (f.status === 'open' || f.resolution === 'open') out.open++;
    else if (f.status === 'resolved' || f.resolution === 'resolved') out.resolved++;
    if (f.check && /sev[ _-]?0/i.test(JSON.stringify(f))) out.sev0_fixes++;
  }
  return out;
}

function inferPrincipleFromCheck(check) {
  if (!check) return null;
  const c = check.toLowerCase();
  if (c.includes('proper_noun') || c.includes('lexical')) return 'E';
  if (c.includes('citation') || c.includes('training_data')) return 'F';
  if (c.includes('first_contact') || c.includes('deliverability')) return 'G';
  if (c.includes('independence') || c.includes('td_plan_source') || c.includes('h_skip')) return 'H';
  if (c.includes('verification_fidelity') || c.includes('production_fidelity')) return 'A';
  if (c.includes('audit_complet')) return 'B';
  if (c.includes('coverage') || c.includes('prose_coverage')) return 'C';
  if (c.includes('path_coverage')) return 'D';
  return null;
}

// ---------------------------------------------------------------------------
// Rating composition (extrapolation of Pass/Fail)
// ---------------------------------------------------------------------------

function composeRating(ctx) {
  const { report, verification, critic, editorVerdicts, ledger, demotionCount, verdict } = ctx;

  // Telos fidelity
  let telosFidelity = 'unknown';
  if (editorVerdicts.length > 0) {
    const finalEditor = editorVerdicts[editorVerdicts.length - 1];
    const properNouns = ledger && Array.isArray(ledger.proper_nouns) ? ledger.proper_nouns : [];
    const unverified = properNouns.filter(pn => pn.verification_status === 'unreachable').length;
    if (finalEditor === 'pass' && demotionCount === 0 && unverified === 0) telosFidelity = 'strong';
    else if (finalEditor === 'pass_with_recommendations') telosFidelity = 'adequate';
    else if (finalEditor === 'pass' && demotionCount > 0) telosFidelity = 'adequate';
    else if (finalEditor && finalEditor.startsWith('route_')) telosFidelity = 'weak';
    if (critic && (critic.by_principle.F > 0 || critic.by_principle.H > 0)) telosFidelity = 'violated';
  }

  // Deliverability tiers
  function tierStatusFromText(s) {
    if (!s) return 'not_run';
    const x = s.toLowerCase();
    if (x === 'verified' || x === 'pass' || x === 'true') return 'verified';
    if (x.includes('unverifiable')) return 'unverifiable';
    if (x === 'failed' || x === 'fail') return 'failed';
    return 'not_run';
  }
  let tier2 = 'not_run';
  if (verification && Array.isArray(verification.first_contact_results)) {
    const fc = verification.first_contact_results;
    if (fc.length === 0) tier2 = 'not_run';
    else if (fc.every(r => (r.status || r.result) === 'verified' || (r.verified === true))) tier2 = 'verified';
    else if (fc.some(r => (r.status || r.result) === 'failed' || r.failed === true)) tier2 = 'failed';
    else if (fc.some(r => /unverifiable/i.test((r.status || r.result || '')))) tier2 = 'unverifiable';
    else tier2 = 'not_run';
  }
  // Tier 1 / PNV — best-effort: present if verdict contains 'pass'; absent if 'fail'
  let tier1 = 'not_run';
  if (verdict === 'pass') tier1 = 'verified';
  else if (verdict === 'pass_with_concerns' || verdict === 'pass_with_recommendations') {
    tier1 = tier2 === 'unverifiable' ? 'unverifiable' : 'verified';
  } else if (verdict === 'fail') tier1 = 'failed';
  else if (verdict === 'failed_recovered') tier1 = 'failed';

  // Tier 3 — sub-goal, from edge cases + assumption checks
  let tier3 = 'not_run';
  if (verification) {
    const ecTotal = verification.edge_cases_total;
    const ecPass  = verification.edge_cases_passing;
    const aTotal  = verification.assumption_checks_total;
    const aVer    = verification.assumption_checks_verified;
    if (ecTotal != null || aTotal != null) {
      const ecOk = (ecTotal == null) || (ecPass === ecTotal && ecTotal > 0);
      const aOk  = (aTotal == null)  || (aVer === aTotal  && aTotal  > 0);
      if (ecOk && aOk) tier3 = 'verified';
      else if (ecTotal != null && ecPass < ecTotal) tier3 = 'failed';
      else if (aTotal  != null && aVer  < aTotal)  tier3 = 'failed';
    }
  }

  // Learning yield
  const amendmentCandidates = report ? report.amendment_candidates.length : 0;

  // Cost
  const dispatches = 0; // filled by caller summary; we keep rating compact
  const minutes = report && report.phases.length
    ? Math.round(report.phases.reduce((acc, p) => acc + (p.duration_seconds || 0), 0) / 60)
    : null;

  // Composite
  let composite = 'unknown';
  if (verdict === 'failed_recovered') composite = 'reclassified';
  else if (tier1 === 'failed' || tier2 === 'failed' || verdict === 'fail') composite = 'failed';
  else if (verdict === 'pass' && telosFidelity === 'strong'
           && tier1 === 'verified' && tier2 === 'verified' && tier3 === 'verified') {
    composite = 'clean';
  } else if (verdict === 'pass' || verdict === 'pass_with_concerns') {
    composite = (tier2 === 'unverifiable') ? 'shipped_with_concerns' : 'shipped_with_concerns';
  } else if (verdict === 'pass_with_recommendations') {
    composite = 'shipped_partial';
  }

  return {
    telos_fidelity: telosFidelity,
    deliverability: {
      tier1_pnv: tier1,
      tier2_first_contact: tier2,
      tier3_subgoal: tier3
    },
    cost: {
      minutes,
      escalations_high: critic ? critic.by_severity.high : 0,
      critic_high: critic ? critic.by_severity.high : 0
    },
    learning_yield: {
      amendment_candidates: amendmentCandidates,
      principle_violations_caught_structurally: 0,
      principle_violations_escaped: 0
    },
    composite
  };
}

// ---------------------------------------------------------------------------
// Architecture-level parsing: amendments + principles
// ---------------------------------------------------------------------------

function parseAmendments(text) {
  if (!text) return [];
  const out = [];
  // Match `- **v1.x** — summary text...` (multi-line until next bullet at column 0)
  const lines = text.split(/\r?\n/);
  let inHistory = false;
  let buf = null;
  for (const line of lines) {
    if (/^##\s+Version History/i.test(line)) { inHistory = true; continue; }
    if (inHistory && /^##\s+/.test(line)) break;
    if (!inHistory) continue;
    const m = line.match(/^-\s+\*\*(v[0-9]+(?:\.[0-9]+)?)\*\*\s+[—-]\s+(.*)$/);
    if (m) {
      if (buf) out.push(buf);
      buf = { version: m[1], title: m[1], summary: m[2].trim() };
    } else if (buf && line.trim().length > 0) {
      buf.summary += ' ' + line.trim();
    } else if (buf && line.trim().length === 0) {
      // paragraph break inside an entry — keep going
    }
  }
  if (buf) out.push(buf);
  // Derive principle and role introductions from summary text
  for (const a of out) {
    const principles = [];
    const principleRe = /\bPrinciple\s+([A-H])\b/g;
    let pm;
    while ((pm = principleRe.exec(a.summary)) !== null) {
      if (!principles.includes(pm[1])) principles.push(pm[1]);
    }
    a.principles_mentioned = principles;
    a.roles_introduced = [];
    if (/\bEditor role\b/i.test(a.summary)) a.roles_introduced.push('Editor');
    if (/\bRe-Verification role\b/i.test(a.summary)) a.roles_introduced.push('Re-Verification');
    if (/\bDemotion Mode\b/i.test(a.summary)) a.roles_introduced.push('Discovery (Demotion Mode)');
    a.summary = truncate(a.summary, 600);
  }
  return out;
}

function parsePrinciples(text) {
  if (!text) return [];
  // Look for top-level entries like "## Principle E — Atomic Lexical Anchors"
  // (the principles.md file uses level-2 headings; we accept ## or ###).
  const out = [];
  const re = /^(##+)\s+Principle\s+([A-H])\s*[—-]\s+([^\n]+)\n+([^]*?)(?=\n##+\s+Principle|\n#\s|$)/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({
      id: m[2],
      name: m[3].trim(),
      summary: truncate(m[4].trim().split(/\n{2,}/)[0], 600),
      introduced_in: inferPrincipleIntroduction(m[2])
    });
  }
  return out;
}

function inferPrincipleIntroduction(id) {
  // From the v1.x amendment history: A–D are foundational (v1.7 elevation),
  // E–H were introduced in v1.9.
  if (['E', 'F', 'G', 'H'].includes(id)) return 'v1.9';
  if (['A', 'B', 'C', 'D'].includes(id)) return 'v1.7';
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(DATA_RUNS_DIR, { recursive: true });
  await fs.mkdir(CURATION_DIR, { recursive: true });

  // Discover run slugs
  const runEntries = await listDir(RUNS_DIR);
  const slugs = runEntries
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  const summaries = [];
  const archVersionsSeen = new Set();

  for (const slug of slugs) {
    try {
      const { summary, detail } = await aggregateRun(slug);
      const outFile = path.join(DATA_RUNS_DIR, `${slug}.json`);
      await fs.writeFile(outFile, JSON.stringify(detail, null, 2), 'utf8');
      const narrative = generateNarrative({
        summary, events: detail.events, first_delivery: detail.first_delivery
      });
      await fs.writeFile(path.join(DATA_RUNS_DIR, `${slug}-narrative.md`), narrative, 'utf8');
      summaries.push(summary);
      if (summary.architecture_version) archVersionsSeen.add(summary.architecture_version);
      console.log(`[codex/aggregate] wrote codex/data/runs/${slug}.json`);
    } catch (err) {
      warn(`failed to aggregate run "${slug}":`, err.message);
      warn(err.stack);
    }
  }

  // v0.4: load codex config (pages_base, repo_base) and populate live_url
  // on each summary. Config is optional; absent → live_url stays null.
  const codexConfig = await loadCodexConfig(DATA_DIR);
  for (const sum of summaries) {
    const det = await readJson(path.join(DATA_RUNS_DIR, sum.slug + '.json'));
    const curation = det && det.summary && det.summary._curation_for_url
      ? det.summary._curation_for_url
      : (await readJson(path.join(CURATION_DIR, sum.slug + '.json'))) || null;
    const composed = composeLiveUrl({
      slug: sum.slug,
      deliverable: {
        kind: sum.deliverable_kind,
        can_run_in_browser: sum.deliverable_can_run_in_browser,
        deliverable_index: sum.deliverable_index
      },
      config: codexConfig,
      curation
    });
    sum.live_url = composed.live_url;
    sum.live_url_kind = composed.live_url_kind;
    // Rewrite the per-run JSON so the bundle picks up the updated summary
    if (det && det.summary) {
      det.summary.live_url = composed.live_url;
      det.summary.live_url_kind = composed.live_url_kind;
      await fs.writeFile(path.join(DATA_RUNS_DIR, sum.slug + '.json'), JSON.stringify(det, null, 2), 'utf8');
    }
  }

  // v0.4: emit per-build showcase pages for non-web deliverables.
  const showcaseCount = await writeAllShowcases({
    summaries,
    dataRunsDir: DATA_RUNS_DIR,
    showcaseDir: SHOWCASE_DIR,
    config: codexConfig
  });
  console.log(`[codex/aggregate] wrote ${showcaseCount} showcase pages to codex/showcase/`);

  // Sort summaries by date desc (newest first), then slug as tiebreaker
  summaries.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.slug.localeCompare(b.slug);
  });

  // Architecture amendments + principles
  const archReadmeText = await readText(path.join(ARCH_DIR, 'README.md'));
  const amendments = parseAmendments(archReadmeText);
  const principlesText = await readText(path.join(ARCH_DIR, 'principles.md'));
  const principles = parsePrinciples(principlesText);

  // v0.2 index-level rollups: load each detail and aggregate roles + first-delivery.
  const perRunTotals = {};
  for (const sum of summaries) {
    try {
      const det = JSON.parse(await fs.readFile(path.join(DATA_RUNS_DIR, sum.slug + '.json'), 'utf8'));
      if (det.role_attribution_totals) perRunTotals[sum.slug] = det.role_attribution_totals;
    } catch (err) {
      warn('index rollup: could not read detail for ' + sum.slug);
    }
  }
  const roleTotalsCorpus = corpusRoleTotals(perRunTotals);
  const fdoDist = firstDeliveryDistribution(summaries);

  // v0.5+: Maintenance handoff collection from codex/docs/ markdown files
  // that carry a `## Maintenance Status` section. See coordination-proposal.md.
  const maintenanceHandoffs = await collectHandoffs({ docsDir: DOCS_DIR });
  const pendingAckCount = maintenanceHandoffs.filter(h => h.pending_ack).length;
  if (maintenanceHandoffs.length > 0) {
    console.log(`[codex/aggregate] parsed ${maintenanceHandoffs.length} handoff doc${maintenanceHandoffs.length === 1 ? '' : 's'} (${pendingAckCount} pending_ack)`);
  }

  const index = {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    codex_version: '0.7',
    architecture_versions_seen: [...archVersionsSeen].sort(),
    run_count: summaries.length,
    runs: summaries,
    amendments,
    principles,
    role_attribution_corpus_totals: roleTotalsCorpus,
    first_delivery_outcome_distribution: fdoDist,
    maintenance_handoffs: maintenanceHandoffs
  };

  const indexFile = path.join(DATA_DIR, 'index.json');
  await fs.writeFile(indexFile, JSON.stringify(index, null, 2), 'utf8');

  // Also emit a JS bundle that the dashboard HTML can load directly via
  // <script src="data/bundle.js"></script>. This is the file:// escape hatch
  // for browsers that block fetch() of local JSON. The bundle includes the
  // index AND the per-run details so the dashboard runs from one load.
  const perRunDetails = {};
  for (const sum of summaries) {
    try {
      const detailText = await fs.readFile(path.join(DATA_RUNS_DIR, `${sum.slug}.json`), 'utf8');
      perRunDetails[sum.slug] = JSON.parse(detailText);
    } catch (err) {
      warn(`bundle: missing detail for ${sum.slug}: ${err.message}`);
    }
  }
  const bundle = { index, runs: perRunDetails };
  const bundleJs =
    '/* eslint-disable */\n' +
    '// Auto-generated by codex/scripts/aggregate.mjs — do not edit.\n' +
    'window.CODEX_BUNDLE = ' + JSON.stringify(bundle, null, 2) + ';\n';
  await fs.writeFile(path.join(DATA_DIR, 'bundle.js'), bundleJs, 'utf8');

  console.log(`[codex/aggregate] wrote codex/data/index.json + bundle.js (${summaries.length} runs, ${amendments.length} amendments, ${principles.length} principles)`);
}

main().catch(err => {
  console.error('[codex/aggregate] fatal:', err);
  process.exit(1);
});
