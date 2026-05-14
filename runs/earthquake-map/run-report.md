# Run Report — earthquake-map

**Prompt:** "Build me a tool to visualize earthquake activity on a map."
**Architecture version:** v1.7
**Dispatch mode:** inline (4 sections, ≤8 threshold)
**Final verdict:** pass
**Date:** 2026-05-10

## Outcome

A self-contained browser tool at `output/final/index.html` that fetches the USGS past-24h earthquake feed on load and renders events as Leaflet circle markers sized + colored by magnitude over an OpenStreetMap tile layer. CV's production-fidelity exercise (headless Chromium, real network) confirmed 480 markers from the live feed, working pan/zoom, and click-popups exposing time/magnitude/place/depth. PNV ("visualize") passed.

## What worked

- **Inline dispatch held up at four sections.** Coordinator ran sections 1–3 in wave 1 (data-fetcher, map renderer, page shell), Integrator in wave 2, edge-case-testing in wave 3, with no escalations originating inside the build phase.
- **Production-fidelity-at-design-time (v1.6) paid off immediately.** TD vendored Leaflet at design time rather than reaching for a CDN. CV's production exercise loaded the artifact via `file://` with no substitution; the latex-equation-renderer recovery loop did not recur.
- **TD-introduced inflection points were used as designed.** Discovery surfaced 3 IPs (live-vs-static, fixed window, filters); TD added 3 of its own (map library = Leaflet, data source = USGS `all_day.geojson`, magnitude encoding = dual size+color with a legend backed by the same style functions the markers use). All 6 resolved via quick reasoning per the four-condition rubric.
- **Prompt-verb analysis kept PNV honest.** TD enumerated three candidate verbs ("build", "visualize", "map") and explicitly rejected "build" as meta and "map" as the medium. PNV exercised "visualize" literally — open the artifact, see earthquakes rendered on a map — which is exactly what the user asked for.
- **CV's headless-Chromium environment is the right level of fidelity for browser artifacts.** Real Leaflet, real USGS fetch, real OSM tiles, real DOM. 480 markers, 4 distinct magnitude buckets observed, popup contents inspected, transform deltas measured to verify pan. This is the exercise the v1.5 amendment was reaching for.

## What broke (or limped)

### A1 — Critic flagged severity HIGH on prose_coverage despite TD writing comprehensive `discovery_coverage_assertions[]`

The v1.7 prose-coverage check (`file_schemas.md` § Coverage-Required Fields) lists `sections[].charter`, each `sections[].out_of_scope[]` item, and contract `interface` methods/fields + `notes` as coverage-required fields. TD's initial sections-v1.json covered Discovery's load-bearing prose thoroughly (28 `discovery_coverage_assertions[]`) and covered each section's `acceptance` prose via `acceptance_assertions[]`, but never authored explicit assertions whose `covers` field named those other fields. Critic correctly flagged this as severity high — it's exactly what the rule is designed to catch.

The remediation (Arbiter → TD impact-mode → sections-v2.json) added 38 new assertions (4 charter + 16 per-section OOS + 18 contract interface/notes). Re-sweep cleared. esc-001 resolved.

**What architecture should learn:** The TD initial-mode charter mentions `discovery_coverage_assertions[]` explicitly but doesn't enumerate the parallel `section_coverage_assertions[]` and `contract_coverage_assertions[]` collections that the coverage-required table actually demands. An average TD agent reading the charter will reasonably infer "discovery is the load-bearing prose" and miss section/contract coverage. Two possible fixes:
- **(a) Charter clarification:** TD charter §"Prose coverage and `covers` field" lists the four Discovery fields it must cover but stops there. Extend it to enumerate the section and contract fields too, with the same prescriptive "you must produce a `_coverage_assertions[]` collection covering X, Y, Z" framing.
- **(b) Schema-level prompt:** the `sections-v{N}.json` schema example in `file_schemas.md` currently shows only `discovery_coverage_assertions[]`. Add example entries for `section_coverage_assertions[]` and `contract_coverage_assertions[]` so the canonical example matches what the coverage-required table requires.
Both are cheap. Option (a) is probably the more forcing function.

This run argues that v1.7's principle-as-property elevation is *correct* but its surface area in the TD charter is *incomplete* — TD wrote good Discovery coverage and stopped, because that's what the charter walked through.

### A2 — Tooling artifact: bash mount briefly showed `audit/flags.jsonl` and `history/log.jsonl` as 0 bytes despite agents writing them correctly

During final delivery I ran `stat` and `wc` over `audit/` and `history/` via the bash mount (`/sessions/.../mnt/Auto Builder/runs/earthquake-map/`) and saw both jsonl files at 0 bytes — even though the original Critic and Coordinator agents had reported substantive writes. I suspected a silent Edit-append failure against the pre-touched empty files and dispatched recovery agents to reconstruct from surviving evidence (Critic from esc-001 + resolution; Historian from the full decision/state/output trail).

Both recovery agents independently reported back that the files were already populated when read via the file Read tool with the Windows path — Critic found 22 entries, Historian found 11 (which it then superseded with a more comprehensive 34-entry reconstruction grounded in the surviving artifacts). The original writes had succeeded; the bash-mount view was stale because both files were `touch`ed empty during initial substrate creation and the bash sandbox apparently held that empty view across subsequent filesystem changes done via the Windows-path tools.

Net outcome: `audit/flags.jsonl` (22 original entries) and `history/log.jsonl` (34 reconstructed entries) are both fully populated and consistent with everything else in the run.

**What architecture should learn:**
- **(a)** If `history/log.jsonl` is required by the schema (it is) but not on the Orchestrator's delivery checklist, treat it as schema-required regardless. The current delivery checklist enumerates the build-summary and decision-index but not the causal log; consider adding it for symmetry.
- **(b)** Future Orchestrator implementations should verify file presence via the file Read tool (the path source of truth) rather than the bash mount when there's a discrepancy. A 0-byte readout on an append-only log file should trigger a Read-tool re-check before assuming data loss. Better still: skip the `touch` during initial substrate creation entirely — let the first writer create the file, since that's also when Critic's writer-permission check would notice an unauthorized creator.
- **(c)** The Historian reconstruction was useful even though it turned out to be unnecessary — it filled in beats from Discovery / TD / Arbiter / CV / Orchestrator that the Coordinator's inline-collapsed Historian work hadn't captured (Coordinator's log only covers what Coordinator did inline). This argues for a delivery-time Historian "consolidation pass" regardless of the inline/nested mode, where Historian walks the full surviving artifact set and writes a complete causal record at the end rather than only logging what the inline-collapsed historian saw.

### A3 — edge-case-testing deferred several user-flow assertions to CV

The edge-case-testing builder marked PV1, DC.A9 (basic interactivity), S2.A1, S2.A5, and IP1.A2 as "not_applicable_in_static — defer to CV browser exercise". CV exercised them and all passed, so this came out fine, but the v1.5 amendment's intent was that edge-case-testing exercise its assertions under production fidelity itself rather than punting them to CV.

In practice, both edge-case-testing (the section) and CV (the role) need real-browser-fidelity exercise to verify behavioral assertions. Re-running the same scenarios in two places is wasted work; punting from edge-case-testing to CV is reasonable when the section's environment can't easily host a headless browser. But the architecture currently asks for both to run under production fidelity, which means in practice one of them defers.

**What architecture should learn:** consider whether edge-case-testing and CV should share a single production-fidelity exercise pass rather than each owning one. Concretely: edge-case-testing's report could be a list of *assertions to exercise* with expected results, and CV's environment could be the single execution venue. Alternatively, edge-case-testing's charter could be narrowed to "exercise non-rendering behavioral assertions (logic, error paths) under jsdom-ish fidelity; defer rendering and interactivity assertions to CV explicitly" — making the deferral pattern part of the spec rather than a workaround.

### A4 — Path-string verbosity in agent dispatches

Briefings to sub-agents included long absolute paths under `C:\Users\mondr\Documents\Claude\Projects\Auto Builder\runs\earthquake-map\…`. Each sub-agent had to translate Windows paths to bash mount paths internally. This worked but consumed prompt tokens and is error-prone.

**What architecture should learn:** Orchestrator briefings could include both path forms once at the top ("absolute Windows path: X; bash mount path: Y") rather than scatter Windows paths through the body. Minor.

## Surprises

- **The USGS feed had 480 events in the past 24 hours.** Higher than I'd have guessed. Useful for marker-density sanity (a 50-event design would have looked different); none needed, since circle markers scale fine.
- **TD's choice to expose `magnitudeColor` and `magnitudeRadius` from section-2 as the legend's source of truth** (rather than re-implementing in section-3) was a clean cross-section coordination move. The contract carried it and CV's exercise confirmed visual consistency.
- **Critic's prose_coverage flag was the only escalation in the run.** No assumption violations, no contract amendments, no Sev 0 fixes, no Builder blocks. The single escalation was a v1.7-specific spec-shape gap, not a behavior issue. This is what the architecture is supposed to feel like when it works.

## Delivery checklist (audit)

| # | Item | Status |
|---|---|---|
| 1 | `state/coordinator/build-complete.json` | present |
| 2 | `audit/flags.jsonl` | present (final_sweep cycle 1 + final_sweep_resweep cycle 2 entries) |
| 3 | `output/verification/report.json` | present, verdict `pass`, PNV `pass` under production fidelity |
| 4 | `output/builders/edge-case-testing/builder-4a/report.json` | present, 22 pass + 1 pass-with-caveat + 3 deferred-to-CV |
| 5 | `output/final/` | populated; byte-equal to `output/integration/` |
| 5.5 | `output/final/divergence-from-integration.json` | not required (final byte-equal to integration) |
| 5.5 | `output/final/vendor-manifest.json` | present (Leaflet 1.9.4, 7 files, 168861 bytes) |
| 6 | `runs/earthquake-map/run-report.md` | this file |
| 7 | `history/build-summary.md` | present |
| 8 | `history/decision-index.json` | present |

Schema-required but not on delivery checklist:
- `history/log.jsonl` — present, 34 entries (reconstructed from surviving artifacts during delivery to capture beats Coordinator's inline historian missed).

## Total dispatches

- 1 × Discovery (initial)
- 1 × TD (initial)
- 1 × Coordinator (inline; collapsed Overseer×4, Builder×~5, Integrator, Historian-narrative, Historian-decision-index)
- 1 × Critic final-sweep
- 1 × Arbiter (esc-001 routing)
- 1 × TD impact-mode (esc-001 remediation)
- 1 × Critic re-sweep
- 1 × Convergence Verifier (production-fidelity Playwright exercise)

8 nested sub-agent dispatches via the Agent tool. Inside the Coordinator, ~10 logical inline dispatches. No Researcher dispatches needed (all 6 IPs resolved via quick reasoning).

## Recommendation

The architecture v1.7 substrate held up. The two non-trivial issues (prose_coverage gap, empty log.jsonl) are charter/schema-surface clarifications rather than principle failures. Ship those clarifications and the next run should be cleaner.
