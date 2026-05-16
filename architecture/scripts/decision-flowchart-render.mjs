// ============================================================================
// architecture/scripts/decision-flowchart-render.mjs
//
// Pass 3 of 4. Takes a Layout from decision-flowchart-layout.mjs and emits
// the SVG markup as a string. Visual style chosen to match the user-uploaded
// earthquake-map reference (decision-flowchart.svg + .html).
// ============================================================================

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapLabel(label, maxChars = 105) {
  // Wrap into <=N-character lines (rough character-count wrap, good enough for monospaced text)
  if (label.length <= maxChars) return [label];
  const words = label.split(/\s+/);
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

function emphasisColor(emphasis, C) {
  if (emphasis === 'escalation-trigger') return C.decisionColorTrigger;
  if (emphasis === 'escalation-impact') return C.decisionColorImpact;
  return C.decisionColorNormal;
}

function renderStatCards(layout) {
  return layout.statCards.map(card => `
  <rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" fill="#fff" stroke="#dcdcdc" stroke-width="1.5"/>
  <rect x="${card.x}" y="${card.y}" width="${card.w}" height="5" fill="${card.accentColor}"/>
  <text x="${card.x + card.w/2}" y="${card.y + 75}" text-anchor="middle" font-size="58" font-weight="bold" fill="#1a1a1a">${esc(card.value)}</text>
  <text x="${card.x + card.w/2}" y="${card.y + 103}" text-anchor="middle" font-size="13" font-weight="bold" fill="#666" letter-spacing="2.5">${esc(card.label)}</text>
`).join('');
}

function renderAgentBox(agent, C) {
  const isImpact = agent.is_impact_mode;
  const headerBg = isImpact ? '#5a1a1a' : C.agentBoxHeaderBg;
  const borderColor = agent.revisited_by_escalation_id ? '#c43c3c' : C.agentBoxBorderColor;
  const borderWidth = agent.revisited_by_escalation_id ? 2 : 1;
  let svg = `
  <!-- Agent: ${esc(agent.id)} -->
  <rect x="${agent.x}" y="${agent.y}" width="${agent.width}" height="${agent.height}" fill="${C.agentBoxBg}" stroke="${borderColor}" stroke-width="${borderWidth}" rx="2"/>
  <rect x="${agent.x}" y="${agent.y}" width="${agent.width}" height="${agent.headerHeight}" fill="${headerBg}"/>
  <text x="${agent.x + agent.width/2}" y="${agent.y + 23}" text-anchor="middle" font-size="15" font-weight="bold" fill="${C.agentBoxHeaderFg}">${esc(agent.label)}</text>
`;
  if (agent.revisited_by_escalation_id) {
    svg += `  <text x="${agent.x + agent.width - 12}" y="${agent.y + 23}" text-anchor="end" font-size="11" font-weight="bold" fill="#fff">↻ REVISITED ${esc(agent.revisited_by_escalation_id)}</text>\n`;
  }
  // Decision rows
  const maxChars = Math.floor((agent.width - 60) / 7.5);  // approx char width for 13px font
  let rowY = agent.y + C.agentBoxHeaderHeight;
  for (const d of agent.decisions) {
    const color = emphasisColor(d.emphasis, C);
    const lines = wrapLabel(d.label, maxChars - 12);  // -12 for id prefix
    const idText = d.id ? `${esc(d.id)}: ` : '';
    if (lines.length === 1) {
      svg += `  <text x="${agent.x + C.decisionTextX}" y="${rowY + 19}" font-size="${C.decisionTextFontSize}" font-weight="bold" fill="${color}">${esc(idText + lines[0])}</text>\n`;
      rowY += C.decisionRowHeight;
    } else {
      // First line carries the ID; subsequent lines indent
      svg += `  <text x="${agent.x + C.decisionTextX}" y="${rowY + 19}" font-size="${C.decisionTextFontSize}" font-weight="bold" fill="${color}">${esc(idText + lines[0])}</text>\n`;
      for (let i = 1; i < lines.length; i++) {
        rowY += 16;
        svg += `  <text x="${agent.x + C.decisionTextX + 30}" y="${rowY + 19}" font-size="${C.decisionTextFontSize - 1}" fill="${color}">${esc(lines[i])}</text>\n`;
      }
      rowY += C.decisionRowHeight;
    }
  }
  return svg;
}

function renderHighway(highway, C) {
  let svg = `
  <!-- Escalation highway: ${esc(highway.id)} -->
  <g class="highway-${esc(highway.id)}">
`;
  for (const seg of highway.segments) {
    if (seg.type === 'h') {
      svg += `    <line x1="${seg.x1}" y1="${seg.y1}" x2="${seg.x2}" y2="${seg.y2}" stroke="${highway.color}" stroke-width="${C.highwayStrokeWidth}"/>\n`;
    } else if (seg.type === 'v') {
      svg += `    <line x1="${seg.x}" y1="${seg.y1}" x2="${seg.x}" y2="${seg.y2}" stroke="${highway.color}" stroke-width="${C.highwayStrokeWidth}"/>\n`;
    }
  }
  // Arrow markers at endpoints
  for (const ah of highway.arrowHeads) {
    svg += renderArrowHead(ah.x, ah.y, ah.direction, highway.color);
  }
  // Labels
  for (const label of highway.labels) {
    const lines = wrapLabel(label.text, 30);
    const anchor = label.anchor === 'end' ? 'end' : 'start';
    for (let i = 0; i < lines.length; i++) {
      svg += `    <text x="${label.x}" y="${label.y + i * 14}" text-anchor="${anchor}" font-size="${C.highwayLabelFontSize}" font-weight="bold" fill="${C.highwayLabelColor}">${esc(lines[i])}</text>\n`;
    }
  }
  // Channel marker at top of lane
  if (highway.segments.length) {
    const firstSeg = highway.segments[0];
    const topY = Math.min(...highway.segments.flatMap(s => s.type === 'v' ? [s.y1, s.y2] : [s.y1]));
    svg += `    <text x="${highway.laneX + 8}" y="${topY - 12}" font-size="12" font-weight="bold" fill="${highway.color}" letter-spacing="0.8">↻ ${esc(highway.id.toUpperCase())}</text>\n`;
  }
  svg += `  </g>\n`;
  return svg;
}

function renderArrowHead(x, y, direction, color) {
  const size = 6;
  let pts;
  if (direction === 'right') {
    pts = `${x},${y} ${x-size},${y-size/1.5} ${x-size},${y+size/1.5}`;
  } else if (direction === 'left') {
    pts = `${x},${y} ${x+size},${y-size/1.5} ${x+size},${y+size/1.5}`;
  } else if (direction === 'down') {
    pts = `${x},${y} ${x-size/1.5},${y-size} ${x+size/1.5},${y-size}`;
  } else {
    pts = `${x},${y} ${x-size/1.5},${y+size} ${x+size/1.5},${y+size}`;
  }
  return `    <polygon points="${pts}" fill="${color}"/>\n`;
}

function renderPhase(phase, C) {
  let svg = `
  <!-- Phase: ${esc(phase.name)} -->
  <text x="${phase.labelX}" y="${phase.labelY}" font-size="${C.phaseLabelFontSize}" font-weight="bold" fill="#888" letter-spacing="0.5">${esc(phase.name)}</text>
`;
  for (const agent of phase.agents) {
    svg += renderAgentBox(agent, C);
  }
  return svg;
}

export function render(layoutData) {
  const C = layoutData.constants;
  const { canvasWidth, canvasHeight, titleY, slug, prompt, verdict } = layoutData;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" font-family="Arial, Helvetica, sans-serif">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#000"/>
    </marker>
  </defs>

  <text x="${canvasWidth/2}" y="${titleY}" text-anchor="middle" font-size="28" font-weight="bold">${esc(slug)} — Decision Flowchart</text>
`;
  svg += renderStatCards(layoutData);
  for (const phase of layoutData.phases) {
    svg += renderPhase(phase, C);
  }
  for (const hw of layoutData.highways) {
    svg += renderHighway(hw, C);
  }
  // Footer
  const footerY = canvasHeight - 25;
  svg += `
  <!-- Footer -->
  <text x="${canvasWidth/2}" y="${footerY}" text-anchor="middle" font-size="11" fill="#999">Auto-generated by architecture/scripts/decision-flowchart.mjs · verdict: ${esc(verdict)} · build: ${esc(slug)}</text>
`;
  svg += `</svg>\n`;
  return svg;
}

