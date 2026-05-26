# Run Report — mlb-daily-dashboard

**Status:** delivered, verified PASS under production fidelity.
**Date:** 2026-05-26
**Architecture version:** v1.10.1

## What worked

- **Editor gate caught nothing, but should still run.** Both proper nouns (MLB, GitHub Pages) carried `verification_status: pending` at TD finish — Editor correctly noted that the structural choices in the plan (API base URL = `statsapi.mlb.com`, deployment_target = github.io path) pragmatically honored both nouns, returned `pass_with_recommendations` with two low-severity carry-forward findings, and the build proceeded without rebuild. The pragmatic-structural-honoring rule is becoming a useful pattern when proper nouns are well-known and the build trivially incorporates them; would be worth codifying as an Editor pass-with-recommendations pattern.

- **Inline-mode coverage at 6 sections held up.** Six sections is right at the edge of the inline-vs-nested boundary (rule is ≤8). The Coordinator agent handled Overseer + Builder + Integrator + scheduled Critic + Historian inline without inline-deviation log entries — meaning either the build was clean enough not to require judgment calls, or the agent under-reported. The 46/46 edge-case-testing pass and CV pass suggest the former.

- **CV's two-option production-fidelity strategy worked.** CV chose Option A (real Playwright Chromium + live statsapi.mlb.com fetch) and confirmed the artifact ships working data: TB 34-17, NYY 32-22, 105 upcoming games rendered. Real browser + real endpoint is the gold standard for v1.5/v1.9 production-fidelity verification, and CV reached it.

- **The "no third-party JS, vanilla ES modules" decision (TD-IP-B + TD-IP-C) was the right one for GitHub Pages static hosting.** No bundler, no CDN deps, no vendor manifest needed. Final/ matches integration/ byte-for-byte. This is the production-fidelity-at-design-time guidance from v1.6 paying off.

- **Hardcoded team-color fallback map (teams.js) absorbed an MLB Stats API gap silently.** The API doesn't expose primary brand colors. TD/Coordinator anticipated this and produced a static 30-team color/abbreviation map that data-client merges with live API responses. Build delivers the dashboard color identity even without API-side color data.

## What broke (or wobbled)

- **Arizona abbreviation inconsistency.** Renders as "AZ" in rankings/trends panels (API value) but "ARI" in upcoming-games panel (teams.js fallback). CV flagged it as cosmetic, not a Sev 0 trivial fix. A normalize-on-the-way-in would have caught this — the data-client could pin the abbreviation to a single source. Pattern worth surfacing: when the same logical field is sourced from two places, normalize at ingest, not at render. Candidate for an architecture amendment on normalization discipline in data-client roles.

- **GitHub Pages live URL is unverified at delivery.** CV confirmed the URL pattern and that the artifact is well-formed; the actual deploy happens via `commit-build.bat`. FC.6 "Public URL delivered" was marked PASS pending deploy. The first-contact gate could be tightened to actually probe the live URL after C5 commit pushes — but that requires Orchestrator to wait on Pages's build pipeline (typically ~60s), and the architecture currently doesn't have a post-C5 verification step. Worth thinking about for v1.11+ amendments.

- **No Researcher actually dispatched.** TD collapsed the CORS probe into "quick reasoning" with a stub probe file. This is technically permitted (canonical evidence cited in TD's IP1/IP2 resolutions), but if the CORS assumption had been wrong, the build would have shipped broken and only the live deploy would have caught it. CV's Option-A live-fetch exercise did empirically confirm CORS works, which is what saved this case. The architecture's defense here is that CV would catch the failure pre-delivery — and that's what happened.

## What surprised me

- **The whole build ran without a single escalation, Sev 0 fix, or inline deviation.** This is the cleanest run in the corpus so far. The combination of (a) a well-understood data source with a stable public API, (b) a clear static-hosting target, and (c) no atomic-noun unreachability seems to be the sweet spot for the v1.10 architecture. Builds that hit Demotion Mode or Researcher escalations tend to wobble more.

- **6 sections + inline mode + ~37 minutes wall time** produced a working dashboard with real MLB data, 30-team coverage, weekly trends, upcoming-games, and 6-division standings + wild card. The architecture is faster than I expected for a build of this scope.

## What the architecture should learn

1. **Normalization discipline in data-client.** A single logical field (team abbreviation) sourced from two places (API + fallback) without normalization is the failure pattern behind the Arizona AZ/ARI inconsistency. Either the data-client charter should mandate normalization at ingest, or TD's contract design step should flag dual-source fields. Candidate v1.11 amendment.

2. **Live-URL post-C5 verification.** FC.6's "Public URL delivered" can be PASS-pending-deploy at CV time, but the architecture currently has no structural step that confirms the live URL serves the artifact after C5 pushes. Orchestrator could optionally wait ~60s for Pages and curl the live URL; failure would not block delivery (per always-deliver contract) but would surface in the wrap-up.

3. **Editor's pragmatic-structural-honoring pattern.** When proper nouns are well-known and structurally honored by the plan, Editor's `pass_with_recommendations` outcome with the verification carried forward to Critic is a useful softer path than `route_to_discovery`. Worth codifying explicitly in Editor's charter.

## Delivery target

`https://mondrianaire.github.io/auto-builder/runs/mlb-daily-dashboard/output/final/`

Will be live after `commit-build.bat mlb-daily-dashboard` pushes and GitHub Pages rebuilds (typically ~60s).
