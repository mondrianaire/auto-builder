// ============================================================================
// architecture/scripts/walkthrough-flowchart.mjs  ·  v2
//
// Generates an animated step-through walkthrough HTML for a single build.
// Companion to decision-flowchart.mjs (static summary SVG).
//
// v2 architecture:
//   - ONE SVG coordinate system. Prompt, Orchestrator, every role container
//     is an SVG block <g id="blk-*">. The camera can frame any of them.
//   - COMPUTED LAYOUT. relayout() stacks blocks top-to-bottom; each block's
//     height is measured from its actual rendered content via getBBox().
//     Change content -> relayout re-stacks everything below. No magic numbers.
//   - VIEW DERIVED FROM CONTENT. frameBlock(id) measures a block's real
//     bounding box and sets the viewBox. No stored viewBox strings.
//
// Output: runs/{slug}/walkthrough-flowchart.html
// Inputs: runs/{slug}/decisions/discovery/ledger-v1.json
//         runs/{slug}/decisions/walkthrough-labels.json  (optional)
//
// CLI:  node architecture/scripts/walkthrough-flowchart.mjs <slug>
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}
function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Extract
// ---------------------------------------------------------------------------

function extractGraph(slug, runDir) {
  const ledger = readJsonSafe(path.join(runDir, 'decisions/discovery/ledger-v1.json'));
  const labels = readJsonSafe(path.join(runDir, 'decisions/walkthrough-labels.json'));
  if (!ledger) throw new Error(`No ledger-v1.json found at ${runDir}/decisions/discovery/`);
  if (!labels) console.warn(`[walkthrough-flowchart] WARNING: no walkthrough-labels.json for ${slug}.`);

  const prompt = (labels && labels.prompt) || ledger.prompt || '';
  const phase1 = (labels && labels.phases && labels.phases.phase_1) || { label: 'Phase 1', subtitle: 'Discovery' };
  const telos = (labels && labels.discovery && labels.discovery.telos)
    || 'Reads the prompt and writes down what the build needs to assume.';
  const decisions = (labels && labels.discovery && labels.discovery.decisions) || [];
  const td = (labels && labels.technical_discovery) ? {
    telos: labels.technical_discovery.telos || 'Turns Discovery’s intent into a technical plan.',
    decisions: labels.technical_discovery.decisions || []
  } : null;
  const editor = (labels && labels.editor) ? {
    telos: labels.editor.telos || 'Re-reads the literal prompt against TD’s plan.',
    decisions: labels.editor.decisions || []
  } : null;
  const coordinator = (labels && labels.coordinator) ? {
    telos: labels.coordinator.telos || 'Sequences the section workstreams and dispatches builders.',
    decisions: labels.coordinator.decisions || []
  } : null;
  const integrator = (labels && labels.integrator) ? {
    telos: labels.integrator.telos || 'Assembles every section’s output into one working artifact.',
    decisions: labels.integrator.decisions || []
  } : null;
  const critic = (labels && labels.critic) ? {
    telos: labels.critic.telos || 'Audits the assembled artifact for drift and inconsistency.',
    decisions: labels.critic.decisions || []
  } : null;
  const cv = (labels && labels.convergence_verifier) ? {
    telos: labels.convergence_verifier.telos || 'Exercises the finished artifact the way a real user would.',
    decisions: labels.convergence_verifier.decisions || []
  } : null;
  return { slug, prompt, phase1, telos, decisions, td, editor, coordinator, integrator, critic, cv };
}

// ---------------------------------------------------------------------------
// Impact bucket — drives tile accent color
// ---------------------------------------------------------------------------

// Per-IP color identity — each Discovery inflection point gets a fixed accent
// (IP1 red, IP2 orange, IP3 yellow, IP4 blue, then cycle). The SAME color is
// used in D-DSC-3 (where the IP is surfaced) and D-TD-2 (where it's ratified),
// so the viewer can see the same fork carried forward and resolved.
function ipAccent(ipId) {
  const m = String(ipId).match(/(\d+)/);
  const n = m ? parseInt(m[1], 10) : 1;
  return ['red','orange','yellow','blue'][(n - 1) % 4];
}

function bucketForAssumption(a) {
  const p = (a.prompt_impact || 'med').toLowerCase();
  const t = (a.tech_impact || 'med').toLowerCase();
  if (p === 'high' && t === 'high') return { bucket: 'key', accent: 'red',    badge: 'tile-badge-high' };
  if (p === 'high' || t === 'high') return { bucket: 'key', accent: 'orange', badge: 'tile-badge-med' };
  if (p === 'low' && t === 'low')   return { bucket: 'low', accent: 'blue',   badge: 'tile-badge-low' };
  return                                   { bucket: 'normal', accent: 'yellow', badge: 'tile-badge-low' };
}

// ===========================================================================
// SVG block renderers — every block renders its content at LOCAL coords
// (block-local y=0 at the block's top). The JS layout engine positions the
// block <g> via transform. Container width is 900, x-offset 0..900.
// ===========================================================================

const BLOCK_W = 900;     // role container width
const FULL_W = 1260;     // full canvas width

// ---- D-UP-1 — user prompt ----
function renderUp1Block(graph) {
  const lines = wrapText(graph.prompt, 52);
  const tspans = lines.map((l, i) =>
    `<tspan x="40" dy="${i === 0 ? 0 : 30}">${esc(l)}</tspan>`).join('');
  return `<g id="blk-up1" class="block">
    <text class="up-tag" x="${FULL_W/2}" y="22" text-anchor="middle">D-UP-1 · USER</text>
    <text class="up-label" x="${FULL_W/2}" y="78" text-anchor="middle">User prompt</text>
    <!-- prompt card -->
    <rect class="up-stripe-r" x="240" y="100" width="195" height="4"/>
    <rect class="up-stripe-o" x="435" y="100" width="195" height="4"/>
    <rect class="up-stripe-y" x="630" y="100" width="195" height="4"/>
    <rect class="up-stripe-b" x="825" y="100" width="195" height="4"/>
    <rect class="up-card" x="240" y="104" width="780" height="120"/>
    <text class="up-prompt-text" x="290" y="160" data-typed="">
      <tspan x="290" dy="0"></tspan>
    </text>
    <text class="up-prompt-full" x="290" y="160" visibility="hidden">${tspans.replace(/x="40"/g, 'x="290"')}</text>
  </g>`;
}

// ---- D-ORC-1 — orchestrator ----
function renderOrc1Block() {
  return `<g id="blk-orc1" class="block">
    <g id="orc-stamp-g" transform="translate(${FULL_W/2}, 46)">
      <rect class="orc-stamp-box" x="-150" y="-26" width="300" height="52" transform="rotate(-2)"/>
      <text class="orc-stamp-id" x="0" y="-2" text-anchor="middle" transform="rotate(-2)">D-ORC-1</text>
      <text class="orc-stamp-role" x="0" y="15" text-anchor="middle" transform="rotate(-2)">ORCHESTRATOR</text>
    </g>
    <text class="orc-desc" x="${FULL_W/2}" y="98" text-anchor="middle">Receives the prompt and starts the build by waking Discovery.</text>
    <text class="orc-caption" id="orc-caption" x="${FULL_W/2}" y="124" text-anchor="middle"> </text>
  </g>`;
}

// ---- Phase band ----
function renderBandBlock(id, num, name) {
  return `<g id="blk-${id}" class="block">
    <text class="phase-band-meta" x="40" y="14">PHASE ${num}</text>
    <text class="phase-band-text" x="40" y="30">${esc(name)}</text>
    <line class="phase-band-line" x1="40" y1="40" x2="${FULL_W-40}" y2="40"/>
  </g>`;
}

// ---- Role container masthead (shared) ----
// Renders at local y=0. Returns { svg, mastheadH }.
function renderMasthead(opts) {
  const { kicker, title, telos, titleSize } = opts;
  const ts = titleSize || 52;
  return `
    <rect class="cstripe-r" x="0" y="0" width="225" height="6"/>
    <rect class="cstripe-o" x="225" y="0" width="225" height="6"/>
    <rect class="cstripe-y" x="450" y="0" width="225" height="6"/>
    <rect class="cstripe-b" x="675" y="0" width="225" height="6"/>
    <text class="masthead-kicker" x="${BLOCK_W/2}" y="34" text-anchor="middle">${esc(kicker)}</text>
    <text class="masthead-title" x="${BLOCK_W/2}" y="${34 + ts*0.85}" text-anchor="middle" font-size="${ts}">${esc(title)}</text>
    <text class="masthead-telos" x="${BLOCK_W/2}" y="${34 + ts*0.85 + 28}" text-anchor="middle">${esc(telos)}</text>
    <line class="masthead-rule" x1="40" y1="${34 + ts*0.85 + 48}" x2="${BLOCK_W-40}" y2="${34 + ts*0.85 + 48}"/>`;
}
// masthead total height for a given title size
function mastheadHeight(titleSize) { return 34 + (titleSize||52)*0.85 + 60; }

// ---- Discovery / TD container ----
// The container is a block with: background rect + masthead + a content group
// that holds decision cells. Cells live in <g class="cell" data-cell="...">,
// hidden by default, revealed by the phase machine. relayout() measures the
// content group and sizes the background rect.
function renderRoleContainer(opts) {
  const { id, kicker, title, titleSize, telos, cells, waitText } = opts;
  const mh = mastheadHeight(titleSize);
  return `<g id="blk-${id}" class="block role-container">
    <rect class="container-bg" id="${id}-bg" x="0" y="0" width="${BLOCK_W}" height="300"/>
    <rect class="container-border" id="${id}-border" x="0" y="0" width="${BLOCK_W}" height="300"/>
    ${renderMasthead({ kicker, title, telos, titleSize })}
    <g class="waiting-block" id="${id}-waiting">
      <text class="role-await" x="${BLOCK_W/2}" y="${mh+40}" text-anchor="middle">WAITING TO START</text>
      <text class="role-await-hint" x="${BLOCK_W/2}" y="${mh+62}" text-anchor="middle">${esc(waitText || 'Decisions will fill this box.')}</text>
    </g>
    <g class="container-content" id="${id}-content" data-masthead-h="${mh}" transform="translate(0, ${mh})">
      ${cells}
    </g>
  </g>`;
}

// ---- Empty (guaranteed-role) container ----
function renderEmptyBlock(opts) {
  const { id, kicker, title, telos } = opts;
  const titleSize = 38;
  const mh = mastheadHeight(titleSize);
  const h = mh + 50;
  return `<g id="blk-${id}" class="block">
    <rect class="container-bg" x="0" y="0" width="${BLOCK_W}" height="${h}"/>
    <rect class="container-border" x="0" y="0" width="${BLOCK_W}" height="${h}"/>
    ${renderMasthead({ kicker, title, telos, titleSize })}
    <text class="role-await" x="${BLOCK_W/2}" y="${mh+28}" text-anchor="middle">WAITING TO START</text>
  </g>`;
}

// ---- Unknown "?" slot ----
function renderUnknownBlock(opts) {
  const { id, label, hint } = opts;
  const h = 110;
  return `<g id="blk-${id}" class="block">
    <rect class="slot-tbd-bg" x="0" y="0" width="${BLOCK_W}" height="${h}"/>
    <rect class="slot-tbd-border" x="0" y="0" width="${BLOCK_W}" height="${h}"/>
    <text class="slot-tbd-q" x="44" y="66" text-anchor="middle">?</text>
    <text class="slot-tbd-section" x="84" y="40">${esc(label)}</text>
    <text class="slot-tbd-title" x="84" y="64">${esc(hint)}</text>
    <text class="slot-tbd-hint" x="84" y="86">Materializes when its trigger event resolves.</text>
  </g>`;
}

// ---- Sections block — a "?" slot that MATERIALIZES at D-TD-3 ----
// Two stacked layers in one block: the dashed "?" placeholder (shown until
// D-TD-3 resolves) and the materialized layer (header + N workstream cards,
// faded in once the section breakdown transits down from D-TD-3).
function renderSectionsBlock(graph) {
  const tdSecDec = graph.td && graph.td.decisions.find(d => d.sections);
  const list = (tdSecDec && tdSecDec.sections) || [];
  const accents = ['red','orange','yellow','blue'];
  const tbdH = 110;
  const tbd = `<g class="sec-layer sec-tbd">
    <rect class="slot-tbd-bg" x="0" y="0" width="${BLOCK_W}" height="${tbdH}"/>
    <rect class="slot-tbd-border" x="0" y="0" width="${BLOCK_W}" height="${tbdH}"/>
    <text class="slot-tbd-q" x="44" y="66" text-anchor="middle">?</text>
    <text class="slot-tbd-section" x="84" y="40">SECTIONS — COUNT NOT YET KNOWN</text>
    <text class="slot-tbd-title" x="84" y="64">TD decides how many sections at D-TD-3. Each gets its own builder.</text>
    <text class="slot-tbd-hint" x="84" y="86">Materializes when D-TD-3 resolves.</text>
  </g>`;
  let cards = '';
  list.forEach((s, i) => {
    const ry = 70 + i*60;
    const accent = accents[i % 4];
    cards += `<g class="sec-card" data-seccard="${esc(s.id)}">
      <rect class="tile-accent-${accent}" x="26" y="${ry}" width="5" height="48"/>
      <rect class="sec-card-bg" x="31" y="${ry}" width="${BLOCK_W-62}" height="48"/>
      <rect class="sec-card-border" x="31" y="${ry}" width="${BLOCK_W-62}" height="48"/>
      <text class="tile-id" x="48" y="${ry+29}">${esc(s.id)}</text>
      <text class="tile-text" x="104" y="${ry+29}" font-size="15">${esc(s.name)}</text>
      <text class="tile-badge tile-badge-low" x="${BLOCK_W-44}" y="${ry+29}" text-anchor="end">${esc(String(s.builders))} BUILDER · ${esc((s.depends||'').toUpperCase())}</text>
    </g>`;
  });
  const fullH = 70 + list.length*60 + 14;
  const real = `<g class="sec-layer sec-real">
    <rect class="container-bg" x="0" y="0" width="${BLOCK_W}" height="${fullH}"/>
    <rect class="container-border" x="0" y="0" width="${BLOCK_W}" height="${fullH}"/>
    <rect class="sec-real-accent" x="0" y="0" width="6" height="${fullH}"/>
    <text class="sec-real-kicker" x="32" y="30">MATERIALIZED · PHASE 3 BUILD</text>
    <text class="sec-real-title" x="32" y="56">${esc(String(list.length))} Parallel Workstreams</text>
    <line x1="32" y1="64" x2="${BLOCK_W-32}" y2="64" stroke="#c8c0aa" stroke-width="1"/>
    ${cards}
  </g>`;
  return `<g id="blk-sections" class="block sections-block">
    ${tbd}
    ${real}
  </g>`;
}

// ===========================================================================
// Cell renderers — each cell is <g class="cell"> with two parts:
//   <g class="cell-title"> — D-XXX-N stamp + the question. Shown as part of
//        the "table of contents" skeleton when the container activates.
//   <g class="cell-body">  — short description + content. Revealed when this
//        specific decision is populated. Offset below the title by TITLE_H.
// Body content renders at body-local y=0. The JS layout engine measures the
// title (always) and the body (only when revealed) to size the cell.
// ===========================================================================

const TITLE_H = 84;

function cellTitleSvg(d) {
  return `<g class="cell-title">
    <rect class="title-hl" x="14" y="2" width="${BLOCK_W-28}" height="74"/>
    <rect class="title-accent" x="14" y="2" width="4" height="74"/>
    <text class="dsc-stamp" x="28" y="24">${esc(d.id)}</text>
    <line x1="28" y1="33" x2="100" y2="33" stroke="#c83a3a" stroke-width="1"/>
    <text class="dsc-question" x="${BLOCK_W/2}" y="62" text-anchor="middle">${esc(d.question)}</text>
  </g>`;
}
function cellWrap(d, bodySvg) {
  return `<g class="cell" data-cell="${esc(d.id)}">
    ${cellTitleSvg(d)}
    <g class="cell-body" transform="translate(0,${TITLE_H})">${bodySvg}</g>
  </g>`;
}
function shortDescSvg(d) {
  return `<text class="dsc-shortdesc" x="${BLOCK_W/2}" y="12" text-anchor="middle">${esc((d.short_description||'').toUpperCase())}</text>`;
}
function srcNoteSvg(d, y) {
  return `<text class="dsc-srcnote" x="${BLOCK_W/2}" y="${y}" text-anchor="middle">${esc((d.answer_source||'').toUpperCase())}</text>`;
}

function renderRestatementCell(d) {
  const lines = d.answer_lines || [];
  const tsp = lines.map((l,i) => `<tspan x="${BLOCK_W/2}" dy="${i===0?0:24}">${esc(l)}</tspan>`).join('');
  const body = `${shortDescSvg(d)}
    <circle cx="${BLOCK_W/2-25}" cy="32" r="2" fill="#c83a3a"/>
    <line x1="${BLOCK_W/2-15}" y1="32" x2="${BLOCK_W/2+15}" y2="32" stroke="#6a6258" stroke-width="0.8"/>
    <circle cx="${BLOCK_W/2+25}" cy="32" r="2" fill="#c83a3a"/>
    <text class="dsc-answer" x="${BLOCK_W/2}" y="62" text-anchor="middle">${tsp}</text>
    ${srcNoteSvg(d, 62 + lines.length*24 + 18)}`;
  return cellWrap(d, body);
}

function renderAssumptionsCell(d) {
  const enriched = (d.assumptions||[]).map(a => ({ ...a, ...bucketForAssumption(a) }));
  const keys = enriched.filter(a => a.bucket === 'key');
  const bg = enriched.filter(a => a.bucket !== 'key');
  let p = [ shortDescSvg(d) ];
  let ty = 44;
  p.push(`<text class="dsc2-key-label" x="30" y="${ty}">KEY DECISIONS — high impact on at least one axis</text>`);
  p.push(`<line x1="30" y1="${ty+10}" x2="${BLOCK_W-30}" y2="${ty+10}" stroke="#c83a3a" stroke-width="1.5"/>`);
  keys.forEach((a, i) => {
    const col = i % 2, row = Math.floor(i/2);
    const tx = col === 0 ? 30 : 462;
    const tyy = ty + 22 + row*72;
    p.push(`<g>
      <rect class="tile-accent-${a.accent}" x="${tx}" y="${tyy}" width="4" height="60"/>
      <rect class="tile-bg" x="${tx+4}" y="${tyy}" width="404" height="60"/>
      <rect class="tile-border" x="${tx+4}" y="${tyy}" width="404" height="60"/>
      <text class="tile-id" x="${tx+16}" y="${tyy+19}">${esc(a.id)}</text>
      <text class="tile-badge ${a.badge}" x="${tx+400}" y="${tyy+19}" text-anchor="end">PROMPT • ${esc((a.prompt_impact||'').toUpperCase())}  TECH • ${esc((a.tech_impact||'').toUpperCase())}</text>
      <text class="tile-text" x="${tx+16}" y="${tyy+45}" font-size="15">${esc(a.label)}</text>
    </g>`);
  });
  let by = ty + 22 + Math.ceil(keys.length/2)*72 + 24;
  p.push(`<text class="dsc2-bg-label" x="30" y="${by}">BACKGROUND ASSUMPTIONS — lower impact</text>`);
  p.push(`<line x1="30" y1="${by+10}" x2="${BLOCK_W-30}" y2="${by+10}" stroke="#c8c0aa" stroke-width="1" stroke-dasharray="3,3"/>`);
  bg.forEach((a, i) => {
    const ry = by + 30 + i*32;
    p.push(`<g>
      <rect class="tile-accent-${a.accent}" x="30" y="${ry-18}" width="3" height="26"/>
      <text class="bg-row-id" x="48" y="${ry}">${esc(a.id)}</text>
      <text class="bg-row-text" x="92" y="${ry}">${esc(a.label)}</text>
      <text class="tile-badge tile-badge-low" x="${BLOCK_W-30}" y="${ry}" text-anchor="end">PROMPT • ${esc((a.prompt_impact||'').toUpperCase())}  TECH • ${esc((a.tech_impact||'').toUpperCase())}</text>
    </g>`);
  });
  p.push(srcNoteSvg(d, by + 30 + bg.length*32 + 6));
  return cellWrap(d, p.join(''));
}

function renderInflectionCell(d) {
  const ips = d.inflection_points || [];
  let p = [ shortDescSvg(d) ];
  ips.forEach((ip, i) => {
    const ry = 30 + i*82;
    const imp = (ip.importance||'medium').toLowerCase();
    // Border COLOR = per-IP identity (matches D-TD-2). Border WIDTH + badge = importance.
    const accent = ipAccent(ip.id);
    const bw = imp === 'high' ? 5 : 3;
    const badgeCls = imp === 'high' ? 'tile-badge-high' : 'tile-badge-low';
    p.push(`<g data-ip="${esc(ip.id)}">
      <rect class="tile-accent-${accent}" x="30" y="${ry}" width="${bw}" height="68"/>
      <rect class="tile-bg" x="34" y="${ry}" width="${BLOCK_W-64}" height="68"/>
      <rect class="tile-border" x="34" y="${ry}" width="${BLOCK_W-64}" height="68"/>
      <text class="tile-id" x="48" y="${ry+18}">${esc(ip.id)}</text>
      <text class="tile-badge ${badgeCls}" x="${BLOCK_W-44}" y="${ry+18}" text-anchor="end">IMPORTANCE • ${esc(imp.toUpperCase())}</text>
      <text class="ip-question" x="48" y="${ry+42}">${esc(ip.question)}</text>
      <text class="ip-default-label" x="48" y="${ry+60}">DEFAULT</text>
      <text class="ip-default" x="118" y="${ry+60}">${esc(ip.default)}</text>
      <text class="ip-fork-dot" x="340" y="${ry+60}">·</text>
      <text class="ip-alt-label" x="360" y="${ry+60}">ALT</text>
      <text class="ip-alt" x="410" y="${ry+60}">${esc(ip.alt)}</text>
    </g>`);
  });
  // Dispatch footer — shows, at the source, that these forks are bound for
  // a later decision (e.g. D-TD-2) for resolution. Sets up the transit payoff.
  let endY = 30 + ips.length*82 + 22;
  if (d.dispatched_to){
    const dy = 30 + ips.length*82 + 18;
    p.push(`<line x1="220" y1="${dy}" x2="${BLOCK_W-220}" y2="${dy}" stroke="#c8c0aa" stroke-width="1" stroke-dasharray="3,3"/>`);
    // the 3 IP color tokens, queued for dispatch
    ips.forEach((ip, i) => {
      const cx = BLOCK_W/2 - ((ips.length-1)*13) + i*26;
      p.push(`<circle class="dispatch-dot" cx="${cx}" cy="${dy+24}" r="6" fill="var(--accent-${ipAccent(ip.id)})"/>`);
    });
    // downward routing arrow — data flows down toward TD
    p.push(`<path class="dispatch-arrow" d="M ${BLOCK_W/2} ${dy+38} L ${BLOCK_W/2} ${dy+56}" stroke="var(--accent-blue)" stroke-width="2.5" fill="none"/>`);
    p.push(`<path class="dispatch-arrow" d="M ${BLOCK_W/2-7} ${dy+50} L ${BLOCK_W/2} ${dy+59} L ${BLOCK_W/2+7} ${dy+50}" stroke="var(--accent-blue)" stroke-width="2.5" fill="none"/>`);
    p.push(`<text class="dispatch-label" x="${BLOCK_W/2}" y="${dy+80}" text-anchor="middle">SENT TO ${esc(d.dispatched_to)} FOR RESOLUTION</text>`);
    endY = dy + 100;
  }
  p.push(srcNoteSvg(d, endY));
  return cellWrap(d, p.join(''));
}

function renderOutOfScopeCell(d) {
  const items = d.out_of_scope || [];
  const colSize = Math.ceil(items.length/2);
  let p = [ shortDescSvg(d) ];
  const startY = 44;
  items.forEach((s, i) => {
    const col = i < colSize ? 0 : 1;
    const row = i < colSize ? i : i - colSize;
    const tx = col === 0 ? 60 : 480;
    const ry = startY + row*32;
    p.push(`<text class="oos-cross" x="${tx}" y="${ry}">×</text>`);
    p.push(`<text class="oos-text" x="${tx+22}" y="${ry}">${esc(s)}</text>`);
  });
  p.push(`<line x1="${BLOCK_W/2}" y1="${startY-14}" x2="${BLOCK_W/2}" y2="${startY+colSize*32-10}" stroke="#c8c0aa" stroke-width="1" stroke-dasharray="2,3"/>`);
  p.push(srcNoteSvg(d, startY + colSize*32 + 18));
  return cellWrap(d, p.join(''));
}

function renderSimpleAnswerCell(d) {
  const lines = d.answer_lines || [];
  const tsp = lines.map((l,i) => `<tspan x="${BLOCK_W/2}" dy="${i===0?0:30}">${esc(l)}</tspan>`).join('');
  const body = `${shortDescSvg(d)}
    <text class="dsc-answer-big" x="${BLOCK_W/2}" y="58" text-anchor="middle">${tsp}</text>
    ${srcNoteSvg(d, 58 + lines.length*30 + 12)}`;
  return cellWrap(d, body);
}

function renderTd2Cell(d) {
  const rats = d.ratifications || [];
  const newIps = d.new_td_ips || [];
  let p = [ shortDescSvg(d) ];
  let ry = 40;
  p.push(`<text class="dsc2-bg-label" x="30" y="${ry}">RATIFIED FROM D-DSC-3 — DISCOVERY’S INFLECTION POINTS, RESOLVED</text>`);
  p.push(`<line x1="30" y1="${ry+10}" x2="${BLOCK_W-30}" y2="${ry+10}" stroke="#c8c0aa" stroke-width="1" stroke-dasharray="3,3"/>`);
  rats.forEach((r, i) => {
    const yy = ry + 32 + i*30;
    // accent color = the IP's identity color (same as in D-DSC-3) — visually
    // links each ratified fork back to where Discovery surfaced it.
    p.push(`<g class="rat-row" data-rat="${esc(r.id)}">
      <rect class="rat-hl rat-hl-${ipAccent(r.id)}" x="26" y="${yy-22}" width="${BLOCK_W-52}" height="32"/>
      <rect class="tile-accent-${ipAccent(r.id)}" x="30" y="${yy-18}" width="4" height="24"/>
      <text class="bg-row-id" x="50" y="${yy}">${esc(r.id)}</text>
      <text class="ip-fork-dot" x="92" y="${yy}">↩</text>
      <text class="bg-row-text" x="112" y="${yy}">${esc(r.question)}</text>
      <text class="oos-cross" x="500" y="${yy}" fill="#3a7a5a">✓</text>
      <text class="ip-default" x="522" y="${yy}" font-size="12">${esc(r.chosen)}</text>
      <text class="tile-badge tile-badge-low" x="${BLOCK_W-30}" y="${yy}" text-anchor="end">DEFAULT KEPT</text>
    </g>`);
  });
  let ny = ry + 32 + rats.length*30 + 28;
  p.push(`<text class="dsc2-key-label" x="30" y="${ny}" fill="#4a6a8a">NEW TECHNICAL QUESTIONS — surfaced by TD</text>`);
  p.push(`<line x1="30" y1="${ny+10}" x2="${BLOCK_W-30}" y2="${ny+10}" stroke="#4a6a8a" stroke-width="1.5"/>`);
  newIps.forEach((r, i) => {
    const yy = ny + 34 + i*34;
    p.push(`<g>
      <rect class="tile-accent-blue" x="30" y="${yy-20}" width="4" height="28"/>
      <text class="bg-row-id" x="48" y="${yy}">${esc(r.id)}</text>
      <text class="bg-row-text" x="118" y="${yy}" font-size="13">${esc(r.question)}</text>
      <text class="ip-fork-dot" x="500" y="${yy}">→</text>
      <text class="ip-default" x="522" y="${yy}" font-size="13">${esc(r.chosen)}</text>
      <text class="tile-badge tile-badge-low" x="${BLOCK_W-30}" y="${yy}" text-anchor="end">NEW • TD-INTRODUCED</text>
    </g>`);
  });
  p.push(srcNoteSvg(d, ny + 34 + newIps.length*34 + 18));
  return cellWrap(d, p.join(''));
}

// D-TD-3 — section breakdown: the build fans out into N parallel workstreams.
// Each section gets a rainbow-cycled accent (the four-stripe identity).
function renderSectionsCell(d) {
  const secs = d.sections || [];
  const accents = ['red','orange','yellow','blue'];
  let p = [ shortDescSvg(d) ];
  secs.forEach((s, i) => {
    const ry = 40 + i*58;
    const accent = accents[i % 4];
    p.push(`<g data-sec="${esc(s.id)}">
      <rect class="tile-accent-${accent}" x="30" y="${ry}" width="4" height="46"/>
      <rect class="tile-bg" x="34" y="${ry}" width="${BLOCK_W-64}" height="46"/>
      <rect class="tile-border" x="34" y="${ry}" width="${BLOCK_W-64}" height="46"/>
      <text class="tile-id" x="48" y="${ry+28}">${esc(s.id)}</text>
      <text class="tile-text" x="100" y="${ry+28}" font-size="15">${esc(s.name)}</text>
      <text class="tile-badge tile-badge-low" x="${BLOCK_W-44}" y="${ry+28}" text-anchor="end">${esc(String(s.builders))} BUILDER · ${esc((s.depends||'').toUpperCase())}</text>
    </g>`);
  });
  p.push(srcNoteSvg(d, 40 + secs.length*58 + 16));
  return cellWrap(d, p.join(''));
}

function renderDiscoveryCell(d) {
  if (d.assumptions) return renderAssumptionsCell(d);
  if (d.inflection_points) return renderInflectionCell(d);
  if (d.out_of_scope) return renderOutOfScopeCell(d);
  return renderRestatementCell(d);
}
function renderTdCell(d) {
  if (d.ratifications || d.new_td_ips) return renderTd2Cell(d);
  if (d.sections) return renderSectionsCell(d);
  return renderSimpleAnswerCell(d);
}

// D-ED-N — Editor checklist: each structural check is a row with a pass/flag
// status, an id, a label, and a one-line result. Cleared rows read green;
// flagged rows read orange (and would carry a route in a real build).
function renderChecklistCell(d) {
  const checks = d.checks || [];
  let p = [ shortDescSvg(d) ];
  const startY = 40;
  checks.forEach((c, i) => {
    const ry = startY + i*50;
    const pass = (c.status || 'pass') === 'pass';
    const accent = pass ? 'pass' : 'flag';
    const glyph = pass ? '✓' : '⚠';
    p.push(`<g>
      <rect class="chk-bar chk-bar-${accent}" x="30" y="${ry}" width="4" height="38"/>
      <rect class="chk-bg" x="34" y="${ry}" width="${BLOCK_W-64}" height="38"/>
      <rect class="chk-border" x="34" y="${ry}" width="${BLOCK_W-64}" height="38"/>
      <text class="chk-glyph chk-${accent}" x="50" y="${ry+25}">${glyph}</text>
      <text class="chk-id" x="72" y="${ry+16}">${esc(c.id)}</text>
      <text class="chk-label" x="116" y="${ry+16}">${esc(c.label)}</text>
      <text class="chk-detail" x="72" y="${ry+32}">${esc(c.detail)}</text>
      <text class="tile-badge chk-${accent}" x="${BLOCK_W-44}" y="${ry+24}" text-anchor="end">${pass ? 'CLEARED' : 'FLAGGED'}</text>
    </g>`);
  });
  p.push(srcNoteSvg(d, startY + checks.length*50 + 14));
  return cellWrap(d, p.join(''));
}
// Generic role-decision cell — used by Editor and the Phase 4 roles
// (Integrator, Critic, CV). A decision with a `checks` array renders as a
// checklist; otherwise it renders as a simple answer.
function renderVerifyCell(d) {
  if (d.checks) return renderChecklistCell(d);
  return renderSimpleAnswerCell(d);
}

// D-CO-N — Coordinator wave plan: each row is one dispatch wave, accented to
// match its section card (S1 red, S2 orange, S3 yellow, S4 blue).
function renderWavesCell(d) {
  const waves = d.waves || [];
  const accents = ['red','orange','yellow','blue'];
  let p = [ shortDescSvg(d) ];
  const startY = 40;
  waves.forEach((w, i) => {
    const ry = startY + i*52;
    const accent = accents[i % 4];
    p.push(`<g>
      <rect class="tile-accent-${accent}" x="30" y="${ry}" width="4" height="42"/>
      <rect class="chk-bg" x="34" y="${ry}" width="${BLOCK_W-64}" height="42"/>
      <rect class="chk-border" x="34" y="${ry}" width="${BLOCK_W-64}" height="42"/>
      <text class="wave-num" x="52" y="${ry+26}">WAVE ${esc(String(w.n))}</text>
      <text class="wave-sections" x="150" y="${ry+19}">${esc(w.sections)}</text>
      <text class="wave-note" x="150" y="${ry+35}">${esc(w.note)}</text>
    </g>`);
  });
  p.push(srcNoteSvg(d, startY + waves.length*52 + 14));
  return cellWrap(d, p.join(''));
}
function renderCoordinatorCell(d) {
  if (d.waves) return renderWavesCell(d);
  return renderSimpleAnswerCell(d);
}

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) { if (cur) lines.push(cur); cur = w; }
    else cur = (cur ? cur + ' ' : '') + w;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ===========================================================================
// SVG assembly
// ===========================================================================

function renderSvg(graph) {
  // Cells rendered as title+body. The JS layout engine (relayoutCells)
  // stacks them, measuring title-only or title+body per cell state.
  let discCells = '';
  graph.decisions.forEach(d => { discCells += renderDiscoveryCell(d); });

  let tdCells = '';
  if (graph.td) {
    graph.td.decisions.forEach(d => { tdCells += renderTdCell(d); });
  }

  let edCells = '';
  if (graph.editor) {
    graph.editor.decisions.forEach(d => { edCells += renderVerifyCell(d); });
  }

  let coCells = '';
  if (graph.coordinator) {
    graph.coordinator.decisions.forEach(d => { coCells += renderCoordinatorCell(d); });
  }

  let inCells = '';
  if (graph.integrator) {
    graph.integrator.decisions.forEach(d => { inCells += renderVerifyCell(d); });
  }
  let crCells = '';
  if (graph.critic) {
    graph.critic.decisions.forEach(d => { crCells += renderVerifyCell(d); });
  }
  let cvCells = '';
  if (graph.cv) {
    graph.cv.decisions.forEach(d => { cvCells += renderVerifyCell(d); });
  }

  const blocks = [];
  blocks.push(renderUp1Block(graph));
  blocks.push(renderOrc1Block());
  blocks.push(renderBandBlock('band1', 1, graph.phase1.subtitle || 'Discovery'));
  blocks.push(renderRoleContainer({
    id: 'discovery', kicker: 'INITIAL MODE', title: 'Discovery', titleSize: 52,
    telos: graph.telos, cells: discCells,
    waitText: 'Discovery’s decisions (D-DSC-1, D-DSC-2, …) will fill this box.'
  }));
  blocks.push(renderBandBlock('band2', 2, 'Planning'));
  if (graph.td) {
    blocks.push(renderRoleContainer({
      id: 'td', kicker: 'INITIAL MODE · AFTER DISCOVERY', title: 'Technical Discovery', titleSize: 44,
      telos: graph.td.telos, cells: tdCells,
      waitText: 'TD’s decisions (D-TD-1, D-TD-2, …) will fill this box.'
    }));
  }
  if (graph.editor) {
    blocks.push(renderRoleContainer({
      id: 'editor', kicker: 'GUARANTEED · AFTER TECHNICAL DISCOVERY', title: 'Editor', titleSize: 44,
      telos: graph.editor.telos, cells: edCells,
      waitText: 'The Editor’s checks (D-ED-1, D-ED-2, …) will fill this box.'
    }));
  } else {
    blocks.push(renderEmptyBlock({ id: 'editor', kicker: 'GUARANTEED · AFTER TECHNICAL DISCOVERY',
      title: 'Editor', telos: 'Audits TD’s plan against Discovery’s intent before any code is written.' }));
  }
  blocks.push(renderBandBlock('band3', 3, 'Build'));
  if (graph.coordinator) {
    blocks.push(renderRoleContainer({
      id: 'coordinator', kicker: 'GUARANTEED · AFTER EDITOR', title: 'Coordinator', titleSize: 44,
      telos: graph.coordinator.telos, cells: coCells,
      waitText: 'The Coordinator’s decisions (D-CO-1, D-CO-2, …) will fill this box.'
    }));
  } else {
    blocks.push(renderEmptyBlock({ id: 'coordinator', kicker: 'GUARANTEED · AFTER EDITOR',
      title: 'Coordinator', telos: 'Sequences the section workstreams and dispatches builders.' }));
  }
  blocks.push(renderSectionsBlock(graph));
  blocks.push(renderBandBlock('band4', 4, 'Verification'));
  if (graph.integrator) {
    blocks.push(renderRoleContainer({
      id: 'integrator', kicker: 'GUARANTEED · AFTER SECTIONS', title: 'Integrator', titleSize: 44,
      telos: graph.integrator.telos, cells: inCells,
      waitText: 'The Integrator’s decisions (D-IN-1, D-IN-2, …) will fill this box.'
    }));
  } else {
    blocks.push(renderEmptyBlock({ id: 'integrator', kicker: 'GUARANTEED · AFTER SECTIONS',
      title: 'Integrator', telos: 'Assembles every section’s output into a single artifact.' }));
  }
  if (graph.critic) {
    blocks.push(renderRoleContainer({
      id: 'critic', kicker: 'GUARANTEED · AFTER INTEGRATION', title: 'Critic', titleSize: 44,
      telos: graph.critic.telos, cells: crCells,
      waitText: 'The Critic’s decisions (D-CR-1, D-CR-2, …) will fill this box.'
    }));
  } else {
    blocks.push(renderEmptyBlock({ id: 'critic', kicker: 'GUARANTEED · AFTER INTEGRATION',
      title: 'Critic', telos: 'Audits the assembled artifact for structural issues.' }));
  }
  if (graph.cv) {
    blocks.push(renderRoleContainer({
      id: 'cv', kicker: 'GUARANTEED · LAST', title: 'Convergence Verifier', titleSize: 38,
      telos: graph.cv.telos, cells: cvCells,
      waitText: 'The Convergence Verifier’s decisions (D-CV-1, …) will fill this box.'
    }));
  } else {
    blocks.push(renderEmptyBlock({ id: 'cv', kicker: 'GUARANTEED · LAST',
      title: 'Convergence Verifier', telos: 'Exercises the artifact the way a real user would.' }));
  }
  blocks.push(renderUnknownBlock({ id: 'helpers', label: 'OPTIONAL HELPERS — ONLY IF NEEDED',
    hint: 'Researchers run if TD has a question. Arbiter runs if something escalates.' }));

  return `<svg id="canvas" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1260 2000"
    preserveAspectRatio="xMidYMid meet" font-family="Arial, Helvetica, sans-serif">
  <rect class="placed-highlight" id="placed-hi" x="0" y="0" width="10" height="10"/>
  ${blocks.join('\n')}
  <!-- transit layer — connector paths drawn at SVG-root coords (no parent transform) -->
  <g id="transit-layer"></g>
  <!-- envelope layer — handoff dispatch pouches, drawn above everything -->
  <g id="envelope-layer"></g>
</svg>`;
}

// ===========================================================================
// HTML + CSS + JS
// ===========================================================================

// Bump this on every change set so the top-left toolbar string lets the
// user confirm they're viewing the freshly-generated HTML, not a cached one.
const WALKTHROUGH_VERSION = '2.22';

function render(graph) {
  // date + time so every regeneration produces a distinct stamp
  const genDate = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(graph.slug)} · Walkthrough · v${WALKTHROUGH_VERSION}</title>
<style>${renderCss()}</style>
</head>
<body>
<div class="stripe-band">
  <span class="s-r"></span><span class="s-o"></span><span class="s-y"></span><span class="s-b"></span>
</div>
<div id="toolbar">
  <span class="wordmark">OttoBLD</span>
  <span class="doc-class">WALKTHROUGH · v${WALKTHROUGH_VERSION} · ${genDate}</span>
  <span class="meta-strip">
    <span><span class="key">SLUG · </span><span class="val">${esc(graph.slug)}</span></span>
    <span><span class="key">DECISION · </span><span class="val" id="cur-decision">D-UP-1</span></span>
  </span>
  <button id="step-btn">Step ▶</button>
  <button id="reset-btn">Reset</button>
  <label class="focus-toggle"><input id="focus-toggle" type="checkbox" checked/><span>auto-focus</span></label>
  <span class="speed">
    <label>speed</label>
    <input id="speed-slider" type="range" min="0.25" max="4" step="0.25" value="1"/>
    <span class="speed-readout" id="speed-readout">1.0x</span>
  </span>
  <span class="progress" id="progress"></span>
</div>
<div id="stage">
  <div id="canvas-wrap">${renderSvg(graph)}</div>
</div>
<script>${renderJs(graph)}</script>
</body>
</html>
`;
}

function renderCss() {
  return `
:root {
  --paper-light:#f5efe2; --paper-warm:#ede4ca; --paper-cream:#f7f1e3; --paper-deep:#ece4cb;
  --accent-red:#c83a3a; --accent-orange:#d77a3e; --accent-yellow:#d4b04a; --accent-blue:#4a6a8a;
  --ink-navy:#1a3a5e; --ink-body:#2a2a2a; --ink-dim:#6a6258; --ink-rule:#c8c0aa;
  --type-display:"Georgia","Times New Roman",serif;
  --type-data:ui-monospace,"Cascadia Mono","Consolas",monospace;
  --type-ui:-apple-system,BlinkMacSystemFont,"Helvetica Neue","Segoe UI",sans-serif;
}
html,body{margin:0;padding:0;height:100%;color:var(--ink-body);font-family:var(--type-ui);
  background-color:var(--paper-light);
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"),radial-gradient(ellipse at center,var(--paper-cream) 0%,var(--paper-deep) 100%);
  background-size:240px 240px,100% 100%;background-attachment:fixed,fixed;}
body{display:flex;flex-direction:column;}
.stripe-band{height:6px;display:flex;flex-shrink:0;}
.stripe-band>span{flex:1;}
.s-r{background:var(--accent-red);}.s-o{background:var(--accent-orange);}
.s-y{background:var(--accent-yellow);}.s-b{background:var(--accent-blue);}
#toolbar{height:56px;background:var(--paper-warm);border-bottom:1px solid var(--ink-rule);
  display:flex;align-items:center;padding:0 20px;gap:16px;font-family:var(--type-data);
  font-size:11px;color:var(--ink-dim);flex-shrink:0;text-transform:uppercase;letter-spacing:0.14em;}
#toolbar .wordmark{font:italic 700 22px/1 var(--type-display);color:var(--ink-navy);text-transform:none;}
#toolbar .doc-class{font-size:9px;font-weight:700;color:var(--ink-dim);letter-spacing:0.20em;
  border:1px solid var(--ink-dim);padding:3px 8px;background:rgba(245,239,226,0.4);}
#toolbar .meta-strip{display:flex;gap:14px;align-items:center;font-size:9px;}
#toolbar .meta-strip .key{opacity:0.6;}
#toolbar .meta-strip .val{color:var(--ink-navy);font-weight:700;}
/* fixed-width so the decision label cycling doesn't reflow the toolbar buttons */
#cur-decision{display:inline-block;min-width:172px;text-align:left;}
#toolbar button{background:var(--paper-cream);border:1px solid var(--ink-navy);color:var(--ink-navy);
  padding:6px 14px;font-size:10px;font-weight:700;font-family:var(--type-data);letter-spacing:0.20em;
  text-transform:uppercase;cursor:pointer;border-radius:0;}
#toolbar button:hover{background:var(--paper-light);}
#toolbar button:disabled{opacity:0.35;cursor:not-allowed;}
#toolbar .focus-toggle{display:flex;align-items:center;gap:6px;font-size:9px;letter-spacing:0.18em;}
#toolbar .focus-toggle input{accent-color:var(--accent-blue);margin:0;}
#toolbar .speed{display:flex;align-items:center;gap:8px;font-size:9px;letter-spacing:0.18em;}
#toolbar .speed input[type=range]{width:90px;height:12px;cursor:pointer;accent-color:var(--accent-blue);margin:0;}
#toolbar .speed-readout{width:40px;text-align:right;color:var(--ink-navy);font-size:10px;letter-spacing:0;}
#toolbar .progress{margin-left:auto;font-size:9px;letter-spacing:0.18em;min-width:110px;text-align:right;}
#stage{flex:1;overflow:hidden;display:flex;}
#canvas-wrap{width:100%;display:flex;align-items:stretch;}
svg#canvas{display:block;width:100%;height:calc(100vh - 62px);user-select:none;}

/* blocks + cells */
.block{} /* positioned by JS transform */
/* a cell's TITLE shows when the container activates (table-of-contents skeleton) */
.cell{opacity:0;transition:opacity 600ms ease-out;}
.cell.in{opacity:1;}
/* a cell's BODY fills in when that specific decision is populated */
.cell-body{opacity:0;transition:opacity 700ms ease-out;}
.cell-body.in{opacity:1;}
.cell-title{transition:opacity 400ms ease-out;}
/* SELECTION — when a section is the active focus, a highlighter band sweeps
   in behind its title (left-to-right) and a red accent bar marks the edge. */
.title-hl{
  fill:var(--accent-yellow);fill-opacity:0.22;
  opacity:0;transform:scaleX(0.03);
  transform-box:fill-box;transform-origin:left center;
  transition:opacity 200ms ease-out, transform 480ms cubic-bezier(0.3,0,0.2,1);
}
.title-accent{
  fill:var(--accent-red);
  opacity:0;transform:scaleY(0.2);
  transform-box:fill-box;transform-origin:center;
  transition:opacity 260ms ease-out, transform 360ms cubic-bezier(0.2,0,0,1.15);
}
.cell.active .title-hl{opacity:1;transform:scaleX(1);}
.cell.active .title-accent{opacity:1;transform:scaleY(1);}
.cell.active .dsc-question{fill:var(--ink-navy);}
.role-container .waiting-block{opacity:1;transition:opacity 500ms ease-out;}
.role-container .waiting-block.gone{opacity:0;}

/* container frame */
.container-bg{fill:var(--paper-warm);}
.container-border{fill:none;stroke:var(--ink-navy);stroke-width:1;}
.cstripe-r{fill:var(--accent-red);}.cstripe-o{fill:var(--accent-orange);}
.cstripe-y{fill:var(--accent-yellow);}.cstripe-b{fill:var(--accent-blue);}

/* masthead */
.masthead-kicker{font-family:var(--type-data);font-size:10px;font-weight:700;fill:var(--accent-red);
  letter-spacing:0.20em;text-transform:uppercase;}
.masthead-title{font-family:var(--type-display);font-style:italic;font-weight:700;fill:var(--ink-navy);}
.masthead-telos{font-family:var(--type-display);font-style:italic;font-size:15px;fill:var(--ink-body);}
.masthead-rule{stroke:var(--ink-navy);stroke-width:1.5;}

/* phase band */
.phase-band-meta{font-family:var(--type-data);font-size:9px;fill:var(--ink-dim);letter-spacing:0.18em;text-transform:uppercase;}
.phase-band-text{font-family:var(--type-display);font-size:16px;font-style:italic;font-weight:700;fill:var(--ink-navy);}
.phase-band-line{stroke:var(--ink-rule);stroke-width:1;stroke-dasharray:3,3;}

/* role await */
.role-await{font-family:var(--type-data);font-size:10px;fill:var(--ink-dim);letter-spacing:0.06em;}
.role-await-hint{font-family:var(--type-display);font-style:italic;font-size:11px;fill:var(--ink-dim);}

/* D-UP-1 */
.up-tag{font-family:var(--type-data);font-size:10px;font-weight:700;fill:var(--accent-red);letter-spacing:0.20em;}
.up-label{font-family:var(--type-display);font-style:italic;font-weight:700;font-size:34px;fill:var(--ink-navy);}
.up-stripe-r{fill:var(--accent-red);}.up-stripe-o{fill:var(--accent-orange);}
.up-stripe-y{fill:var(--accent-yellow);}.up-stripe-b{fill:var(--accent-blue);}
.up-card{fill:var(--paper-warm);stroke:var(--ink-rule);stroke-width:1;}
.up-prompt-text,.up-prompt-full{font-family:var(--type-display);font-style:italic;font-size:20px;fill:var(--ink-body);}

/* D-ORC-1 */
.orc-stamp-box{fill:rgba(245,239,226,0.5);stroke:var(--accent-blue);stroke-width:2;}
.orc-stamp-id{font-family:var(--type-data);font-size:10px;font-weight:700;fill:var(--accent-red);letter-spacing:0.16em;}
.orc-stamp-role{font-family:var(--type-data);font-size:12px;font-weight:700;fill:var(--accent-blue);letter-spacing:0.20em;}
.orc-desc{font-family:var(--type-display);font-style:italic;font-size:14px;fill:var(--ink-navy);}
.orc-caption{font-family:var(--type-display);font-style:italic;font-size:13px;fill:var(--ink-dim);}

/* decision cells */
.dsc-stamp{font-family:var(--type-data);font-size:10px;font-weight:700;fill:var(--accent-red);letter-spacing:0.20em;text-transform:uppercase;}
.dsc-question{font-family:var(--type-display);font-size:24px;font-style:italic;font-weight:700;fill:var(--ink-navy);}
.dsc-shortdesc{font-family:var(--type-data);font-size:10px;font-weight:700;fill:var(--ink-dim);letter-spacing:0.16em;text-transform:uppercase;}
/* subsection CONTENT uses the system-sans voice — distinct from the meta
   areas (italic Georgia questions + monospace labels). Three voices, no overlap. */
.dsc-answer{font-family:var(--type-ui);font-size:15px;fill:var(--ink-body);}
.dsc-answer-big{font-family:var(--type-ui);font-size:30px;font-weight:800;fill:var(--ink-navy);letter-spacing:-0.01em;}
.dsc-srcnote{font-family:var(--type-data);font-size:9px;font-weight:700;fill:#999;letter-spacing:0.16em;text-transform:uppercase;}
.dsc2-key-label{font-family:var(--type-data);font-size:10px;font-weight:700;fill:var(--accent-red);letter-spacing:0.18em;text-transform:uppercase;}
.dsc2-bg-label{font-family:var(--type-data);font-size:10px;font-weight:700;fill:var(--ink-dim);letter-spacing:0.18em;text-transform:uppercase;}
.tile-bg{fill:var(--paper-light);}
.tile-border{fill:none;stroke:var(--ink-rule);stroke-width:1;}
.tile-accent-red{fill:var(--accent-red);}.tile-accent-orange{fill:var(--accent-orange);}
.tile-accent-yellow{fill:var(--accent-yellow);}.tile-accent-blue{fill:var(--accent-blue);}
.tile-id{font-family:var(--type-data);font-size:11px;font-weight:700;fill:var(--ink-navy);letter-spacing:0.14em;}
.tile-text{font-family:var(--type-ui);font-size:13.5px;fill:var(--ink-body);}
.tile-badge{font-family:var(--type-data);font-size:8px;font-weight:700;fill:var(--ink-dim);letter-spacing:0.16em;text-transform:uppercase;}
.tile-badge-high{fill:var(--accent-red);}.tile-badge-med{fill:var(--accent-orange);}.tile-badge-low{fill:var(--ink-dim);}
.bg-row-text{font-family:var(--type-ui);font-size:12px;fill:var(--ink-body);}
.bg-row-id{font-family:var(--type-data);font-size:10px;font-weight:700;fill:var(--ink-navy);letter-spacing:0.14em;}
.ip-question{font-family:var(--type-ui);font-size:15px;font-weight:700;fill:var(--ink-navy);}
.ip-default-label{font-family:var(--type-data);font-size:9px;font-weight:700;fill:var(--ink-dim);letter-spacing:0.16em;text-transform:uppercase;}
.ip-default{font-family:var(--type-ui);font-size:13px;font-weight:700;fill:var(--ink-navy);}
.ip-alt-label{font-family:var(--type-data);font-size:9px;fill:var(--ink-dim);letter-spacing:0.16em;text-transform:uppercase;}
.ip-alt{font-family:var(--type-ui);font-size:13px;fill:var(--ink-dim);}
.ip-fork-dot{font-family:var(--type-data);font-size:14px;fill:var(--ink-rule);}
.oos-cross{font-family:var(--type-data);font-size:13px;font-weight:700;fill:var(--accent-red);}
.oos-text{font-family:var(--type-ui);font-size:13px;fill:var(--ink-dim);}
/* rat-row resolution sweep — each ratified IP gets a left-to-right wipe
   in its own accent colour once it has landed in D-TD-2. */
.rat-hl{opacity:0;transform:scaleX(0.02);transform-box:fill-box;transform-origin:left center;
  transition:opacity 180ms ease-out,transform 520ms cubic-bezier(0.3,0,0.2,1);}
.rat-hl-red{fill:var(--accent-red);fill-opacity:0.20;}
.rat-hl-orange{fill:var(--accent-orange);fill-opacity:0.20;}
.rat-hl-yellow{fill:var(--accent-yellow);fill-opacity:0.24;}
.rat-hl-blue{fill:var(--accent-blue);fill-opacity:0.20;}
.rat-row.lit .rat-hl{opacity:1;transform:scaleX(1);}
/* Editor checklist rows — green when a check clears, orange when flagged */
.chk-bg{fill:var(--paper-light);}
.chk-border{fill:none;stroke:var(--ink-rule);stroke-width:1;}
.chk-bar-pass{fill:#3a7a5a;}
.chk-bar-flag{fill:var(--accent-orange);}
.chk-pass{fill:#3a7a5a;}
.chk-flag{fill:var(--accent-orange);}
.chk-glyph{font-family:var(--type-data);font-size:15px;font-weight:700;}
.chk-id{font-family:var(--type-data);font-size:10px;font-weight:700;fill:var(--ink-navy);letter-spacing:0.12em;}
.chk-label{font-family:var(--type-ui);font-size:14px;font-weight:700;fill:var(--ink-navy);}
.chk-detail{font-family:var(--type-ui);font-size:11.5px;fill:var(--ink-dim);}
/* Coordinator wave rows */
.wave-num{font-family:var(--type-data);font-size:12px;font-weight:700;fill:var(--ink-navy);letter-spacing:0.14em;}
.wave-sections{font-family:var(--type-ui);font-size:14px;font-weight:700;fill:var(--ink-navy);}
.wave-note{font-family:var(--type-ui);font-size:11.5px;fill:var(--ink-dim);}
.slot-tbd-bg{fill:var(--paper-cream);fill-opacity:0.5;}
.slot-tbd-border{stroke:var(--ink-rule);stroke-width:1;fill:none;stroke-dasharray:6,4;}
.slot-tbd-q{font-family:var(--type-display);font-size:28px;font-style:italic;font-weight:700;fill:var(--ink-rule);}
.slot-tbd-section{font-family:var(--type-data);font-size:9px;font-weight:700;fill:var(--accent-blue);letter-spacing:0.20em;text-transform:uppercase;}
.slot-tbd-title{font-family:var(--type-display);font-size:13px;font-style:italic;fill:var(--ink-navy);}
.slot-tbd-hint{font-family:var(--type-data);font-size:9px;fill:var(--ink-dim);letter-spacing:0.10em;text-transform:uppercase;}
/* sections block — the "?" slot that materializes into N workstream cards
   when D-TD-3 resolves. Two layers cross-fade; cards arrive one per token. */
.sec-tbd{transition:opacity 400ms ease-out;}
.sec-real{opacity:0;transition:opacity 600ms ease-out;}
.sections-block.materialized .sec-tbd{opacity:0;}
.sections-block.materialized .sec-real{opacity:1;}
.sec-real-accent{fill:var(--accent-blue);}
.sec-real-kicker{font-family:var(--type-data);font-size:10px;font-weight:700;fill:var(--ink-dim);letter-spacing:0.18em;text-transform:uppercase;}
.sec-real-title{font-family:var(--type-display);font-size:24px;font-style:italic;font-weight:700;fill:var(--ink-navy);}
.sec-card-bg{fill:var(--paper-light);}
.sec-card-border{fill:none;stroke:var(--ink-rule);stroke-width:1;}
.sec-card{opacity:0;}
.sec-card.arrived{opacity:1;transition:opacity 350ms ease-out;}

/* dispatch footer — at the source cell, foreshadows that data is bound elsewhere */
.dispatch-label{font-family:var(--type-data);font-size:10px;font-weight:700;fill:var(--accent-blue);letter-spacing:0.18em;text-transform:uppercase;}
.dispatch-arrow{animation:dispatch-pulse 1.7s ease-in-out infinite;}
.dispatch-dot{animation:dispatch-pulse 1.7s ease-in-out infinite;}
@keyframes dispatch-pulse{0%,100%{transform:translateY(0);opacity:0.78;}50%{transform:translateY(3px);opacity:1;}}

/* transit — connector paths showing inflection points pass D-DSC-3 -> D-TD-2 */
.transit-path{fill:none;stroke-width:3.5;opacity:0.9;stroke-linecap:round;}
.transit-red{stroke:var(--accent-red);}
.transit-orange{stroke:var(--accent-orange);}
.transit-yellow{stroke:var(--accent-yellow);}
.transit-blue{stroke:var(--accent-blue);}
.transit-dot{stroke:none;}
.transit-dot-red{fill:var(--accent-red);}
.transit-dot-orange{fill:var(--accent-orange);}
.transit-dot-yellow{fill:var(--accent-yellow);}
.transit-dot-blue{fill:var(--accent-blue);}
/* labeled source + destination regions during the transit */
.transit-srcbox{fill:rgba(200,58,58,0.05);stroke:var(--accent-red);stroke-width:2.5;stroke-dasharray:9 6;}
.transit-dstbox{fill:rgba(26,58,94,0.04);stroke:var(--ink-navy);stroke-width:2.5;stroke-dasharray:9 6;}
.transit-label{font-family:var(--type-data);font-size:24px;font-weight:700;letter-spacing:0.16em;}
.transit-label-src{fill:var(--accent-red);}
.transit-label-dst{fill:var(--ink-navy);}

/* handoff envelope — a small OttoBLD dispatch slip carrying one task's output
   to the next task: packs at the dispatch footer, travels, unpacks on arrival */
.env-body{fill:var(--paper-warm);stroke:var(--ink-navy);stroke-width:1.4;}
.env-stripe-r{fill:var(--accent-red);}.env-stripe-o{fill:var(--accent-orange);}
.env-stripe-y{fill:var(--accent-yellow);}.env-stripe-b{fill:var(--accent-blue);}
.env-flap{fill:var(--paper-deep);stroke:var(--ink-navy);stroke-width:1.4;stroke-linejoin:round;}
.env-seal{fill:var(--accent-red);}
.env-rule{stroke:var(--ink-rule);stroke-width:1;stroke-dasharray:3,2;}
.env-from{font-family:var(--type-data);font-size:10px;font-weight:700;fill:var(--accent-red);letter-spacing:0.13em;}
.env-contents{font-family:var(--type-ui);font-size:13px;font-weight:700;fill:var(--ink-navy);}
.env-token{stroke:var(--paper-light);stroke-width:1.5;}

/* highlight */
.placed-highlight{fill:none;stroke:var(--accent-red);stroke-width:3;stroke-dasharray:8 6;opacity:0;pointer-events:none;}
.placed-highlight.flashing{animation:placed-flash 1800ms ease-out forwards;}
@keyframes placed-flash{0%{opacity:0;}12%{opacity:1;}72%{opacity:1;}100%{opacity:0;}}
`;
}

// ===========================================================================
// JS — layout engine + view engine + phase machine
// ===========================================================================

function renderJs(graph) {
  const promptText = JSON.stringify(graph.prompt || '');
  const dscIds = JSON.stringify(graph.decisions.map(d => d.id));
  const tdIds = JSON.stringify(graph.td ? graph.td.decisions.map(d => d.id) : []);
  const edIds = JSON.stringify(graph.editor ? graph.editor.decisions.map(d => d.id) : []);
  const coIds = JSON.stringify(graph.coordinator ? graph.coordinator.decisions.map(d => d.id) : []);
  const inIds = JSON.stringify(graph.integrator ? graph.integrator.decisions.map(d => d.id) : []);
  const crIds = JSON.stringify(graph.critic ? graph.critic.decisions.map(d => d.id) : []);
  const cvIds = JSON.stringify(graph.cv ? graph.cv.decisions.map(d => d.id) : []);
  // map: decision id -> IP ids it ratifies. Drives the transit animation.
  const ratMap = {};
  if (graph.td) graph.td.decisions.forEach(d => {
    if (d.ratifications && d.ratifications.length) ratMap[d.id] = d.ratifications.map(r => r.id);
  });
  // map: decision id -> the "?" block it materializes (e.g. D-TD-3 -> sections).
  const matMap = {};
  if (graph.td) graph.td.decisions.forEach(d => {
    if (d.materializes) matMap[d.id] = d.materializes;
  });
  const tdSecDec = graph.td && graph.td.decisions.find(d => d.sections);
  const secCount = (tdSecDec && tdSecDec.sections) ? tdSecDec.sections.length : 0;
  return `
(function(){
  const PROMPT_TEXT = ${promptText};
  const DSC_IDS = ${dscIds};
  const TD_IDS = ${tdIds};
  const ED_IDS = ${edIds};
  const CO_IDS = ${coIds};
  const IN_IDS = ${inIds};
  const CR_IDS = ${crIds};
  const CV_IDS = ${cvIds};
  const CELL_RATIFIES = ${JSON.stringify(ratMap)};
  const CELL_MATERIALIZES = ${JSON.stringify(matMap)};
  const SEC_COUNT = ${secCount};
  const SEC_FULL_H = ${70 + secCount*60 + 14};  // materialized sections-block height
  const BASE_TYPE_MS = 17;
  const TITLE_H = ${TITLE_H};
  let speedMul = 1.0;
  function typeMs(){ return Math.max(2, Math.round(BASE_TYPE_MS / speedMul)); }

  const canvas = document.getElementById('canvas');
  const stepBtn = document.getElementById('step-btn');
  const resetBtn = document.getElementById('reset-btn');
  const progress = document.getElementById('progress');
  const speedSlider = document.getElementById('speed-slider');
  const speedReadout = document.getElementById('speed-readout');
  const curDecision = document.getElementById('cur-decision');
  const focusToggle = document.getElementById('focus-toggle');
  const placedHi = document.getElementById('placed-hi');

  // ---- BLOCK MODEL ----
  // Ordered list of blocks. Each block is an SVG <g id="blk-*">.
  // visible=false blocks are skipped by relayout (height 0, hidden).
  const BLOCK_ORDER = ['up1','orc1','band1','discovery','band2']
    .concat(${graph.td ? "['td']" : "[]"})
    .concat(['editor','band3','coordinator','sections','band4','integrator','critic','cv','helpers']);
  const GAP = 26;
  const blocks = {};
  BLOCK_ORDER.forEach(id => {
    const g = document.getElementById('blk-' + id);
    blocks[id] = { id, g, visible: false };
  });
  // sections block resolves from a "?" slot to N workstream cards at D-TD-3.
  const sectionsState = { materialized: false };

  // ---- LAYOUT ENGINE ----
  // relayout() stacks visible blocks top-to-bottom. Each block's height is
  // MEASURED from its actual rendered content via getBBox(). No magic numbers.
  function blockHeight(id){
    const b = blocks[id];
    if (!b || !b.visible) return 0;
    // Role containers: height = the sized bg rect (content-driven), NOT the
    // group getBBox — getBBox would count opacity:0 unrevealed cells.
    if (id === 'discovery' || id === 'td' || id === 'editor' || id === 'coordinator'
        || id === 'integrator' || id === 'critic' || id === 'cv') return sizeContainer(id);
    // Sections block: two stacked layers — height is state-driven, not getBBox
    // (getBBox would count the opacity:0 materialized layer before it resolves).
    if (id === 'sections') return sectionsState.materialized ? SEC_FULL_H : 110;
    try {
      const bb = b.g.getBBox();
      return bb.height + bb.y;
    } catch(e){ return 0; }
  }
  // Stack cells whose TITLE is shown (.cell.in). A cell with its body filled
  // (.cell-body.in) takes title+body height; otherwise just the title.
  // Records cellLayout[cellId] = {y,h} (content-group-local) for frameCell.
  const CELL_GAP = 30;
  const cellLayout = {};
  function relayoutCells(id){
    const content = document.getElementById(id + '-content');
    if (!content) return 0;
    let y = 0;
    content.querySelectorAll('.cell').forEach(cell => {
      if (!cell.classList.contains('in')) return;  // title not shown yet
      const cid = cell.getAttribute('data-cell');
      const body = cell.querySelector('.cell-body');
      let h = TITLE_H + 12;  // title-only height
      if (body && body.classList.contains('in')) {
        try {
          const bb = body.getBBox();
          h = TITLE_H + bb.y + bb.height + 20;
        } catch(e){}
      }
      cell.setAttribute('transform', 'translate(0,' + y + ')');
      cellLayout[cid] = { y: y, h: h };
      y += h + CELL_GAP;
    });
    return y;
  }
  // Size a container's bg rect to enclose masthead + revealed, stacked cells.
  function sizeContainer(id){
    const content = document.getElementById(id + '-content');
    const bg = document.getElementById(id + '-bg');
    const border = document.getElementById(id + '-border');
    if (!content || !bg) return 0;
    const mh = parseFloat(content.getAttribute('data-masthead-h')) || 180;
    const stacked = relayoutCells(id);
    const h = mh + (stacked > 0 ? stacked + 24 : 56);
    bg.setAttribute('height', h);
    if (border) border.setAttribute('height', h);
    return h;
  }
  function relayout(){
    let y = 0;
    BLOCK_ORDER.forEach(id => {
      const b = blocks[id];
      if (!b || !b.g) return;
      if (!b.visible){ b.g.setAttribute('visibility','hidden'); return; }
      b.g.setAttribute('visibility','visible');
      b.g.setAttribute('transform','translate(0,' + y + ')');
      b.y = y;
      const h = blockHeight(id);
      b.h = h;
      y += h + GAP;
    });
    totalHeight = y;
  }
  let totalHeight = 2000;

  // ---- VIEW ENGINE ----
  // frameBlock(id) measures a block's real position+size and animates the
  // viewBox to frame it. Pure read of the layout — never writes structure.
  let vbAnim = null;
  function animateViewBox(target, durationMs){
    if (focusToggle && !focusToggle.checked){ canvas.setAttribute('viewBox', target.join(' ')); return; }
    if (vbAnim) cancelAnimationFrame(vbAnim);
    const cur = (canvas.getAttribute('viewBox')||'0 0 1260 2000').split(/\\s+/).map(parseFloat);
    const dur = Math.max(60, durationMs || Math.round(900 / speedMul));
    const start = performance.now();
    function tick(now){
      const t = Math.min(1, (now-start)/dur);
      const e = 1 - Math.pow(1-t, 3);
      const v = cur.map((c,i) => c + (target[i]-c)*e);
      canvas.setAttribute('viewBox', v.join(' '));
      if (t < 1) vbAnim = requestAnimationFrame(tick); else vbAnim = null;
    }
    vbAnim = requestAnimationFrame(tick);
  }
  function frameBlock(id, pad){
    const b = blocks[id];
    if (!b || !b.visible) return;
    pad = pad == null ? 60 : pad;
    const y = b.y || 0;
    const h = b.h || blockHeight(id);
    // Block content spans roughly x=0..1260 (full) or centered 900-wide.
    // Frame the full width so containers + bands are all visible.
    animateViewBox([ -pad, y - pad, 1260 + pad*2, h + pad*2 ]);
  }
  function frameWide(){
    // Frame everything currently visible.
    animateViewBox([ -40, -40, 1340, totalHeight + 40 ]);
  }
  function frameRange(idFrom, idTo, pad){
    pad = pad == null ? 50 : pad;
    const a = blocks[idFrom], b = blocks[idTo];
    if (!a || !b) return;
    const top = a.y || 0;
    const bot = (b.y||0) + (b.h||0);
    animateViewBox([ -pad, top - pad, 1260 + pad*2, (bot-top) + pad*2 ]);
  }
  // cellAbsRect — a cell's {y,h} in viewBox coords, from the layout engine
  // (the trustworthy source — same data frameCell + relayout use).
  function cellAbsRect(containerId, cellId){
    const b = blocks[containerId];
    const content = document.getElementById(containerId + '-content');
    const cl = cellLayout[cellId];
    if (!b || !content || !cl) return null;
    const mh = parseFloat(content.getAttribute('data-masthead-h')) || 180;
    return { y: (b.y || 0) + mh + cl.y, h: cl.h };
  }
  // Frame a single cell inside a container — used while a decision fills in.
  function frameCell(containerId, cellId, pad){
    pad = pad == null ? 46 : pad;
    const r = cellAbsRect(containerId, cellId);
    if (!r) return;
    animateViewBox([ -pad, r.y - pad, 1260 + pad*2, r.h + pad*2 ]);
  }

  function flashHighlight(id){
    const b = blocks[id];
    if (!b || !b.g) return;
    try {
      const y = b.y || 0;
      let x, w, h;
      if (id === 'discovery' || id === 'td'){
        // Use the sized bg rect — getBBox of the group would count the
        // opacity:0 unrevealed cells and balloon the box far past the container.
        const bg = document.getElementById(id + '-bg');
        x = parseFloat(bg.getAttribute('x')) || 0;
        w = parseFloat(bg.getAttribute('width')) || 900;
        h = parseFloat(bg.getAttribute('height')) || 200;
        placedHi.setAttribute('x', x - 8);
        placedHi.setAttribute('y', y - 8);
        placedHi.setAttribute('width', w + 16);
        placedHi.setAttribute('height', h + 16);
      } else {
        const bb = b.g.getBBox();
        placedHi.setAttribute('x', bb.x - 8);
        placedHi.setAttribute('y', y + bb.y - 8);
        placedHi.setAttribute('width', bb.width + 16);
        placedHi.setAttribute('height', bb.height + 16);
      }
      placedHi.classList.remove('flashing');
      void placedHi.getBBox();
      placedHi.classList.add('flashing');
    } catch(e){}
  }

  // ---- TRANSIT — visualizes data passing between cells ----
  function ipAccent(id){
    const m = String(id).match(/(\\d+)/);
    const n = m ? parseInt(m[1],10) : 1;
    return ['red','orange','yellow','blue'][(n-1)%4];
  }
  // absPos — an element's bbox in viewBox coords, computed from the LAYOUT
  // ENGINE (block y + masthead + cell y + cell-body offset), the SAME data
  // the camera (cellAbsRect) uses. This keeps the transit animation locked to
  // the container positions. Falls back to getCTM only for elements outside
  // the cell structure.
  function absPos(el){
    if (!el) return null;
    let bb; try { bb = el.getBBox(); } catch(e){ return null; }
    // sections block — a plain block; its children sit at block.y + local y.
    const secBlk = el.closest('.sections-block');
    if (secBlk){
      const b = blocks['sections'];
      if (b) return { x: bb.x, y: bb.y + (b.y||0), w: bb.width, h: bb.height };
    }
    const cellG = el.closest('[data-cell]');
    const rc = el.closest('.role-container');
    if (cellG && rc){
      const containerId = rc.id.replace('blk-','');
      const cellId = cellG.getAttribute('data-cell');
      const b = blocks[containerId];
      const content = document.getElementById(containerId + '-content');
      const cl = cellLayout[cellId];
      if (b && content && cl){
        const mh = parseFloat(content.getAttribute('data-masthead-h')) || 180;
        const inBody = !!el.closest('.cell-body');
        const offY = (b.y||0) + mh + cl.y + (inBody ? TITLE_H : 0);
        return { x: bb.x, y: bb.y + offY, w: bb.width, h: bb.height };
      }
    }
    // fallback — getCTM, for elements not inside the cell structure
    const m = el.getCTM();
    if (!m) return null;
    const p = canvas.createSVGPoint();
    p.x = bb.x; p.y = bb.y;
    const a = p.matrixTransform(m);
    p.x = bb.x+bb.width; p.y = bb.y+bb.height;
    const c = p.matrixTransform(m);
    return { x:Math.min(a.x,c.x), y:Math.min(a.y,c.y), w:Math.abs(c.x-a.x), h:Math.abs(c.y-a.y) };
  }
  // runTransit — shows ratified IPs passing from their source cell to the
  // destination cell. BOTH camera moves use cellAbsRect (the reliable
  // layout-engine frame) — never the getCTM union, which mis-resolves on
  // hidden bodies. Connector-path endpoints still use absPos (sub-cell precision).
  function runTransit(ipIds, containerId, cellId, onComplete){
    const layer = document.getElementById('transit-layer');
    if (!layer){ onComplete(); return; }
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    const NS = 'http://www.w3.org/2000/svg';
    function mkRect(x,y,w,h,cls){
      const r = document.createElementNS(NS,'rect');
      r.setAttribute('x',x); r.setAttribute('y',y);
      r.setAttribute('width',w); r.setAttribute('height',h);
      r.setAttribute('class',cls); layer.appendChild(r); return r;
    }
    function mkLabel(x,y,txt,cls){
      const t = document.createElementNS(NS,'text');
      t.setAttribute('x',x); t.setAttribute('y',y);
      t.setAttribute('class','transit-label '+cls);
      t.textContent = txt; layer.appendChild(t); return t;
    }
    const pad = 18;

    // measure the SOURCE tiles (already revealed + stable; revealing the
    // dest later won't move them — the dest is below the source)
    const srcItems = [];
    let srcCellId = '', srcContainerId = 'discovery';
    ipIds.forEach(ipid => {
      const src = canvas.querySelector('[data-ip="' + ipid + '"]');
      if (src){
        const s = absPos(src);
        if (s){
          srcItems.push({ ipid:ipid, s:s, accent:ipAccent(ipid) });
          const c = src.closest('[data-cell]'); if (c) srcCellId = c.getAttribute('data-cell');
          const rc = src.closest('.role-container'); if (rc) srcContainerId = rc.id.replace('blk-','');
        }
      }
    });
    if (!srcItems.length){ onComplete(); return; }
    let sT=Infinity,sB=-Infinity,sL=Infinity,sR=-Infinity;
    srcItems.forEach(l => {
      sT=Math.min(sT,l.s.y); sB=Math.max(sB,l.s.y+l.s.h);
      sL=Math.min(sL,l.s.x); sR=Math.max(sR,l.s.x+l.s.w);
    });

    // STEP 1 — frame the SOURCE cell via cellAbsRect (reliable). Dwell.
    const srcRect = cellAbsRect(srcContainerId, srcCellId);
    if (srcRect) animateViewBox([ -50, srcRect.y - 60, 1360, srcRect.h + 120 ], Math.round(650/speedMul));
    mkRect(sL-pad, sT-pad, (sR-sL)+pad*2, (sB-sT)+pad*2, 'transit-srcbox');
    mkLabel(sL-pad, sT-pad-16, 'DATA FROM ' + srcCellId, 'transit-label-src');

    // STEP 2 — populate the destination, ZOOM OUT to show the whole data flow
    // (source -> connector paths + tokens -> destination), then settle on the
    // destination. Both camera frames use cellAbsRect (reliable).
    setTimeout(() => {
      revealCellBody(cellId);   // dest now populated
      relayout();               // cellLayout[cellId] now has full height
      // measure dest rows post-reveal (accurate, visible)
      const links = [];
      srcItems.forEach(sl => {
        const dst = canvas.querySelector('[data-rat="' + sl.ipid + '"]');
        if (dst){ const d = absPos(dst); if (d) links.push({ ipid:sl.ipid, s:sl.s, d:d, accent:sl.accent }); }
      });
      if (links.length){
        let dT=Infinity,dB=-Infinity,dL=Infinity,dR=-Infinity;
        links.forEach(l => {
          dT=Math.min(dT,l.d.y); dB=Math.max(dB,l.d.y+l.d.h);
          dL=Math.min(dL,l.d.x); dR=Math.max(dR,l.d.x+l.d.w);
        });
        mkRect(dL-pad, dT-pad, (dR-dL)+pad*2, (dB-dT)+pad*2, 'transit-dstbox');
        mkLabel(dL-pad, dT-pad-16, 'RESOLVED IN ' + cellId, 'transit-label-dst');
      }
      const srcRectN = cellAbsRect(srcContainerId, srcCellId);
      const dstRect  = cellAbsRect(containerId, cellId);
      // ZOOM OUT — frame the whole arc: source through destination
      const arcTop = (srcRectN ? srcRectN.y : sT) - 100;
      const arcBot = (dstRect ? dstRect.y + dstRect.h : sB) + 100;
      const zoomMs = Math.round(850 / speedMul);
      animateViewBox([ -70, arcTop, 1400, arcBot - arcTop ], zoomMs);
      // after the zoom-out settles, draw the paths + run the tokens
      setTimeout(() => {
        const travelMs = Math.round(1700 / speedMul);
        links.forEach((l, i) => {
          const sx = l.s.x + l.s.w, sy = l.s.y + l.s.h/2;
          const dx = l.d.x, dy = l.d.y + l.d.h/2;
          const midX = Math.max(sx, dx, 1140) + 30 + i*26;
          const path = document.createElementNS(NS, 'path');
          path.setAttribute('d', 'M '+sx+' '+sy+' C '+midX+' '+sy+', '+midX+' '+dy+', '+dx+' '+dy);
          path.setAttribute('class', 'transit-path transit-' + l.accent);
          layer.appendChild(path);
          const len = path.getTotalLength();
          path.style.strokeDasharray = len;
          path.style.strokeDashoffset = len;
          path.getBoundingClientRect();
          path.style.transition = 'stroke-dashoffset ' + travelMs + 'ms cubic-bezier(0.3,0,0.2,1)';
          path.style.strokeDashoffset = '0';
          const dot = document.createElementNS(NS, 'circle');
          dot.setAttribute('r', '10');
          dot.setAttribute('class', 'transit-dot transit-dot-' + l.accent);
          dot.setAttribute('cx', sx); dot.setAttribute('cy', sy);
          layer.appendChild(dot);
          const t0 = performance.now();
          (function move(now){
            const t = Math.min(1, (now - t0)/travelMs);
            const te = 1 - Math.pow(1-t, 3);
            const pt = path.getPointAtLength(len * te);
            dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
            if (t < 1) requestAnimationFrame(move);
            else dot.style.opacity = '0';
          })(performance.now());
        });
        // after the tokens arrive: settle the camera onto the destination,
        // reveal-complete, then clean up the transit layer
        setTimeout(() => {
          if (dstRect) animateViewBox([ -50, dstRect.y - 60, 1360, dstRect.h + 120 ], Math.round(750/speedMul));
          onComplete();
          setTimeout(() => { while (layer.firstChild) layer.removeChild(layer.firstChild); }, Math.round(900/speedMul));
          // each resolved IP now gets its own left-to-right wipe, in order
          setTimeout(() => highlightRatRows(cellId), Math.round(620/speedMul));
        }, travelMs + 250);
      }, zoomMs + 120);
    }, Math.round(950 / speedMul));
  }

  // highlightRatRows — once the ratified IPs have landed in their cell,
  // sweep each row left-to-right in turn so the eye reads one resolution
  // at a time (IP1, then IP2, then IP3 ...).
  function highlightRatRows(cellId){
    const cell = canvas.querySelector('.cell[data-cell="' + cellId + '"]');
    if (!cell) return;
    const rows = Array.from(cell.querySelectorAll('.rat-row'));
    rows.forEach((row, i) => {
      setTimeout(() => row.classList.add('lit'), Math.round(i * 450 / speedMul));
    });
  }

  // materializeSections — the "?" sections slot resolves into N workstream
  // cards. Cross-fades the two layers and re-sizes the block via the layout
  // engine (height switches 110 -> SEC_FULL_H, blocks below shift down).
  function materializeSections(){
    const blk = document.getElementById('blk-sections');
    if (blk) blk.classList.add('materialized');
    sectionsState.materialized = true;
    relayout();
  }

  // runSectionsTransit — D-TD-3's section breakdown flows DOWN into the
  // sections container. Same visual grammar as runTransit (source box,
  // zoom-out arc, traveling tokens) but the destination is a whole block,
  // not a cell — and arrival MATERIALIZES the "?" slot, one card per token.
  function runSectionsTransit(srcContainerId, srcCellId, onComplete){
    const layer = document.getElementById('transit-layer');
    if (!layer){ materializeSections(); onComplete(); return; }
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    const NS = 'http://www.w3.org/2000/svg';
    function mkRect(x,y,w,h,cls){
      const r = document.createElementNS(NS,'rect');
      r.setAttribute('x',x); r.setAttribute('y',y);
      r.setAttribute('width',w); r.setAttribute('height',h);
      r.setAttribute('class',cls); layer.appendChild(r); return r;
    }
    function mkLabel(x,y,txt,cls){
      const t = document.createElementNS(NS,'text');
      t.setAttribute('x',x); t.setAttribute('y',y);
      t.setAttribute('class','transit-label '+cls);
      t.textContent = txt; layer.appendChild(t); return t;
    }
    const pad = 18;
    const accents = ['red','orange','yellow','blue'];
    // SOURCE — the section tiles rendered inside D-TD-3
    const srcItems = [];
    canvas.querySelectorAll('.cell[data-cell="'+srcCellId+'"] [data-sec]').forEach((el,i) => {
      const s = absPos(el);
      if (s) srcItems.push({ id: el.getAttribute('data-sec'), s:s, accent: accents[i%4] });
    });
    if (!srcItems.length){ materializeSections(); onComplete(); return; }
    let sT=Infinity,sB=-Infinity,sL=Infinity,sR=-Infinity;
    srcItems.forEach(l => {
      sT=Math.min(sT,l.s.y); sB=Math.max(sB,l.s.y+l.s.h);
      sL=Math.min(sL,l.s.x); sR=Math.max(sR,l.s.x+l.s.w);
    });

    // STEP 1 — frame the D-TD-3 source cell, draw the labeled source box
    const srcRect = cellAbsRect(srcContainerId, srcCellId);
    if (srcRect) animateViewBox([ -50, srcRect.y - 60, 1360, srcRect.h + 120 ], Math.round(650/speedMul));
    mkRect(sL-pad, sT-pad, (sR-sL)+pad*2, (sB-sT)+pad*2, 'transit-srcbox');
    mkLabel(sL-pad, sT-pad-16, 'SECTION BREAKDOWN FROM ' + srcCellId, 'transit-label-src');

    // STEP 2 — measure the destination cards, zoom out to the whole arc,
    // then run the tokens; each arrival reveals its card.
    setTimeout(() => {
      const links = [];
      srcItems.forEach(sl => {
        const dst = canvas.querySelector('[data-seccard="' + sl.id + '"]');
        if (dst){ const d = absPos(dst); if (d) links.push({ id:sl.id, s:sl.s, d:d, accent:sl.accent }); }
      });
      const secBlk = blocks['sections'];
      const secTop = secBlk ? (secBlk.y||0) : sB + 200;
      if (links.length){
        let dT=Infinity,dB=-Infinity,dL=Infinity,dR=-Infinity;
        links.forEach(l => {
          dT=Math.min(dT,l.d.y); dB=Math.max(dB,l.d.y+l.d.h);
          dL=Math.min(dL,l.d.x); dR=Math.max(dR,l.d.x+l.d.w);
        });
        mkRect(dL-pad, dT-pad, (dR-dL)+pad*2, (dB-dT)+pad*2, 'transit-dstbox');
        mkLabel(dL-pad, dT-pad-16, 'MATERIALIZED IN SECTIONS', 'transit-label-dst');
      }
      // ZOOM OUT — frame the whole arc: D-TD-3 through the sections block
      const arcTop = (srcRect ? srcRect.y : sT) - 100;
      const arcBot = secTop + SEC_FULL_H + 100;
      const zoomMs = Math.round(850 / speedMul);
      animateViewBox([ -70, arcTop, 1400, arcBot - arcTop ], zoomMs);
      setTimeout(() => {
        const travelMs = Math.round(1700 / speedMul);
        // materialize up front so the empty workstream frame fades in while
        // the tokens are still travelling; each card stays hidden until hit.
        materializeSections();
        links.forEach((l, i) => {
          const sx = l.s.x + l.s.w/2, sy = l.s.y + l.s.h;
          const dx = l.d.x + l.d.w/2, dy = l.d.y;
          const midX = Math.max(sx, dx) + 90 + i*30;
          const path = document.createElementNS(NS, 'path');
          path.setAttribute('d', 'M '+sx+' '+sy+' C '+midX+' '+sy+', '+midX+' '+dy+', '+dx+' '+dy);
          path.setAttribute('class', 'transit-path transit-' + l.accent);
          layer.appendChild(path);
          const len = path.getTotalLength();
          path.style.strokeDasharray = len;
          path.style.strokeDashoffset = len;
          path.getBoundingClientRect();
          path.style.transition = 'stroke-dashoffset ' + travelMs + 'ms cubic-bezier(0.3,0,0.2,1)';
          path.style.strokeDashoffset = '0';
          const dot = document.createElementNS(NS, 'circle');
          dot.setAttribute('r', '10');
          dot.setAttribute('class', 'transit-dot transit-dot-' + l.accent);
          dot.setAttribute('cx', sx); dot.setAttribute('cy', sy);
          layer.appendChild(dot);
          const t0 = performance.now();
          (function move(now){
            const t = Math.min(1, (now - t0)/travelMs);
            const te = 1 - Math.pow(1-t, 3);
            const pt = path.getPointAtLength(len * te);
            dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
            if (t < 1) requestAnimationFrame(move);
            else {
              dot.style.opacity = '0';
              const card = canvas.querySelector('[data-seccard="' + l.id + '"]');
              if (card) card.classList.add('arrived');
            }
          })(performance.now());
        });
        setTimeout(() => {
          if (secBlk) animateViewBox([ -50, (secBlk.y||0) - 60, 1360, SEC_FULL_H + 120 ], Math.round(750/speedMul));
          onComplete();
          setTimeout(() => { while (layer.firstChild) layer.removeChild(layer.firstChild); }, Math.round(900/speedMul));
        }, travelMs + 250);
      }, zoomMs + 120);
    }, Math.round(950 / speedMul));
  }

  // ---- ENVELOPE — a task-to-task handoff. The PACK is performed in the
  // source task: the camera holds on the dispatching cell while that cell's
  // inflection-point tokens fly into a small OttoBLD dispatch slip and it
  // seals. The slip then travels (camera panning with it). The UNPACK is
  // performed in the receiving task: the camera holds on the destination
  // cell while the slip opens and its tokens drop into it. ONE rAF clock
  // drives every property, so the motion stays smooth.
  function runCellEnvelope(srcEl, ipIds, dstContainerId, dstCellId, sender, contents, onComplete){
    const layer = document.getElementById('envelope-layer');
    const done = onComplete || function(){};
    const src = srcEl ? absPos(srcEl) : null;
    relayout();
    const dst = cellAbsRect(dstContainerId, dstCellId);
    if (!layer || !src || !dst){ done(); return; }
    if (vbAnim){ cancelAnimationFrame(vbAnim); vbAnim = null; }
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    const NS = 'http://www.w3.org/2000/svg';
    const EW = 252, EH = 96, FLAP = 26;
    const cx = src.x + src.w/2;
    const exLeft = cx - EW/2;
    const srcY = src.y + src.h/2 - EH/2;
    const dstY = dst.y - EH*0.16;
    const clamp01 = v => Math.min(1, Math.max(0, v));
    const easeIO = u => u < 0.5 ? 4*u*u*u : 1 - Math.pow(-2*u+2,3)/2;

    function mk(tag, attrs, cls, parent){
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      if (cls) e.setAttribute('class', cls);
      (parent||layer).appendChild(e); return e;
    }

    // data tokens — one per inflection point. Pack origins = the source cell's
    // dispatch-footer dots; unpack targets = a tidy stack inside the dest cell.
    const ids = (ipIds && ipIds.length) ? ipIds : [];
    const srcCellG = srcEl ? srcEl.closest('[data-cell]') : null;
    const footDots = srcCellG ? Array.from(srcCellG.querySelectorAll('.dispatch-dot')) : [];
    const tok = ids.map((id, i) => {
      const fd = footDots[i] ? absPos(footDots[i]) : null;
      const ox = fd ? fd.x + fd.w/2 : (cx - (ids.length-1)*13 + i*26);
      const oy = fd ? fd.y + fd.h/2 : srcY;
      const c = mk('circle', {r:6, cx:ox, cy:oy, opacity:0,
        fill:'var(--accent-' + ipAccent(id) + ')'}, 'env-token', layer);
      return { el:c, ox:ox, oy:oy, tx:70, ty:dst.y + 104 + i*26 };
    });

    // envelope (drawn above the tokens so they fly into / out of it)
    const g = mk('g', {}, 'envelope', layer);
    mk('rect', {x:0,y:0,width:EW,height:EH}, 'env-body', g);
    const seg = EH/4;
    ['r','o','y','b'].forEach((c,i) => mk('rect', {x:0,y:i*seg,width:5,height:seg}, 'env-stripe-'+c, g));
    const cg = mk('g', {}, 'env-contents-grp', g);
    const tFrom = mk('text', {x:20,y:42}, 'env-from', cg); tFrom.textContent = 'FROM ' + sender;
    mk('line', {x1:20,y1:52,x2:EW-18,y2:52}, 'env-rule', cg);
    const tCon = mk('text', {x:20,y:76}, 'env-contents', cg); tCon.textContent = contents;
    // flap — a triangle hinged on the top edge; scale(1,s) sweeps it from
    // open (s=-1, apex up) to sealed (s=1, apex down).
    const flap = mk('path', {d:'M 0 0 L '+EW+' 0 L '+(EW/2)+' '+FLAP+' Z'}, 'env-flap', g);
    const seal = mk('circle', {cx:EW/2,cy:FLAP,r:6}, 'env-seal', g);

    // initial state (avoids a one-frame flash at canvas origin)
    g.setAttribute('transform', 'translate('+exLeft+','+srcY+')');
    g.setAttribute('opacity', '0');
    cg.setAttribute('opacity', '0');
    flap.setAttribute('transform', 'scale(1,-1)');
    seal.setAttribute('opacity', '0');

    // camera: holds on the SOURCE task through the pack, pans during travel,
    // holds on the DESTINATION task through the unpack.
    const VW = 1352, VH = 600, viewX = -46;
    const srcView = (srcY + EH/2) - VH/2;
    const dstView = (dstY + EH/2) + 110 - VH/2;
    const followOn = !focusToggle || focusToggle.checked;

    const T = Math.round(3200 / speedMul);
    const t0 = performance.now();
    (function frame(now){
      const t = Math.min(1, (now - t0)/T);
      // travel window t in [0.37, 0.72] — also drives the camera pan
      const te = easeIO(clamp01((t - 0.37)/0.35));
      const envY = srcY + (dstY - srcY)*te;
      g.setAttribute('transform', 'translate('+exLeft+','+envY+')');
      if (followOn){
        canvas.setAttribute('viewBox',
          viewX + ' ' + (srcView + (dstView-srcView)*te) + ' ' + VW + ' ' + VH);
      }
      // envelope fade in / out
      g.setAttribute('opacity',
        clamp01(t < 0.07 ? t/0.07 : (t > 0.96 ? (1-t)/0.04 : 1)).toFixed(3));
      // contents load during the pack
      cg.setAttribute('opacity', clamp01((t-0.10)/0.14).toFixed(3));
      // flap: open -> sealed over the pack; sealed; -> open over the unpack
      let s;
      if (t < 0.27) s = -1 + 2*clamp01((t-0.10)/0.15);
      else if (t < 0.80) s = 1;
      else s = 1 - 2*clamp01((t-0.81)/0.12);
      flap.setAttribute('transform', 'scale(1,'+s.toFixed(3)+')');
      seal.setAttribute('opacity', s > 0.55 ? '1' : '0');
      // tokens — fly into the slip during the pack, ride sealed + hidden
      // through travel, fly out into the destination cell during the unpack.
      const pe = easeIO(clamp01((t-0.08)/0.18));
      const ue = easeIO(clamp01((t-0.80)/0.14));
      const pk = clamp01((t-0.08)/0.18), up = clamp01((t-0.80)/0.14);
      const packX = exLeft + EW/2, packY = srcY + EH/2;
      const upX = exLeft + EW/2, upY = dstY + EH/2;
      tok.forEach(tk => {
        if (t < 0.27){
          tk.el.setAttribute('cx', (tk.ox + (packX-tk.ox)*pe).toFixed(1));
          tk.el.setAttribute('cy', (tk.oy + (packY-tk.oy)*pe).toFixed(1));
          tk.el.setAttribute('opacity', clamp01(Math.min(pk*4, (1-pk)*3)).toFixed(2));
        } else if (t < 0.80){
          tk.el.setAttribute('opacity', '0');
        } else {
          tk.el.setAttribute('cx', (upX + (tk.tx-upX)*ue).toFixed(1));
          tk.el.setAttribute('cy', (upY + (tk.ty-upY)*ue).toFixed(1));
          tk.el.setAttribute('opacity', clamp01(Math.min(up*4, (1-up)*2.4)).toFixed(2));
        }
      });
      if (t < 1) requestAnimationFrame(frame);
      else {
        done();
        setTimeout(() => { while (layer.firstChild) layer.removeChild(layer.firstChild); },
                   Math.round(420 / speedMul));
      }
    })(performance.now());
  }

  // ---- content reveal helpers ----
  function showBlock(id){ if (blocks[id]) blocks[id].visible = true; }
  // revealCellTitle — shows a cell's TITLE (table-of-contents skeleton)
  function revealCellTitle(cellId){
    const cell = canvas.querySelector('.cell[data-cell="' + cellId + '"]');
    if (cell) cell.classList.add('in');
  }
  // revealCellBody — fills a cell's body (the decision's actual content)
  function revealCellBody(cellId){
    const cell = canvas.querySelector('.cell[data-cell="' + cellId + '"]');
    if (!cell) return;
    cell.classList.add('in');
    const body = cell.querySelector('.cell-body');
    if (body) body.classList.add('in');
  }
  function setWaiting(id, gone){
    const w = document.getElementById(id + '-waiting');
    if (w){ if (gone) w.classList.add('gone'); else w.classList.remove('gone'); }
  }
  // setActiveCell — marks exactly one cell as the selected focus (highlighter
  // band + accent bar sweep in). Pass null to clear.
  function setActiveCell(cellId){
    canvas.querySelectorAll('.cell.active').forEach(c => c.classList.remove('active'));
    if (cellId){
      const cell = canvas.querySelector('.cell[data-cell="' + cellId + '"]');
      if (cell) cell.classList.add('active');
    }
  }

  // ---- D-UP-1 typewriter (SVG text) ----
  let typeTimer = null;
  function typePrompt(done){
    const tnode = canvas.querySelector('.up-prompt-text tspan');
    if (!tnode){ if (done) done(); return; }
    let i = 0;
    function tick(){
      if (i >= PROMPT_TEXT.length){ if (done) done(); return; }
      tnode.textContent += PROMPT_TEXT[i]; i++;
      relayout();
      typeTimer = setTimeout(tick, typeMs());
    }
    tick();
  }

  // ---- ORCHESTRATOR captions ----
  const ORC_CAPTIONS = {
    4:'Reading the prompt…',
    5:'Phase 1 — Discovery. The first role to run.',
    6:'Laying out the phases the build will move through.',
    7:'Placing every guaranteed role into its phase.',
    8:'Discovery starts here.'
  };
  function setCaption(p){
    const c = document.getElementById('orc-caption');
    if (c) c.textContent = ORC_CAPTIONS[p] || ' ';
  }

  // ---- PHASE MACHINE ----
  // Choreography:
  //  1-3   D-UP-1 typewriter
  //  4     ORC wakes
  //  5     Phase 1 band placed
  //  6     Discovery container placed
  //  7     downstream stack placed
  //  8     ORC hands off
  //  P_DSC_ACT   Discovery activates — ALL decision titles shown (skeleton)
  //  then EACH decision gets TWO beats:
  //    focus-empty  — camera moves to the empty titled section (keyframe)
  //    populate     — that section's body fills in
  //  P_DSC_OUT   camera zooms out to the whole filled Discovery
  //  ...same pattern for TD.
  const N_DSC = DSC_IDS.length;
  const N_TD = TD_IDS.length;
  const HAS_TD = N_TD > 0;
  const N_ED = ED_IDS.length;
  const HAS_ED = N_ED > 0;
  const N_CO = CO_IDS.length;
  const HAS_CO = N_CO > 0;
  const N_IN = IN_IDS.length;
  const HAS_IN = N_IN > 0;
  const N_CR = CR_IDS.length;
  const HAS_CR = N_CR > 0;
  const N_CV = CV_IDS.length;
  const HAS_CV = N_CV > 0;
  const P_DSC_ACT = 9;
  const P_DSC_OUT = P_DSC_ACT + 1 + N_DSC;   // 1 step per decision (highlight → reveal)
  const P_TD_ACT  = P_DSC_OUT + 1;
  const P_TD_OUT  = P_TD_ACT + 1 + N_TD;
  const P_ED_ACT  = P_TD_OUT + 1;
  const P_ED_OUT  = P_ED_ACT + 1 + N_ED;
  const P_CO_ACT  = P_ED_OUT + 1;
  const P_CO_OUT  = P_CO_ACT + 1 + N_CO;
  const P_IN_ACT  = P_CO_OUT + 1;
  const P_IN_OUT  = P_IN_ACT + 1 + N_IN;
  const P_CR_ACT  = P_IN_OUT + 1;
  const P_CR_OUT  = P_CR_ACT + 1 + N_CR;
  const P_CV_ACT  = P_CR_OUT + 1;
  const P_CV_OUT  = P_CV_ACT + 1 + N_CV;
  // MAX_PHASE = the last role's OUT phase that actually has content
  let MAX_PHASE = P_DSC_OUT;
  if (HAS_TD) MAX_PHASE = P_TD_OUT;
  if (HAS_ED) MAX_PHASE = P_ED_OUT;
  if (HAS_CO) MAX_PHASE = P_CO_OUT;
  if (HAS_IN) MAX_PHASE = P_IN_OUT;
  if (HAS_CR) MAX_PHASE = P_CR_OUT;
  if (HAS_CV) MAX_PHASE = P_CV_OUT;
  let phase = 0;

  // For a phase in a role's cell range, return which cell it addresses.
  function cellStep(ph, actPhase, ids){
    const rel = ph - actPhase - 1;
    if (rel < 0 || rel >= ids.length) return null;
    return { id: ids[rel], idx: rel };
  }

  function updateProgress(){
    progress.textContent = 'PHASE ' + phase + ' / ' + MAX_PHASE;
    stepBtn.disabled = (phase < 3) || phase >= MAX_PHASE;
    let lbl = 'D-UP-1';
    if (HAS_CV && phase === P_CV_OUT) lbl = 'CONVERGED ✓';
    else if (HAS_CV && phase === P_CV_ACT) lbl = 'CONVERGENCE VERIFIER';
    else if (HAS_CV && phase > P_CV_ACT && phase < P_CV_OUT){
      const cs = cellStep(phase, P_CV_ACT, CV_IDS); lbl = cs ? cs.id : 'D-CV';
    }
    else if (HAS_CR && phase === P_CR_OUT) lbl = 'CRITIC ✓';
    else if (HAS_CR && phase === P_CR_ACT) lbl = 'CRITIC';
    else if (HAS_CR && phase > P_CR_ACT && phase < P_CR_OUT){
      const cs = cellStep(phase, P_CR_ACT, CR_IDS); lbl = cs ? cs.id : 'D-CR';
    }
    else if (HAS_IN && phase === P_IN_OUT) lbl = 'INTEGRATOR ✓';
    else if (HAS_IN && phase === P_IN_ACT) lbl = 'INTEGRATOR';
    else if (HAS_IN && phase > P_IN_ACT && phase < P_IN_OUT){
      const cs = cellStep(phase, P_IN_ACT, IN_IDS); lbl = cs ? cs.id : 'D-IN';
    }
    else if (HAS_CO && phase === P_CO_OUT) lbl = 'COORDINATOR ✓';
    else if (HAS_CO && phase === P_CO_ACT) lbl = 'COORDINATOR';
    else if (HAS_CO && phase > P_CO_ACT && phase < P_CO_OUT){
      const cs = cellStep(phase, P_CO_ACT, CO_IDS); lbl = cs ? cs.id : 'D-CO';
    }
    else if (HAS_ED && phase === P_ED_OUT) lbl = 'EDITOR ✓';
    else if (HAS_ED && phase === P_ED_ACT) lbl = 'EDITOR';
    else if (HAS_ED && phase > P_ED_ACT && phase < P_ED_OUT){
      const cs = cellStep(phase, P_ED_ACT, ED_IDS); lbl = cs ? cs.id : 'D-ED';
    }
    else if (HAS_TD && phase === P_TD_OUT) lbl = 'TD ✓';
    else if (HAS_TD && phase === P_TD_ACT) lbl = 'TECHNICAL DISCOVERY';
    else if (HAS_TD && phase > P_TD_ACT && phase < P_TD_OUT){
      const cs = cellStep(phase, P_TD_ACT, TD_IDS); lbl = cs ? cs.id : 'D-TD';
    }
    else if (phase === P_DSC_OUT) lbl = 'DISCOVERY ✓';
    else if (phase === P_DSC_ACT) lbl = 'DISCOVERY';
    else if (phase > P_DSC_ACT && phase < P_DSC_OUT){
      const cs = cellStep(phase, P_DSC_ACT, DSC_IDS); lbl = cs ? cs.id : 'D-DSC';
    }
    else if (phase >= 4) lbl = 'D-ORC-1';
    curDecision.textContent = lbl;
  }

  // Run the two-beat cell logic for a role. Returns true if handled.
  // One step per subsection:
  //  - highlight the section's title, camera lands on it
  //  - if the decision ratifies IPs surfaced elsewhere, run the transit
  //    animation (connector paths + traveling tokens) before revealing
  //  - otherwise just reveal the body after a beat
  function runCellBeat(actPhase, ids, containerId){
    const cs = cellStep(phase, actPhase, ids);
    if (!cs) return false;
    setActiveCell(cs.id);
    const reveal = () => {
      revealCellBody(cs.id);
      requestAnimationFrame(() => { relayout(); frameCell(containerId, cs.id); });
    };
    const ratifies = CELL_RATIFIES[cs.id];
    const materializes = CELL_MATERIALIZES[cs.id];
    if (ratifies && ratifies.length){
      // Task-to-task handoff — an earlier cell dispatched its data here (e.g.
      // D-DSC-3's "SENT TO D-TD-2" footer). The envelope drives the camera
      // itself, so this cell is NOT pre-framed (that would snap then jump).
      const n = ratifies.length;
      const srcIp = canvas.querySelector('[data-ip="' + ratifies[0] + '"]');
      const srcCell = srcIp ? srcIp.closest('[data-cell]') : null;
      const srcAnchor = srcCell ? (srcCell.querySelector('.dispatch-label') || srcCell) : null;
      const sender = srcCell ? srcCell.getAttribute('data-cell') : 'DISCOVERY';
      setTimeout(() => runCellEnvelope(srcAnchor, ratifies, containerId, cs.id, sender,
        n + ' inflection point' + (n > 1 ? 's' : ''),
        () => { reveal(); setTimeout(() => highlightRatRows(cs.id), Math.round(620 / speedMul)); }
      ), Math.round(360 / speedMul));
    } else if (materializes === 'sections'){
      // reveal D-TD-3's own breakdown first, THEN flow it down to the
      // sections container — the "?" slot materializes on arrival.
      requestAnimationFrame(() => { relayout(); frameCell(containerId, cs.id); });
      setTimeout(() => {
        reveal();
        setTimeout(() => runSectionsTransit(containerId, cs.id, function(){}),
                   Math.round(1100 / speedMul));
      }, Math.round(750 / speedMul));
    } else {
      requestAnimationFrame(() => { relayout(); frameCell(containerId, cs.id); });
      setTimeout(reveal, Math.round(750 / speedMul));
    }
    return true;
  }

  function advance(){
    if (phase < 3 || phase >= MAX_PHASE) return;
    phase++;
    if (phase === 4){
      showBlock('orc1'); relayout(); setCaption(4); frameRange('up1','orc1');
    } else if (phase === 5){
      // Phase 1 + Discovery placed together — Phase 1 IS Discovery
      showBlock('band1'); showBlock('discovery');
      relayout(); setCaption(5);
      frameBlock('discovery'); flashHighlight('discovery');
    } else if (phase === 6){
      // Build the rest of the phases — the phase-band skeleton
      showBlock('band2'); showBlock('band3'); showBlock('band4');
      relayout(); setCaption(6); frameWide();
    } else if (phase === 7){
      // Introduce the guaranteed role containers into each phase
      ['td','editor','coordinator','sections','integrator','critic','cv','helpers']
        .forEach(showBlock);
      relayout(); setCaption(7); frameWide();
    } else if (phase === 8){
      // Zoom back to Discovery — interaction starts here
      setCaption(8); frameBlock('discovery');
    } else if (phase === P_DSC_ACT){
      setWaiting('discovery', true);
      setActiveCell(null);
      DSC_IDS.forEach(revealCellTitle);
      requestAnimationFrame(() => { relayout(); frameBlock('discovery'); });
    } else if (phase > P_DSC_ACT && phase < P_DSC_OUT){
      runCellBeat(P_DSC_ACT, DSC_IDS, 'discovery');
    } else if (phase === P_DSC_OUT){
      setActiveCell(null);
      requestAnimationFrame(() => { relayout(); frameBlock('discovery'); });
    } else if (HAS_TD && phase === P_TD_ACT){
      setWaiting('td', true);
      setActiveCell(null);
      TD_IDS.forEach(revealCellTitle);
      requestAnimationFrame(() => { relayout(); frameBlock('td'); flashHighlight('td'); });
    } else if (HAS_TD && phase > P_TD_ACT && phase < P_TD_OUT){
      runCellBeat(P_TD_ACT, TD_IDS, 'td');
    } else if (HAS_TD && phase === P_TD_OUT){
      setActiveCell(null);
      requestAnimationFrame(() => { relayout(); frameBlock('td'); });
    } else if (HAS_ED && phase === P_ED_ACT){
      // Editor activates — its check titles appear as a skeleton, then fill
      setWaiting('editor', true);
      setActiveCell(null);
      ED_IDS.forEach(revealCellTitle);
      requestAnimationFrame(() => { relayout(); frameBlock('editor'); flashHighlight('editor'); });
    } else if (HAS_ED && phase > P_ED_ACT && phase < P_ED_OUT){
      runCellBeat(P_ED_ACT, ED_IDS, 'editor');
    } else if (HAS_ED && phase === P_ED_OUT){
      setActiveCell(null);
      requestAnimationFrame(() => { relayout(); frameBlock('editor'); });
    } else if (HAS_CO && phase === P_CO_ACT){
      // Coordinator activates — Phase 3, the build phase
      setWaiting('coordinator', true);
      setActiveCell(null);
      CO_IDS.forEach(revealCellTitle);
      requestAnimationFrame(() => { relayout(); frameBlock('coordinator'); flashHighlight('coordinator'); });
    } else if (HAS_CO && phase > P_CO_ACT && phase < P_CO_OUT){
      runCellBeat(P_CO_ACT, CO_IDS, 'coordinator');
    } else if (HAS_CO && phase === P_CO_OUT){
      setActiveCell(null);
      requestAnimationFrame(() => { relayout(); frameBlock('coordinator'); });
    } else if (HAS_IN && phase === P_IN_ACT){
      setWaiting('integrator', true);
      setActiveCell(null);
      IN_IDS.forEach(revealCellTitle);
      requestAnimationFrame(() => { relayout(); frameBlock('integrator'); flashHighlight('integrator'); });
    } else if (HAS_IN && phase > P_IN_ACT && phase < P_IN_OUT){
      runCellBeat(P_IN_ACT, IN_IDS, 'integrator');
    } else if (HAS_IN && phase === P_IN_OUT){
      setActiveCell(null);
      requestAnimationFrame(() => { relayout(); frameBlock('integrator'); });
    } else if (HAS_CR && phase === P_CR_ACT){
      setWaiting('critic', true);
      setActiveCell(null);
      CR_IDS.forEach(revealCellTitle);
      requestAnimationFrame(() => { relayout(); frameBlock('critic'); flashHighlight('critic'); });
    } else if (HAS_CR && phase > P_CR_ACT && phase < P_CR_OUT){
      runCellBeat(P_CR_ACT, CR_IDS, 'critic');
    } else if (HAS_CR && phase === P_CR_OUT){
      setActiveCell(null);
      requestAnimationFrame(() => { relayout(); frameBlock('critic'); });
    } else if (HAS_CV && phase === P_CV_ACT){
      setWaiting('cv', true);
      setActiveCell(null);
      CV_IDS.forEach(revealCellTitle);
      requestAnimationFrame(() => { relayout(); frameBlock('cv'); flashHighlight('cv'); });
    } else if (HAS_CV && phase > P_CV_ACT && phase < P_CV_OUT){
      runCellBeat(P_CV_ACT, CV_IDS, 'cv');
    } else if (HAS_CV && phase === P_CV_OUT){
      setActiveCell(null);
      requestAnimationFrame(() => { relayout(); frameBlock('cv'); });
    }
    updateProgress();
  }

  function reset(){
    if (typeTimer){ clearTimeout(typeTimer); typeTimer = null; }
    if (vbAnim){ cancelAnimationFrame(vbAnim); vbAnim = null; }
    const envL0 = document.getElementById('envelope-layer');
    if (envL0){ while (envL0.firstChild) envL0.removeChild(envL0.firstChild); }
    phase = 0;
    BLOCK_ORDER.forEach(id => { blocks[id].visible = false; });
    canvas.querySelectorAll('.cell').forEach(c => c.classList.remove('in','active'));
    canvas.querySelectorAll('.cell-body').forEach(b => b.classList.remove('in'));
    canvas.querySelectorAll('.rat-row.lit').forEach(r => r.classList.remove('lit'));
    // sections block back to its un-resolved "?" state
    sectionsState.materialized = false;
    const secBlk = document.getElementById('blk-sections');
    if (secBlk) secBlk.classList.remove('materialized');
    canvas.querySelectorAll('.sec-card.arrived').forEach(c => c.classList.remove('arrived'));
    const tnode = canvas.querySelector('.up-prompt-text tspan');
    if (tnode) tnode.textContent = '';
    setWaiting('discovery', false);
    setWaiting('td', false);
    setWaiting('editor', false);
    setWaiting('coordinator', false);
    setWaiting('integrator', false);
    setWaiting('critic', false);
    setWaiting('cv', false);
    setCaption(0);
    placedHi.classList.remove('flashing');
    // up1 visible from the start
    blocks.up1.visible = true;
    relayout();
    frameBlock('up1', 40);
    updateProgress();
    setTimeout(startPrompt, 300);
  }

  function startPrompt(){
    phase = 1;
    relayout();
    frameBlock('up1', 40);
    typePrompt(() => { phase = 3; updateProgress(); });
    updateProgress();
  }

  stepBtn.addEventListener('click', advance);
  resetBtn.addEventListener('click', reset);
  speedSlider.addEventListener('input', () => {
    speedMul = parseFloat(speedSlider.value);
    speedReadout.textContent = speedMul.toFixed(2).replace(/\\.?0+$/,'') + 'x';
  });
  speedSlider.dispatchEvent(new Event('input'));

  // boot
  blocks.up1.visible = true;
  relayout();
  frameBlock('up1', 40);
  updateProgress();
  setTimeout(startPrompt, 250);
})();
`;
}

// ---------------------------------------------------------------------------
// Public API + CLI
// ---------------------------------------------------------------------------

export function generate(slug, runDir) {
  const graph = extractGraph(slug, runDir);
  const html = render(graph);
  const outPath = path.join(runDir, 'walkthrough-flowchart.html');
  fs.writeFileSync(outPath, html);
  return { outPath, decisionCount: graph.decisions.length
    + (graph.td ? graph.td.decisions.length : 0)
    + (graph.editor ? graph.editor.decisions.length : 0)
    + (graph.coordinator ? graph.coordinator.decisions.length : 0)
    + (graph.integrator ? graph.integrator.decisions.length : 0)
    + (graph.critic ? graph.critic.decisions.length : 0)
    + (graph.cv ? graph.cv.decisions.length : 0) };
}

const __thisFile = decodeURIComponent(new URL(import.meta.url).pathname);
if (process.argv[1] && __thisFile.endsWith(path.basename(process.argv[1]))) {
  const slug = process.argv[2];
  if (!slug) { console.error('Usage: node walkthrough-flowchart.mjs <slug>'); process.exit(1); }
  // import.meta.dirname is a clean filesystem path on Windows + Linux (Node 20.11+)
  const repoRoot = path.resolve(import.meta.dirname, '..', '..');
  const runDir = path.join(repoRoot, 'runs', slug);
  let result;
  try {
    result = generate(slug, runDir);
  } catch (e) {
    // Build hasn't produced substrate yet (or it's malformed) — exit with a
    // clean one-line message rather than a Node stack trace.
    console.error(`[walkthrough-flowchart] cannot render "${slug}": ${e.message}`);
    process.exit(1);
  }
  console.log(`[walkthrough-flowchart] wrote ${result.outPath}`);
  console.log(`[walkthrough-flowchart] decisions rendered: ${result.decisionCount}`);
}
