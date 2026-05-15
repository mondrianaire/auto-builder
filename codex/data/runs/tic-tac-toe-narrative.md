# tic-tac-toe — Codex narrative

**First-delivery outcome:** Unverified (no first-delivery signal found) _(source: default)_
**Composite (architectural):** shipped_with_concerns
**Verdict (build pipeline):** pass
**Date:** 2026-05-09  ·  **Architecture:** —

## Timeline

### Re-audit  _(14 events)_

- **[reaudit_gate]** _(sev 1)_ [build_complete_handoff] (v1.2) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [tic-tac-toe/v16-reaudit.json](../../runs/tic-tac-toe/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [machine_checkable_assertions_per_ip_lock] (v1.2) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [tic-tac-toe/v16-reaudit.json](../../runs/tic-tac-toe/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [acceptance_assertions_per_section] (v1.3) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [tic-tac-toe/v16-reaudit.json](../../runs/tic-tac-toe/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [cv_artifact_exercise_pass] (v1.3) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [tic-tac-toe/v16-reaudit.json](../../runs/tic-tac-toe/v16-reaudit.json)

- **[reaudit_gate]** [inline_deviation_logging] (v1.4) not_applicable_to_this_run
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [tic-tac-toe/v16-reaudit.json](../../runs/tic-tac-toe/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [cv_artifact_exercise_production_fidelity] (v1.5) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [tic-tac-toe/v16-reaudit.json](../../runs/tic-tac-toe/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [prompt_named_verb_assertion] (v1.5) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [tic-tac-toe/v16-reaudit.json](../../runs/tic-tac-toe/v16-reaudit.json)

- **[reaudit_gate]** [td_introduced_ip_schema] (v1.6) not_applicable_to_this_run
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [tic-tac-toe/v16-reaudit.json](../../runs/tic-tac-toe/v16-reaudit.json)

- **[reaudit_gate]** [integration_final_divergence_record] (v1.6) not_applicable_to_this_run
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [tic-tac-toe/v16-reaudit.json](../../runs/tic-tac-toe/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [historian_build_summary_and_decision_index] (v1.6) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [tic-tac-toe/v16-reaudit.json](../../runs/tic-tac-toe/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [prompt_verb_analysis] (v1.6) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [tic-tac-toe/v16-reaudit.json](../../runs/tic-tac-toe/v16-reaudit.json)

- **[rca_finding]** Incidental: The artifact almost certainly does play tic-tac-toe correctly — the rules engine and UI from inspection look sound. The reclassification is about verification regime conformance, not artifact correct…
  __inferred:_ Re-Verification · _confidence:_ low_  ·  [tic-tac-toe/v16-reaudit.json](../../runs/tic-tac-toe/v16-reaudit.json)

- **[rca_finding]** Incidental: Reflects the v1.0 era of the architecture: static inspection sufficed for the first run because the prompt's domain is small and the architecture's verification gates hadn't been built yet.
  __inferred:_ Re-Verification · _confidence:_ low_  ·  [tic-tac-toe/v16-reaudit.json](../../runs/tic-tac-toe/v16-reaudit.json)

- **[rca_finding]** Incidental: Useful as a baseline of how much the architecture has grown: 7 gates fail not because the build is bad but because the gates didn't exist when the build happened.
  __inferred:_ Re-Verification · _confidence:_ low_  ·  [tic-tac-toe/v16-reaudit.json](../../runs/tic-tac-toe/v16-reaudit.json)


## Source files

- [run-report.md](../../runs/tic-tac-toe/run-report.md)
- [verification report](../../runs/tic-tac-toe/output/verification/report.json)
- [discovery ledger](../../runs/tic-tac-toe/decisions/discovery/ledger-v1.json)
- [TD sections](../../runs/tic-tac-toe/decisions/technical-discovery/sections-v1.json)
- [final/](../../runs/tic-tac-toe/output/final/)
- [audit flags](../../runs/tic-tac-toe/audit/flags.jsonl)
