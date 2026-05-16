// ============================================================================
// architecture/scripts/decision-flowchart-layout.mjs
//
// Pass 2 of 4. Takes a BuildGraph from decision-flowchart-extract.mjs and
// produces a Layout object describing the geometric placement of every visual
// element.
//
// Layout shape:
//   {
//     canvasWidth, canvasHeight,
//     statCards: [{ x, y, w, h, accentColor, value, label }],
//     titleY,
//     phases: [
//       { name, labelX, labelY, agents: [
//         { id, label, x, y, width, height, headerHeight, revisitedBadge?,
//           decisions: [{ id, label, emphasis, y }] }
//       ] }
//     ],
//     highways: [
//       { id, laneX, color, segments: [{type:'h'|'v', x1,y1,x2,y2}],
//         labels: [{x,y,text}], arrowMarkerAt: [{x,y, direction}] }
//     ]
//   }
//
// Manhattan routing: each escalation gets its own vertical lane at
// laneBaseX + lane_index * laneWidth. From one waypoint agent to the next:
// horizontal exit from agent right edge to lane, then vertical to next
// waypoint's y, then horizontal back into the agent.
// ============================================================================

// ---- visual constants ----
const C = {
  baseCanvasWidth: 2400,
  narrowCanvasWidth: 2000,  // auto-narrow when escalation_count === 0
  marginX: 50,
  titleY: 40,
  statCardY: 60,
  statCardHeight: 115,
  statCardWidth: 360,
  statCardSpacing: 30,
  statCardsBlockHeight: 175,  // 60 (top margin) + 115 (height)
  phaseBandTopPadding: 50,
  phaseBandLabelOffsetY: 18,
  phaseLabelX: 80,
  phaseLabelFontSize: 14,
  agentBoxPaddingX: 20,
  agentBoxHeaderHeight: 36,
  agentBoxPaddingBottom: 18,
  agentBoxBorderColor: '#333',
  agentBoxHeaderBg: '#1e3a5f',
  agentBoxHeaderFg: '#fff',
  agentBoxBg: '#fff',
  decisionRowHeight: 30,
  decisionTextX: 30,
  decisionTextFontSize: 13,
  splitDividerColor: '#999',
  // Escalation highway
  laneBaseX: 2050,  // first escalation lane starts here
  laneWidth: 55,
  highwayColor: '#c43c3c',
  highwayStrokeWidth: 2.5,
  highwayLabelFontSize: 11,
  highwayLabelColor: '#c43c3c',
  // Agent positioning
  primaryAgentWidth: 1400,
  primaryAgentX: 500,
  splitInitialAgentX: 200,
  splitInitialAgentWidth: 900,
  splitImpactAgentX: 1130,
  splitImpactAgentWidth: 900,
  // Colors
  decisionColorNormal: '#0a3a6a',
  decisionColorTrigger: '#c43c3c',  // bright red for escalation-trigger
  decisionColorImpact: '#5a1a1a'    // dark red for escalation-impact
};

function computeAgentHeight(agent) {
  return C.agentBoxHeaderHeight
    + (agent.decisions.length * C.decisionRowHeight)
    + C.agentBoxPaddingBottom;
}

function isImpactAgent(agent) {
  return agent.id === 'td-impact' || agent.id === 'coordinator-reengaged' || agent.is_impact_mode;
}

// Find the partner-initial-mode agent for an impact-mode agent in the same phase
function findInitialPartner(phase, impactAgent) {
  if (impactAgent.id === 'td-impact') return phase.agents.find(a => a.id === 'td-initial');
  if (impactAgent.id === 'coordinator-reengaged') return phase.agents.find(a => a.id === 'coordinator');
  return null;
}

// Layout one phase, returning { y: yAfter, agentBoxes: [...] }
function layoutPhase(phase, yStart, hasEscalations) {
  const agentBoxes = [];
  const yLabelLine = yStart;
  let y = yStart + C.phaseBandTopPadding;
  // Build pairs: initial-mode agent on left + (optional) impact partner on right
  const impactAgents = phase.agents.filter(isImpactAgent);
  const standaloneAgents = phase.agents.filter(a => !isImpactAgent(a) && !impactAgents.some(i => findInitialPartner(phase, i) === a));
  const splitPairs = impactAgents
    .map(i => ({ initial: findInitialPartner(phase, i), impact: i }))
    .filter(p => p.initial);
  // Iterate phase.agents in their natural order, but treat split-pair-members as one row
  const renderedIds = new Set();
  for (const agent of phase.agents) {
    if (renderedIds.has(agent.id)) continue;
    const pair = splitPairs.find(p => p.initial.id === agent.id || p.impact.id === agent.id);
    if (pair) {
      // Split layout
      const initH = computeAgentHeight(pair.initial);
      const impactH = computeAgentHeight(pair.impact);
      const rowH = Math.max(initH, impactH);
      agentBoxes.push(layoutAgentBox(pair.initial, C.splitInitialAgentX, y, C.splitInitialAgentWidth));
      agentBoxes.push(layoutAgentBox(pair.impact, C.splitImpactAgentX, y, C.splitImpactAgentWidth));
      renderedIds.add(pair.initial.id);
      renderedIds.add(pair.impact.id);
      y += rowH + 25;
    } else {
      // Single-row layout (primary)
      const h = computeAgentHeight(agent);
      agentBoxes.push(layoutAgentBox(agent, C.primaryAgentX, y, C.primaryAgentWidth));
      renderedIds.add(agent.id);
      y += h + 25;
    }
  }
  return {
    yEnd: y,
    yLabelLine,
    agentBoxes
  };
}

function layoutAgentBox(agent, x, y, width) {
  const height = computeAgentHeight(agent);
  const decisions = agent.decisions.map((d, idx) => ({
    ...d,
    y: y + C.agentBoxHeaderHeight + (idx * C.decisionRowHeight) + Math.round(C.decisionRowHeight * 0.65),
    rowYTop: y + C.agentBoxHeaderHeight + (idx * C.decisionRowHeight)
  }));
  return {
    id: agent.id,
    label: agent.label,
    x, y, width, height,
    headerHeight: C.agentBoxHeaderHeight,
    is_impact_mode: agent.is_impact_mode || isImpactAgent(agent),
    revisited_by_escalation_id: agent.revisited_by_escalation_id,
    decisions,
    rightEdgeX: x + width,
    midY: y + height / 2
  };
}

// Manhattan-route an escalation across its agent box waypoints
function routeHighway(escalation, agentBoxMap, laneIndex) {
  const laneX = C.laneBaseX + (laneIndex * C.laneWidth);
  const segments = [];
  const labels = [];
  const arrowHeads = [];
  let prevY = null;
  let prevX = null;
  for (let i = 0; i < escalation.route_path.length; i++) {
    const wp = escalation.route_path[i];
    const agentBox = agentBoxMap.get(wp.agent_id);
    if (!agentBox) continue;
    const enterX = agentBox.rightEdgeX;
    const enterY = agentBox.midY;
    if (i === 0) {
      // First: arrow exits agent right side, jogs to lane
      segments.push({ type: 'h', x1: enterX, y1: enterY, x2: laneX, y2: enterY });
      arrowHeads.push({ x: enterX, y: enterY, direction: 'right' });  // arrow leaving agent
      // Label near origin
      labels.push({ x: laneX - 8, y: enterY - 10, text: wp.label, anchor: 'end' });
    } else {
      // Vertical from prev to current enter_y in lane
      segments.push({ type: 'v', x: laneX, y1: prevY, y2: enterY });
      // Vertical-mid label
      const midY = (prevY + enterY) / 2;
      labels.push({ x: laneX + 8, y: midY, text: wp.label, anchor: 'start' });
      // Horizontal back into agent right edge
      segments.push({ type: 'h', x1: laneX, y1: enterY, x2: enterX, y2: enterY });
      arrowHeads.push({ x: enterX, y: enterY, direction: 'left' });  // arrow into agent
    }
    prevY = enterY;
    prevX = laneX;
  }
  return {
    id: escalation.id,
    laneX,
    color: C.highwayColor,
    segments,
    labels,
    arrowHeads,
    summary: escalation.summary || ''
  };
}

export function layout(graph) {
  const hasEscalations = graph.stats.escalation_count > 0;
  const canvasWidth = hasEscalations ? C.baseCanvasWidth : C.narrowCanvasWidth;

  // Stat cards: 2 or 3 depending on whether escalation_count > 0
  const cardCount = hasEscalations ? 3 : 2;
  const cardsTotalWidth = (cardCount * C.statCardWidth) + ((cardCount - 1) * C.statCardSpacing);
  const cardsStartX = (canvasWidth - cardsTotalWidth) / 2;
  const statCards = [];
  const cardSpecs = [
    { value: graph.stats.decision_count, label: 'DECISIONS', accentColor: '#3a6abf' },
    { value: graph.stats.agent_count, label: 'AGENTS DEPLOYED', accentColor: '#8a3aaf' }
  ];
  if (hasEscalations) {
    cardSpecs.push({ value: graph.stats.escalation_count, label: 'ESCALATIONS', accentColor: '#c43c3c' });
  }
  cardSpecs.forEach((spec, i) => {
    statCards.push({
      x: cardsStartX + i * (C.statCardWidth + C.statCardSpacing),
      y: C.statCardY,
      w: C.statCardWidth,
      h: C.statCardHeight,
      ...spec
    });
  });

  // Phases
  let cursorY = C.statCardsBlockHeight + 80;  // gap below stat cards
  const phasesLayout = [];
  for (const phase of graph.phases) {
    const phaseLayout = layoutPhase(phase, cursorY, hasEscalations);
    phasesLayout.push({
      name: phase.name,
      labelX: C.phaseLabelX,
      labelY: phaseLayout.yLabelLine + C.phaseBandLabelOffsetY,
      agents: phaseLayout.agentBoxes
    });
    cursorY = phaseLayout.yEnd + 20;
  }

  // Highways
  const agentBoxMap = new Map();
  for (const phase of phasesLayout) {
    for (const ab of phase.agents) {
      agentBoxMap.set(ab.id, ab);
    }
  }
  const highways = (graph.escalations || []).map((esc, i) => routeHighway(esc, agentBoxMap, i));

  return {
    slug: graph.slug,
    prompt: graph.prompt,
    verdict: graph.verdict,
    canvasWidth,
    canvasHeight: cursorY + 60,
    titleY: C.titleY,
    statCards,
    phases: phasesLayout,
    highways,
    constants: C  // pass through for the renderer
  };
}

