/**
 * readGitLog.mjs
 *
 * Git-log adapter for the Codex revisions[] layer. Reads `delivery/{slug}*`
 * tags and their contributing commits from the parent repo and produces an
 * array of revision objects matching Codex's existing schema (events.mjs
 * extractRevisions output shape).
 *
 * Spec: see `codex/docs/maintenance-initiated/git-integration-proposal.md` §6.
 * Status block: codex-implements-readgitlog (ratified 2026-05-14).
 *
 * Exports:
 *   readGitLog(repoPath, slug) → revisions[]   // empty array if no tags / no git
 *
 * Failure modes (all graceful — empty array preserves v0.3 synthesized-rev-0):
 *   - git CLI not on PATH (e.g., sandbox environment) → []
 *   - repo has no `.git` directory → []
 *   - no `delivery/{slug}*` tags exist yet → []
 *   - tag annotation parse glitch → returns what it can, never throws
 *
 * Runtime note:
 *   This module shells out to git. The rest of the aggregator is pure-Node
 *   filesystem reads. This is the first runtime CLI dependency. Acceptable
 *   because it's local-only (`-C "${repoPath}"`) and the graceful-degradation
 *   path means absent git just falls back to synthesized rev-0.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function tryGit(repoPath, args) {
  try {
    return execSync(`git -C "${repoPath}" ${args}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return null;
  }
}

function safeParseInt(s) {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Walk the parent repo's tags + commits to produce Codex-shaped revisions[]
 * for a single build slug.
 *
 * Returns a Codex revisions[] array (one entry per delivery tag) or [] if
 * git is unavailable, the repo isn't initialized, or no relevant tags exist.
 *
 * Each returned entry conforms to the v0.3 schema:
 *   {
 *     id:                'rev-0' | 'rev-1' | ...,
 *     kind:              'primary_run' | 'additional_step',
 *     ref:               '<full commit SHA>' | null,
 *     ts:                '<ISO timestamp>' | null,
 *     summary:           '<tag annotation subject>' | null,
 *     tag:               '<delivery/{slug} or delivery/{slug}/rev-N>',
 *     contributing_commits: [{ sha, ts, subject }, ...],
 *     source:            'git'
 *   }
 */
export function readGitLog(repoPath, slug) {
  if (!repoPath || !slug) return [];
  if (!existsSync(path.join(repoPath, '.git'))) return [];

  // (1) Probe git availability.
  const ver = tryGit(repoPath, '--version');
  if (!ver) return [];

  // (2) Find all delivery tags for this slug. We use `tag -l` with a
  //     pipe-separated format we can parse safely. The `delivery/{slug}*`
  //     pattern matches the primary tag and any rev-N child tags.
  //
  //     Note: shell-quoting differs between bash and cmd.exe. The format
  //     string contains backticks-and-percent-signs that cmd.exe is fine
  //     with but bash might try to interpret. Using single quotes in the
  //     argument is safe for both because we shell out via execSync with
  //     the shell handling the outer quoting.
  const tagFormat = '%(refname:short)|%(objectname)|%(creatordate:iso-strict)|%(contents:subject)';
  const tagListRaw = tryGit(
    repoPath,
    `tag -l "delivery/${slug}" "delivery/${slug}/*" --format="${tagFormat}"`
  );
  if (!tagListRaw) return [];

  // (3) Parse each tag line.
  const tags = tagListRaw.split('\n').filter(Boolean).map(line => {
    const parts = line.split('|');
    const tagname = parts[0] || '';
    const sha = parts[1] || null;
    const date = parts[2] || null;
    const subject = parts[3] || null;
    const isPrimary = tagname === `delivery/${slug}`;
    // For revN tags the format is `delivery/{slug}/rev-N`; take the last segment.
    const revLabel = isPrimary
      ? 'rev-0'
      : (tagname.split('/').pop() || 'rev-?');
    return {
      tag: tagname,
      rev: revLabel,
      kind: isPrimary ? 'primary_run' : 'additional_step',
      ref: sha,
      ts: date,
      summary: subject
    };
  });

  if (tags.length === 0) return [];

  // (4) Sort: rev-0 first, then rev-N ascending. Resilient to non-numeric
  //     suffixes by falling back to lexicographic order.
  tags.sort((a, b) => {
    if (a.rev === 'rev-0' && b.rev !== 'rev-0') return -1;
    if (b.rev === 'rev-0' && a.rev !== 'rev-0') return 1;
    const an = safeParseInt(a.rev.replace(/^rev-/, ''));
    const bn = safeParseInt(b.rev.replace(/^rev-/, ''));
    if (an !== bn) return an - bn;
    return a.rev.localeCompare(b.rev);
  });

  // (5) For each tag fetch the contributing commits (commits between the
  //     previous tag — or repo root for rev-0 — and this tag, scoped to
  //     this build's runs/{slug}/ directory). The path-scope makes the
  //     view per-build even when the parent repo has unrelated commits
  //     in between.
  for (let i = 0; i < tags.length; i++) {
    const fromRef = i === 0 ? '' : tags[i - 1].tag;
    const toRef = tags[i].tag;
    const range = fromRef ? `${fromRef}..${toRef}` : toRef;
    const commitsRaw = tryGit(
      repoPath,
      `log ${range} --pretty=format:"%H|%cI|%s" -- "runs/${slug}/"`
    );
    if (commitsRaw) {
      tags[i].contributing_commits = commitsRaw
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const [sha, ts, subject] = line.split('|');
          return { sha: sha || null, ts: ts || null, subject: subject || '' };
        });
    } else {
      tags[i].contributing_commits = [];
    }
  }

  // (6) Normalize the output to the v0.3 revisions[] schema. The keys
  //     `id` and `kind` match what extractRevisions emits today, so the
  //     merger in events.mjs can treat git and curation as homogeneous
  //     inputs.
  return tags.map(t => ({
    id: t.rev,
    kind: t.kind,
    ref: t.ref,
    ts: t.ts,
    summary: t.summary,
    tag: t.tag,
    contributing_commits: t.contributing_commits,
    // Origin marker so downstream code knows where this came from when
    // merging with curation/synthesized entries.
    source: 'git'
  }));
}
