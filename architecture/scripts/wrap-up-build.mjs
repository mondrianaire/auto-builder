#!/usr/bin/env node
// ============================================================================
// architecture/scripts/wrap-up-build.mjs
//
// Wrap-up routine for a ratified AutoBuilder build. Produces the Cat 1
// "wrap-up documentation" required by promote-build.bat AND
// .github/workflows/completion-triggered-fork.yml before a build is
// eligible for promotion.
//
// Outputs (in runs/{slug}/):
//   - PROJECT-OVERVIEW.md             — Cat 1 orientation doc generated from
//                                       architecture/project-overview-template.md
//                                       and the build's corpus + index data
//   - wrap-up-complete.json           — Sentinel file. Its presence is what
//                                       promote-build.bat and workflow #2 check.
//
// Usage:
//   node architecture/scripts/wrap-up-build.mjs <slug> [--invoked-by ratify-build.bat|wrap-up-build.bat|manual]
//
// Exit codes:
//   0  success — both PROJECT-OVERVIEW.md and wrap-up-complete.json written
//   1  validation failure (slug missing, not ratified, etc.)
//   2  template or data read failure
//   3  write failure
//
// Re-runnable: writing this on a build that's already wrapped up overwrites
// both artifacts with fresh timestamps. Safe for back-fill of older builds
// or for re-generating after template changes.
//
// Author: Maintenance, 2026-05-16 per user directive: "we also need to
// implement a verification aspect for the promotion action itself. The
// only builds that should be available to promote are those that have
// passed verification and ratification and the completion procedures and
// routines have run and wrap up documentation created and accompanied."
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WRITER_VERSION = '0.1';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// architecture/scripts/wrap-up-build.mjs -> repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function die(code, msg) {
  console.error(`*** wrap-up-build: ${msg}`);
  process.exit(code);
}

function readJson(p, label) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    die(2, `failed to read ${label} at ${p}: ${e.message}`);
  }
}

function readText(p, fallback) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return fallback;
  }
}

// --- arg parsing ---
const args = process.argv.slice(2);
if (args.length === 0) {
  die(1, 'usage: node architecture/scripts/wrap-up-build.mjs <slug> [--invoked-by <caller>]');
}
const slug = args[0];
let invokedBy = 'manual';
const ibIdx = args.indexOf('--invoked-by');
if (ibIdx >= 0 && args[ibIdx + 1]) invokedBy = args[ibIdx + 1];

// --- validation ---
const runDir = path.join(REPO_ROOT, 'runs', slug);
if (!fs.existsSync(runDir)) die(1, `runs/${slug}/ does not exist.`);

const ratifiedPath = path.join(runDir, 'completion-ratified.json');
if (!fs.existsSync(ratifiedPath)) {
  die(1, `runs/${slug}/completion-ratified.json missing — wrap-up requires ratification first. Run ratify-build.bat ${slug}.`);
}

const reportPath = path.join(runDir, 'output', 'verification', 'report.json');
if (!fs.existsSync(reportPath)) {
  die(1, `runs/${slug}/output/verification/report.json missing — wrap-up requires a verification report.`);
}

const templatePath = path.join(REPO_ROOT, 'architecture', 'project-overview-template.md');
if (!fs.existsSync(templatePath)) {
  die(2, `architecture/project-overview-template.md missing — cannot generate PROJECT-OVERVIEW.md.`);
}

// --- data gather ---
const ratified = readJson(ratifiedPath, 'completion-ratified.json');
const report = readJson(reportPath, 'verification report');
const promptText = readText(path.join(runDir, 'prompt.txt'), '(prompt.txt missing from corpus)');

// Codex index (best-effort — may be stale or missing fields)
let idxRun = null;
try {
  const idx = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'codex', 'data', 'index.json'), 'utf8'));
  idxRun = (idx.runs || []).find(r => r.slug === slug) || null;
} catch {
  idxRun = null;
}

const verdict = report.verdict || 'unknown';
const ratifiedAt = ratified.ratified_at || 'unknown';
const ratifiedBy = ratified.ratified_by || 'unknown';
const telos = (idxRun && idxRun.telos) || '(telos not surfaced in corpus index)';
const archVersion = (idxRun && idxRun.architecture_version) || 'unknown';
const wallMin = (idxRun && idxRun.counts && idxRun.counts.wall_clock_minutes != null)
  ? String(idxRun.counts.wall_clock_minutes) : 'unknown';
const fdo = (idxRun && idxRun.first_delivery_outcome) || 'unknown';
const deliverableKind = (idxRun && idxRun.deliverable_kind) || 'unknown';
const liveUrl = (idxRun && idxRun.live_url) || '';

const liveUrlLine = liveUrl
  ? `**Live URL:** ${liveUrl} (set by promotion / Pages auto-enable, or via curation overlay).`
  : `**Live URL:** not set. For web_app builds this is populated at promotion time by workflow #2's Pages auto-enable step. For non-web kinds (plugin/cli/library/document/data/other) a Codex showcase page will eventually fill the same role — currently deferred.`;

// --- substitute template ---
const tpl = readText(templatePath, '');
const overview = tpl
  .replaceAll('{slug}', slug)
  .replaceAll('{telos}', telos)
  .replaceAll('{deliverable_kind}', deliverableKind)
  .replaceAll('{verdict}', verdict)
  .replaceAll('{fdo}', fdo)
  .replaceAll('{architecture_version}', archVersion)
  .replaceAll('{wall_min}', wallMin)
  .replaceAll('{ratified_at}', ratifiedAt)
  .replaceAll('{ratified_by}', ratifiedBy)
  .replaceAll('{prompt}', promptText)
  .replaceAll('{live_url_line}', liveUrlLine);

// --- write outputs ---
const overviewPath = path.join(runDir, 'PROJECT-OVERVIEW.md');
const sentinelPath = path.join(runDir, 'wrap-up-complete.json');

try {
  fs.writeFileSync(overviewPath, overview);
} catch (e) {
  die(3, `failed to write ${overviewPath}: ${e.message}`);
}

const sentinel = {
  schema_version: '0.1',
  completed_at: new Date().toISOString(),
  completed_by: invokedBy,
  writer_version: WRITER_VERSION,
  artifacts: ['PROJECT-OVERVIEW.md']
};

try {
  fs.writeFileSync(sentinelPath, JSON.stringify(sentinel, null, 2) + '\n');
} catch (e) {
  die(3, `failed to write ${sentinelPath}: ${e.message}`);
}

console.log(`[wrap-up] wrote ${path.relative(REPO_ROOT, overviewPath)}`);
console.log(`[wrap-up] wrote ${path.relative(REPO_ROOT, sentinelPath)}`);

// Generate decision-flowchart artifact (non-fatal). Per the locked design
// in codex/docs/maintenance-initiated/decision-flowchart-wrap-up-artifact.md
// (all 5 design questions answered 2026-05-16).
try {
  const flowchart = await import('./decision-flowchart.mjs');
  const result = flowchart.generate(slug, runDir, REPO_ROOT);
  console.log(`[wrap-up] wrote ${path.relative(REPO_ROOT, result.htmlPath)}`);
  console.log(`[wrap-up] wrote ${path.relative(REPO_ROOT, result.svgPath)}`);
  // Patch sentinel artifacts[] to include the new files
  const s = JSON.parse(fs.readFileSync(sentinelPath, 'utf8'));
  s.artifacts = Array.from(new Set([...(s.artifacts || []), 'decision-flowchart.html', 'decision-flowchart.svg']));
  fs.writeFileSync(sentinelPath, JSON.stringify(s, null, 2) + '\n');
} catch (e) {
  console.warn(`[wrap-up] decision-flowchart generation failed (non-fatal): ${e.message}`);
}

console.log(`[wrap-up] ${slug} is now promotion-eligible.`);
process.exit(0);
