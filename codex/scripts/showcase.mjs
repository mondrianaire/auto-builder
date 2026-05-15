/**
 * showcase.mjs
 *
 * Per-build showcase page generator. For each build whose deliverable is
 * not browser-runnable (plugin, cli, library, document, data, other), emit
 * `codex/showcase/{slug}.html` — a self-contained Pages-deployable page
 * that captures the deliverable's contents and purpose.
 *
 * Inputs: the per-run detail JSON (already written by the aggregator) plus
 * the codex config. No external dependencies; outputs raw HTML.
 *
 * Exports:
 *   generateShowcase(detail, config) → html string
 *   shouldGenerateShowcase(summary) → boolean
 *
 * Cardinal rule: this file produces HTML *only*. It does not read
 * anything new from the substrate; all inputs come from the aggregator.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Predicate
// ---------------------------------------------------------------------------

export function shouldGenerateShowcase(summary) {
  if (!summary || !summary.deliverable_kind) return false;
  // Web apps point to their hosted artifact directly; everything else
  // needs a Codex-generated showcase page.
  if (summary.deliverable_kind === 'web_app' && summary.deliverable_can_run_in_browser) return false;
  return true;
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function chip(text, cls) {
  return `<span class="pill ${cls || ''}">${esc(text)}</span>`;
}

function definitionList(obj, depth = 0) {
  if (!obj || typeof obj !== 'object') return `<code>${esc(JSON.stringify(obj))}</code>`;
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '<em>(empty)</em>';
    return '<ul>' + obj.map(v => `<li>${typeof v === 'object' ? definitionList(v, depth + 1) : esc(v)}</li>`).join('') + '</ul>';
  }
  const rows = Object.entries(obj).map(([k, v]) => {
    let valueHtml;
    if (v == null) valueHtml = '<em>null</em>';
    else if (typeof v === 'object') valueHtml = definitionList(v, depth + 1);
    else valueHtml = esc(v);
    return `<dt>${esc(k)}</dt><dd>${valueHtml}</dd>`;
  });
  return `<dl class="kv-deep">${rows.join('')}</dl>`;
}

function fileTreeHtml(tree) {
  if (!tree || !Array.isArray(tree) || tree.length === 0) {
    return '<em>(file tree not available)</em>';
  }
  return '<ul class="filetree">' + tree.map(node => {
    if (node.kind === 'dir') {
      return `<li class="dir">📁 ${esc(node.name)}${node.children ? fileTreeHtml(node.children) : ''}</li>`;
    }
    return `<li class="file">📄 ${esc(node.name)}${node.size != null ? ` <span class="size">(${node.size}b)</span>` : ''}</li>`;
  }).join('') + '</ul>';
}

// ---------------------------------------------------------------------------
// Styles (inlined; matches dashboard aesthetic)
// ---------------------------------------------------------------------------

const STYLES = `
:root {
  --bg:#0e1217; --bg-elev:#161c24; --bg-elev-2:#1c232d;
  --border:#283040; --border-soft:#1e2530;
  --text:#d8dee9; --text-dim:#8e98a8; --text-faint:#5b6678;
  --accent:#6ea8fe; --accent-soft:#2a3b58;
  --ok:#6ec97a; --warn:#d4a35a; --bad:#d97070; --info:#6ea8fe; --muted:#6b7280;
}
* { box-sizing: border-box; }
html, body {
  margin:0; padding:0; background:var(--bg); color:var(--text);
  font-family:'SF Mono','Cascadia Code',Menlo,Consolas,monospace;
  font-size:13px; line-height:1.6;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.topbar {
  padding: 14px 24px; border-bottom: 1px solid var(--border);
  background: var(--bg-elev); display:flex; justify-content:space-between; align-items:baseline;
  position: sticky; top: 0; z-index: 10;
}
.topbar h1 { margin: 0; font-size: 15px; font-weight: 600; }
.topbar .nav { color: var(--text-dim); font-size: 12px; }
main { max-width: 1100px; margin: 0 auto; padding: 24px; }
.hero { padding: 24px 0 16px 0; border-bottom: 1px solid var(--border-soft); margin-bottom: 24px; }
.hero h2 { margin: 0 0 8px 0; font-size: 22px; color: var(--text); letter-spacing: -0.2px; line-height: 1.3; }
.hero .telos { color: var(--text-dim); font-size: 14px; max-width: 78ch; }
.hero .meta { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 12px; color: var(--text-faint); font-size: 12px; }
section.block { padding: 18px 0; border-bottom: 1px solid var(--border-soft); }
section.block:last-of-type { border-bottom: 0; }
section.block h3 { margin: 0 0 12px 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-faint); font-weight: 600; }
.pill {
  display:inline-flex; align-items:center; padding:2px 8px; border-radius:10px;
  font-size:11px; font-weight:600; letter-spacing:0.3px;
  background:var(--bg-elev-2); color:var(--text); border:1px solid var(--border);
}
.pill.ok        { color: var(--ok);    border-color: rgba(110,201,122,0.35); background: rgba(110,201,122,0.08); }
.pill.warn      { color: var(--warn);  border-color: rgba(212,163,90,0.35);  background: rgba(212,163,90,0.08); }
.pill.bad       { color: var(--bad);   border-color: rgba(217,112,112,0.35); background: rgba(217,112,112,0.08); }
.pill.info      { color: var(--info);  border-color: rgba(110,168,254,0.35); background: rgba(110,168,254,0.08); }
.pill.muted     { color: var(--muted); border-color: var(--border-soft); }
.pill.kind {
  text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.6px;
  background: var(--accent-soft); color: var(--accent); border-color: transparent;
}
dl.kv-deep { margin: 0; display: grid; grid-template-columns: 200px 1fr; gap: 4px 18px; font-size: 12.5px; }
dl.kv-deep dt { color: var(--text-faint); font-weight: 500; }
dl.kv-deep dd { margin: 0; color: var(--text); word-break: break-word; }
dl.kv-deep dl.kv-deep { grid-template-columns: 160px 1fr; padding-left: 8px; border-left: 1px solid var(--border-soft); }
ol.steps { margin: 0; padding-left: 20px; }
ol.steps li { margin-bottom: 6px; }
.code-block {
  background: var(--bg-elev); border: 1px solid var(--border-soft);
  border-radius: 4px; padding: 12px 14px;
  white-space: pre-wrap; word-break: break-word;
  font-size: 12px; color: var(--text);
}
ul.filetree { list-style: none; padding-left: 14px; margin: 0; }
ul.filetree li { padding: 1px 0; color: var(--text); }
ul.filetree li.dir { font-weight: 600; }
ul.filetree li.file { color: var(--text-dim); }
ul.filetree .size { color: var(--text-faint); font-size: 11px; }
.uncertainty { background: rgba(212,163,90,0.06); border-left: 3px solid var(--warn); padding: 10px 14px; border-radius: 0 4px 4px 0; }
.uncertainty ul { margin: 4px 0 0 0; padding-left: 18px; }
.uncertainty li { margin-bottom: 6px; }
.download {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 4px;
  background: var(--accent); color: var(--bg); font-weight: 600;
  text-decoration: none; font-size: 13px;
}
.download:hover { text-decoration: none; opacity: 0.92; }
.kv-row { display: grid; grid-template-columns: 140px 1fr; gap: 4px 16px; font-size: 12.5px; }
.kv-row dt { color: var(--text-faint); }
.kv-row dd { margin: 0; color: var(--text); }
img.screenshot { max-width: 100%; border-radius: 4px; border: 1px solid var(--border-soft); }
`;

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderHero(detail) {
  const s = detail.summary;
  const lg = detail.ledger || {};
  return `
    <section class="hero">
      <div>${chip(s.deliverable_kind || 'other', 'kind')} ${chip(s.verdict || 'unknown', s.verdict === 'pass' ? 'ok' : s.verdict === 'fail' ? 'bad' : 'warn')} ${chip('first delivery: ' + (s.first_delivery_outcome || 'unverified'), 'muted')}</div>
      <h2>${esc(s.slug)}</h2>
      <div class="telos">${esc(lg.telos || lg.restatement || s.prompt || '')}</div>
      <div class="meta">
        ${s.date ? `<span>${esc(s.date)}</span>` : ''}
        ${s.architecture_version ? `<span>architecture ${esc(s.architecture_version)}</span>` : ''}
        ${s.counts && s.counts.events_total ? `<span>${s.counts.events_total} events</span>` : ''}
        ${s.counts && s.counts.revision_count ? `<span>${s.counts.revision_count} revision${s.counts.revision_count === 1 ? '' : 's'}</span>` : ''}
      </div>
    </section>
  `;
}

function renderPluginContext(detail) {
  const s = detail.summary;
  const manifest = s.deliverable_manifest;
  if (!manifest) return '';
  const interesting = ['Name','Description','Author','Version','SDKVersion','OS','Type','TargetDevice','Controllers','Actions','CodePath','Nodejs','Icon'];
  const subset = {};
  for (const k of interesting) if (k in manifest) subset[k] = manifest[k];
  if (Object.keys(subset).length === 0) Object.assign(subset, manifest);
  return `
    <section class="block">
      <h3>Manifest</h3>
      ${definitionList(subset)}
    </section>
  `;
}

function renderInstallSteps(detail) {
  // Pulled from run-report-excerpts.amendment_candidates? No — from the
  // run-report's install section. We look at uncertainty_manifest for the
  // streamdock case which captures bets, AND we look at curation for an
  // override block. Best signal we have today is the curation override or
  // any "Install steps" excerpt the aggregator may surface.
  const s = detail.summary;
  const sa = s.showcase_assets || {};
  const steps = sa.demo_steps;
  const install = sa.install_command_override;
  if (!steps && !install) return '';
  let body = '';
  if (install) body += `<div class="code-block">${esc(install)}</div>`;
  if (steps && steps.length) {
    body += '<ol class="steps">' + steps.map(s => `<li>${esc(s)}</li>`).join('') + '</ol>';
  }
  return `<section class="block"><h3>Install / use</h3>${body}</section>`;
}

function renderUncertainty(detail) {
  const um = detail.uncertainty_manifest;
  if (!um || !um.length) return '';
  return `
    <section class="block">
      <h3>Uncertainty manifest <span class="pill muted">${um.length} item${um.length === 1 ? '' : 's'}</span></h3>
      <div class="uncertainty">
        <ul>
          ${um.map(b => `<li>${esc(b)}</li>`).join('')}
        </ul>
      </div>
    </section>
  `;
}

function renderRevisionStrip(detail) {
  const revs = detail.revisions || [];
  if (revs.length <= 1) return '';
  return `
    <section class="block">
      <h3>Revision lineage <span class="pill muted">${revs.length} revisions</span></h3>
      <ol class="steps">
        ${revs.map(r => `<li><strong>${esc(r.id)}</strong> · ${esc(r.kind)} · ${esc(r.summary)}${r.verdict ? ` <span class="pill ${r.verdict === 'pass' ? 'ok' : r.verdict === 'fail' ? 'bad' : 'warn'}">${esc(r.verdict)}</span>` : ''}</li>`).join('')}
      </ol>
    </section>
  `;
}

function renderScreenshots(detail) {
  const sa = detail.summary.showcase_assets || {};
  if (!sa.screenshots || !sa.screenshots.length) return '';
  return `
    <section class="block">
      <h3>Screenshots</h3>
      ${sa.screenshots.map(p => `<img class="screenshot" src="../data/curation/${esc(p)}" alt="screenshot for ${esc(detail.summary.slug)}" />`).join(' ')}
    </section>
  `;
}

function renderFileTree(detail) {
  const ft = detail.file_tree;
  if (!ft || !Array.isArray(ft.tree) || ft.tree.length === 0) return '';
  const count = ft.node_count || ft.tree.length;
  const truncated = ft.truncated ? ' <span class="pill muted">truncated</span>' : '';
  return `
    <section class="block">
      <h3>Deliverable contents <span class="pill muted">${count} item${count === 1 ? '' : 's'}</span>${truncated}</h3>
      ${fileTreeHtml(ft.tree)}
    </section>
  `;
}

function renderBuildLinks(detail, config) {
  const s = detail.summary;
  const repoBase = (config && config.repo_base) ? config.repo_base.replace(/\/+$/, '') : null;
  const branch = (config && config.branch) || 'main';
  const link = (relPath, label) => {
    if (!relPath) return null;
    if (repoBase) return `<a href="${repoBase}/blob/${branch}/${esc(relPath)}" target="_blank">${esc(label)}</a>`;
    return `<a href="../../${esc(relPath)}" target="_blank">${esc(label)}</a>`;
  };
  const items = [
    link(s.links && s.links.run_report,   'run-report.md'),
    link(s.links && s.links.verification, 'verification report'),
    link(s.links && s.links.ledger,       'discovery ledger'),
    link(s.links && s.links.final_dir,    'final/'),
    link('codex/index.html',              '← back to dashboard')
  ].filter(Boolean);
  return `<section class="block"><h3>Source files</h3>${items.join(' · ')}</section>`;
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export function generateShowcase(detail, config) {
  const s = detail.summary;
  const kind = s.deliverable_kind || 'other';

  const sections = [
    renderHero(detail),
    renderScreenshots(detail),
    kind === 'plugin' ? renderPluginContext(detail) : '',
    renderInstallSteps(detail),
    renderUncertainty(detail),
    renderRevisionStrip(detail),
    renderBuildLinks(detail, config)
  ].filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(s.slug)} · Auto Builder showcase</title>
<style>${STYLES}</style>
</head>
<body>
<div class="topbar">
  <h1>${esc(s.slug)} <span style="color:var(--text-faint);font-weight:400">· showcase</span></h1>
  <div class="nav"><a href="../index.html">← Auto Builder Codex</a></div>
</div>
<main>
${sections}
</main>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Bulk writer (used by aggregator)
// ---------------------------------------------------------------------------

export async function writeAllShowcases({ summaries, dataRunsDir, showcaseDir, config }) {
  await fs.mkdir(showcaseDir, { recursive: true });
  let count = 0;
  for (const sum of summaries) {
    if (!shouldGenerateShowcase(sum)) continue;
    try {
      const detailText = await fs.readFile(path.join(dataRunsDir, sum.slug + '.json'), 'utf8');
      const detail = JSON.parse(detailText);
      const html = generateShowcase(detail, config);
      await fs.writeFile(path.join(showcaseDir, sum.slug + '.html'), html, 'utf8');
      count++;
    } catch (err) {
      console.error('[codex/showcase] failed for ' + sum.slug + ':', err.message);
    }
  }
  return count;
}
