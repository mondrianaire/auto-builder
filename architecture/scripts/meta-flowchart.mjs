#!/usr/bin/env node
// ============================================================================
// architecture/scripts/meta-flowchart.mjs
//
// Top-level orchestrator for the Meta-architecture flowchart generator.
//
// Pipeline:
//   1. Extract role data from architecture/role_charters.md.
//   2. Compute layout (spine + side roles + connection graph).
//   3. Render SVG using shared flowchart-primitives.
//   4. Write to architecture/meta-flowcharts/v{architecture_version}.svg.
//   5. Update architecture/meta-flowcharts/latest.svg to point at the new version.
//
// Usage:
//   node architecture/scripts/meta-flowchart.mjs [--arch-version 1.11]
//
// Output paths:
//   architecture/meta-flowcharts/v{version}.svg     (versioned archive)
//   architecture/meta-flowcharts/latest.svg         (stable pointer for embeds)
//
// Audit hooks (v0.1):
//   - Warn if a known role heading is missing from role_charters.md
//   - Warn if an unknown heading is found that does not match ROLE_REGISTRY
//   - Count connections and stat-card them as a sanity check
// ============================================================================

import { extract } from './meta-flowchart-extract.mjs';
import { layout } from './meta-flowchart-layout.mjs';
import { render } from './meta-flowchart-render.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// repo root = up two levels from architecture/scripts/
const REPO_ROOT = resolve(__dirname, '..', '..');
const CHARTER_PATH = resolve(REPO_ROOT, 'architecture', 'role_charters.md');
const OUT_DIR = resolve(REPO_ROOT, 'architecture', 'meta-flowcharts');

function parseArgs(argv) {
  const args = { archVersion: '1.11' };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--arch-version' && argv[i + 1]) {
      args.archVersion = argv[i + 1];
      i++;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);

  console.log(`[meta-flowchart] Charter: ${CHARTER_PATH}`);
  console.log(`[meta-flowchart] Architecture version: ${args.archVersion}`);
  console.log(`[meta-flowchart] Output dir: ${OUT_DIR}`);

  const graph = extract(CHARTER_PATH, args.archVersion);
  console.log(`[meta-flowchart] Extracted ${graph.roleCount} roles.`);

  const laidOut = layout(graph);
  console.log(`[meta-flowchart] Laid out ${laidOut.roles.filter(r => !r._isWrapper).length} role boxes + ${laidOut.roles.filter(r => r._isWrapper).length} wrappers.`);
  console.log(`[meta-flowchart] Connection graph: ${laidOut.connections.length} arrows.`);
  console.log(`[meta-flowchart] Canvas: ${laidOut.canvasWidth} x ${laidOut.canvasHeight}.`);

  const svg = render(laidOut);

  mkdirSync(OUT_DIR, { recursive: true });
  const versionedPath = resolve(OUT_DIR, `v${args.archVersion}.svg`);
  const latestPath = resolve(OUT_DIR, 'latest.svg');
  writeFileSync(versionedPath, svg, 'utf-8');
  copyFileSync(versionedPath, latestPath);

  console.log(`[meta-flowchart] Wrote ${versionedPath} (${svg.length} bytes).`);
  console.log(`[meta-flowchart] Wrote ${latestPath} (copy of versioned for stable embed reference).`);
}

main();
