# latex-equation-renderer — Codex narrative

**First-delivery outcome:** Failed — user had to re-prompt _(source: run_report_status)_
**Composite (architectural):** reclassified
**Verdict (build pipeline):** failed_recovered
**Date:** 2026-05-10  ·  **Architecture:** v1.4 (initial run); v1.5 (recovery)

## Timeline

### Re-audit  _(15 events)_

- **[reaudit_gate]** [build_complete_handoff] (v1.2) pass
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [latex-equation-renderer/v16-reaudit.json](../../runs/latex-equation-renderer/v16-reaudit.json)

- **[reaudit_gate]** [machine_checkable_assertions_per_ip_lock] (v1.2) pass
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [latex-equation-renderer/v16-reaudit.json](../../runs/latex-equation-renderer/v16-reaudit.json)

- **[reaudit_gate]** [acceptance_assertions_per_section] (v1.3) pass
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [latex-equation-renderer/v16-reaudit.json](../../runs/latex-equation-renderer/v16-reaudit.json)

- **[reaudit_gate]** [cv_artifact_exercise_pass] (v1.3) pass
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [latex-equation-renderer/v16-reaudit.json](../../runs/latex-equation-renderer/v16-reaudit.json)

- **[reaudit_gate]** [cv_artifact_exercise_production_fidelity] (v1.5) pass
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [latex-equation-renderer/v16-reaudit.json](../../runs/latex-equation-renderer/v16-reaudit.json)

- **[reaudit_gate]** [prompt_named_verb_assertion] (v1.5) pass
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [latex-equation-renderer/v16-reaudit.json](../../runs/latex-equation-renderer/v16-reaudit.json)

- **[reaudit_gate]** [inline_deviation_logging] (v1.4) pass
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [latex-equation-renderer/v16-reaudit.json](../../runs/latex-equation-renderer/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [td_introduced_ip_schema] (v1.6) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [latex-equation-renderer/v16-reaudit.json](../../runs/latex-equation-renderer/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [integration_final_divergence_record] (v1.6) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [latex-equation-renderer/v16-reaudit.json](../../runs/latex-equation-renderer/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [historian_build_summary_and_decision_index] (v1.6) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [latex-equation-renderer/v16-reaudit.json](../../runs/latex-equation-renderer/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [prompt_verb_analysis] (v1.6) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [latex-equation-renderer/v16-reaudit.json](../../runs/latex-equation-renderer/v16-reaudit.json)

- **[rca_finding]** Incidental: All v1.5 gates pass cleanly — this run is the canonical post-v1.5-recovery example.
  __inferred:_ Re-Verification · _confidence:_ low_  ·  [latex-equation-renderer/v16-reaudit.json](../../runs/latex-equation-renderer/v16-reaudit.json)

- **[rca_finding]** Incidental: All four v1.6 failures are pure documentation/structure additions, no behavioral concerns. The artifact is verifiably correct under production fidelity.
  __inferred:_ Re-Verification · _confidence:_ low_  ·  [latex-equation-renderer/v16-reaudit.json](../../runs/latex-equation-renderer/v16-reaudit.json)

- **[rca_finding]** Incidental: The four failures are exactly the gates that v1.6 was designed to introduce based on this run's experience. The latex run is both the proof v1.5 works and the motivation for v1.6.
  __inferred:_ Re-Verification · _confidence:_ low_  ·  [latex-equation-renderer/v16-reaudit.json](../../runs/latex-equation-renderer/v16-reaudit.json)

- **[rca_finding]** Incidental: Patches needed are surgical and additive: add 4 fields/files. No artifact code touched.
  __inferred:_ Re-Verification · _confidence:_ low_  ·  [latex-equation-renderer/v16-reaudit.json](../../runs/latex-equation-renderer/v16-reaudit.json)


### Post-delivery / user contact  _(2 events)_

- **[reclassification]** STATUS: FAILED → RECOVERED under v1.5 (reclassified 2026-05-10).
  __confidence:_ low_  ·  [latex-equation-renderer/run-report.md](../../runs/latex-equation-renderer/run-report.md)

- **[user_first_contact_failure]** Original delivery was reclassified as failed: delivered, CV pass — **WRONG** (see addendum)
  _**explicit:** CV · _confidence:_ high_  ·  [latex-equation-renderer/run-report.md](../../runs/latex-equation-renderer/run-report.md)


## Source files

- [run-report.md](../../runs/latex-equation-renderer/run-report.md)
- [verification report](../../runs/latex-equation-renderer/output/verification/report.json)
- [discovery ledger](../../runs/latex-equation-renderer/decisions/discovery/ledger-v1.json)
- [TD sections](../../runs/latex-equation-renderer/decisions/technical-discovery/sections-v1.json)
- [final/](../../runs/latex-equation-renderer/output/final/)
- [audit flags](../../runs/latex-equation-renderer/audit/flags.jsonl)
