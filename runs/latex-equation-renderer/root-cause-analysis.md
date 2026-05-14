# Root-Cause Analysis — latex-equation-renderer

**Architecture version at time of run:** v1.4 (initial); v1.5 (recovery)
**Outcome:** delivered with original verdict pass; user found defect (renderer surfaced "KaTeX library is not loaded" for every input); reclassified failed; recovery patched (KaTeX bundled locally); re-verified pass under v1.5 production fidelity.

This run is the **defining test of Principle A.** The original failure is exactly what Principle A predicts: verification environment substituted a runtime dependency the production environment doesn't, deliverable shipped past every gate, deliverable failed for the user. The recovery is exactly what enforcement of Principle A looks like: explicit production_fidelity_environment, explicit no-substitution evidence, fetch_log proving local-only resource loading.

## What this run reveals about each principle

**Principle A (verification fidelity).** Initially violated; recovery enforced the principle for this specific substitute (CDN ↔ npm package) and produced the canonical example of the principle in action.

But the recovery enforces the principle only for the specific substitute that broke. Other substitutes still in play in the recovery's verification environment:
- jsdom approximates CSS layout (not real-browser layout)
- jsdom approximates font metrics (not real-browser fonts)
- jsdom does not run a real JIT
- file:// loads have different security context than https:// loads
- The verifier runs locally; no network conditions

These are silent exceptions. The CV report lists `runtime_dependency_substitution: false` but does not enumerate the *other* differences from the user's actual environment. A future failure that depends on any of these — say, a layout-sensitive interaction or a font-fallback rendering issue — would surface as the next user-found defect post-delivery.

The principle would require: enumerate every difference between verification environment and user environment as an explicit exception with justification. The latex run does the best job of any run at one specific exception (CDN substitution) and continues the silent-exception pattern for everything else.

**Principle B (audit completeness).** Honored at v1.4 enumeration level. `build-complete.json`, `audit/flags.jsonl`, three inline-deviations logged with `nested_equivalent` articulation, full delivery checklist (under v1.4 wording).

The recovery introduced a new audit gap: `output/final/` diverges from `output/integration/` (final/ contains vendor/katex/ that integration/ does not), and the divergence is documented in the run-report but not in any structured artifact. v1.6's divergence-from-integration record was added to address this; it didn't exist at the time so the run is not at fault.

This is the principle's enforcement gap manifesting predictably: each new artifact category that appears in the architecture's lifecycle (the recovery patch is one) needs a record requirement, and each one gets enumerated only after a specific instance demonstrates the gap.

**Principle C (spec-to-test coverage).** Honored substantively for sections (12 acceptance assertions) and IPs (10 machine-checkable assertions across 4 IPs). The PNV was implicitly chosen as "render LaTeX" but `prompt_verb_analysis` did not exist — TD picked the verb without enumerating alternatives or articulating rationale.

The TD added IP4 (KaTeX vs MathJax) beyond Discovery's 3 — an organic exercise of v1.6's TD-introduced-IP capability before that capability was formally allowed by schema. This is the same organic-best-practice pattern kanban exhibited: agents do the right thing, then enforcement is added retroactively.

**Principle D (path coverage).** Same gap as every other run.

## What this run teaches the architecture

This is the **principle-enforcement loop in microcosm.** A specific substitute broke (CDN). The architecture closed that substitute (v1.5: strike "stubbed DOM" allowance). The recovery proved the closure works (report-v15.json passes with explicit no-substitution evidence). The amendment teaches: closing one substitute is straightforward; closing all substitutes requires generalizing to the principle.

The deeper lesson, which this run articulates more clearly than any other: **the substrate-recursion pattern is real, and v1.5 doesn't escape it.** The latex run-report itself names this:

> Each amendment closes the previously-tested defect class but layers on top of substrate the next class can still exploit.

This is the proof-of-concept for Principle A's "explicit exception list" requirement. If the architecture wants to escape the recursion, it has to require enumeration of every difference between verification and production. v1.5 enumerates two specific differences as forbidden; the principle requires enumerating all differences with justification.

## Recommendation

Do **not** patch this run. The recovery already produced report-v15.json which is the canonical v1.5 conformance example. v1.6 gaps (no prompt_verb_analysis, no Historian artifacts, no divergence record, no source: "td" on IP4) are documentation gaps that don't change what we learn from the run.

The most useful continuation is what `principles.md` proposes: a v1.7 amendment that elevates Principle A from "strike specific substitutes" to "enumerate every exception." If that amendment exists, this run becomes the test case — re-running with v1.7 should produce a CV report listing every difference from real-browser execution, with each justified. If the resulting list is short, v1.7's enforcement is well-calibrated. If long, the architecture has discovered a class of silent assumptions worth documenting permanently.
