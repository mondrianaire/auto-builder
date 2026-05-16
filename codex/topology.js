/* codex/topology.js — v0.15
 * Per-build dynamic SVG topology renderer for the dashboard detail panel.
 * Spec: codex/docs/live-build-visualization-proposal.md
 *
 * Exposes window.renderBuildTopology(detail.build_shape, el) returning a
 * DOM node (or null when no build_shape is present). The dashboard's
 * renderDetail() function appends it between the ratification section
 * and the body's left/right panes.
 *
 * Pure-function module; uses only window-level helpers (el(), document).
 * Loaded via <script src="topology.js"></script> in codex/index.html.
 *
 * Per Maintenance ack open Q#2: web_app + plugin specific treatments;
 * generic fallback for everything else (never throws on unknown kinds).
 */
(function () {
  'use strict';

  const TOPO_BANDS = [
    { key: 'kickoff',      label: 'Kickoff' },
    { key: 'planning',     label: 'Planning' },
    { key: 'build',        label: 'Build' },
    { key: 'verification', label: 'Verification' },
    { key: 'delivery',     label: 'Delivery' },
    { key: 'ratification', label: 'Ratification' },
    { key: 'promoted',     label: 'Promoted' }
  ];

  function svgEl(tag, attrs) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) for (const k in attrs) {
      if (attrs[k] == null) continue;
      if (k === 'class') node.setAttribute('class', attrs[k]);
      else if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    }
    return node;
  }
  function svgText(x, y, text, cls) {
    const t = svgEl('text', { x: x, y: y, class: cls });
    t.textContent = text == null ? '' : String(text);
    return t;
  }
  function svgRrect(x, y, w, h, r, cls) {
    return svgEl('rect', { x: x, y: y, width: w, height: h, rx: r, ry: r, class: cls });
  }

  function classifyRoleState(roleKind, phaseState, bs) {
    if (phaseState === 'pending') return 'pending';
    if (roleKind === 'cv' && bs.cv_verdict === 'fail') return 'failed';
    if (roleKind === 'editor' && bs.editor_iterations === 0) return 'pending';
    if (roleKind === 'researcher' && bs.inflection_points.every(function (ip) { return !ip.has_research; })) {
      return phaseState === 'done' ? 'done' : 'pending';
    }
    if (roleKind === 'critic' && (bs.critic_high + bs.critic_medium + bs.critic_low) === 0) {
      return phaseState === 'done' ? 'done' : 'pending';
    }
    return phaseState;
  }

  function renderRoleNode(cx, cy, label, sublabel, count, state, w, h) {
    const g = svgEl('g', { transform: 'translate(' + (cx - w/2) + ', ' + (cy - h/2) + ')' });
    g.appendChild(svgRrect(0, 0, w, h, 4, 'topo-role-bg ' + state));
    g.appendChild(svgText(w/2, h/2 - 1, label, 'topo-role-label'));
    if (sublabel) g.appendChild(svgText(w/2, h/2 + 11, sublabel, 'topo-role-sublabel'));
    else if (count != null) g.appendChild(svgText(w/2, h/2 + 11, '×' + count, 'topo-role-sublabel'));
    return g;
  }

  function renderDeliverableMaterialization(cx, cy, w, h, bs) {
    const g = svgEl('g');
    const x = cx - w/2;
    const y = cy - h/2;
    g.appendChild(svgRrect(x, y, w, h, 4, 'topo-deliv-frame'));
    g.appendChild(svgText(cx, y + 16, bs.deliverable_label || bs.slug, 'topo-deliv-label'));
    g.appendChild(svgText(cx, y + 28, bs.deliverable_kind, 'topo-deliv-kind'));
    const innerTop = y + 36;
    const innerBottom = y + h - 8;
    const innerHeight = innerBottom - innerTop;

    if (bs.deliverable_kind === 'web_app') {
      const sectionCount = Math.max(bs.sections.length, 1);
      const bayH = Math.min(14, (innerHeight - 4 * (sectionCount + 1)) / sectionCount);
      const buildDone = bs.phase_band_states.build === 'done';
      for (let i = 0; i < sectionCount; i++) {
        const by = innerTop + i * (bayH + 4);
        const bx = x + 12;
        const bw = w - 24;
        const filled = buildDone;
        const bayCls = 'topo-deliv-bay' + (filled ? ' filled' : '');
        g.appendChild(svgRrect(bx, by, bw, bayH, 2, bayCls));
        const sec = bs.sections[i];
        if (sec) g.appendChild(svgText(cx, by + bayH/2 + 3, sec.name || sec.id, 'topo-deliv-bay-label'));
      }
    } else if (bs.deliverable_kind === 'plugin') {
      const fields = ['manifest_version', 'name', 'description', 'handlers', 'capabilities', 'icon'];
      const filled = bs.phase_band_states.build !== 'pending';
      const lineH = Math.min(12, (innerHeight - 2 * fields.length) / fields.length);
      for (let i = 0; i < fields.length; i++) {
        const fy = innerTop + i * (lineH + 2);
        g.appendChild(svgRrect(x + 12, fy, w - 24, lineH, 1, 'topo-deliv-bay' + (filled ? ' filled' : '')));
        g.appendChild(svgText(cx, fy + lineH/2 + 3, fields[i], 'topo-deliv-bay-label'));
      }
    } else {
      const milestones = ['plan', 'build', 'verify', 'deliver'];
      const states = [bs.phase_band_states.planning, bs.phase_band_states.build,
                       bs.phase_band_states.verification, bs.phase_band_states.delivery];
      const colW = (w - 24) / milestones.length;
      for (let i = 0; i < milestones.length; i++) {
        const mx = x + 12 + i * colW;
        const filled = states[i] === 'done' || states[i] === 'active';
        g.appendChild(svgRrect(mx + 2, innerTop, colW - 4, innerHeight - 4, 2,
                                'topo-deliv-bay' + (filled ? ' filled' : '')));
        g.appendChild(svgText(mx + colW/2, innerTop + innerHeight/2 + 3, milestones[i], 'topo-deliv-bay-label'));
      }
    }
    return g;
  }

  // Public entry point. `el` is the dashboard's DOM-builder helper
  // (defined in index.html); we accept it as an argument so this module
  // doesn't reach into the global namespace ambiguously.
  function renderBuildTopology(bs, el) {
    if (!bs) return null;
    const wrap = el('div', { class: 'build-topo' });
    wrap.appendChild(el('h3', { text: 'Build topology · this run' }));
    wrap.appendChild(el('div', { class: 'topo-sub',
      text: bs.totals.inflection_points + ' IPs · ' + bs.totals.sections + ' sections · ' +
            bs.totals.waves + ' wave(s) · ' + bs.totals.dispatches + ' dispatch entries · lifecycle: ' +
            bs.lifecycle_phase.replace(/_/g, ' ')
    }));

    const W = 960, BAND_H = 64;
    const H = BAND_H * TOPO_BANDS.length + 12;
    const PAD_L = 100, PAD_R = 16;
    const usableW = W - PAD_L - PAD_R;
    const DELIV_W = 200;
    const DELIV_X = PAD_L + (usableW - DELIV_W) / 2;
    const DELIV_TOP = BAND_H * 1 + 8;
    const DELIV_BOT = BAND_H * 5 - 8;
    const DELIV_H = DELIV_BOT - DELIV_TOP;
    const svg = svgEl('svg', {
      class: 'topo-svg',
      viewBox: '0 0 ' + W + ' ' + H,
      preserveAspectRatio: 'xMidYMid meet'
    });

    TOPO_BANDS.forEach(function (band, i) {
      const y = i * BAND_H + 6;
      const state = bs.phase_band_states[band.key];
      svg.appendChild(svgRrect(PAD_L, y, usableW, BAND_H - 4, 3,
        'topo-band-' + band.key + ' topo-band-' + state));
      const labelCls = 'topo-band-label ' + (state === 'active' ? 'active'
                                              : state === 'done' ? 'done' : '');
      const lt = svgText(PAD_L - 10, y + BAND_H/2 + 3, band.label, labelCls);
      lt.setAttribute('text-anchor', 'end');
      svg.appendChild(lt);
    });

    svg.appendChild(renderDeliverableMaterialization(
      DELIV_X + DELIV_W/2, DELIV_TOP + DELIV_H/2, DELIV_W, DELIV_H, bs));

    const leftCenter = PAD_L + (DELIV_X - PAD_L) / 2;
    const rightCenter = DELIV_X + DELIV_W + (W - PAD_R - (DELIV_X + DELIV_W)) / 2;

    function placeAt(bandIdx, side, slotIdx, slotCount, label, sublabel, count, roleKind) {
      const y = bandIdx * BAND_H + 6 + (BAND_H - 4) / 2;
      const baseX = side === 'left' ? leftCenter : rightCenter;
      const slotW = side === 'left' ? (DELIV_X - PAD_L) : (W - PAD_R - (DELIV_X + DELIV_W));
      const usable = slotW - 20;
      let x = baseX;
      if (slotCount > 1) {
        const stepX = Math.min(usable / (slotCount + 0.5), 90);
        const totalSpan = stepX * (slotCount - 1);
        x = baseX - totalSpan/2 + slotIdx * stepX;
      }
      const state = classifyRoleState(roleKind, bs.phase_band_states[TOPO_BANDS[bandIdx].key], bs);
      svg.appendChild(renderRoleNode(x, y, label, sublabel, count, state, 86, 32));
    }

    // Kickoff: Orchestrator
    (function () {
      const y = 0 * BAND_H + 6 + (BAND_H - 4) / 2;
      const state = bs.phase_band_states.kickoff;
      svg.appendChild(renderRoleNode(DELIV_X + DELIV_W/2, y, 'Orchestrator', null, null, state, 110, 32));
    })();

    // Planning: Discovery + TD + Researcher slots
    placeAt(1, 'left',  0, 1, 'Discovery',
      bs.inflection_points.length ? bs.inflection_points.length + ' IPs' : null, null, 'discovery');
    placeAt(1, 'right', 0, 1, 'Technical Discovery',
      bs.sections.length ? bs.sections.length + ' sections' : null, null, 'td');
    const ipShown = Math.min(bs.inflection_points.length, 4);
    if (ipShown > 0) {
      const overflow = bs.inflection_points.length - ipShown;
      for (let i = 0; i < ipShown; i++) {
        const yResearcher = 1 * BAND_H + 6 + 12;
        const ipNode = bs.inflection_points[i];
        const startX = PAD_L + 20;
        const x = startX + i * 70;
        const state = classifyRoleState('researcher', bs.phase_band_states.planning, bs);
        svg.appendChild(renderRoleNode(x, yResearcher, 'R' + (i+1), ipNode.id || null, null, state, 44, 22));
      }
      if (overflow > 0) {
        const ymark = 1 * BAND_H + 6 + 12;
        const t = svgText(PAD_L + 20 + ipShown * 70, ymark + 3, '+' + overflow + ' more', 'topo-role-sublabel');
        t.setAttribute('text-anchor', 'start');
        svg.appendChild(t);
      }
    }

    // Build: Coordinator + Builder slots flanking
    (function () {
      const y = 2 * BAND_H + 6 + (BAND_H - 4) / 2;
      const state = bs.phase_band_states.build;
      svg.appendChild(renderRoleNode(DELIV_X + DELIV_W/2, y - 10, 'Coordinator',
        bs.totals.waves ? bs.totals.waves + ' wave' + (bs.totals.waves === 1 ? '' : 's') : null,
        null, state, 110, 26));
    })();
    const builderCount = bs.sections.length;
    const buildersLeft = Math.ceil(builderCount / 2);
    const buildersRight = builderCount - buildersLeft;
    const builderState = classifyRoleState('builder', bs.phase_band_states.build, bs);
    for (let i = 0; i < buildersLeft; i++) {
      const yb = 2 * BAND_H + 6 + (BAND_H - 4) / 2 + 12;
      const startX = PAD_L + 10;
      const x = startX + i * 56;
      const sec = bs.sections[i];
      svg.appendChild(renderRoleNode(x, yb, 'B', sec ? (sec.id || '').slice(0,6) : null, null, builderState, 44, 22));
    }
    for (let i = 0; i < buildersRight; i++) {
      const yb = 2 * BAND_H + 6 + (BAND_H - 4) / 2 + 12;
      const startX = DELIV_X + DELIV_W + 10;
      const x = startX + i * 56;
      const sec = bs.sections[buildersLeft + i];
      svg.appendChild(renderRoleNode(x, yb, 'B', sec ? (sec.id || '').slice(0,6) : null, null, builderState, 44, 22));
    }

    // Verification: Editor + Critic on left, CV on right
    placeAt(3, 'left',  0, 2, 'Editor',
      bs.editor_iterations ? bs.editor_iterations + ' iter' : null, null, 'editor');
    placeAt(3, 'left',  1, 2, 'Critic',
      (bs.critic_high + bs.critic_medium + bs.critic_low) > 0
        ? 'H' + bs.critic_high + '/M' + bs.critic_medium + '/L' + bs.critic_low : null,
      null, 'critic');
    placeAt(3, 'right', 0, 1, 'Convergence Verifier', bs.cv_verdict || null, null, 'cv');

    // Delivery: Integrator
    (function () {
      const y = 4 * BAND_H + 6 + (BAND_H - 4) / 2;
      const state = bs.phase_band_states.delivery;
      svg.appendChild(renderRoleNode(leftCenter, y, 'Integrator', bs.deliverable_kind, null, state, 90, 28));
    })();

    // Ratification: ratify-build.bat marker
    (function () {
      const y = 5 * BAND_H + 6 + (BAND_H - 4) / 2;
      const state = bs.ratified ? 'done'
                  : bs.phase_band_states.ratification === 'active' ? 'active'
                  : 'pending';
      svg.appendChild(renderRoleNode(DELIV_X + DELIV_W/2, y, 'ratify-build.bat',
        bs.ratified ? 'ratified ✓' : 'awaiting user', null, state, 130, 28));
    })();

    // Promoted: star + link
    (function () {
      const y = 6 * BAND_H + 6 + (BAND_H - 4) / 2;
      if (bs.promoted) {
        const starX = DELIV_X + DELIV_W/2 - 50;
        svg.appendChild(svgText(starX, y + 5, '★', 'topo-promoted-star'));
        const linkLabel = bs.promoted_to ? bs.promoted_to.replace(/^https?:\/\//, '') : 'promoted';
        const t = svgText(DELIV_X + DELIV_W/2 + 8, y + 5, linkLabel, 'topo-promoted-link');
        if (bs.promoted_to) {
          const a = svgEl('a', { href: bs.promoted_to, target: '_blank' });
          a.appendChild(t);
          svg.appendChild(a);
        } else {
          svg.appendChild(t);
        }
      } else {
        const t = svgText(DELIV_X + DELIV_W/2, y + 5, '(not yet promoted)', 'topo-role-sublabel');
        svg.appendChild(t);
      }
    })();

    wrap.appendChild(svg);

    const meta = el('div', { class: 'topo-meta' });
    meta.appendChild(el('span', null, el('b', { text: 'Inflection points: ' }), String(bs.inflection_points.length)));
    meta.appendChild(el('span', null, el('b', { text: 'Sections: ' }), String(bs.sections.length)));
    meta.appendChild(el('span', null, el('b', { text: 'Contracts: ' }), String(bs.contracts.length)));
    meta.appendChild(el('span', null, el('b', { text: 'Waves: ' }), String(bs.totals.waves)));
    meta.appendChild(el('span', null, el('b', { text: 'Builders dispatched: ' }), String(bs.totals.builders || bs.builder_dispatch_count)));
    meta.appendChild(el('span', null, el('b', { text: 'CV: ' }), bs.cv_verdict || '—'));
    meta.appendChild(el('span', null, el('b', { text: 'Lifecycle: ' }), bs.lifecycle_phase.replace(/_/g, ' ')));
    wrap.appendChild(meta);

    return wrap;
  }

  // Expose on window for the dashboard
  window.renderBuildTopology = renderBuildTopology;
})();
