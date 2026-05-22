# Run Report — closest-liquor-store

**Prompt:** "Build me an app that points me to the closest liquor store"
**Architecture version:** v1.10.1
**Dispatch mode:** inline (5 sections, ≤8 threshold)
**Final verdict:** `pass_with_concerns` (CV) — upgraded in practice by an Orchestrator-led live verification (see below)
**Date:** 2026-05-22
**Orchestrator-spawned dispatches:** 4 (Discovery → TD → Editor → Coordinator) + 2 post-build (Critic final-sweep, CV)

## Outcome

A self-contained, single-file browser app at `output/final/index.html` (32 KB, no build step, no server, no CDN). On open it attempts browser geolocation; a manual location-entry box is always visible as a fallback. It resolves the location to coordinates (browser Geolocation, or OSM Nominatim geocoding for a typed location), queries the public OpenStreetMap Overpass API for `shop=alcohol` / `shop=wine` / `shop=beverages` features within a radius, computes great-circle distance to each, and presents the single closest store as a card with name, address, and distance, plus two external directions links (OpenStreetMap + Google Maps). Empty results widen the radius (4 → 12 → 30 → 80 km); network/timeout/HTTP errors surface a clear human-readable message; no path crashes or shows a blank screen.

The prompt named no proper nouns, so Principle E was inert this run. The one high-stakes inflection point — where store data comes from — was resolved by a real research probe (probe-IP1, 6 canonical OSM citations) to the live Overpass API, the only option that satisfies "the closest liquor store *wherever the user is*" without an API key or a user-operated backend.

## What worked

- **Discovery's honest IP framing.** Discovery did not paper over the hard part. It logged "where store-location data comes from" as a high-importance inflection point with a documented best-effort default (live real data) rather than silently assuming a bundled dataset — which would have shipped an app that works in one region and silently fails everywhere else. The telos was authored cleanly without any supportive proper noun.
- **TD's research probe earned its keep.** IP1 failed the quick-reasoning rubric (introduces an external dependency, not trivially reversible) and TD correctly routed it to research instead of guessing. The probe produced 6 re-fetchable citations against OSM canonical wiki pages; every external-system assertion downstream sourced as `canonical_evidence` with a `citations_pointer`, not training-data familiarity.
- **Editor gate passed cleanly first try.** No iteration. All five structural checks held: empty `proper_nouns[]` confirmed correct against the literal prompt, both high-importance IPs had concrete action, no `td_plan`-sourced assertion targeted an external-system property, all four first-contact requirements had covering assertions, telos coherence held.
- **Inline mode held at 5 sections.** Linear dependency chain (location → lookup → presentation → shell → integrator → edge-case-testing), no escalations originating in the build phase. The Coordinator produced real working code, not stubs.
- **Critic final-sweep clean.** 0 flags across all 9 checks; all 13 machine-checkable assertions verified against the integrated artifact.
- **Graceful degradation is real, not decorative.** Every failure path the spec named — geolocation denied, Overpass timeout/HTTP-error/offline, empty nearby results — was exercised (11/11 edge-case assertions) and produces a clear message. This is what let the build absorb the transient-504 reality of the public data source without crashing.

## What broke / what was surprising

### B1 — The verification environment could not reach Overpass, and CV's diagnosis of *why* was incomplete

The build's inline deviation dev-002 recorded that the sandbox network proxy returns HTTP 406 for the Overpass endpoint. CV inherited that framing, tagged the Overpass component `modeled`, verified the artifact's parse/select/render code against a canonical-shape payload, and shipped verdict `pass_with_concerns` with the residual "the live Overpass success path could not be exercised from the sandbox — on a real machine it works."

That residual was only *half* right, and the Orchestrator's delivery-time live verification (in the user's real Chrome, via the browser MCP) is what surfaced the full picture:

- A **GET**-form request to `overpass-api.de/api/interpreter?data=…` returns **HTTP 406** — from the *real* browser too, not just the sandbox. Overpass's Apache layer rejects the GET shape.
- A **POST** with the raw query body returns **200** (27 stores for the Chicago test point).
- A **POST** with `data=`-form encoding — *which is exactly what the app sends* — returns **200** on ~2 of 3 attempts and **504 Gateway Timeout** on the rest. The 504 is the free public `overpass-api.de` instance being transiently overloaded, not a request-shape rejection.

So: the app genuinely works (live-confirmed: real liquor stores returned, e.g. "Uncork It!", "Loop Wine & Spirits"), but the public data source is intermittently slow, and the "406" in the build record conflated three different things (sandbox proxy behavior, Overpass's GET rejection, and transient 504s).

**What architecture should learn:** CV's production-fidelity exercise has no path to the user's *actual* browser when the verification sandbox can't reach a required endpoint — so it modeled the component and inherited an upstream role's incomplete diagnosis. Either (a) CV's charter should permit a real-user-environment exercise (the browser MCP) for the specific assertions a sandbox can't reach, or (b) the Orchestrator delivery step should formally include a live real-environment confirmation pass, with its findings written back into the verification record. This run did (b) ad hoc; it should be a named step, not improvisation. An upstream role's environment-limitation note ("dev-002: sandbox returns 406") should not be allowed to propagate into CV's residual unverified.

### B2 — TD could not actually dispatch a Researcher sub-agent

TD's charter tells it to dispatch Researchers as real sub-agents. TD reported that no `Agent` tool was available in its dispatch environment, so it conducted the IP1 probe in-role via web search, still writing real `probe-IP1/briefing.json` and `findings.json` with verbatim-excerpt citations. The audit trail is intact and Principle F was honored — but the architecture assumes a role can spawn the roles its charter names, and at least one dispatched role could not. The same constraint would bite harder under `nested` dispatch mode, where the Coordinator is *required* to spawn Overseers and Builders.

**What architecture should learn:** the dispatch model assumes uniform sub-agent-spawning capability at every depth. In practice the capability is not guaranteed past the first level. Either the architecture documents "in-role conduct with full artifact-writing is an accepted substitute for a dispatch when spawning is unavailable" (it worked fine here), or the run framework must guarantee the Agent tool to every dispatched role. The first is cheaper and this run is evidence it is sound.

### B3 — `output/final/` carries an extra `manifest.json`

The integration `manifest.json` was copied into `final/` alongside `index.html` and could not be removed (the sandbox blocks deletes). `final/` is meant to be Category-3 (the deliverable only); `manifest.json` is a Category-2 build byproduct. Harmless — it is just a description of the build — but it means `final/` is not strictly deliverable-only. A future Orchestrator should copy *only* the entry artifact and its real assets into `final/`, never the integration manifest.

## Uncertainty Manifest

Per the always-deliver contract, the commitments this build made where the prompt was silent or evidence was bounded:

- **Live data over a bundled dataset (IP1).** The app needs network at use time. If the user is offline or `overpass-api.de` is down, the app cannot answer — it says so clearly rather than failing silently. This was the honest reading of "the closest liquor store" and is documented, not hidden.
- **"Closest" = straight-line distance (A2).** Great-circle distance, not drive time. In a dense road network the straight-line-nearest store may not be the fastest to reach. The directions hand-off (which opens a real maps service) covers the routing the app deliberately does not do.
- **"Points me to" = identify-and-show + hand-off (A5/IP4).** The app names the store, its address, distance, and gives external directions links. It does not do in-app turn-by-turn — that was an explicit out-of-scope choice.
- **Single closest store, not a ranked list (IP3).** The prompt said "the closest" (singular). A nearby-list is a reasonable enhancement but was not asked for.
- **Transient 504s from the public Overpass instance.** Live verification measured ~1-in-3 calls returning a transient 504 at the test time. The app handles each gracefully ("the service may be busy — please try again") but does **not** auto-retry — the user must click again. The app is functional; first-contact reliability is bounded by the free public endpoint's load. Auto-retry-on-transient-error is the single highest-value refinement (see below). This was a deliberate Orchestrator decision *not* to patch code beyond what TD specced — graceful HTTP-error handling is implemented and verified; auto-retry would be new behavior, which is a TD/build decision, not an Orchestrator improvisation.

## Refinements to consider

In rough architectural priority:

1. **Formalize a live real-environment verification pass.** B1 is the important one. The build's verdict (`pass_with_concerns`) was correct, but its *concern* was a partly-wrong diagnosis that an Orchestrator-led real-browser check had to correct at delivery time. The architecture should give CV (or a named Orchestrator delivery step) an explicit, sanctioned way to exercise the user's real environment for the assertions a sandbox cannot reach — and a rule that an upstream environment-limitation note may not be carried into a verification residual without an independent check.
2. **Auto-retry on transient errors for network-dependent builds.** Not an architecture change — a build-quality pattern. When a build's data source is a free public API with known transient failure (Overpass, Nominatim, many others), TD should spec a small bounded retry-with-backoff on 429/502/503/504/timeout as part of the graceful-degradation acceptance, so first-contact does not depend on the endpoint being un-busy on the first call. Consider adding it to the TD "production-fidelity at design time" heuristic.
3. **Document in-role conduct as an accepted dispatch substitute (B2).** When a role cannot spawn the sub-agent its charter names, conducting that role's work in-role *with the full artifact set written* is a sound fallback — this run proves it. Make it explicit so it is not treated as a deviation.
4. **`final/` hygiene (B3).** Orchestrator should copy only the deliverable into `final/`, never the integration manifest. Minor.
5. **Git commit cadence (C1–C5) was not executed from the run.** Per project convention, git operations are not run from the sandbox; the five-commit cadence is deferred to a user-run script at delivery. The build substrate is complete and committable as one delivery commit.

## Note on git

Consistent with the project's standing rule (never run git from the sandbox — it corrupts the index), the C1–C4 intermediate commits were not made. The full `runs/closest-liquor-store/` substrate is complete and ready for a single delivery commit + `delivery/closest-liquor-store` tag via the repo-root commit script, to be run by the user.
