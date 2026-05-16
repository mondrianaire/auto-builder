# _apply-decision-flowchart-embed.py
# Adds decision-flowchart iframe embed to renderDetail per
# codex/docs/maintenance-initiated/decision-flowchart-dashboard-embed.md.
# Invoked by apply-decision-flowchart-embed.bat.

import sys

p = 'codex/index.html'
with open(p, 'r', encoding='utf-8') as f:
    s = f.read()

original_size = len(s)
original_lines = s.count('\n')

# Substitution 1: insert renderDecisionFlowchart helper before renderRowActions
old_marker = '  // ---- Promoted-row action buttons (per maintenance-initiated/promoted-row-action-buttons.md)'
new_helper_and_marker = '''  // ---- Decision flowchart embed (per maintenance-initiated/decision-flowchart-dashboard-embed.md)
  function renderDecisionFlowchart(detail) {
    const path = detail.summary && detail.summary.decision_flowchart_path;
    const wrap = el('div', { class: 'decision-flowchart' });
    wrap.appendChild(el('h3', { text: 'Decision flowchart' }));
    if (!path) {
      wrap.appendChild(el('div', { class: 'flowchart-stub',
        text: 'Decision flowchart will appear here once the wrap-up routine generates it for this build.' }));
      return wrap;
    }
    const iframe = el('iframe', {
      src: '../' + path,
      width: '100%',
      height: '600',
      style: 'border:1px solid var(--border);border-radius:4px;background:#fafafa;display:block;',
      title: detail.slug + ' decision flowchart',
      loading: 'lazy'
    });
    wrap.appendChild(iframe);
    const linkRow = el('div', { class: 'flowchart-link' },
      el('a', { href: '../' + path, target: '_blank' }, 'Open full-screen ↗')
    );
    wrap.appendChild(linkRow);
    return wrap;
  }

  // ---- Promoted-row action buttons (per maintenance-initiated/promoted-row-action-buttons.md)'''

# Substitution 2: invoke renderDecisionFlowchart right after build-topology widget
old_topo_call = '''    // ---- v0.15: per-build dynamic SVG topology (live-build-visualization-proposal)
    if (detail.build_shape && typeof renderBuildTopology === 'function') {
      const topo = renderBuildTopology(detail.build_shape, el);
      if (topo) host.appendChild(topo);
    }'''
new_topo_call_plus_fc = '''    // ---- v0.15: per-build dynamic SVG topology (live-build-visualization-proposal)
    if (detail.build_shape && typeof renderBuildTopology === 'function') {
      const topo = renderBuildTopology(detail.build_shape, el);
      if (topo) host.appendChild(topo);
    }

    // ---- decision-flowchart embed (per maintenance-initiated/decision-flowchart-dashboard-embed.md)
    const fc = renderDecisionFlowchart(detail);
    if (fc) host.appendChild(fc);'''

# Substitution 3: add CSS for the embed section, inserted before </style>
old_style_close = '</style>'
new_css = '''  /* ---- decision-flowchart embed (per maintenance-initiated/decision-flowchart-dashboard-embed.md) */
  .decision-flowchart {
    margin: 16px 20px 0 20px;
    padding: 14px 16px 10px 16px;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 5px;
  }
  .decision-flowchart h3 {
    margin: 0 0 10px 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .decision-flowchart .flowchart-link {
    margin-top: 6px;
    text-align: right;
    font-size: 11px;
  }
  .decision-flowchart .flowchart-link a {
    color: var(--accent);
    text-decoration: none;
  }
  .decision-flowchart .flowchart-link a:hover { text-decoration: underline; }
  .decision-flowchart .flowchart-stub {
    padding: 18px;
    color: var(--text-faint);
    font-size: 12px;
    font-style: italic;
    border: 1px dashed var(--border);
    border-radius: 4px;
    background: var(--bg);
  }
</style>'''

fails = []
def sub(old, new, label):
    global s
    if old in s:
        s = s.replace(old, new, 1)
        print(f"OK [{label}]: {len(new) - len(old):+d} chars")
    else:
        fails.append(label)
        print(f"FAIL [{label}]: source string not found")

sub(old_marker, new_helper_and_marker, 'insert-helper')
sub(old_topo_call, new_topo_call_plus_fc, 'insert-render-call')
sub(old_style_close, new_css, 'insert-css')

if fails:
    print(f"\nFAILS: {fails}")
    sys.exit(1)
else:
    with open(p, 'w', encoding='utf-8', newline='') as f:
        f.write(s)
    print(f"\nWritten. Size {original_size} -> {len(s)} ({len(s)-original_size:+d}); Lines {original_lines} -> {s.count(chr(10))} ({s.count(chr(10))-original_lines:+d})")
