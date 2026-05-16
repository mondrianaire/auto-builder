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

const HTML_TEMPLATE = (slug, svgMarkup) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${slug} Decision Flowchart</title>
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: #fafafa; font-family: Arial, Helvetica, sans-serif; overflow: hidden; }
  #toolbar {
    position: fixed; top: 0; left: 0; right: 0; height: 44px;
    background: #fff; border-bottom: 1px solid #ddd;
    display: flex; align-items: center; padding: 0 14px; gap: 14px; z-index: 10;
    font-size: 13px; color: #444;
  }
  #toolbar button { border: 1px solid #bbb; background: #fff; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; }
  #toolbar button:hover { background: #f0f0f0; }
  #toolbar .hint { color: #888; }
  #stage { position: absolute; top: 44px; left: 0; right: 0; bottom: 0; overflow: hidden; }
  #stage svg { display: block; width: 100%; height: 100%; user-select: none; }
  #stage.panning { cursor: grabbing; }
</style>
</head>
<body>
<div id="toolbar">
  <strong>${slug} · Decision Flowchart</strong>
  <span class="hint">scroll to zoom · click-drag to pan</span>
  <button id="reset">Reset</button>
  <button id="zoomin">+</button>
  <button id="zoomout">−</button>
  <span id="zoominfo" style="margin-left:auto; color:#888;"></span>
</div>
<div id="stage">
${svgMarkup}
</div>
<script>
(function() {
  const stage = document.getElementById('stage');
  const svg = stage.querySelector('svg');
  const zoomInfo = document.getElementById('zoominfo');
  const vbAttr = svg.getAttribute('viewBox').split(/\\s+/).map(Number);
  const initialVB = { x: vbAttr[0], y: vbAttr[1], w: vbAttr[2], h: vbAttr[3] };
  let vb = { ...initialVB };
  function applyVB() {
    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
    const z = (initialVB.w / vb.w * 100).toFixed(0);
    zoomInfo.textContent = z + '%';
  }
  applyVB();
  // Wheel zoom
  stage.addEventListener('wheel', function(e) {
    e.preventDefault();
    const rect = stage.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const newW = vb.w * factor;
    const newH = vb.h * factor;
    vb.x += (vb.w - newW) * mx;
    vb.y += (vb.h - newH) * my;
    vb.w = newW;
    vb.h = newH;
    applyVB();
  }, { passive: false });
  // Click-drag pan
  let panning = false; let startX, startY, startVB;
  stage.addEventListener('mousedown', function(e) {
    panning = true; stage.classList.add('panning');
    startX = e.clientX; startY = e.clientY; startVB = { ...vb };
  });
  window.addEventListener('mousemove', function(e) {
    if (!panning) return;
    const rect = stage.getBoundingClientRect();
    const dx = (e.clientX - startX) / rect.width * startVB.w;
    const dy = (e.clientY - startY) / rect.height * startVB.h;
    vb.x = startVB.x - dx;
    vb.y = startVB.y - dy;
    applyVB();
  });
  window.addEventListener('mouseup', function() { panning = false; stage.classList.remove('panning'); });
  // Reset
  document.getElementById('reset').addEventListener('click', function() { vb = { ...initialVB }; applyVB(); });
  document.getElementById('zoomin').addEventListener('click', function() {
    vb.w *= 0.8; vb.h *= 0.8; applyVB();
  });
  document.getElementById('zoomout').addEventListener('click', function() {
    vb.w *= 1.25; vb.h *= 1.25; applyVB();
  });
})();
</script>
</body>
</html>
`;

export function generate(slug, runDir, repoRoot) {
  const graph = extract(slug, runDir, repoRoot);
  const layoutData = layout(graph);
  const svg = renderSvg(layoutData);
  const html = HTML_TEMPLATE(slug, svg);
  // Write both .svg (raw asset) and .html (toolbar wrapper)
  const svgPath = path.join(runDir, 'decision-flowchart.svg');
  const htmlPath = path.join(runDir, 'decision-flowchart.html');
  fs.writeFileSync(svgPath, svg);
  fs.writeFileSync(htmlPath, html);
  return { svgPath, htmlPath, stats: graph.stats };
}

// CLI
const __thisFile = decodeURIComponent(new URL(import.meta.url).pathname);
if (process.argv[1] && __thisFile.endsWith(process.argv[1].split('/').pop())) {
  const slug = process.argv[2];
  if (!slug) { console.error('Usage: node decision-flowchart.mjs <slug>'); process.exit(1); }
  const repoRoot = path.resolve(path.dirname(__thisFile), '..', '..');
  const result = generate(slug, path.join(repoRoot, 'runs', slug), repoRoot);
  console.log(`[decision-flowchart] wrote ${result.svgPath}`);
  console.log(`[decision-flowchart] wrote ${result.htmlPath}`);
  console.log(`[decision-flowchart] stats: ${JSON.stringify(result.stats)}`);
}
