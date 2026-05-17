// ============================================================================
// architecture/scripts/meta-flowchart-layout.mjs
//
// Pass 2 of 4. Takes the extracted role graph from meta-flowchart-extract.mjs
// and produces a Layout object: pixel positions for every visual element +
// the connection graph (dispatch arrows + escalation paths + mode transitions
// + observation lines).
//
// The connection graph is hardcoded here for v0.1 (charter-text parsing is a
// future enhancement per meta-architecture-flowchart-spec.md § "Audit hooks").
// Every connection traces to a charter sentence — the rationale is in the
// connection's `traceTo` field so future audits can verify charter fidelity.
//
// Spine layout (top-to-bottom):
//   User Prompt → Orchestrator → Discovery (wrapper, 3 modes)
//     → TD (wrapper, 2 modes) → Editor → Coordinator → Sections (Overseer
//     and Builder roles as a stacked pair) → Integrator → Critic (final
//     sweep) → CV → Orchestrator delivery
//
// Side roles:
//   - Critic (scheduled mode) — left flank, mid-spine
//   - Arbiter — right flank, mid-spine
//   - Researcher (wrapper, 2 modes) — right flank, below Arbiter
//   - Historian — bottom-left, observing all
//   - Re-Verification — bottom-right, post-build audit
// ============================================================================

// ---- visual constants ----
const C = {
  canvasWidth: 2600,
  marginX: 60,
  titleY: 50,
  subtitleY: 78,
  statCardY: 110,
  statCardHeight: 115,
  statCardWidth: 360,
  statCardGap: 30,
  spineCenterX: 1300,
  spineColumnWidth: 740,
  sideColumnWidth: 480,
  leftColumnX: 80,
  rightColumnX: 2040,
  // Vertical rhythm
  phaseBandPaddingTop: 30,
  phaseBandHeight: 28,
  roleBoxMinHeight: 220,
  roleBoxGap: 40,
  wrapperPaddingX: 10,
  wrapperPaddingTop: 28,
  wrapperPaddingBottom: 12,
  wrapperModeGap: 12,
  legendWidth: 320,
  legendItemHeight: 22
};

// ---- estimate role-box height from content ----
function estimateRoleBoxHeight(role) {
  // Header (36) + subtitle (18 if present) + description wrap + atomic steps + boundaries + padding.
  let h = 36 + 22;  // header + top padding
  if (role.subtitle) h += 18;
  if (role.description) {
    const descLines = Math.ceil(role.description.length / 60);
    h += descLines * 15 + 6;
  }
  if (role.atomicSteps && role.atomicSteps.length) {
    h += 16;  // "ATOMIC STEPS" label
    for (const step of role.atomicSteps) {
      const stepLines = Math.ceil(step.length / 60);
      h += stepLines * 14 + 2;
    }
  }
  if (role.boundaries && role.boundaries.length) {
    h += 20;  // "BOUNDARIES" label
    for (const b of role.boundaries) {
      const bLines = Math.ceil(b.length / 60);
      h += bLines * 14;
    }
  }
  h += 20;  // bottom padding
  return Math.max(h, C.roleBoxMinHeight);
}

// ---- helper: find role by heading or roleKey+mode ----
function findRole(roles, predicate) {
  return roles.find(predicate);
}

// ---- compute spine-or-side column for each role ----
function classifyRole(role) {
  // Side roles in the Meta layout.
  const sideRoles = {
    critic:     'left',
    arbiter:    'right',
    researcher: 'right',
    historian:  'left-bottom',
    reVerify:   'right-bottom'
  };
  return sideRoles[role.roleKey] || 'spine';
}

// ---- build the connection graph ----
// Every connection has: from (roleId), to (roleId), styleKey, label, traceTo (charter sentence reference).
function buildConnectionGraph(roleById) {
  const connections = [];

  // Spine: Orchestrator → Discovery (Initial) → TD (Initial) → Editor →
  //        Coordinator → Overseer → Builder → Integrator → Critic (final) → CV → Orchestrator
  const spine = [
    { from: 'orchestrator-null', to: 'discovery-initial', label: 'dispatch w/ prompt' },
    { from: 'discovery-initial', to: 'td-initial',        label: 'ledger + telos' },
    { from: 'td-initial',        to: 'editor-null',       label: 'sections + contracts' },
    { from: 'editor-null',       to: 'coordinator-null',  label: 'pass verdict' },
    { from: 'coordinator-null',  to: 'overseer-null',     label: 'wave dispatch (per section)' },
    { from: 'overseer-null',     to: 'builder-null',      label: 'task dispatch (per builder)' },
    { from: 'builder-null',      to: 'overseer-null',     label: 'output for verification' },
    { from: 'overseer-null',     to: 'integrator-null',   label: 'verified sections (all done)' },
    { from: 'integrator-null',   to: 'critic-null',       label: 'integrated artifact + manifest' },
    { from: 'critic-null',       to: 'cv-null',           label: 'pass final sweep' },
    { from: 'cv-null',           to: 'orchestrator-null', label: 'verdict report' }
  ];
  for (const c of spine) {
    if (roleById[c.from] && roleById[c.to]) {
      connections.push({ ...c, styleKey: 'spine', traceTo: 'role_charters.md spine dispatch chain' });
    }
  }

  // Mode transitions inside wrappers (curved arrows, mode style)
  const modeTransitions = [
    { from: 'discovery-initial', to: 'discovery-amendment', label: 'amendment triggered' },
    { from: 'discovery-initial', to: 'discovery-demotion',  label: 'demotion required' },
    { from: 'td-initial',        to: 'td-impact',           label: 'impact analysis' }
  ];
  for (const c of modeTransitions) {
    if (roleById[c.from] && roleById[c.to]) {
      connections.push({ ...c, styleKey: 'mode', traceTo: 'role_charters.md mode-dispatch rules' });
    }
  }

  // Escalation paths
  const escalations = [
    { from: 'overseer-null',   to: 'arbiter-null',              label: 'block / Sev-2+' },
    { from: 'critic-null',     to: 'arbiter-null',              label: 'high-severity flag' },
    { from: 'integrator-null', to: 'arbiter-null',              label: 'unresolvable issue' },
    { from: 'cv-null',         to: 'arbiter-null',              label: 'fail verdict' },
    { from: 'arbiter-null',    to: 'td-impact',                 label: 'structural → TD impact' },
    { from: 'arbiter-null',    to: 'discovery-amendment',       label: 'intent gap → Discovery amend' },
    { from: 'arbiter-null',    to: 'discovery-demotion',        label: 'unverifiable noun → Discovery demote' },
    { from: 'arbiter-null',    to: 'coordinator-null',          label: 're-engage Coordinator with delta' },
    { from: 'arbiter-null',    to: 'researcher-escalation',     label: 'missing canonical evidence' }
  ];
  for (const c of escalations) {
    if (roleById[c.from] && roleById[c.to]) {
      connections.push({ ...c, styleKey: 'escalation', traceTo: 'role_charters.md escalation routing' });
    }
  }

  // Research planning dispatch (TD initiates)
  if (roleById['td-initial'] && roleById['researcher-planning']) {
    connections.push({
      from: 'td-initial', to: 'researcher-planning',
      label: 'IP probe', styleKey: 'spine', traceTo: 'role_charters.md TD → Researcher dispatch'
    });
  }

  // Critic scheduled mode — audits during build
  if (roleById['critic-null'] && roleById['coordinator-null']) {
    connections.push({
      from: 'critic-null', to: 'coordinator-null',
      label: 'scheduled audit cycle', styleKey: 'audit',
      traceTo: 'role_charters.md Critic § Scheduled mode'
    });
  }

  // Historian — observes everything (single rep arrow from Orchestrator for clarity)
  if (roleById['historian-null'] && roleById['orchestrator-null']) {
    connections.push({
      from: 'orchestrator-null', to: 'historian-null',
      label: 'state events from all roles (representative)',
      styleKey: 'observation',
      traceTo: 'role_charters.md Historian § runs on every state-changing event'
    });
  }

  // Re-Verification — dispatched by Orchestrator on architecture amendment
  if (roleById['reVerify-null'] && roleById['orchestrator-null']) {
    connections.push({
      from: 'orchestrator-null', to: 'reVerify-null',
      label: 'post-build re-audit under v{N}', styleKey: 'reaudit',
      traceTo: 'role_charters.md Re-Verification dispatch'
    });
    connections.push({
      from: 'reVerify-null', to: 'orchestrator-null',
      label: 'patch / rebuild recommendation', styleKey: 'reaudit',
      traceTo: 'role_charters.md Re-Verification output'
    });
  }

  return connections;
}

// ---- main layout function ----
export function layout(graph) {
  const { roles, architectureVersion } = graph;

  // Index roles by stable id "{roleKey}-{mode||'null'}".
  const roleById = {};
  for (const r of roles) {
    const id = `${r.roleKey}-${r.mode || 'null'}`;
    r.id = id;
    roleById[id] = r;
  }

  // Group roles by wrapper (multi-mode wrappers).
  const wrappers = {};
  for (const r of roles) {
    if (r.wrapperKey) {
      if (!wrappers[r.wrapperKey]) wrappers[r.wrapperKey] = [];
      wrappers[r.wrapperKey].push(r);
    }
  }

  // Decide spine vs. side classification.
  for (const r of roles) {
    r.classification = classifyRole(r);
  }

  // ---- Phase / spine vertical layout ----
  // Spine elements in vertical order:
  // 1. User Prompt + Orchestrator (top, single combined block)
  // 2. Discovery wrapper
  // 3. TD wrapper
  // 4. Editor
  // 5. Coordinator
  // 6. Overseer + Builder (paired horizontally, single phase)
  // 7. Integrator
  // 8. Critic (final sweep)
  // 9. CV
  //
  // Side roles flank specific phases.

  const spinePhases = [
    {
      name: 'PHASE 0 — KICKOFF',
      members: ['orchestrator-null']
    },
    {
      name: 'PHASE 1 — DISCOVERY',
      wrapperKey: 'discovery',
      wrapperLabel: 'DISCOVERY · 3 MODES'
    },
    {
      name: 'PHASE 2 — TECHNICAL DISCOVERY',
      wrapperKey: 'td',
      wrapperLabel: 'TECHNICAL DISCOVERY · 2 MODES'
    },
    {
      name: 'PHASE 3 — EDITOR REVIEW',
      members: ['editor-null']
    },
    {
      name: 'PHASE 4 — BUILD DISPATCH',
      members: ['coordinator-null']
    },
    {
      name: 'PHASE 5 — BUILD EXECUTION (per section)',
      members: ['overseer-null', 'builder-null'],
      pairHorizontal: true
    },
    {
      name: 'PHASE 6 — INTEGRATION',
      members: ['integrator-null']
    },
    {
      name: 'PHASE 7 — FINAL AUDIT',
      members: ['critic-null']
    },
    {
      name: 'PHASE 8 — VERIFICATION',
      members: ['cv-null']
    }
  ];

  // Compute geometry for each phase.
  let cursorY = C.statCardY + C.statCardHeight + 60;
  const placedRoles = [];
  const phaseBands = [];

  for (const phase of spinePhases) {
    // Phase band
    phaseBands.push({
      x: C.marginX,
      y: cursorY,
      width: C.canvasWidth - 2 * C.marginX,
      label: phase.name
    });
    cursorY += C.phaseBandHeight;

    if (phase.wrapperKey) {
      // Multi-mode wrapper.
      const modes = wrappers[phase.wrapperKey] || [];
      // Layout modes horizontally inside the wrapper.
      const wrapperX = C.spineCenterX - C.spineColumnWidth / 2;
      const wrapperW = C.spineColumnWidth;
      const innerW = wrapperW - 2 * C.wrapperPaddingX;
      const modeW = (innerW - (modes.length - 1) * C.wrapperModeGap) / modes.length;
      // Compute each mode's height; wrapper height is the max + padding.
      const modeHeights = modes.map(estimateRoleBoxHeight);
      const wrapperContentH = Math.max(...modeHeights);
      const wrapperH = C.wrapperPaddingTop + wrapperContentH + C.wrapperPaddingBottom;
      const innerY = cursorY + C.wrapperPaddingTop;
      for (let i = 0; i < modes.length; i++) {
        const role = modes[i];
        const mx = wrapperX + C.wrapperPaddingX + i * (modeW + C.wrapperModeGap);
        role.x = mx;
        role.y = innerY;
        role.width = modeW;
        role.height = wrapperContentH;
        placedRoles.push(role);
      }
      // Stash wrapper rect for the renderer.
      placedRoles.push({
        _isWrapper: true,
        wrapperKey: phase.wrapperKey,
        wrapperLabel: phase.wrapperLabel,
        x: wrapperX,
        y: cursorY,
        width: wrapperW,
        height: wrapperH,
        modes
      });
      cursorY += wrapperH + C.roleBoxGap;
    } else if (phase.pairHorizontal) {
      // Two roles side by side.
      const memberIds = phase.members;
      const members = memberIds.map(id => roleById[id]).filter(Boolean);
      const totalW = C.spineColumnWidth;
      const memW = (totalW - C.wrapperModeGap) / members.length;
      const maxH = Math.max(...members.map(estimateRoleBoxHeight));
      for (let i = 0; i < members.length; i++) {
        const role = members[i];
        role.x = C.spineCenterX - totalW / 2 + i * (memW + C.wrapperModeGap);
        role.y = cursorY;
        role.width = memW;
        role.height = maxH;
        placedRoles.push(role);
      }
      cursorY += maxH + C.roleBoxGap;
    } else {
      // Single-member phase.
      const memberId = phase.members[0];
      const role = roleById[memberId];
      if (!role) continue;
      role.x = C.spineCenterX - C.spineColumnWidth / 2;
      role.y = cursorY;
      role.width = C.spineColumnWidth;
      role.height = estimateRoleBoxHeight(role);
      placedRoles.push(role);
      cursorY += role.height + C.roleBoxGap;
    }
  }

  const spineBottomY = cursorY;

  // ---- Side roles ----
  // Place Arbiter, Researcher wrapper, Critic (scheduled), Historian, Re-Verification.
  // Arbiter — right flank, beside Coordinator / sections (mid-spine).
  // Researcher — right flank, below Arbiter.
  // Critic (scheduled) is the same role-box as Critic (final); we already
  //   placed it in spine. The "scheduled mode" semantics are described in
  //   its atomic steps; we only render one Critic box for v0.1.
  // Historian — bottom-left.
  // Re-Verification — bottom-right.

  const arbiterRole = roleById['arbiter-null'];
  if (arbiterRole) {
    arbiterRole.x = C.rightColumnX;
    arbiterRole.y = phaseBands.find(p => p.label.includes('PHASE 4'))?.y || 1200;
    arbiterRole.width = C.sideColumnWidth;
    arbiterRole.height = estimateRoleBoxHeight(arbiterRole);
    placedRoles.push(arbiterRole);
  }

  // Researcher wrapper (two modes)
  const researcherModes = wrappers['researcher'] || [];
  if (researcherModes.length) {
    const wrapperX = C.rightColumnX;
    const wrapperW = C.sideColumnWidth;
    const innerW = wrapperW - 2 * C.wrapperPaddingX;
    const modeH = Math.max(...researcherModes.map(estimateRoleBoxHeight));
    // Stack vertically inside side wrapper (less horizontal space).
    const wrapperH = C.wrapperPaddingTop + researcherModes.length * modeH + (researcherModes.length - 1) * C.wrapperModeGap + C.wrapperPaddingBottom;
    const wrapperY = (arbiterRole ? arbiterRole.y + arbiterRole.height + C.roleBoxGap : 1500);
    for (let i = 0; i < researcherModes.length; i++) {
      const role = researcherModes[i];
      role.x = wrapperX + C.wrapperPaddingX;
      role.y = wrapperY + C.wrapperPaddingTop + i * (modeH + C.wrapperModeGap);
      role.width = innerW;
      role.height = modeH;
      placedRoles.push(role);
    }
    placedRoles.push({
      _isWrapper: true,
      wrapperKey: 'researcher',
      wrapperLabel: 'RESEARCHER · 2 MODES',
      x: wrapperX,
      y: wrapperY,
      width: wrapperW,
      height: wrapperH,
      modes: researcherModes
    });
  }

  // Critic (scheduled mode reference) — left column, mid-spine
  const criticRole = roleById['critic-null'];
  if (criticRole) {
    // Already in spine. Move to left column instead, in PHASE 4-5 area.
    // For v0.1 we'll relocate Critic to the LEFT column near build dispatch
    // since its scheduled-mode audits happen there. The "final sweep" mode
    // is described in the role's atomic steps; one box covers both.
    const buildPhase = phaseBands.find(p => p.label.includes('PHASE 4'));
    if (buildPhase) {
      criticRole.x = C.leftColumnX;
      criticRole.y = buildPhase.y;
      criticRole.width = C.sideColumnWidth;
      criticRole.height = estimateRoleBoxHeight(criticRole);
    }
  }

  // Historian — bottom-left
  const historianRole = roleById['historian-null'];
  if (historianRole) {
    historianRole.x = C.leftColumnX;
    historianRole.y = spineBottomY + 30;
    historianRole.width = C.sideColumnWidth;
    historianRole.height = estimateRoleBoxHeight(historianRole);
    placedRoles.push(historianRole);
  }

  // Re-Verification — bottom-right
  const reVerifyRole = roleById['reVerify-null'];
  if (reVerifyRole) {
    reVerifyRole.x = C.rightColumnX;
    reVerifyRole.y = spineBottomY + 30;
    reVerifyRole.width = C.sideColumnWidth;
    reVerifyRole.height = estimateRoleBoxHeight(reVerifyRole);
    placedRoles.push(reVerifyRole);
  }

  // ---- Connection graph ----
  const connections = buildConnectionGraph(roleById);

  // Compute canvas height: spine bottom + side roles bottom + footer margin.
  const allBottomYs = placedRoles.filter(r => !r._isWrapper).map(r => r.y + r.height);
  const layoutBottomY = Math.max(spineBottomY, ...allBottomYs);
  const canvasHeight = layoutBottomY + 140;  // footer + legend space

  return {
    architectureVersion,
    canvasWidth: C.canvasWidth,
    canvasHeight,
    titleY: C.titleY,
    subtitleY: C.subtitleY,
    statCards: [
      { x: C.marginX + 80,                              y: C.statCardY, w: C.statCardWidth, h: C.statCardHeight, accentColor: '#3a6abf', value: roles.length, label: 'ROLES' },
      { x: C.marginX + 80 + C.statCardWidth + C.statCardGap,  y: C.statCardY, w: C.statCardWidth, h: C.statCardHeight, accentColor: '#8a3aaf', value: connections.length, label: 'CONNECTIONS' },
      { x: C.marginX + 80 + 2 * (C.statCardWidth + C.statCardGap), y: C.statCardY, w: C.statCardWidth, h: C.statCardHeight, accentColor: '#c43c3c', value: connections.filter(c => c.styleKey === 'escalation').length, label: 'ESCALATION PATHS' }
    ],
    phaseBands,
    roles: placedRoles,
    connections,
    constants: C
  };
}
