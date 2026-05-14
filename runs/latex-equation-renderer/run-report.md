# Run Report — latex-equation-renderer

> **STATUS: FAILED → RECOVERED under v1.5 (reclassified 2026-05-10).**
>
> Original delivery claimed CV `pass`. User opened the artifact and the renderer surfaced its own "KaTeX library is not loaded." guard for every input. Root cause: the verification stack never exercised the deliverable in production fidelity. cv_artifact_exercise and edge-case-testing both ran in jsdom with KaTeX provided as an npm-installed Node module — the CDN script tag in index.html was never required to actually load and execute. The prompt's named verb (render LaTeX) was never asserted against the artifact in its target deployment environment.
>
> This is a v1.4 architectural failure, not a localized section defect. See "Recovery + v1.5 amendments" section appended below.

**Prompt:** "build me a tool to render mathematical equations from LaTeX input"
**Architecture version:** v1.4 (initial run); v1.5 (recovery)
**Dispatch mode:** inline (5 sections, ≤8 threshold)
**Original verdict:** delivered, CV pass — **WRONG** (see addendum)
**Reclassified verdict:** FAILED → recovered with bundled KaTeX + production-fidelity re-verification
**Date:** 2026-05-10

---

## Phase summary

| Phase | Mode | Outcome |
|---|---|---|
| Discovery | nested | 9 assumptions, 3 IPs, clean OOS list |
| Technical Discovery | nested | 5 sections, 4 contracts, 4 IP locks (all quick-reasoning), 0 Researchers dispatched |
| Coordinator (build) | inline | 5 waves, 6 builders, 0 cancellations, 3 inline deviations |
| Integrator | inline (within Coordinator) | 5 files assembled into `output/integration/`, jsdom smoke check passed |
| Edge-case-testing | inline | 22/22 assertions pass (12 section + 10 IP) |
| Critic final-sweep | nested | 0 flags across all 8 checks |
| Convergence Verifier | nested | pass; 5 user-flow assertions exercised in jsdom |

## What worked

**The IP locks were all genuine quick-reasoning candidates.** TD's rubric (canonical answer, similar branch complexity, no new dependencies, reversible) cleanly filtered all four IPs to no-research-needed. KaTeX-vs-MathJax (IP4 added during TD) is the closest call but the math-mode-only scope from A7 made the asymmetry one-sided. **Lesson:** the rubric is well-calibrated for small builds; it would be worth seeing it stretched on a more ambiguous IP.

**Inline dispatch was the right mode.** 5 sections, no escalations, no behaviors-being-studied — exactly the "default for typical builds" case the charter calls out. Coordinator was able to produce all the nested-mode artifacts (state files, dispatch-log, history, audit) without spawning sub-agents, which is a meaningful cost win.

**The v1.3 user-flow assertion + cv_artifact_exercise machinery worked.** TD wrote 5 user-flow assertions (input change → output render, error display, layout grid, etc.). CV simulated each in jsdom and confirmed behavioral correctness. This is exactly the loop that was missing in the blackjack run.

**Inline-deviation logging behaved as intended.** 3 deviations logged, all `documentation-only` (no artifact/contract/assumption changes). Critic's audit confirmed `nested_equivalent` was articulated for each. The dev-003 case (jsdom test harness shim) is interesting: it modified test infrastructure, not product code, and the `product_code_changed:false` field surfaced that distinction cleanly.

**Edge-case-testing depending on `integrator` worked.** The pseudo-node sequencing (W4 integrator → W5 edge-case-testing) executed cleanly. The harness ran against the integrated artifact, not pre-integration outputs, which is the v1.1 fix.

## What broke / what to refine

**Nothing broke per se, but the run was easy.** Every phase ran clean on the first attempt. That makes this run useful as a smoke test of the v1.4 substrate, but a poor test of escalation handling, Researcher dispatch, Sev 0 fix paths, or impact-analysis flow. The next run should pick a prompt likely to surface those — something with a real ambiguity (e.g., persistence model, undo semantics) or a wider scope.

**The TD agent added IP4 (KaTeX vs MathJax) as a "technical IP" beyond Discovery's 3.** This is fine — TD's job is to surface technical decisions Discovery wouldn't have flagged. But the schema doesn't explicitly allow TD to *add* IPs vs only resolve Discovery's. Worth clarifying in the file_schemas.md whether TD-introduced IPs go into `inflection_resolutions[]` (they did here) or need a separate field like `technical_inflection_points[]`.

**Inline-mode role collapse for Critic scheduled cycles.** The charter says Critic's scheduled mode "may be collapsed into Coordinator under inline dispatch." Coordinator did append basic `audit/flags.jsonl` entries during the build, but the schema for those entries vs final_sweep entries is identical — there's no field distinguishing "scheduled cycle from coordinator" vs "true Critic dispatch." Audit downstream might want to know.

**The `output/builders/section-5-edge-case-testing/...` path is awkwardly long.** Worth considering whether edge-case-testing should have a flatter path. Minor.

**No Historian summary or decision-index.** The Historian charter says "compose summary `history/build-summary.md`" and "maintain index at `history/decision-index.json`." Neither exists in this run because Historian work was collapsed into Coordinator's inline execution and Coordinator focused on `log.jsonl`. Architecture should clarify whether these summary artifacts are required-for-delivery or nice-to-have. Currently the Orchestrator delivery checklist enumerates 6 artifacts and these aren't in it.

## Surprises

**Zero Researcher dispatches felt right.** A LaTeX renderer is well-trodden ground; KaTeX vs MathJax is a 30-second decision for anyone with web-rendering knowledge. The architecture didn't force a Researcher dispatch and the build was faster for it. Confirms that the rubric's "well-known canonical answers" gate is doing useful work.

**The 22/22 → 22/22 edge-case-testing first run was almost suspicious.** On re-read, the harness does test what it claims to test (DOM presence, KaTeX class injection, error visibility, no export buttons, etc.). But this is also a tool with a tiny attack surface for behavioral defects: input goes in, KaTeX renders, errors surface. Larger artifacts will produce more interesting test runs.

## Recommendations for next run

1. Pick a prompt with at least one *load-bearing* ambiguity that should force a Researcher dispatch. Candidates: "build me a notes app with undo" (persistence + undo semantics), "build me a markdown editor with extensions" (extension model), "build me a unit converter for engineers" (unit corpus + precision model).
2. Resolve the TD-introduced-IPs schema question in `file_schemas.md`.
3. Decide whether `history/build-summary.md` belongs in the delivery checklist.
4. Worth a deliberate try at nested mode (>8 sections OR explicitly requested) to validate the substrate produces parity output.

## Delivery (original — superseded)

- Artifact: `runs/latex-equation-renderer/output/final/index.html` (+ `styles.css`, `renderer.js`, `input.js`, `app.js`)
- Ledger: `runs/latex-equation-renderer/decisions/discovery/ledger-v1.json`
- OOS list: 8 items (auth, persistence, collaboration, full-doc compilation, custom packages, native mobile, offline desktop, OCR)
- Verification: `runs/latex-equation-renderer/output/verification/report.json` (originally `pass`; reclassified `fail` under v1.5)
- Audit: `runs/latex-equation-renderer/audit/flags.jsonl` (0 flags)

---

## Recovery + v1.5 amendments (2026-05-10)

### What actually broke

User opened the delivered artifact and got the renderer's own guard message — `KaTeX library is not loaded.` — for every input. The deliverable was incapable of doing the verb in the prompt.

### Root cause (verification-stack failure, not section defect)

Both verifiers — `section-5-edge-case-testing` and `cv_artifact_exercise` — ran in jsdom. The harness for both made KaTeX available by stubbing `window.katex = require('katex')` (npm package), so renderer.js's runtime guard `typeof global.katex === 'undefined'` always fell through to a successful `katex.render(...)` call. The CDN script tag in `index.html` was never required to actually load and execute. When the user opened the file in a real browser without reachable jsdelivr CDN, the script tag failed silently and the runtime guard tripped.

The CV charter's v1.3 wording explicitly *permitted* this: "Load integrated artifact in DOM-capable sandbox (jsdom, puppeteer, or **Node sandbox with stubbed DOM**)." That phrase is the loophole. It let the verifier substitute the very runtime dependency the artifact requires.

The v1.3 amendment, which introduced `cv_artifact_exercise` after the blackjack Deal-button defect, layered behavioral testing on top of this same flawed substrate. So the v1.3 fix didn't actually close the gap it was meant to close — it just moved the goalposts and left the same class of failure exploitable. **The first blackjack run (`runs/blackjack/`) has been retroactively reclassified FAILED for the same root-cause class.**

### v1.5 amendments (written into architecture/)

1. **CV charter, §Artifact-exercise pass:** strike "Node sandbox with stubbed DOM." Replace with explicit production-fidelity environment requirement per artifact type (browser → real headless browser or jsdom-with-real-resource-loading-and-no-substitution; web app → real backend on real port; CLI → real binary in fresh process; library → import via published entry point). Any deviation must be documented and justified.
2. **TD charter, new §Prompt-named-verb assertion:** require exactly one `prompt_named_verb_assertion` at the section-list level, derived from the literal verb in the user's prompt, with scenario that exercises the verb end-to-end against the deliverable. Schema specified.
3. **CV charter, new §Prompt-named-verb pass:** non-skippable; no `pass_with_concerns`; runs under production fidelity; if it fails the verdict is `fail` regardless of every other check.
4. **TD heuristic for edge-case-testing section** updated: charter must include the production-fidelity language so the section's own runner doesn't substitute runtime deps either.
5. **README.md:** version-history entry for v1.5, open-questions table row, motivation logged.

### Recovery patch (artifact-side)

KaTeX bundled locally to eliminate the runtime network dependency entirely:

- Added `output/final/vendor/katex/katex.min.js` (~277 KB) and `katex.min.css` (~23 KB)
- Added `output/final/vendor/katex/fonts/` with all 16 KaTeX woff2 fonts (~245 KB)
- `index.html` script + link tags rewritten from `https://cdn.jsdelivr.net/...` to `vendor/katex/...`
- Total bundle ~545 KB; the artifact is now fully offline-capable

The integrator's original output in `output/integration/` is left untouched as a record of the v1.4 build. The recovery patch lives only in `output/final/` (Orchestrator's authorized write target). Future v1.5-native runs would TD-design the local-bundle approach into section design from the start; the file copy here is a one-time bridge between v1.4 delivery and v1.5 verdict.

### v1.5 verdict

`output/verification/report-v15.json` — **PASS.**

- Environment: jsdom@22 with `runScripts: 'dangerously'` and `resources: 'usable'`, file:// load of `output/final/index.html`. Custom ResourceLoader logged every fetch as proof of no substitution.
- Fetch log shows KaTeX loaded from `file://.../output/final/vendor/katex/katex.min.js`. Zero CDN fetches.
- PNV.1 — *type "x^2", observe .katex DOM in output region* — pass.
- S3.A1 (`a+b` live render), S3.A2 (`\frac{1}{` error surfacing) — both pass under production fidelity.
- `runtime_dependency_substitution: false`, evidenced by the fetch log.

### Lessons

- A verifier that can substitute the runtime dependency the artifact needs is not a verifier of the artifact; it's a verifier of an alternate-universe artifact that happens to share the source files. The architecture has to forbid this explicitly, and v1.5 does.
- The "named verb" phrasing matters. Per-section assertions decompose the system; none of them reassemble it and ask "does the user's prompt's verb work against the deliverable in the user's environment." That's why both blackjack and latex-equation-renderer shipped past every gate while failing at the central job.
- This is the third architectural amendment driven by a defect that *the user found*, not the system. Future runs should treat any user-found defect post-delivery as proof of a verification gap, not a "post-delivery defect" — that framing was wrong on this run too.
- The pattern across v1.3 → v1.5 is the same: each amendment closes the previously-tested defect class but layers on top of substrate the next class can still exploit. The next run-report should explicitly stress-test the new gate before declaring it sound.
