/**
 * coordination.mjs
 *
 * Parser for the async coordination convention between Codex and
 * AutoBuilder-Maintenance. Looks for `## Maintenance Status` sections in
 * markdown files under `codex/docs/` and `codex/docs/maintenance-initiated/`,
 * extracts structured state, and computes a per-proposal `pending_ack`
 * flag so Codex can see its own backlog without user mediation.
 *
 * See `codex/docs/coordination-proposal.md` for the full convention.
 *
 * Exports:
 *   parseMaintenanceStatus(text, filePath) → { last_touched, overall_state,
 *                                              items[], maintenance_notes[],
 *                                              codex_acks[], pending_ack }
 *   collectHandoffs({ docsDir }) → Promise<Handoff[]>
 *
 * Tolerance policy (matches the rest of the Codex aggregator):
 *   Missing or malformed fields default to null/empty rather than throwing.
 *   The parser will surface what it can; the dashboard renders gracefully
 *   for any subset of the schema.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Separator tolerance (refinement 5): em-dash, colon, or hyphen.
// The regex captures whichever is present so we don't have to branch.
const CHECKBOX_RE = /^\s*-\s*\[\s*([ x~!])\s*\]\s+([a-z0-9][a-z0-9-]*)\s*(?:[—:-]\s*(.*))?$/i;

const STATUS_MAP = {
  ' ': 'open',
  'x': 'done',
  'X': 'done',
  '~': 'in_progress',
  '!': 'blocked'
};

// ---------------------------------------------------------------------------
// parseMaintenanceStatus
// ---------------------------------------------------------------------------

/**
 * Extract the `## Maintenance Status` section from a markdown blob and
 * parse it into structured form.
 *
 * @param {string} text  full markdown content
 * @param {string} filePath  source path, used for diagnostic warnings
 * @returns {Object|null} parsed status, or null if the section is absent
 */
export function parseMaintenanceStatus(text, filePath) {
  if (!text || typeof text !== 'string') return null;

  // Strip fenced code blocks before searching for the heading — example
  // status blocks inside ```markdown fences should not be parsed as the
  // real status block. We replace fenced content with empty lines so
  // line indices roughly survive (helpful for diagnostics).
  const stripped = text.replace(/```[\s\S]*?```/g, (match) => {
    return match.split('\n').map(() => '').join('\n');
  });

  // Locate the section. Heading match is permissive (allow trailing spaces).
  // We deliberately match the LAST occurrence in the stripped text to handle
  // the case where multiple status blocks somehow appear (later ones supersede).
  const allMatches = [...stripped.matchAll(/^##\s+Maintenance\s+Status\s*$/gm)];
  if (allMatches.length === 0) return null;
  const sectionMatch = allMatches[allMatches.length - 1];

  // Everything from the section heading until the next level-2 heading or
  // end of file is the section body. Use the stripped text so example blocks
  // inside fenced regions don't bleed into the parsed section.
  const startIdx = sectionMatch.index;
  const afterHeading = stripped.slice(startIdx + sectionMatch[0].length);
  const nextH2 = afterHeading.search(/\n##\s+\S/);
  const body = nextH2 >= 0 ? afterHeading.slice(0, nextH2) : afterHeading;

  const out = {
    source_file: filePath || null,
    last_touched: null,
    overall_state: null,
    items: [],
    maintenance_notes: [],
    codex_acks: [],
    pending_ack: false,
    parse_warnings: []
  };

  // Last touched — first `**Last touched:**` line.
  const ltMatch = body.match(/\*\*Last touched:\*\*\s*([^\n]+)/i);
  if (ltMatch) {
    const raw = ltMatch[1].trim();
    const isoMatch = raw.match(/(\d{4}-\d{2}-\d{2})/);
    out.last_touched = isoMatch ? isoMatch[1] : (raw.startsWith('_') ? null : raw);
  }

  // Overall state.
  const osMatch = body.match(/\*\*Overall state:\*\*\s*([^\n]+)/i);
  if (osMatch) {
    const token = osMatch[1].trim().split(/\s+/)[0].toLowerCase().replace(/[.,;]/g, '');
    if (['not-started', 'in-progress', 'done', 'blocked'].includes(token)) {
      out.overall_state = token;
    } else if (token.startsWith('_')) {
      out.overall_state = null; // placeholder
    } else {
      out.overall_state = token;
      out.parse_warnings.push(`unrecognized overall_state value: ${token}`);
    }
  }

  // Checkbox items.
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(CHECKBOX_RE);
    if (!m) continue;
    const status = STATUS_MAP[m[1]] || 'open';
    const slug = m[2];
    const trailer = (m[3] || '').trim();
    out.items.push({ slug, status, text: trailer });
  }

  // Maintenance notes + Codex acks.
  out.maintenance_notes = extractDatedParagraphs(body, 'Maintenance notes');
  out.codex_acks = extractDatedParagraphs(body, 'Codex acks');

  // pending_ack heuristic (refinement 2): true when there's a newer dated
  // Maintenance note than the most-recent dated Codex ack — i.e., Codex owes
  // a response. Undated paragraphs are not considered for the comparison.
  const latestNote = latestDate(out.maintenance_notes);
  const latestAck  = latestDate(out.codex_acks);
  if (latestNote && (!latestAck || latestNote > latestAck)) {
    out.pending_ack = true;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Paragraph extractor (handles Maintenance notes and Codex acks)
// ---------------------------------------------------------------------------

function extractDatedParagraphs(body, headingText) {
  // Find the `### {heading}` line, then read until the next ### heading,
  // ## heading, or end of body.
  const headingRe = new RegExp(`^###\\s+${headingText}\\s*$`, 'mi');
  const headingMatch = body.match(headingRe);
  if (!headingMatch) return [];

  const startIdx = headingMatch.index + headingMatch[0].length;
  const afterHeading = body.slice(startIdx);
  const nextHeading = afterHeading.search(/\n###\s+\S/);
  const sectionText = nextHeading >= 0 ? afterHeading.slice(0, nextHeading) : afterHeading;

  // Split by blank lines. Each non-empty block is a paragraph.
  const blocks = sectionText.split(/\n\s*\n/);
  const out = [];
  for (const blk of blocks) {
    const trimmed = blk.trim();
    if (!trimmed) continue;
    // Skip the "_(awaiting...)_" placeholder paragraphs.
    if (/^_\(.*\)_$/.test(trimmed)) continue;
    // Date prefix: `YYYY-MM-DD: ...`. Captures both date and body.
    const dateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2}):\s*([\s\S]*)$/);
    if (dateMatch) {
      out.push({ date: dateMatch[1], body: dateMatch[2].trim() });
    } else {
      out.push({ date: null, body: trimmed });
    }
  }
  return out;
}

function latestDate(paragraphs) {
  let latest = null;
  for (const p of paragraphs) {
    if (p.date && (!latest || p.date > latest)) latest = p.date;
  }
  return latest;
}

// ---------------------------------------------------------------------------
// Collector — walks codex/docs/ and codex/docs/maintenance-initiated/
// ---------------------------------------------------------------------------

export async function collectHandoffs({ docsDir }) {
  const handoffs = [];
  await collectFromDir(docsDir, handoffs, 'codex-initiated');
  await collectFromDir(path.join(docsDir, 'maintenance-initiated'), handoffs, 'maintenance-initiated');
  // Sort: pending_ack first, then by last_touched desc.
  handoffs.sort((a, b) => {
    if (a.pending_ack !== b.pending_ack) return a.pending_ack ? -1 : 1;
    const at = a.last_touched || '';
    const bt = b.last_touched || '';
    return bt.localeCompare(at);
  });
  return handoffs;
}

async function collectFromDir(dir, out, origin) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch { return; }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.md')) continue;
    const filePath = path.join(dir, entry.name);
    const text = await fs.readFile(filePath, 'utf8').catch(() => null);
    if (!text) continue;
    const status = parseMaintenanceStatus(text, filePath);
    if (!status) continue;
    // Extract title from the first H1 line for display.
    const titleMatch = text.match(/^#\s+([^\n]+)/m);
    const title = titleMatch ? titleMatch[1].trim() : entry.name.replace(/\.md$/, '');
    // Per-proposal summary numbers for the dashboard card.
    const itemsTotal = status.items.length;
    const itemsDone = status.items.filter(i => i.status === 'done').length;
    const itemsInProgress = status.items.filter(i => i.status === 'in_progress').length;
    const itemsBlocked = status.items.filter(i => i.status === 'blocked').length;
    // Pull the slug from the filename for stable identity in the bundle.
    const slug = entry.name.replace(/\.md$/, '');
    // Short excerpts (≤280 chars each) of the most recent note and ack.
    const latestNote = status.maintenance_notes[status.maintenance_notes.length - 1] || null;
    const latestAck  = status.codex_acks[status.codex_acks.length - 1] || null;
    const exc = (p, n) => p && p.body ? (p.body.length > n ? p.body.slice(0, n - 1) + '…' : p.body) : null;
    out.push({
      slug,
      title,
      origin,
      source_file: 'codex/docs/' + (origin === 'maintenance-initiated' ? 'maintenance-initiated/' : '') + entry.name,
      last_touched: status.last_touched,
      overall_state: status.overall_state,
      items_total: itemsTotal,
      items_done: itemsDone,
      items_in_progress: itemsInProgress,
      items_blocked: itemsBlocked,
      pending_ack: status.pending_ack,
      maintenance_notes_count: status.maintenance_notes.length,
      codex_acks_count: status.codex_acks.length,
      maintenance_notes_latest: latestNote ? { date: latestNote.date, excerpt: exc(latestNote, 280) } : null,
      codex_acks_latest: latestAck ? { date: latestAck.date, excerpt: exc(latestAck, 280) } : null,
      parse_warnings: status.parse_warnings
    });
  }
}
