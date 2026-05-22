// ============================================================================
// architecture/scripts/walkthrough-labels-derive.mjs
//
// Mechanically derives runs/{slug}/decisions/walkthrough-labels.json from a
// build's raw substrate (Discovery ledger + TD sections + Coordinator state).
//
// PURPOSE — this is a FALLBACK. The gold path is each role emitting its own
// scan-length walkthrough blurbs as a Completion Report (the v1.11/v1.12
// substrate amendment). Until that lands, a hand-authored walkthrough-labels.json
// was the ONLY way to feed the walkthrough flowchart, which meant no build was
// checkpoint-refreshable without manual authoring. This deriver removes that
// step: it reads whatever substrate a build has produced so far and emits a
// usable (if crude) labels file — so ANY build, including one still in
// progress, can be visualized by re-running the walkthrough flowchart.
//
// It also de-risks the substrate amendment: the derived file is a working
// reference for the exact shape each role's Completion Report must eventually
// emit directly.
//
// SCOPE (deriver v1): Discovery (D-DSC-1..4) and Technical Discovery
// (D-TD-1..4) are fully derived. The Coordinator wave plan (D-CO-1..2) is
// derived once state/coordinator/ exists. Editor / Integrator / Critic /
// Convergence Verifier are NOT derived in v1 — they render in the walkthrough
// as empty "WAITING TO START" containers, which is the correct, honest
// representation of a build that has not reached those phases.
//
// SAFETY — never clobbers a hand-authored labels file. If walkthrough-labels.json
// already exists and was NOT written by this deriver, the derived output is
// written to walkthrough-labels.auto.json instead (unless --force is passed).
// walkthrough-flowchart.mjs reads walkthrough-labels.json, so a hand-authored
// file always wins; the .auto.json is available for inspection/diffing.
//
// CLI:  node architecture/scripts/walkthrough-labels-derive.mjs <slug> [--force]
// Output: runs/{slug}/decisions/walkthrough-labels.json   (or .auto.json)
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';

const GENERATOR = 'walkthrough-labels-derive/v1';

// ---------------------------------------------------------------------------
// IO helpers
// ---------------------------------------------------------------------------
function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function readTextSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Text shorteners — the walkthrough cells want scan-length phrases, but raw
// substrate carries full sentences. These reduce a sentence to its leading
// clause and clip it to a target width.
// ---------------------------------------------------------------------------

// Clip to `max` chars at a word boundary, appending an ellipsis when truncated.
function clip(text, max) {
  const s = String(text == null ? '' : text).trim().replace(/\s+/g, ' ');
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[.,;:\s]+$/, '') + '…';
}

// Leading clause: text before the first em/en-dash, colon, semicolon, open
// paren, or comma — whichever comes first. Falls back to the whole string.
function firstClause(text) {
  const s = String(text == null ? '' : text).trim();
  const m = s.search(/\s[—–-]\s|[:;(]|,\s/);
  return (m > 0 ? s.slice(0, m) : s).replace(/[.\s]+$/, '');
}

// Single-axis Discovery confidence -> the walkthrough's impact vocabulary.
// (The deriver has no dual-axis data; both axes get the same value. The
// v1.12 amendment is what will eventually carry real prompt/tech impact.)
function confToImpact(c) {
  const v = String(c || '').toLowerCase();
  if (v === 'high') return 'high';
  if (v === 'low') return 'low';
  return 'med';
}

// Wrap a string into lines of at most `maxChars` (for multi-line answer cells).
function wrapLines(text, maxChars) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > maxChars) { lines.push(cur); cur = w; }
    else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

// "section-1" -> "S1"; anything mentioning the integrator -> "integration".
function secLabel(id) {
  if (/integrat/i.test(String(id))) return 'integration';
  const m = String(id).match(/(\d+)/);
  return m ? 'S' + m[1] : String(id);
}

// Format a section's depends_on list into a scan-length phrase.
function fmtDepends(deps) {
  const d = Array.isArray(deps) ? deps : [];
  if (!d.length) return 'no dependencies';
  if (d.some(x => /integrat/i.test(String(x)))) return 'after integration';
  return 'needs ' + d.map(secLabel).join(' + ');
}

// ---------------------------------------------------------------------------
// Prompt resolution — the verbatim prompt is not stored in the ledger. Try the
// canonical Cat-1 file first, then TD's recorded literal prompt, then fall back.
// ---------------------------------------------------------------------------
function resolvePrompt(runDir, ledger, sections) {
  const txt = readTextSafe(path.join(runDir, 'prompt.txt'));
  if (txt && txt.trim()) return txt.trim();
  const pva = sections && sections.prompt_verb_analysis;
  if (pva && pva.literal_prompt) return String(pva.literal_prompt).trim();
  if (ledger && ledger.prompt) return String(ledger.prompt).trim();
  if (ledger && ledger.restatement) return String(ledger.restatement).trim();
  return '';
}

// ---------------------------------------------------------------------------
// Discovery — derived from decisions/discovery/ledger-v1.json
// ---------------------------------------------------------------------------
function deriveDiscovery(ledger) {
  const decisions = [];

  // D-DSC-1 — restatement of the prompt
  if (ledger.restatement) {
    decisions.push({
      id: 'D-DSC-1',
      question: 'What does the user want?',
      short_description: 'Restatement of the user prompt',
      answer_lines: wrapLines(ledger.restatement, 52),
      answer_source: 'FROM ledger-v1.json · restatement'
    });
  }

  // D-DSC-2 — assumption ledger
  const al = Array.isArray(ledger.assumption_ledger) ? ledger.assumption_ledger : [];
  if (al.length) {
    decisions.push({
      id: 'D-DSC-2',
      question: 'What does the build need to assume?',
      short_description: `Logged ${al.length} assumptions · rated by confidence`,
      assumptions: al.map(a => {
        const imp = confToImpact(a.confidence);
        return {
          id: a.id,
          label: clip(firstClause(a.assumption), 54),
          prompt_impact: imp,
          tech_impact: imp
        };
      }),
      answer_source: `${al.length} assumptions · derived from ledger-v1.json`
    });
  }

  // D-DSC-3 — inflection points
  const ips = Array.isArray(ledger.inflection_points) ? ledger.inflection_points : [];
  if (ips.length) {
    decisions.push({
      id: 'D-DSC-3',
      question: 'Where could this go wrong?',
      short_description: `Surfaced ${ips.length} inflection points · open questions for TD`,
      inflection_points: ips.map(ip => {
        const choices = Array.isArray(ip.choices) ? ip.choices : [];
        const def = String(ip.default_branch || '').trim();
        const defHead = def.toLowerCase().slice(0, 12);
        // alt = the choice that is NOT the default branch
        let alt = '';
        for (const c of choices) {
          const head = firstClause(c);
          if (defHead && head.toLowerCase().startsWith(defHead)) continue;
          alt = head;
          break;
        }
        if (!alt && choices.length) alt = firstClause(choices[choices.length - 1]);
        return {
          id: ip.id,
          question: clip(ip.topic, 56),
          default: clip(def, 30),
          alt: clip(alt, 28),
          importance: String(ip.importance || 'medium').toLowerCase()
        };
      }),
      dispatched_to: 'D-TD-2',
      answer_source: `${ips.length} forks · each resolved at D-TD-2`
    });
  }

  // D-DSC-4 — out of scope
  const oos = Array.isArray(ledger.out_of_scope) ? ledger.out_of_scope : [];
  if (oos.length) {
    decisions.push({
      id: 'D-DSC-4',
      question: 'What is explicitly out of scope?',
      short_description: `Marked ${oos.length} items not in this build`,
      out_of_scope: oos.map(s => clip(firstClause(s), 30)),
      answer_source: 'Discovery complete · handoff to Technical Discovery'
    });
  }

  return {
    telos: 'Reads the prompt and writes down what the build needs to assume.',
    decisions
  };
}

// ---------------------------------------------------------------------------
// Technical Discovery — derived from decisions/technical-discovery/sections-v*.json
// ---------------------------------------------------------------------------
function countAssertions(sections) {
  const len = a => (Array.isArray(a) ? a.length : 0);
  let n = len(sections.discovery_coverage_assertions)
        + len(sections.section_coverage_assertions)
        + len(sections.contract_coverage_assertions);
  (sections.sections || []).forEach(s => { n += len(s.acceptance_assertions); });
  (sections.inflection_resolutions || []).forEach(r => {
    // assertion array is named `assertions` or `machine_checkable_assertions`
    // depending on the sections-file schema version.
    n += len(r.assertions || r.machine_checkable_assertions);
  });
  return n;
}

function deriveTD(sections, ledger) {
  const decisions = [];

  // D-TD-1 — deliverable kind
  const kind = sections.deliverable_kind || sections.deliverable || null;
  decisions.push({
    id: 'D-TD-1',
    question: 'What kind of thing are we building?',
    short_description: 'Deliverable kind · anchors every downstream technical decision',
    answer_lines: kind ? wrapLines(String(kind).replace(/_/g, ' '), 40) : ['Web application'],
    answer_source: kind
      ? 'FROM sections · deliverable_kind'
      : 'DERIVED · deliverable_kind absent from substrate · defaulted'
  });

  // D-TD-2 — inflection resolutions (Discovery IPs ratified + new TD IPs).
  // An IP is a *ratified Discovery IP* if its id appears in the Discovery
  // ledger's inflection_points; anything else is a *new TD IP*. Classifying by
  // ledger membership is schema-robust — older sections files carry no `source`
  // tag, so a source-based filter silently misclassifies every Discovery IP as
  // new. The chosen branch is likewise stored under different keys across
  // schema versions (chosen_option / chosen_branch).
  const ir = Array.isArray(sections.inflection_resolutions) ? sections.inflection_resolutions : [];
  if (ir.length) {
    const dscIpIds = new Set(
      ((ledger && ledger.inflection_points) || []).map(ip => String(ip.id))
    );
    const isDsc = r => dscIpIds.has(String(r.ip_id));
    const rats = ir.filter(isDsc);
    const tdips = ir.filter(r => !isDsc(r));
    const chosenOf = r => r.chosen_option || r.chosen_branch || r.chosen || '';
    const shortChoice = c => clip(firstClause(c), 26);
    decisions.push({
      id: 'D-TD-2',
      question: 'How does TD resolve the open questions?',
      short_description: `${ir.length} inflection points · ${rats.length} ratified from Discovery + ${tdips.length} new technical questions`,
      ratifications: rats.map(r => ({
        id: r.ip_id,
        question: clip(r.topic, 40),
        chosen: shortChoice(chosenOf(r))
      })),
      new_td_ips: tdips.map(r => ({
        id: r.ip_id,
        question: clip(r.topic, 46),
        chosen: shortChoice(chosenOf(r))
      })),
      answer_source: 'FROM sections · inflection_resolutions[]'
    });
  }

  // D-TD-3 — section breakdown (materializes the sections "?" slot)
  const secs = Array.isArray(sections.sections) ? sections.sections : [];
  if (secs.length) {
    decisions.push({
      id: 'D-TD-3',
      question: 'How do we split the build?',
      short_description: `Section breakdown · ${secs.length} parallel workstreams`,
      materializes: 'sections',
      sections: secs.map(s => ({
        id: secLabel(s.id),
        name: clip(s.name, 42),
        builders: s.estimated_builders || 1,
        depends: fmtDepends(s.depends_on)
      })),
      answer_source: 'FROM sections · sections[]'
    });
  }

  // D-TD-4 — coverage
  const total = countAssertions(sections);
  decisions.push({
    id: 'D-TD-4',
    question: 'How do we know the build is correct?',
    short_description: 'Coverage checks + the prompt-named verb',
    answer_lines: [
      `${total} checks written across the build.`,
      'Plus the prompt-named-verb check —',
      'the one that decides pass or fail.'
    ],
    answer_source: 'FROM sections · coverage assertion counts'
  });

  return {
    telos: "Turns Discovery's intent into a technical plan TD can hand to builders.",
    decisions
  };
}

// ---------------------------------------------------------------------------
// Coordinator — wave plan derived from the section dependency DAG. Only emitted
// once state/coordinator/ exists, so the walkthrough honestly reflects that the
// Coordinator has actually been dispatched.
// ---------------------------------------------------------------------------
function deriveCoordinator(sections, runDir) {
  if (!fs.existsSync(path.join(runDir, 'state', 'coordinator'))) return null;
  const secs = Array.isArray(sections && sections.sections) ? sections.sections : [];
  if (!secs.length) return null;

  const byId = {};
  secs.forEach(s => { byId[s.id] = s; });

  // Topological depth: a section's wave = 1 + max(wave of its section deps).
  // Sections depending on the integrator are pinned to a final wave.
  const POST_INTEGRATION = 99;
  const waveOf = {};
  function depth(id, seen) {
    if (waveOf[id] != null) return waveOf[id];
    if (seen.has(id)) return 1; // cycle guard
    seen.add(id);
    const s = byId[id];
    const deps = (s && Array.isArray(s.depends_on)) ? s.depends_on : [];
    const secDeps = deps.filter(d => byId[d]);
    const onIntegrator = deps.some(d => /integrat/i.test(String(d)));
    let w = secDeps.length ? 1 + Math.max(...secDeps.map(d => depth(d, seen))) : 1;
    if (onIntegrator) w = POST_INTEGRATION;
    waveOf[id] = w;
    return w;
  }
  secs.forEach(s => depth(s.id, new Set()));

  // Normalize sparse wave numbers into a dense 1..N sequence.
  const distinct = [...new Set(secs.map(s => waveOf[s.id]))].sort((a, b) => a - b);
  const denseNum = {};
  distinct.forEach((w, i) => { denseNum[w] = i + 1; });

  const waves = distinct.map(w => {
    const inWave = secs.filter(s => waveOf[s.id] === w);
    const n = denseNum[w];
    const label = inWave.map(s => `${secLabel(s.id)} · ${clip(s.name, 34)}`).join(', ');
    let note;
    if (w === POST_INTEGRATION) {
      note = 'Runs after the Integrator assembles the earlier sections';
    } else if (n === 1) {
      note = 'No dependencies — dispatched first';
    } else {
      const deps = [...new Set(inWave.flatMap(s =>
        ((s.depends_on || []).filter(d => byId[d]).map(secLabel))))];
      note = deps.length ? 'Waits for ' + deps.join(' + ') : 'Dispatched after the prior wave';
    }
    return { n, sections: label, note };
  });

  return {
    telos: 'Sequences the section workstreams and dispatches the builders.',
    decisions: [
      {
        id: 'D-CO-1',
        question: "What is the Coordinator's job?",
        short_description: "Coordinator's mandate · flow control, no product calls",
        answer_lines: [
          'Sequence the build. Build the dependency graph,',
          'dispatch sections in waves as their inputs come',
          'ready, and watch for completion. The Coordinator',
          'makes no architectural or product decisions.'
        ],
        answer_source: 'FROM role_charters.md · Coordinator Charter'
      },
      {
        id: 'D-CO-2',
        question: 'What order does the build run in?',
        short_description: `Wave plan · ${secs.length} sections sequenced by dependency`,
        waves,
        answer_source: 'DERIVED · sections depends_on DAG'
      }
    ]
  };
}

// ---------------------------------------------------------------------------
// Assemble the full labels object
// ---------------------------------------------------------------------------
export function deriveLabels(slug, runDir) {
  const ledger = readJsonSafe(path.join(runDir, 'decisions/discovery/ledger-v1.json'));
  if (!ledger) {
    throw new Error(`No ledger-v1.json at ${runDir}/decisions/discovery/ — Discovery has not run yet, nothing to derive.`);
  }

  // TD: pick the highest-versioned sections-v{N}.json that parses.
  const tdDir = path.join(runDir, 'decisions/technical-discovery');
  let sections = null;
  let sectionsFile = null;
  if (fs.existsSync(tdDir)) {
    const cands = fs.readdirSync(tdDir)
      .filter(f => /^sections-v\d+\.json$/.test(f))
      .sort((a, b) => parseInt(b.match(/\d+/)[0], 10) - parseInt(a.match(/\d+/)[0], 10));
    for (const f of cands) {
      const j = readJsonSafe(path.join(tdDir, f));
      if (j) { sections = j; sectionsFile = f; break; }
    }
  }

  const labels = {
    version: 1,
    slug,
    generator: GENERATOR,
    generated_at: new Date().toISOString(),
    note: 'Mechanically derived from raw build substrate by walkthrough-labels-derive.mjs. '
        + 'This is a fallback for hand-authored labels; blurbs are clipped from full-sentence '
        + 'substrate and are necessarily crude. Superseded once roles emit their own Completion '
        + 'Reports (the v1.11/v1.12 substrate amendment).',
    prompt: resolvePrompt(runDir, ledger, sections),
    phases: { phase_1: { label: 'Phase 1', subtitle: 'Discovery' } },
    discovery: deriveDiscovery(ledger)
  };

  if (sections) labels.technical_discovery = deriveTD(sections, ledger);
  const coordinator = deriveCoordinator(sections, runDir);
  if (coordinator) labels.coordinator = coordinator;

  return { labels, sectionsFile };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const slug = args.find(a => !a.startsWith('--'));
  if (!slug) {
    console.error('Usage: node walkthrough-labels-derive.mjs <slug> [--force]');
    process.exit(1);
  }

  const repoRoot = path.resolve(import.meta.dirname, '..', '..');
  const runDir = path.join(repoRoot, 'runs', slug);
  if (!fs.existsSync(runDir)) {
    console.error(`[derive] no run directory: ${runDir}`);
    process.exit(1);
  }

  let result;
  try {
    result = deriveLabels(slug, runDir);
  } catch (e) {
    console.error(`[derive] ${e.message}`);
    process.exit(1);
  }
  const { labels, sectionsFile } = result;

  const target = path.join(runDir, 'decisions', 'walkthrough-labels.json');
  let outPath = target;
  const existing = readJsonSafe(target);
  if (existing && existing.generator !== GENERATOR && !force) {
    outPath = path.join(runDir, 'decisions', 'walkthrough-labels.auto.json');
    console.warn('[derive] walkthrough-labels.json exists and is hand-authored — not overwriting.');
    console.warn('[derive] derived output written to walkthrough-labels.auto.json instead.');
    console.warn('[derive] pass --force to replace the hand-authored file.');
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(labels, null, 2) + '\n');

  const roles = ['discovery', 'technical_discovery', 'coordinator'].filter(r => labels[r]);
  const dscN = labels.discovery.decisions.length;
  const tdN = labels.technical_discovery ? labels.technical_discovery.decisions.length : 0;
  const coN = labels.coordinator ? labels.coordinator.decisions.length : 0;
  console.log(`[derive] ${slug}: wrote ${outPath}`);
  console.log(`[derive] roles: ${roles.join(', ')}${sectionsFile ? ` (TD from ${sectionsFile})` : ''}`);
  console.log(`[derive] cells: Discovery ${dscN} · TD ${tdN} · Coordinator ${coN}`);
}

const __thisFile = decodeURIComponent(new URL(import.meta.url).pathname);
if (process.argv[1] && __thisFile.endsWith(path.basename(process.argv[1]))) {
  main();
}
