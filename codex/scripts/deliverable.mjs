/**
 * deliverable.mjs
 *
 * Deliverable-kind detection + live URL composition for Codex v0.4.
 *
 * Exports:
 *   detectDeliverableKind(ctx)  → { kind, can_run_in_browser, deliverable_index, manifest? }
 *   composeLiveUrl(ctx)         → { live_url, live_url_kind }
 *   loadCodexConfig(projectRoot) → { pages_base, repo_base, ... } | {}
 *
 * Detection is best-effort. The aggregator must pass the actual final/
 * directory entries so we don't speculate beyond what's on disk. The
 * curation overlay can override any decision via
 * `codex/data/curation/{slug}.json#deliverable_kind`.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

const PLUGIN_MANIFEST_HINT_KEYS = ['Actions', 'Controllers', 'Type', 'SDKVersion', 'TargetDevice'];

export async function detectDeliverableKind(ctx) {
  const { finalDir, ledger, curation } = ctx;

  // Curation overlay short-circuits.
  if (curation && curation.deliverable_kind) {
    return {
      kind: curation.deliverable_kind,
      can_run_in_browser: !!curation.deliverable_can_run_in_browser,
      deliverable_index: curation.deliverable_index || null,
      manifest: null
    };
  }

  let entries = [];
  try {
    entries = await fs.readdir(finalDir, { withFileTypes: true });
  } catch {
    return { kind: 'other', can_run_in_browser: false, deliverable_index: null, manifest: null };
  }

  const fileNames = entries.filter(e => e.isFile()).map(e => e.name);
  const dirNames  = entries.filter(e => e.isDirectory()).map(e => e.name);

  // (1) Plugin signal: a *.sdPlugin/ directory OR a manifest.json at top level
  //     whose contents look like a plugin manifest.
  const pluginDir = dirNames.find(d => /\.sdPlugin$/.test(d));
  if (pluginDir) {
    const manifestPath = path.join(finalDir, pluginDir, 'manifest.json');
    const manifest = await safeReadJson(manifestPath);
    return {
      kind: 'plugin',
      can_run_in_browser: false,
      deliverable_index: pluginDir + '/',
      manifest
    };
  }
  if (fileNames.includes('manifest.json')) {
    const manifestPath = path.join(finalDir, 'manifest.json');
    const manifest = await safeReadJson(manifestPath);
    if (manifest && PLUGIN_MANIFEST_HINT_KEYS.some(k => k in manifest)) {
      return { kind: 'plugin', can_run_in_browser: false, deliverable_index: '.', manifest };
    }
  }

  // (2) Web app signal: index.html present, no native binary
  if (fileNames.includes('index.html')) {
    const hasNative = fileNames.some(f => /\.(exe|bin|sh|app)$/.test(f));
    if (!hasNative) {
      return {
        kind: 'web_app',
        can_run_in_browser: true,
        deliverable_index: 'index.html',
        manifest: null
      };
    }
  }

  // (3) CLI signal: *.exe / *.bin / shell script with executable bit, OR
  //     package.json with a `bin` field.
  const nativeExe = fileNames.find(f => /\.(exe|bin)$/.test(f));
  if (nativeExe) {
    return { kind: 'cli', can_run_in_browser: false, deliverable_index: nativeExe, manifest: null };
  }
  if (fileNames.includes('package.json')) {
    const pkg = await safeReadJson(path.join(finalDir, 'package.json'));
    if (pkg && pkg.bin) {
      return { kind: 'cli', can_run_in_browser: false, deliverable_index: 'package.json', manifest: pkg };
    }
    // (4) Library: package.json with main/exports but no bin and no html
    if (pkg && (pkg.main || pkg.exports) && !fileNames.includes('index.html')) {
      return {
        kind: 'library',
        can_run_in_browser: false,
        deliverable_index: 'package.json',
        manifest: pkg
      };
    }
  }

  // (5) Document signal: .pdf / .docx / .md as the load-bearing artifact
  const docFile = fileNames.find(f => /\.(pdf|docx|md)$/i.test(f));
  if (docFile && fileNames.length <= 3) {
    return { kind: 'document', can_run_in_browser: f => /\.pdf$/i.test(f), deliverable_index: docFile, manifest: null };
  }

  // (6) Data signal: csv / jsonl / parquet / sql
  const dataFile = fileNames.find(f => /\.(csv|jsonl|parquet|sql)$/i.test(f));
  if (dataFile && fileNames.length <= 5) {
    return { kind: 'data', can_run_in_browser: false, deliverable_index: dataFile, manifest: null };
  }

  // (7) Fallback
  return { kind: 'other', can_run_in_browser: false, deliverable_index: null, manifest: null };
}

async function safeReadJson(p) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); }
  catch { return null; }
}

// ---------------------------------------------------------------------------
// Live URL composition
// ---------------------------------------------------------------------------

export function composeLiveUrl(ctx) {
  const { slug, deliverable, config, curation } = ctx;

  // Curation overlay can supply a live_url directly.
  if (curation && curation.live_url) {
    return {
      live_url: curation.live_url,
      live_url_kind: curation.live_url_kind || (deliverable.can_run_in_browser ? 'artifact' : 'showcase')
    };
  }

  const pages = config && config.pages_base;
  if (!pages) {
    return { live_url: null, live_url_kind: 'none' };
  }
  // Strip trailing slash for clean composition.
  const base = pages.replace(/\/+$/, '');

  if (deliverable.kind === 'web_app' && deliverable.can_run_in_browser) {
    return {
      live_url: `${base}/runs/${slug}/output/final/${deliverable.deliverable_index || 'index.html'}`,
      live_url_kind: 'artifact'
    };
  }
  // Everything else gets a showcase page URL.
  return {
    live_url: `${base}/codex/showcase/${slug}.html`,
    live_url_kind: 'showcase'
  };
}

// ---------------------------------------------------------------------------
// Codex config loader
// ---------------------------------------------------------------------------
//
// Lives at codex/data/config.json. Created once by the user when GitHub
// Pages is set up. Optional. The aggregator tolerates absence.
//
// Shape:
// {
//   "pages_base": "https://jett.github.io/Auto-Builder",
//   "repo_base":  "https://github.com/Jett/Auto-Builder",
//   "branch":     "main"
// }

export async function loadCodexConfig(dataDir) {
  try {
    const text = await fs.readFile(path.join(dataDir, 'config.json'), 'utf8');
    return JSON.parse(text);
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// File tree extraction (v0.5)
// ---------------------------------------------------------------------------
//
// Walks output/final/ recursively for non-web deliverables. Returned as a
// nested array structure the showcase template can render directly. Skips
// the .git directory and any directory matching IGNORED_TREE_DIRS. Files
// over MAX_INLINE_SIZE are still listed but flagged as `oversized`.

const IGNORED_TREE_DIRS = new Set(['.git', 'node_modules', '.DS_Store']);
const MAX_INLINE_SIZE = 256 * 1024; // 256 KB — files larger get the oversized flag
const MAX_TREE_NODES = 500;          // safety cap to keep the bundle lean

export async function walkFileTree(rootDir, maxDepth = 6) {
  const result = [];
  let nodeCount = 0;
  async function walk(dir, depth) {
    if (depth > maxDepth) return [];
    if (nodeCount >= MAX_TREE_NODES) return [];
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch { return []; }
    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    const out = [];
    for (const entry of entries) {
      if (nodeCount >= MAX_TREE_NODES) break;
      if (IGNORED_TREE_DIRS.has(entry.name)) continue;
      nodeCount++;
      if (entry.isDirectory()) {
        const children = await walk(path.join(dir, entry.name), depth + 1);
        out.push({ kind: 'dir', name: entry.name, children });
      } else {
        let size = null;
        try {
          const st = await fs.stat(path.join(dir, entry.name));
          size = st.size;
        } catch {}
        const node = { kind: 'file', name: entry.name };
        if (size != null) node.size = size;
        if (size != null && size > MAX_INLINE_SIZE) node.oversized = true;
        out.push(node);
      }
    }
    return out;
  }
  try {
    const tree = await walk(rootDir, 0);
    return { tree, node_count: nodeCount, truncated: nodeCount >= MAX_TREE_NODES };
  } catch {
    return { tree: [], node_count: 0, truncated: false };
  }
}

