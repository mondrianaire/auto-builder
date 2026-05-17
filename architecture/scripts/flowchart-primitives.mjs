// ============================================================================
// architecture/scripts/flowchart-primitives.mjs
//
// Shared rendering primitives for all flowchart generators in the family:
//   - meta-flowchart.mjs        (build-agnostic role topology, the "what AutoBuilder is")
//   - decision-flowchart.mjs    (post-build verbatim enumeration, the "what one build did")
//   - (future) live-flowchart   (Codex v0.16 live narrative renderer)
//
// Single source of truth for the visual vocabulary so the three flowcharts
// feel like one family. Each generator imports what it needs; nothing is
// duplicated.
//
// Visual register grounded in the user-provided example flowcharts at
// example flowcharts/ — Arial sans, header-strip role boxes, color-coded
// roles, stat cards with colored top stripe, red dashed escalation paths.
// ============================================================================

// ---- XML / string helpers ----

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function wrapText(text, maxChars = 80) {
  if (text.length <= maxChars) return [text];
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur ? cur + ' ' : '') + w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---- color palette ----
// Role-colored header strips; consistent across all flowcharts.
export const PALETTE = {
  // Spine roles
  orchestrator: { headerBg: '#3a5a8c', headerFg: '#fff' },
  discovery:    { headerBg: '#1e3a5f', headerFg: '#fff' },
  td:           { headerBg: '#1e3a5f', headerFg: '#fff' },
  editor:       { headerBg: '#2a6e3a', headerFg: '#fff' },
  coordinator:  { headerBg: '#1e3a5f', headerFg: '#fff' },
  overseer:     { headerBg: '#2a7a3a', headerFg: '#fff' },
  builder:      { headerBg: '#c46a1a', headerFg: '#fff' },
  integrator:   { headerBg: '#3a6abf', headerFg: '#fff' },
  cv:           { headerBg: '#1e3a5f', headerFg: '#fff' },
  // Cross-cutting roles
  critic:       { headerBg: '#8a4a1a', headerFg: '#fff' },
  arbiter:      { headerBg: '#5a1a1a', headerFg: '#fff' },
  historian:    { headerBg: '#5a5a5a', headerFg: '#fff' },
  researcher:   { headerBg: '#5a3a8a', headerFg: '#fff' },
  // Modes
  impact:       { headerBg: '#5a1a1a', headerFg: '#fff' },
  reEngaged:    { headerBg: '#5a1a1a', headerFg: '#fff' },
  // Re-Verification
  reVerify:     { headerBg: '#3a3a3a', headerFg: '#fff' },
  // Default fallback
  _default:     { headerBg: '#444',    headerFg: '#fff' }
};

export function paletteFor(roleKey) {
  return PALETTE[roleKey] || PALETTE._default;
}

// ---- connection styles ----
export const CONNECTION_STYLES = {
  spine:       { stroke: '#000',    strokeWidth: 2,   dash: null,    label: 'dispatch' },
  escalation:  { stroke: '#c43c3c', strokeWidth: 3,   dash: '6,4',   label: 'escalation' },
  observation: { stroke: '#888',    strokeWidth: 1,   dash: '2,3',   label: 'observes' },
  mode:        { stroke: '#5a1a1a', strokeWidth: 1.5, dash: '4,3',   label: 'mode-transition' },
  audit:       { stroke: '#8a4a1a', strokeWidth: 1.5, dash: '5,3',   label: 'audits' },
  reaudit:     { stroke: '#5a5a5a', strokeWidth: 1.5, dash: '3,3',   label: 're-audit' }
};

// ---- SVG defs (markers, etc.) ----

export function svgDefs() {
  return `
  <defs>
    <marker id="arrow-spine" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#000"/>
    </marker>
    <marker id="arrow-esc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#c43c3c"/>
    </marker>
    <marker id="arrow-obs" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#888"/>
    </marker>
    <marker id="arrow-mode" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#5a1a1a"/>
    </marker>
    <marker id="arrow-audit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#8a4a1a"/>
    </marker>
    <marker id="arrow-reaudit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#5a5a5a"/>
    </marker>
  </defs>`;
}

export function markerForStyle(styleKey) {
  return ({
    spine: 'arrow-spine',
    escalation: 'arrow-esc',
    observation: 'arrow-obs',
    mode: 'arrow-mode',
    audit: 'arrow-audit',
    reaudit: 'arrow-reaudit'
  })[styleKey] || 'arrow-spine';
}

// ---- title block ----

export function renderTitle(text, x, y, fontSize = 28) {
  return `
  <text x="${x}" y="${y}" text-anchor="middle" font-size="${fontSize}" font-weight="bold">${esc(text)}</text>`;
}

export function renderSubtitle(text, x, y, fontSize = 14) {
  return `
  <text x="${x}" y="${y}" text-anchor="middle" font-size="${fontSize}" fill="#666" font-style="italic">${esc(text)}</text>`;
}

// ---- stat cards ----

export function renderStatCard({ x, y, w, h, value, label, accentColor }) {
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="#dcdcdc" stroke-width="1.5"/>
  <rect x="${x}" y="${y}" width="${w}" height="5" fill="${accentColor}"/>
  <text x="${x + w/2}" y="${y + 75}" text-anchor="middle" font-size="58" font-weight="bold" fill="#1a1a1a">${esc(value)}</text>
  <text x="${x + w/2}" y="${y + 103}" text-anchor="middle" font-size="13" font-weight="bold" fill="#666" letter-spacing="2.5">${esc(label)}</text>`;
}

// ---- phase band ----

export function renderPhaseBand({ x, y, width, label, color = '#888' }) {
  return `
  <text x="${x}" y="${y}" font-size="14" font-weight="bold" fill="${color}" letter-spacing="0.5">${esc(label)}</text>
  <line x1="${x}" y1="${y + 8}" x2="${x + width}" y2="${y + 8}" stroke="#ddd"/>`;
}

// ---- role box ----
//
// A role box has:
//   - colored header strip with title (14-15px white bold)
//   - optional italic subtitle line under the title
//   - body area with:
//       * optional description paragraph (italic gray)
//       * optional numbered atomic-step list
//       * optional bullet list (boundaries / footnotes)
//
// All inputs are pre-laid-out by the caller. This primitive only renders.
// ============================================================================

export function renderRoleBox({
  x, y, width, height,
  headerHeight = 36,
  roleKey,
  title,
  subtitle,
  description,
  atomicSteps,    // array of step strings, or null
  boundaries,     // array of boundary strings, or null
  footerNote,     // italic gray footnote line, or null
  borderColor = '#333',
  borderWidth = 1,
  borderDash = null,
  bgColor = '#fff'
}) {
  const palette = paletteFor(roleKey);
  const borderDashAttr = borderDash ? ` stroke-dasharray="${borderDash}"` : '';
  let svg = `
  <!-- role: ${esc(title)} -->
  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${bgColor}" stroke="${borderColor}" stroke-width="${borderWidth}"${borderDashAttr} rx="2"/>
  <rect x="${x}" y="${y}" width="${width}" height="${headerHeight}" fill="${palette.headerBg}"/>
  <text x="${x + width/2}" y="${y + 23}" text-anchor="middle" font-size="15" font-weight="bold" fill="${palette.headerFg}">${esc(title)}</text>`;

  let cursorY = y + headerHeight + 22;
  const textX = x + 16;
  const maxBodyChars = Math.floor((width - 32) / 7);   // approximate for 12px sans

  if (subtitle) {
    svg += `
  <text x="${x + width/2}" y="${cursorY}" text-anchor="middle" font-size="11" fill="#3a6abf" font-style="italic">${esc(subtitle)}</text>`;
    cursorY += 18;
  }

  if (description) {
    const lines = wrapText(description, maxBodyChars);
    for (const line of lines) {
      svg += `
  <text x="${textX}" y="${cursorY}" font-size="11" fill="#444" font-style="italic">${esc(line)}</text>`;
      cursorY += 15;
    }
    cursorY += 6;
  }

  if (atomicSteps && atomicSteps.length) {
    svg += `
  <text x="${textX}" y="${cursorY}" font-size="11" font-weight="bold" fill="#0a3a6a" letter-spacing="0.8">ATOMIC STEPS</text>`;
    cursorY += 16;
    for (let i = 0; i < atomicSteps.length; i++) {
      const step = atomicSteps[i];
      const lines = wrapText(step, maxBodyChars - 6);
      svg += `
  <text x="${textX}" y="${cursorY}" font-size="11" font-weight="bold" fill="#0a3a6a">${i + 1}.</text>`;
      for (let j = 0; j < lines.length; j++) {
        const lx = textX + 22;
        svg += `
  <text x="${lx}" y="${cursorY}" font-size="11" fill="#222">${esc(lines[j])}</text>`;
        cursorY += 14;
      }
      cursorY += 2;
    }
  }

  if (boundaries && boundaries.length) {
    cursorY += 4;
    svg += `
  <text x="${textX}" y="${cursorY}" font-size="11" font-weight="bold" fill="#5a1a1a" letter-spacing="0.8">BOUNDARIES</text>`;
    cursorY += 16;
    for (const b of boundaries) {
      const lines = wrapText(b, maxBodyChars - 6);
      for (let j = 0; j < lines.length; j++) {
        const prefix = j === 0 ? '• ' : '  ';
        svg += `
  <text x="${textX}" y="${cursorY}" font-size="11" fill="#5a1a1a">${esc(prefix + lines[j])}</text>`;
        cursorY += 14;
      }
    }
  }

  if (footerNote) {
    cursorY = y + height - 16;
    svg += `
  <text x="${textX}" y="${cursorY}" font-size="10" fill="#888" font-style="italic">${esc(footerNote)}</text>`;
  }

  return svg;
}

// ---- multi-mode wrapper ----
//
// Wraps N role-box-like sub-panels under a single bordered container with
// a top-left agent label and optional revisited badge. The wrapper's caller
// provides the inner sub-panel SVG; this primitive just renders the chrome.
// ============================================================================

export function renderMultiModeWrapper({
  x, y, width, height,
  wrapperLabel,    // e.g. "DISCOVERY · 3 MODES"
  modeCount,
  revisitedBadge,  // e.g. "↻ REVISITED esc-001", or null
  borderColor = '#333',
  innerContent    // pre-rendered SVG of the sub-panels
}) {
  let svg = `
  <!-- multi-mode wrapper: ${esc(wrapperLabel)} -->
  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${borderColor}" stroke-width="2" rx="2"/>
  <rect x="${x + 2}" y="${y + 2}" width="240" height="20" fill="${borderColor}"/>
  <text x="${x + 12}" y="${y + 16}" font-size="11" font-weight="bold" fill="#fff">${esc(wrapperLabel)}</text>`;
  if (revisitedBadge) {
    svg += `
  <rect x="${x + width - 160}" y="${y + 2}" width="155" height="22" fill="#c43c3c"/>
  <text x="${x + width - 82}" y="${y + 18}" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff">${esc(revisitedBadge)}</text>`;
  }
  svg += innerContent;
  return svg;
}

// ---- connection (single-segment or routed) ----
//
// Renders a connection between two anchor points. Style key selects color,
// width, dash, and arrow marker. Caller supplies an array of points
// representing a Manhattan path; this primitive draws the segments and the
// terminal arrow.
// ============================================================================

export function renderConnection({ points, styleKey = 'spine', label, labelX, labelY, labelAnchor = 'start' }) {
  if (!points || points.length < 2) return '';
  const style = CONNECTION_STYLES[styleKey] || CONNECTION_STYLES.spine;
  const dashAttr = style.dash ? ` stroke-dasharray="${style.dash}"` : '';
  const marker = `url(#${markerForStyle(styleKey)})`;

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
  }
  let svg = `
  <path d="${pathD}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr} marker-end="${marker}"/>`;
  if (label) {
    svg += `
  <text x="${labelX}" y="${labelY}" text-anchor="${labelAnchor}" font-size="11" font-weight="bold" fill="${style.stroke}">${esc(label)}</text>`;
  }
  return svg;
}

// ---- footer ----

export function renderFooter({ x, y, generatorName, extraInfo = '' }) {
  return `
  <text x="${x}" y="${y}" text-anchor="middle" font-size="11" fill="#999">Auto-generated by ${esc(generatorName)}${extraInfo ? ' · ' + esc(extraInfo) : ''}</text>`;
}

// ---- legend ----
//
// Renders a small legend explaining connection styles. Useful for the Meta
// flowchart which has many distinct connection types.
// ============================================================================

export function renderLegend({ x, y, entries }) {
  // entries: [{ styleKey, label }]
  let svg = `
  <!-- legend -->
  <rect x="${x}" y="${y}" width="320" height="${20 + entries.length * 22}" fill="#fff" stroke="#dcdcdc" stroke-width="1"/>
  <text x="${x + 12}" y="${y + 16}" font-size="11" font-weight="bold" fill="#666" letter-spacing="0.8">LEGEND</text>`;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const style = CONNECTION_STYLES[entry.styleKey] || CONNECTION_STYLES.spine;
    const ey = y + 38 + i * 22;
    const dashAttr = style.dash ? ` stroke-dasharray="${style.dash}"` : '';
    svg += `
  <line x1="${x + 14}" y1="${ey}" x2="${x + 60}" y2="${ey}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr}/>
  <text x="${x + 70}" y="${ey + 4}" font-size="11" fill="#444">${esc(entry.label)}</text>`;
  }
  return svg;
}

// ---- HTML viewer wrapper ----
//
// Wraps a generated SVG in a self-contained HTML page with a toolbar
// (Reset / + / − / zoom-percentage indicator) and click-drag pan + scroll-
// wheel zoom. No external dependencies — vanilla JS manipulating the SVG's
// viewBox attribute.
//
// Use case: SVGs opened in image viewers can't zoom/pan; the .html wrapper
// gives the same SVG a usable viewer for inspection at any size.
//
// Shared between meta-flowchart, decision-flowchart, and any future
// flowchart generator that needs interactive viewing.
// ============================================================================

export function renderHtmlViewerWrapper({ title, subtitle, svgMarkup }) {
  const safeTitle = esc(title);
  const safeSubtitle = subtitle ? esc(subtitle) : '';
  // Note: backslash-doubled \\s inside the template-literal source so the
  // emitted JS string sees \s (the actual regex metachar) at runtime.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${safeTitle}</title>
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: #fafafa; font-family: Arial, Helvetica, sans-serif; overflow: hidden; }
  #toolbar {
    position: fixed; top: 0; left: 0; right: 0; height: 44px;
    background: #fff; border-bottom: 1px solid #ddd;
    display: flex; align-items: center; padding: 0 14px; gap: 14px; z-index: 10;
    font-size: 13px; color: #444;
  }
  #toolbar strong { font-weight: 600; }
  #toolbar .subtitle { color: #888; font-weight: 400; }
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
  <strong>${safeTitle}</strong>
  ${safeSubtitle ? `<span class="subtitle">· ${safeSubtitle}</span>` : ''}
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
  document.getElementById('reset').addEventListener('click', function() { vb = { ...initialVB }; applyVB(); });
  document.getElementById('zoomin').addEventListener('click', function() { vb.w *= 0.8; vb.h *= 0.8; applyVB(); });
  document.getElementById('zoomout').addEventListener('click', function() { vb.w *= 1.25; vb.h *= 1.25; applyVB(); });
})();
</script>
</body>
</html>
`;
}
