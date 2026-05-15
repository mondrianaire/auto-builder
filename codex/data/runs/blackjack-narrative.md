# blackjack — Codex narrative

**First-delivery outcome:** Failed — user had to re-prompt _(source: run_report_status)_
**Composite (architectural):** reclassified
**Verdict (build pipeline):** failed_recovered
**Date:** 2026-05-09  ·  **Architecture:** —

## Timeline

### Re-audit  _(12 events)_

- **[reaudit_gate]** _(sev 1)_ [build_complete_handoff] (v1.2) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack/v16-reaudit.json](../../runs/blackjack/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [delivery_checklist] (v1.2) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack/v16-reaudit.json](../../runs/blackjack/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [machine_checkable_assertions_per_ip_lock] (v1.2) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack/v16-reaudit.json](../../runs/blackjack/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [acceptance_assertions_per_section] (v1.3) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack/v16-reaudit.json](../../runs/blackjack/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [cv_artifact_exercise_pass] (v1.3) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack/v16-reaudit.json](../../runs/blackjack/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [cv_artifact_exercise_production_fidelity] (v1.5) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack/v16-reaudit.json](../../runs/blackjack/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [prompt_named_verb_assertion] (v1.5) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack/v16-reaudit.json](../../runs/blackjack/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [historian_build_summary_and_decision_index] (v1.6) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack/v16-reaudit.json](../../runs/blackjack/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [prompt_verb_analysis] (v1.6) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack/v16-reaudit.json](../../runs/blackjack/v16-reaudit.json)

- **[rca_finding]** Incidental: The artifact also has the Deal-button-disabled defect (per the conversation context where another Claude found it post-delivery). That is a real artifact defect on top of the verification regime gaps.
  __inferred:_ Re-Verification · _confidence:_ low_  ·  [blackjack/v16-reaudit.json](../../runs/blackjack/v16-reaudit.json)

- **[rca_finding]** Incidental: The IP2 shoe drift (per-round vs per-session) is also a real artifact deviation from the locked spec.
  __inferred:_ Re-Verification · _confidence:_ low_  ·  [blackjack/v16-reaudit.json](../../runs/blackjack/v16-reaudit.json)

- **[rca_finding]** Incidental: This run failed on every load-bearing v1.2-onward gate. It is the canonical example of why the architecture has grown the gates it has.
  __inferred:_ Re-Verification · _confidence:_ low_  ·  [blackjack/v16-reaudit.json](../../runs/blackjack/v16-reaudit.json)


### Post-delivery / user contact  _(2 events)_

- **[reclassification]** STATUS: RECLASSIFIED FAILED (2026-05-10).
  __confidence:_ low_  ·  [blackjack/run-report.md](../../runs/blackjack/run-report.md)

- **[user_first_contact_failure]** Original delivery was reclassified as failed: pass_with_concerns (13/13 assumption checks, 15/15 out-of-scope checks, both inflection points honored; concerns are TD-level tightenings, not spec violations)…
  _**explicit:** TD, CV · _confidence:_ high_  ·  [blackjack/run-report.md](../../runs/blackjack/run-report.md)


## Source files

- [run-report.md](../../runs/blackjack/run-report.md)
- [verification report](../../runs/blackjack/output/verification/report.json)
- [discovery ledger](../../runs/blackjack/decisions/discovery/ledger-v1.json)
- [TD sections](../../runs/blackjack/decisions/technical-discovery/sections-v1.json)
- [final/](../../runs/blackjack/output/final/)
- [audit flags](../../runs/blackjack/audit/flags.jsonl)
