// card-renderer.js — DOM/SVG renderer for the profile card.
// XSS hardening: all user-controlled strings are written via textContent
// or setAttribute on whitelisted safe attributes (alt, href, src). URLs
// for href/src are validated to be http(s) before use.

const SVG_NS = 'http://www.w3.org/2000/svg';

const INTENSITY_COLORS = [
  '#161b22', // 0
  '#0e4429', // 1-3
  '#006d32', // 4-6
  '#26a641', // 7-9
  '#39d353'  // 10+
];

function intensityLevel(count) {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

function isSafeHttpUrl(s) {
  if (typeof s !== 'string') return false;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch (_e) {
    return false;
  }
}

function el(tag, opts) {
  const e = document.createElement(tag);
  if (opts && opts.cls) e.className = opts.cls;
  if (opts && opts.text != null) e.textContent = String(opts.text);
  return e;
}

function svgEl(tag, attrs) {
  const e = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      e.setAttribute(k, String(v));
    }
  }
  return e;
}

function renderHeader(payload) {
  const header = el('div', { cls: 'card-header' });

  // Avatar (img is XSS-safe via src attribute with URL validation).
  const avatarWrap = el('div', { cls: 'card-avatar-wrap' });
  const img = document.createElement('img');
  img.className = 'card-avatar';
  if (isSafeHttpUrl(payload.user.avatar_url)) {
    img.setAttribute('src', payload.user.avatar_url);
  }
  img.setAttribute('alt', payload.user.login || '');
  img.setAttribute('width', '96');
  img.setAttribute('height', '96');
  avatarWrap.appendChild(img);
  header.appendChild(avatarWrap);

  // Name + handle + bio block.
  const meta = el('div', { cls: 'card-meta' });
  const nameEl = el('div', { cls: 'card-name', text: payload.user.name || payload.user.login || '' });
  meta.appendChild(nameEl);

  const handleEl = el('div', { cls: 'card-handle' });
  if (payload.user.html_url && isSafeHttpUrl(payload.user.html_url)) {
    const a = document.createElement('a');
    a.setAttribute('href', payload.user.html_url);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
    a.textContent = `@${payload.user.login || ''}`;
    handleEl.appendChild(a);
  } else {
    handleEl.textContent = `@${payload.user.login || ''}`;
  }
  meta.appendChild(handleEl);

  if (payload.user.bio) {
    const bio = el('div', { cls: 'card-bio', text: payload.user.bio });
    meta.appendChild(bio);
  }

  const counts = el('div', { cls: 'card-counts' });
  counts.appendChild(el('span', { cls: 'card-count', text: `${payload.user.followers ?? 0} followers` }));
  counts.appendChild(el('span', { cls: 'card-count', text: `${payload.user.following ?? 0} following` }));
  counts.appendChild(el('span', { cls: 'card-count', text: `${payload.user.public_repos ?? 0} public repos` }));
  meta.appendChild(counts);

  header.appendChild(meta);
  return header;
}

function renderPinnedSection(pinnedRepos) {
  const section = el('section', { cls: 'pinned-section' });
  const label = el('h2', { cls: 'section-label', text: 'Pinned repositories' });
  section.appendChild(label);

  if (!Array.isArray(pinnedRepos) || pinnedRepos.length === 0) {
    const empty = el('div', { cls: 'empty-state', text: 'No pinned repositories' });
    section.appendChild(empty);
    return section;
  }

  const grid = el('div', { cls: 'pinned-grid' });
  const cap = Math.min(pinnedRepos.length, 6);
  for (let i = 0; i < cap; i++) {
    const repo = pinnedRepos[i];
    const card = el('div', { cls: 'pinned-card' });

    const nameRow = el('div', { cls: 'pinned-name-row' });
    if (repo.url && isSafeHttpUrl(repo.url)) {
      const a = document.createElement('a');
      a.setAttribute('href', repo.url);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
      a.className = 'pinned-name';
      a.textContent = repo.name || '';
      nameRow.appendChild(a);
    } else {
      const span = el('span', { cls: 'pinned-name', text: repo.name || '' });
      nameRow.appendChild(span);
    }
    card.appendChild(nameRow);

    if (repo.description) {
      const desc = el('div', { cls: 'pinned-desc', text: repo.description });
      card.appendChild(desc);
    }

    const footer = el('div', { cls: 'pinned-footer' });
    if (repo.primary_language_name) {
      const langWrap = el('span', { cls: 'lang-wrap' });
      const dot = el('span', { cls: 'lang-dot' });
      if (typeof repo.primary_language_color === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(repo.primary_language_color)) {
        dot.style.backgroundColor = repo.primary_language_color;
      } else {
        dot.style.backgroundColor = '#586069';
      }
      langWrap.appendChild(dot);
      const langName = el('span', { cls: 'lang-name', text: repo.primary_language_name });
      langWrap.appendChild(langName);
      footer.appendChild(langWrap);
    }
    const stars = el('span', { cls: 'pinned-stars', text: `★ ${repo.stargazer_count ?? 0}` });
    footer.appendChild(stars);
    card.appendChild(footer);

    grid.appendChild(card);
  }
  section.appendChild(grid);
  return section;
}

function renderStatsRow(payload, derived) {
  const row = el('section', { cls: 'stats-row' });

  const streakBlock = el('div', { cls: 'stat-block' });
  const streakLabel = el('div', { cls: 'stat-label', text: 'Current streak' });
  const streakValue = el('div', { cls: 'stat-value', text: `${derived.streak.streak_days} days` });
  streakBlock.appendChild(streakLabel);
  streakBlock.appendChild(streakValue);
  row.appendChild(streakBlock);

  const langBlock = el('div', { cls: 'stat-block' });
  const langLabel = el('div', { cls: 'stat-label', text: 'Most-used language across public repos' });
  const langValue = el('div', { cls: 'stat-value', text: derived.language.language ? derived.language.language : '—' });
  langBlock.appendChild(langLabel);
  langBlock.appendChild(langValue);
  row.appendChild(langBlock);

  const totalBlock = el('div', { cls: 'stat-block' });
  const totalLabel = el('div', { cls: 'stat-label', text: 'Total contributions (year)' });
  const totalValue = el('div', { cls: 'stat-value', text: String(payload.contribution_calendar_year && payload.contribution_calendar_year.total_contributions != null ? payload.contribution_calendar_year.total_contributions : 0) });
  totalBlock.appendChild(totalLabel);
  totalBlock.appendChild(totalValue);
  row.appendChild(totalBlock);

  return row;
}

function renderHeatmap(ninetyDaySlice) {
  const wrap = el('section', { cls: 'heatmap-section' });
  const caption = el('div', { cls: 'heatmap-caption', text: 'Contribution activity (last 90 days)' });
  wrap.appendChild(caption);

  // 13 weeks x 7 days = 91 cells.
  const WEEKS = 13;
  const DAYS = 7;
  const CELL = 10;
  const GAP = 2;
  const width = WEEKS * (CELL + GAP);
  const height = DAYS * (CELL + GAP);

  const svg = svgEl('svg', {
    class: 'heatmap',
    width: String(width),
    height: String(height),
    viewBox: `0 0 ${width} ${height}`,
    xmlns: SVG_NS
  });

  // Place the 90-day slice such that the last day occupies the
  // appropriate weekday position in the rightmost column. Cells before
  // the slice's first day in the leading column are zero-filled.
  // grid[col][row] indexing: col 0 = leftmost (oldest), col 12 = rightmost (newest).
  const slice = Array.isArray(ninetyDaySlice) ? ninetyDaySlice : [];
  // The slice has 90 entries. We need 91 cells. The last day's weekday
  // determines its row in the rightmost column. Cells "after" the last
  // day in the rightmost column (i.e., later weekdays in current week)
  // and any leading cells before the first day are zero-fill.
  let lastWeekday = 0;
  if (slice.length > 0) {
    const lastDay = slice[slice.length - 1];
    if (typeof lastDay.weekday === 'number') {
      lastWeekday = lastDay.weekday;
    } else if (typeof lastDay.date === 'string') {
      lastWeekday = new Date(`${lastDay.date}T00:00:00Z`).getUTCDay();
    }
  }
  // Total cell positions: 91 (13 weeks x 7 days). Map each slice entry
  // backward from the rightmost-column / last-weekday slot.
  // Position 0 = top-left (week 0, day 0). Position 90 = bottom-right
  // (week 12, day 6). The last slice entry sits at (col=12, row=lastWeekday).
  // That corresponds to linear position 12*7 + lastWeekday = 84 + lastWeekday.
  const lastLinear = 12 * DAYS + lastWeekday;
  // Slice entries fill positions [lastLinear - 89 .. lastLinear] inclusive.
  // Any positions outside that range get 0 contributions.
  const counts = new Array(WEEKS * DAYS).fill(0);
  for (let i = 0; i < slice.length; i++) {
    const linear = lastLinear - (slice.length - 1 - i);
    if (linear >= 0 && linear < counts.length) {
      counts[linear] = slice[i].contribution_count ?? 0;
    }
  }

  for (let col = 0; col < WEEKS; col++) {
    for (let row = 0; row < DAYS; row++) {
      const linear = col * DAYS + row;
      const count = counts[linear];
      const level = intensityLevel(count);
      const x = col * (CELL + GAP);
      const y = row * (CELL + GAP);
      const rect = svgEl('rect', {
        x: String(x),
        y: String(y),
        width: String(CELL),
        height: String(CELL),
        rx: '2',
        ry: '2',
        fill: INTENSITY_COLORS[level]
      });
      svg.appendChild(rect);
    }
  }

  wrap.appendChild(svg);
  return wrap;
}

export function renderCard(container, payload, derived) {
  if (!container) throw new Error('renderCard requires a container element');
  if (!payload || !payload.user) throw new Error('renderCard requires a valid payload');
  const safeDerived = derived || {
    streak: { streak_days: 0, anchor_date: null },
    language: { language: null, bytes: 0, share_pct: 0 },
    ninety_day_slice: []
  };

  // Clear container before rendering so repeat lookups replace prior content.
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const card = el('article', { cls: 'profile-card' });
  card.appendChild(renderHeader(payload));
  card.appendChild(renderStatsRow(payload, safeDerived));
  card.appendChild(renderPinnedSection(payload.pinned_repos));
  card.appendChild(renderHeatmap(safeDerived.ninety_day_slice));
  container.appendChild(card);
}
