// ============================================================================
// architecture/scripts/meta-flowchart-render.mjs
//
// Pass 3 of 4. Takes a Layout from meta-flowchart-layout.mjs and emits the
// SVG markup. Uses flowchart-primitives.mjs for the shared visual vocabulary.
// ============================================================================

import {
  esc, svgDefs, renderTitle, renderSubtitle, renderStatCard,
  renderPhaseBand, renderRoleBox, renderMultiModeWrapper, renderConnection,
  renderFooter, renderLegend
} from './flowchart-primitives.mjs';

// ---- connection routing (Manhattan, simple) ----
//
// Given a "from" role-box and "to" role-box, compute a Manhattan path
// (sequence of points) that goes from from's appropriate exit edge to to's
// appropriate entry edge with minimal overlap.
//
// For v0.1 we use simple heuristics:
//   - If both are spine roles vertically stacked: vertical line, midX.
//   - If from is above to: exit bottom-center, enter top-center.
//   - If from is below to: exit top-center, enter bottom-center.
//   - If both on same row (paired horizontal): exit right-center, enter left-center, single horizontal segment.
//   - If from is spine and to is side (or vice versa): exit/enter at appropriate side edges with a short horizontal segment.
function routeConnection(fromRole, toRole, styleKey) {
  if (!fromRole || !toRole) return null;
  const fromCx = fromRole.x + fromRole.width / 2;
  const fromCy = fromRole.y + fromRole.height / 2;
  const toCx   = toRole.x + toRole.width / 2;
  const toCy   = toRole.y + toRole.height / 2;
  const fromBottom = { x: fromCx, y: fromRole.y + fromRole.height };
  const fromTop    = { x: fromCx, y: fromRole.y };
  const fromLeft   = { x: fromRole.x, y: fromCy };
  const fromRight  = { x: fromRole.x + fromRole.width, y: fromCy };
  const toBottom = { x: toCx, y: toRole.y + toRole.height };
  const toTop    = { x: toCx, y: toRole.y };
  const toLeft   = { x: toRole.x, y: toCy };
  const toRight  = { x: toRole.x + toRole.width, y: toCy };

  const vDiff = toRole.y - (fromRole.y + fromRole.height);

  // Same row (overseer ↔ builder pair)
  if (Math.abs(fromCy - toCy) < 30 && Math.abs(fromRole.height - toRole.height) < 30) {
    if (fromCx < toCx) return [fromRight, toLeft];
    return [fromLeft, toRight];
  }

  // From above to (most spine cases)
  if (vDiff >= 0) {
    // Vertical drop with side-step if x differs significantly
    if (Math.abs(fromCx - toCx) < 30) {
      return [fromBottom, toTop];
    }
    // Manhattan route via midpoint
    const midY = fromBottom.y + vDiff / 2;
    return [fromBottom, { x: fromBottom.x, y: midY }, { x: toTop.x, y: midY }, toTop];
  }

  // From below to (loop-back, e.g. CV → Orchestrator)
  if (Math.abs(fromCx - toCx) < 30) {
    return [fromTop, toBottom];
  }
  const midY = fromRole.y - 40;
  return [fromTop, { x: fromTop.x, y: midY }, { x: toBottom.x, y: midY }, toBottom];
}

// ---- per-mode sub-panel renderer (inside a wrapper) ----
function renderModePanel(role) {
  return renderRoleBox({
    x: role.x,
    y: role.y,
    width: role.width,
    height: role.height,
    roleKey: role.roleKey === 'discovery' || role.roleKey === 'td' || role.roleKey === 'researcher'
      ? role.roleKey
      : role.roleKey,
    title: role.title + (role.subtitle ? ` (${role.subtitle.replace(' mode', '')})` : ''),
    subtitle: null,
    description: role.description,
    atomicSteps: role.atomicSteps,
    boundaries: role.boundaries
  });
}

// ---- main render ----
export function render(layoutData) {
  const { canvasWidth, canvasHeight, titleY, subtitleY, statCards, phaseBands, roles, connections, architectureVersion, constants } = layoutData;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" font-family="Arial, Helvetica, sans-serif">`;

  svg += svgDefs();

  // Title block
  svg += renderTitle(`AutoBuilder Architecture v${architectureVersion} — Role Topology`, canvasWidth / 2, titleY, 28);
  svg += renderSubtitle('Build-agnostic model of every role, its atomic steps, and the connections between them.', canvasWidth / 2, subtitleY, 13);

  // Stat cards
  for (const card of statCards) {
    svg += renderStatCard(card);
  }

  // Phase bands
  for (const band of phaseBands) {
    svg += renderPhaseBand({ x: band.x, y: band.y + 18, width: band.width, label: band.label });
  }

  // Roles: render wrappers first as background chrome, then the role boxes on top.
  const wrappers = roles.filter(r => r._isWrapper);
  const concreteRoles = roles.filter(r => !r._isWrapper);

  for (const w of wrappers) {
    // Build inner content by rendering each mode panel.
    let inner = '';
    for (const mode of w.modes) {
      inner += renderModePanel(mode);
    }
    svg += renderMultiModeWrapper({
      x: w.x, y: w.y, width: w.width, height: w.height,
      wrapperLabel: w.wrapperLabel,
      modeCount: w.modes.length,
      revisitedBadge: null,
      borderColor: '#0a3a6a',
      innerContent: ''  // we render the inner panels separately below to control z-order
    });
  }

  // Render every concrete role box.
  for (const role of concreteRoles) {
    // Modes inside wrappers are already laid out; render each as a plain role box.
    svg += renderRoleBox({
      x: role.x,
      y: role.y,
      width: role.width,
      height: role.height,
      roleKey: role.roleKey,
      title: role.title + (role.subtitle ? ` (${role.subtitle.replace(' mode', '')})` : ''),
      subtitle: null,
      description: role.description,
      atomicSteps: role.atomicSteps,
      boundaries: role.boundaries
    });
  }

  // Connections — drawn after role boxes so arrows render on top.
  const roleById = {};
  for (const r of concreteRoles) {
    roleById[r.id] = r;
  }
  for (const c of connections) {
    const from = roleById[c.from];
    const to = roleById[c.to];
    if (!from || !to) continue;
    const path = routeConnection(from, to, c.styleKey);
    if (!path) continue;
    // Position the label at the midpoint of the longest segment.
    let labelX = null, labelY = null;
    if (path.length >= 2) {
      const lastIdx = path.length - 1;
      labelX = (path[lastIdx - 1].x + path[lastIdx].x) / 2;
      labelY = (path[lastIdx - 1].y + path[lastIdx].y) / 2;
    }
    svg += renderConnection({
      points: path,
      styleKey: c.styleKey,
      label: c.label,
      labelX, labelY,
      labelAnchor: 'middle'
    });
  }

  // Legend (bottom-right corner)
  const legendEntries = [
    { styleKey: 'spine',       label: 'Dispatch (linear path)' },
    { styleKey: 'mode',        label: 'Mode transition (same role, different mode)' },
    { styleKey: 'escalation',  label: 'Escalation (Sev-2+ routed via Arbiter)' },
    { styleKey: 'audit',       label: 'Audit (Critic scheduled cycle)' },
    { styleKey: 'observation', label: 'Observation (Historian captures all state events)' },
    { styleKey: 'reaudit',     label: 'Re-audit (post-build, on architecture amendment)' }
  ];
  svg += renderLegend({
    x: canvasWidth - 340,
    y: canvasHeight - 50 - (legendEntries.length * 22) - 24,
    entries: legendEntries
  });

  // Footer
  svg += renderFooter({
    x: canvasWidth / 2,
    y: canvasHeight - 25,
    generatorName: 'architecture/scripts/meta-flowchart.mjs',
    extraInfo: `architecture v${architectureVersion}`
  });

  svg += `\n</svg>\n`;
  return svg;
}
