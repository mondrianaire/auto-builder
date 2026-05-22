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
//   - wrap-up-interactive.md          — the interactive-wrap-up question card
//                                       (interactive-wrapup-spec.md §2/§12 v1.1).
//                                       The wrap-up routine reads this, asks the
//                                       §2 differentiating question, and routes
//                                       to lane A/B/C.
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

const WRITER_VERSION = '0.2';

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

function listFiles(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

// Collapse a verification verdict to its family. The interactive-wrapup-spec
// §2 cross-check table is keyed on "pass" vs "fail"; `pass_with_concerns` is a
// pass, anything unrecognised is "unknown" (all three readings then shown).
function verdictClass(v) {
  const lv = String(v || '').toLowerCase();
  if (lv.startsWith('pass')) return 'pass';
  if (lv.startsWith('fail')) return 'fail';
  return 'unknown';
}

// The §2 verdict cross-check, specialised to this build's verdict family.
// Returns the "Reading" each possible user answer (A/B/C) would produce.
function crossCheckRows(vClass) {
  const A = vClass === 'fail'
    ? '**Contradiction — likely a FALSE FAIL.** The recorded verdict is `fail`, but the user says it works. Their answer is evidence: capture it as a re-audit evidence record (codex `re_audit_reclassified_verdict`). This corrects a mistaken verdict — it never waves a broken build through.'
    : vClass === 'pass'
      ? 'Agreement — clean. Proceed straight to ratification, no diagnostic walk.'
      : 'Verdict unrecorded — treat an A answer as agreement and proceed to ratification, but note the missing verdict.';
  const B = 'Orthogonal — a build can pass verification and still miss intent; that is Discovery misalignment by definition. Run the Lane B walk regardless of the recorded verdict.';
  const C = vClass === 'fail'
    ? 'Agreement — the build is genuinely broken. Run the Lane C walk.'
    : vClass === 'pass'
      ? '**Contradiction — verification missed something.** The recorded verdict is a pass, but the user says it is broken. Record a finding about the test itself, then run the Lane C walk.'
      : 'Verdict unrecorded — run the Lane C walk and note that there is no verdict to cross-check against.';
  return { A, B, C };
}

// Build the interactive-wrap-up question card (interactive-wrapup-spec §2/§12,
// v1.1). wrap-up-build.mjs cannot conduct a conversation, so it emits this
// card: the wrap-up routine (the Claude instance in the build's Cowork chat)
// reads it, asks the §2 question, and follows the lane it routes to.
function buildInteractiveCard({ slug, runDir, verdict }) {
  const vClass = verdictClass(verdict);
  const rows = crossCheckRows(vClass);

  const ledgerRel = 'decisions/discovery/ledger-v1.json';
  const ledgerPresent = fs.existsSync(path.join(runDir, ledgerRel));

  const tdDir = path.join(runDir, 'decisions', 'technical-discovery');
  const sectionsFiles = listFiles(tdDir)
    .filter(f => /^sections-v.*\.json$/.test(f))
    .sort();
  const sectionsRel = sectionsFiles.length
    ? `decisions/technical-discovery/${sectionsFiles[sectionsFiles.length - 1]}`
    : 'decisions/technical-discovery/sections-v*.json';

  const reportFiles = listFiles(path.join(runDir, 'state', 'reports'))
    .filter(f => f.endsWith('.json'));

  const yn = b => (b ? 'yes' : '**NO — walk degrades**');

  let existing = null;
  try {
    existing = JSON.parse(
      fs.readFileSync(path.join(runDir, 'wrap-up-diagnosis.json'), 'utf8'));
  } catch {
    existing = null;
  }

  const existingBlock = existing
    ? `
## ⚠ A diagnosis is already on file

\`runs/${slug}/wrap-up-diagnosis.json\` already exists — this build's interactive wrap-up has been conducted:

- **Lane ${existing.outcome_lane || '?'}** — ${existing.outcome_lane_label || '(no label)'}
- ${existing.culprit
        ? `**Culprit:** ${existing.culprit.id || '?'} — ${existing.culprit.role || '?'} / ${existing.culprit.task || '?'} (walkthrough cell \`${existing.culprit.cell_id || '?'}\`)`
        : 'No culprit — Lane A, no diagnostic walk.'}

Re-ask the §2 question only if you are deliberately re-validating the outcome.
`
    : '';

  return `# Interactive Wrap-Up — ${slug}

> Generated by \`wrap-up-build.mjs\` as part of the wrap-up routine.
> Spec: \`architecture/interactive-wrapup-spec.md\` §2 + §12 (v1.1).

**The wrap-up is not finished until the §2 question below has been asked.**
The wrap-up routine — the Claude instance running this build's Cowork chat —
must ask the user this question, then follow the lane it routes to and write
\`runs/${slug}/wrap-up-diagnosis.json\`.

## The question — ask the user verbatim

> **How did this build land for you?**
>
> - **A** — It's what I wanted.
> - **B** — It works, but it's not what I asked for.
> - **C** — It's broken / it doesn't do the job.

The user pre-classifies nothing — they report their own lived experience.

## Verdict cross-check

Recorded verification verdict for this build: **\`${verdict || 'unknown'}\`** (${vClass}-family).
Comparing the user's answer against it is itself diagnostic — the moment "what
the user lived" disagrees with "what the architecture concluded" is the single
most valuable signal the wrap-up produces.

| If the user answers | Reading for this build |
|---|---|
| **A** | ${rows.A} |
| **B** | ${rows.B} |
| **C** | ${rows.C} |

## Lane procedures

### Lane A — "It's what I wanted"
No diagnostic walk. Proceed to ratification. ${vClass === 'fail'
      ? '⚠ This build\'s recorded verdict is `fail`, so a Lane-A answer is a **false fail** — stage a re-audit evidence record for codex `re_audit_reclassified_verdict`; do not silently bypass the verification gate.'
      : 'Still write `wrap-up-diagnosis.json` with `outcome_lane: "A"` so every wrap-up leaves a record.'}

### Lane B — "It works, but it's not what I asked for"
Discovery misalignment — a **Phase-1 documented gap, NOT a Phase 2 trigger**
(\`build-lifecycle.md\`). Run the diagnostic walk below over the assumption
trail; land on the wrong assumption or misresolved inflection point. Output: a
documented gap + an amendment candidate. Does **not** change \`first_delivery_outcome\`.

### Lane C — "It's broken / it doesn't do the job"
Verification failure. Run the diagnostic walk below over the build trail; land
on the failing role-task. Output: a targeted Phase 2 rectification brief.
\`first_delivery_outcome\` stays \`failed_user_reprompted\` (the cardinal rule).

## The diagnostic walk (Lanes B and C) — spec §5

1. **Capture the detail** in free text — delivered vs intended (B) or what
   fails (C).
2. **Rank candidate decisions** by overlap with that description — for B,
   especially against each assumption's \`what_breaks_if_wrong\`.
3. **Walk the trail in dependency order:** Discovery assumptions → Discovery
   inflection points → TD resolutions → role tasks. Ask **one open-ended
   question per suspect**, phrased from the role Completion Report blurb. The
   questions are open — a reframe from the user is signal, follow it.
4. **Stop at the first denial, then drill one level:** the decision itself was
   wrong, vs a downstream role-task implemented a sound decision wrongly.
5. **Name the culprit:** \`id\`, owning role + task, walkthrough \`cell_id\`,
   decision text, layer, and the user's correction (B) / failure detail (C).

## Substrate the walk reads — spec §4

| Source | File (under \`runs/${slug}/\`) | Present |
|---|---|---|
| Assumption ledger + inflection points + out-of-scope | \`${ledgerRel}\` | ${yn(ledgerPresent)} |
| TD inflection resolutions | \`${sectionsRel}\` | ${yn(sectionsFiles.length > 0)} |
| Role Completion Reports | \`state/reports/*.json\` | ${reportFiles.length} file(s) |

## Output — write \`runs/${slug}/wrap-up-diagnosis.json\`

Per spec §7: \`outcome_lane\`, \`outcome_lane_label\`, \`verdict_cross_check\`,
and for B/C the \`culprit\` (\`id\`, \`role\`, \`task\`, \`cell_id\`, decision
text, \`layer\`) + the user's correction / failure detail. Lane B adds an
amendment candidate; Lane C adds a Phase 2 rectification brief; Lane A on a
recorded fail adds a re-audit evidence record.

The \`culprit.cell_id\` lets the §8 walkthrough diagnosis overlay locate the
fault — run \`walkthrough-flowchart.bat ${slug}\` after writing the diagnosis
and the \`⚠ Diagnosis\` button will highlight the culprit cell.
${existingBlock}`;
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
const interactivePath = path.join(runDir, 'wrap-up-interactive.md');
const sentinelPath = path.join(runDir, 'wrap-up-complete.json');

try {
  fs.writeFileSync(overviewPath, overview);
} catch (e) {
  die(3, `failed to write ${overviewPath}: ${e.message}`);
}

// Interactive-wrap-up question card (interactive-wrapup-spec §2/§12, v1.1).
try {
  fs.writeFileSync(interactivePath, buildInteractiveCard({ slug, runDir, verdict }));
} catch (e) {
  die(3, `failed to write ${interactivePath}: ${e.message}`);
}

const sentinel = {
  schema_version: '0.1',
  completed_at: new Date().toISOString(),
  completed_by: invokedBy,
  writer_version: WRITER_VERSION,
  artifacts: ['PROJECT-OVERVIEW.md', 'wrap-up-interactive.md']
};

try {
  fs.writeFileSync(sentinelPath, JSON.stringify(sentinel, null, 2) + '\n');
} catch (e) {
  die(3, `failed to write ${sentinelPath}: ${e.message}`);
}

console.log(`[wrap-up] wrote ${path.relative(REPO_ROOT, overviewPath)}`);
console.log(`[wrap-up] wrote ${path.relative(REPO_ROOT, interactivePath)}`);
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
  s.artifacts = Array.from(new Set([...(s.artifacts || []), 'decision-flowchart-auto.html', 'decision-flowchart-auto.svg']));
  fs.writeFileSync(sentinelPath, JSON.stringify(s, null, 2) + '\n');
} catch (e) {
  console.warn(`[wrap-up] decision-flowchart generation failed (non-fatal): ${e.message}`);
}

console.log(`[wrap-up] ${slug} is now promotion-eligible.`);
console.log('');
console.log('[wrap-up] >> INTERACTIVE STEP NOT YET DONE <<');
console.log(`[wrap-up] The wrap-up routine must now open runs/${slug}/wrap-up-interactive.md,`);
console.log('[wrap-up] ask the user the §2 question, and write wrap-up-diagnosis.json.');
process.exit(0);
