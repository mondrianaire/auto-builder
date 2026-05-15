/**
 * narrative.mjs
 *
 * Generates `codex/data/runs/{slug}-narrative.md` from the events extracted
 * by events.mjs. Human-readable timeline reconstruction with role chips.
 *
 * The narrative is a reading guide, not a replacement for the canonical
 * run-report. Every phase block links back to the run-report and verification
 * report.
 *
 * Exports:
 *   generateNarrative({ summary, events, links, first_delivery })
 *     → returns markdown string
 */

const PHASE_ORDER = [
  'discovery', 'td', 'build', 'integration', 'verification',
  'delivery', 'reaudit', 'post_delivery'
];

const PHASE_LABEL = {
  discovery:    'Discovery',
  td:           'Technical Discovery',
  build:        'Build',
  integration:  'Integration',
  verification: 'Verification',
  delivery:     'Delivery',
  reaudit:      'Re-audit',
  post_delivery: 'Post-delivery / user contact'
};

const FDO_LABEL = {
  succeeded:               'Succeeded',
  succeeded_with_concerns: 'Succeeded with concerns',
  failed_user_reprompted:  'Failed — user had to re-prompt',
  failed_unrecoverable:    'Failed — unrecoverable',
  unverified:              'Unverified (no first-delivery signal found)'
};

function rolesLine(e) {
  const exp = (e.explicit_roles || []);
  const inf = (e.inferred_roles || []).filter(r => !exp.includes(r));
  const parts = [];
  if (exp.length) parts.push('**explicit:** ' + exp.join(', '));
  if (inf.length) parts.push('_inferred:_ ' + inf.join(', '));
  if (e.principles_implicated && e.principles_implicated.length) {
    parts.push('_principles:_ ' + e.principles_implicated.join(', '));
  }
  parts.push('_confidence:_ ' + (e.confidence || 'low'));
  return parts.join(' · ');
}

function bulletForEvent(e) {
  const sevSuffix = e.severity != null ? ` _(sev ${e.severity})_` : '';
  const moduleSuffix = e.module ? ` _(${e.module})_` : '';
  const curatedTag = e.curated ? ' *(curated)*' : '';
  return `- **[${e.kind}]**${sevSuffix}${moduleSuffix}${curatedTag} ${e.summary || ''}\n` +
         `  _${rolesLine(e)}_` +
         (e.source_file ? `  ·  [${e.source_file.split('#')[0].split('/').slice(-2).join('/')}](../../${e.source_file.split('#')[0]})` : '') +
         '\n';
}

export function generateNarrative({ summary, events, first_delivery }) {
  const groups = {};
  for (const e of events) {
    const ph = e.phase || 'post_delivery';
    (groups[ph] ||= []).push(e);
  }

  const lines = [];
  lines.push(`# ${summary.slug} — Codex narrative\n`);
  lines.push(`**First-delivery outcome:** ${FDO_LABEL[first_delivery.outcome] || first_delivery.outcome}` +
             ` _(source: ${first_delivery.source})_`);
  lines.push(`**Composite (architectural):** ${summary.rating.composite}`);
  lines.push(`**Verdict (build pipeline):** ${summary.verdict || '—'}`);
  lines.push(`**Date:** ${summary.date || '—'}  ·  **Architecture:** ${summary.architecture_version || '—'}`);
  if (summary.telos) lines.push(`\n> ${summary.telos}\n`);
  lines.push('');

  lines.push(`## Timeline\n`);
  let anyEvent = false;
  for (const ph of PHASE_ORDER) {
    const list = groups[ph];
    if (!list || !list.length) continue;
    anyEvent = true;
    lines.push(`### ${PHASE_LABEL[ph] || ph}  _(${list.length} event${list.length === 1 ? '' : 's'})_\n`);
    for (const e of list) lines.push(bulletForEvent(e));
    lines.push('');
  }
  if (!anyEvent) {
    lines.push('_(No events extracted for this run. Either the substrate predates the audit conventions, or the run was clean. Use curation to add events from memory.)_\n');
  }

  lines.push(`## Source files\n`);
  const L = summary.links || {};
  if (L.run_report)   lines.push(`- [run-report.md](../../${L.run_report})`);
  if (L.verification) lines.push(`- [verification report](../../${L.verification})`);
  if (L.ledger)       lines.push(`- [discovery ledger](../../${L.ledger})`);
  if (L.sections)     lines.push(`- [TD sections](../../${L.sections})`);
  if (L.final_dir)    lines.push(`- [final/](../../${L.final_dir})`);
  if (L.audit_flags)  lines.push(`- [audit flags](../../${L.audit_flags})`);
  lines.push('');

  return lines.join('\n');
}
