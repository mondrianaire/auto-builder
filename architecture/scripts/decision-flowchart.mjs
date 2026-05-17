// ============================================================================
// architecture/scripts/decision-flowchart.mjs
//
// Pass 5 of 4 — orchestrator. Takes a slug; produces
// runs/{slug}/decision-flowchart.html (SVG + toolbar/pan/zoom wrapper).
//
// Called by:
//   - wrap-up-build.mjs (automatically as part of the wrap-up routine)
//   - wrap-up-build.bat (standalone back-fill)
//   - CLI for dev: node architecture/scripts/decision-flowchart.mjs <slug>
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { extract } from './decision-flowchart-extract.mjs';
import { layout } from './decision-flowchart-layout.mjs';
import { render as renderSvg } from './decision-flowchart-render.mjs';
import { renderHtmlViewerWrapper } from './flowchart-primitives.mjs';

export function generate(slug, runDir, repoRoot) {
  const graph = extract(slug, runDir, repoRoot);
  const layoutData = layout(graph);
  const svg = renderSvg(layoutData);
  const html = renderHtmlViewerWrapper({
    title: `${slug} · Decision Flowchart`,
    subtitle: null,
    svgMarkup: svg
  });
  // Write both .svg (raw asset) and .html (toolbar wrapper)
  const svgPath = path.join(runDir, 'decision-flowchart-auto.svg');
  const htmlPath = path.join(runDir, 'decision-flowchart-auto.html');
  fs.writeFileSync(svgPath, svg);
  fs.writeFileSync(htmlPath, html);
  return { svgPath, htmlPath, stats: graph.stats };
}

// CLI
const __thisFile = decodeURIComponent(new URL(import.meta.url).pathname);
if (process.argv[1] && __thisFile.endsWith(path.basename(process.argv[1]))) {
  const slug = process.argv[2];
  if (!slug) { console.error('Usage: node decision-flowchart.mjs <slug>'); process.exit(1); }
  const repoRoot = path.resolve(path.dirname(__thisFile), '..', '..');
  const result = generate(slug, path.join(repoRoot, 'runs', slug), repoRoot);
  console.log(`[decision-flowchart] wrote ${result.svgPath}`);
  console.log(`[decision-flowchart] wrote ${result.htmlPath}`);
  console.log(`[decision-flowchart] stats: ${JSON.stringify(result.stats)}`);
}
