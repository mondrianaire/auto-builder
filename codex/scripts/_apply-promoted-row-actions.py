# _apply-promoted-row-actions.py
# Implements promoted-row-action-buttons per
# codex/docs/maintenance-initiated/promoted-row-action-buttons.md
# Invoked by apply-promoted-row-actions.bat.

import sys, os

p = 'codex/index.html'
with open(p, 'r', encoding='utf-8') as f:
    s = f.read()

original_size = len(s)
original_lines = s.count('\n')

# Substitution 1: table header — add Actions column + move Phase right of Slug
old_thead = '''        <tr>
          <th data-sort-key="slug">Slug</th>
          <th data-sort-key="date">Date</th>
          <th data-sort-key="architecture_version">Arch</th>
          <th data-sort-key="verdict">Verdict</th>
          <th data-sort-key="first_delivery_outcome">First delivery</th>
          <th>Phase</th>
          <th data-sort-key="composite">Composite</th>'''

new_thead = '''        <tr>
          <th class="row-actions-header"></th>
          <th data-sort-key="slug">Slug</th>
          <th>Phase</th>
          <th data-sort-key="date">Date</th>
          <th data-sort-key="architecture_version">Arch</th>
          <th data-sort-key="verdict">Verdict</th>
          <th data-sort-key="first_delivery_outcome">First delivery</th>
          <th data-sort-key="composite">Composite</th>'''

# Substitution 2: row generation — add actions cell + reorder phase cell
old_row = '''      tr.appendChild(el('td', { class: 'slug', title: r.prompt || '' }, r.slug));
      tr.appendChild(el('td', { class: 'date' }, dash(r.date)));
      tr.appendChild(el('td', { class: 'arch' }, dash(r.architecture_version)));
      tr.appendChild(el('td', null, verdictPill(r.verdict)));
      tr.appendChild(el('td', null, firstDeliveryPill(r.first_delivery_outcome, r.first_delivery_outcome_source)));
      // v0.13: phase chip on roster (was detail-only in v0.12)
      tr.appendChild(el('td', null, phasePill(r)));
      tr.appendChild(el('td', null, compositePill(r.rating.composite)));'''

new_row = '''      // Promoted-row-action-buttons: three icon buttons (GH / Live / Launch) for promoted; empty placeholder otherwise (column alignment)
      tr.appendChild(renderRowActions(r));
      tr.appendChild(el('td', { class: 'slug', title: r.prompt || '' }, r.slug));
      // Phase chip hoisted to immediate right of slug for prominence (was at column 6 prior)
      tr.appendChild(el('td', null, phasePill(r)));
      tr.appendChild(el('td', { class: 'date' }, dash(r.date)));
      tr.appendChild(el('td', { class: 'arch' }, dash(r.architecture_version)));
      tr.appendChild(el('td', null, verdictPill(r.verdict)));
      tr.appendChild(el('td', null, firstDeliveryPill(r.first_delivery_outcome, r.first_delivery_outcome_source)));
      tr.appendChild(el('td', null, compositePill(r.rating.composite)));'''

# Substitution 3: insert renderRowActions helper before renderRoster
old_marker = '  function renderRoster() {'
new_helper_and_marker = '''  // ---- Promoted-row action buttons (per maintenance-initiated/promoted-row-action-buttons.md)
  function renderRowActions(sum) {
    const cell = el('td', { class: 'row-actions' });
    if (!sum.promoted_to) return cell;  // empty placeholder for column alignment

    // UI/live target with the same fallback as the View column
    const uiHref = sum.live_url || (sum.deliverable_kind && sum.deliverable_kind !== 'web_app'
      ? 'showcase/' + sum.slug + '.html' : null);

    // Button 1: View GitHub repo
    const gh = el('a', { class: 'row-action gh', href: sum.promoted_to, target: '_blank',
      title: 'View source on GitHub: ' + sum.promoted_to });
    gh.textContent = 'GH';
    cell.appendChild(gh);

    // Button 2: View UI deliverable
    if (uiHref) {
      const live = el('a', { class: 'row-action live', href: uiHref, target: '_blank',
        title: 'View live: ' + uiHref });
      live.textContent = '▶';
      cell.appendChild(live);
    }

    // Button 3: Launch Claude Code via clipboard copy
    const cmd = 'cd /d "C:\\\\Users\\\\mondr\\\\Documents\\\\Claude\\\\Projects\\\\Auto Builder" && call launch-promoted-product.bat ' + sum.slug;
    const launch = el('button', { class: 'row-action launch', type: 'button',
      title: 'Copy launch command: ' + cmd });
    launch.textContent = '▷_';
    launch.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(cmd);
        const orig = launch.textContent;
        launch.textContent = '✓';
        launch.classList.add('copied');
        setTimeout(() => { launch.textContent = orig; launch.classList.remove('copied'); }, 1400);
      } catch (err) {
        launch.textContent = '✗';
        setTimeout(() => { launch.textContent = '▷_'; }, 1400);
      }
    });
    cell.appendChild(launch);

    // Stop click propagation on the whole cell so button clicks don't also select the row
    cell.addEventListener('click', e => e.stopPropagation());
    return cell;
  }

  function renderRoster() {'''

# Substitution 4: add CSS rules for new cell + button styling, inserted before </style>
old_style_close = '</style>'
new_css = '''  /* ---- promoted-row-action-buttons (per maintenance-initiated/promoted-row-action-buttons.md) */
  table.runs td.row-actions { width: 88px; padding: 4px 6px; white-space: nowrap; }
  table.runs th.row-actions-header { width: 88px; }
  .row-action {
    display: inline-block;
    min-width: 22px;
    padding: 2px 6px;
    margin-right: 3px;
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg-elev);
    color: var(--text-dim);
    text-decoration: none;
    cursor: pointer;
    vertical-align: middle;
    font-family: inherit;
    line-height: 1.4;
  }
  .row-action:hover { background: var(--bg-elev-2); color: var(--text); border-color: var(--accent); }
  .row-action.gh { color: var(--text-dim); }
  .row-action.live { color: var(--ok); }
  .row-action.launch { color: var(--accent); font-family: 'Consolas', monospace; }
  .row-action.launch.copied { background: var(--accent); color: var(--bg); border-color: var(--accent); }
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

sub(old_thead, new_thead, 'thead-reorder')
sub(old_row, new_row, 'row-reorder')
sub(old_marker, new_helper_and_marker, 'insert-helper')
sub(old_style_close, new_css, 'insert-css')

if fails:
    print(f"\nFAILS: {fails}")
    sys.exit(1)
else:
    with open(p, 'w', encoding='utf-8', newline='') as f:
        f.write(s)
    print(f"\nWritten. Size {original_size} -> {len(s)} ({len(s)-original_size:+d}); Lines {original_lines} -> {s.count(chr(10))} ({s.count(chr(10))-original_lines:+d})")
