# blackjack-trainer — Codex narrative

**First-delivery outcome:** Unverified (no first-delivery signal found) _(source: default)_
**Composite (architectural):** shipped_with_concerns
**Verdict (build pipeline):** pass
**Date:** 2026-05-09  ·  **Architecture:** v1.3

## Timeline

### Verification  _(8 events)_

- **[audit_flag]** [writer_permission_compliance] All files attribute to authorized writers per file_schemas.md permission table. Build ran under inline dispatch mode (dispatch_mode='inline' in dag.json and build-complete.json). Coordinator legitimately wrot…
  _**explicit:** Coordinator, Overseer, Builder, Integrator · _inferred:_ CV · _confidence:_ high_  ·  [audit/flags.jsonl](../../runs/blackjack-trainer/audit/flags.jsonl)

- **[audit_flag]** [out_of_scope_presence] Greps over integration source for the 15 out-of-scope items in ledger-v1.json: login/auth/signup/password — no matches; fetch/XHR/network — no matches; sync/share — no matches; player_id/seat/socket — no matches; st…
  __inferred:_ CV · _confidence:_ low_  ·  [audit/flags.jsonl](../../runs/blackjack-trainer/audit/flags.jsonl)

- **[audit_flag]** [schema_conformance] ledger-v1.json: version, created_at, project_name, restatement, assumption_ledger[14], inflection_points[5], out_of_scope[15] all present. sections-v1.json: version, based_on_ledger, inflection_resolutions[5] each with…
  __inferred:_ CV · _confidence:_ low_  ·  [audit/flags.jsonl](../../runs/blackjack-trainer/audit/flags.jsonl)

- **[audit_flag]** [section_coverage] All 7 sections (rules-engine, strategy-table, game-state-machine, ui-render, hint-and-review, app-shell, edge-case-testing) have state file with status='verified', have output files referenced in output/builders/{section…
  __inferred:_ CV · _confidence:_ low_  ·  [audit/flags.jsonl](../../runs/blackjack-trainer/audit/flags.jsonl)

- **[audit_flag]** [charter_implementation_conformance] IP1.A1 S17: rules-engine.js line 120 'if (score.total >= 17) break' fires regardless of soft — soft 17 stands. IP1.A2 DAS: rules-engine.js lines 101-103 'cards.length===2 && !hasHit' allows double on sp…
  __inferred:_ CV · _confidence:_ low_  ·  [audit/flags.jsonl](../../runs/blackjack-trainer/audit/flags.jsonl)

- **[audit_flag]** [sev0_audit] Directory contains only .gitkeep — no Sev 0 fixes applied during this run, consistent with Coordinator's claim in build-complete.json summary. No scope_check claims to audit.
  _**explicit:** Coordinator · _inferred:_ CV · _confidence:_ high_  ·  [audit/flags.jsonl](../../runs/blackjack-trainer/audit/flags.jsonl)

- **[audit_flag]** [acceptance_assertion_coverage] Every section has acceptance_assertions[] populated. Section 1: 6 assertions (S1.A1-A6) covering totals, blackjack/bust flags, legal actions, S17 dealer, 3:2 payout, Node-loadable purity. Section 2: 3 assert…
  __inferred:_ CV · _confidence:_ low_  ·  [audit/flags.jsonl](../../runs/blackjack-trainer/audit/flags.jsonl)

- **[audit_flag]** [critical_user_flow_assertions] S3.A5 verified-in-source: game-state-machine.js dispatch() case 'deal' lines 313-316: 'if (state.phase==="betting") mutated=doDeal(); else if (state.phase==="resolved"||state.phase==="review") mutated=doNext…
  __inferred:_ CV · _confidence:_ low_  ·  [audit/flags.jsonl](../../runs/blackjack-trainer/audit/flags.jsonl)


### Re-audit  _(11 events)_

- **[reaudit_gate]** [build_complete_handoff] (v1.2) pass
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack-trainer/v16-reaudit.json](../../runs/blackjack-trainer/v16-reaudit.json)

- **[reaudit_gate]** [machine_checkable_assertions_per_ip_lock] (v1.2) needs_inspection
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack-trainer/v16-reaudit.json](../../runs/blackjack-trainer/v16-reaudit.json)

- **[reaudit_gate]** [acceptance_assertions_per_section] (v1.3) needs_inspection
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack-trainer/v16-reaudit.json](../../runs/blackjack-trainer/v16-reaudit.json)

- **[reaudit_gate]** [cv_artifact_exercise_pass] (v1.3) needs_inspection
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack-trainer/v16-reaudit.json](../../runs/blackjack-trainer/v16-reaudit.json)

- **[reaudit_gate]** [cv_artifact_exercise_production_fidelity] (v1.5) fail_likely
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack-trainer/v16-reaudit.json](../../runs/blackjack-trainer/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [prompt_named_verb_assertion] (v1.5) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack-trainer/v16-reaudit.json](../../runs/blackjack-trainer/v16-reaudit.json)

- **[reaudit_gate]** [historian_build_summary_and_decision_index] (v1.6) needs_inspection
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack-trainer/v16-reaudit.json](../../runs/blackjack-trainer/v16-reaudit.json)

- **[reaudit_gate]** _(sev 1)_ [prompt_verb_analysis] (v1.6) fail
  _**explicit:** Re-Verification · _confidence:_ high_  ·  [blackjack-trainer/v16-reaudit.json](../../runs/blackjack-trainer/v16-reaudit.json)

- **[rca_finding]** Incidental: This run was more sophisticated than the original blackjack run — has build-complete.json, full verification report with assumption checks, populated final/. It's closer to passing v1.6 than blackjac…
  __inferred:_ Re-Verification · _confidence:_ low_  ·  [blackjack-trainer/v16-reaudit.json](../../runs/blackjack-trainer/v16-reaudit.json)

- **[rca_finding]** Incidental: The two definite failures are PNV and prompt_verb_analysis, both v1.5/v1.6 gates that postdate this run. The 'needs_inspection' items might pass; a more thorough audit pass would resolve them.
  __inferred:_ Re-Verification · _confidence:_ low_  ·  [blackjack-trainer/v16-reaudit.json](../../runs/blackjack-trainer/v16-reaudit.json)

- **[rca_finding]** Incidental: If the trainer artifact actually trains the user on blackjack correctly (which the run-report claims it does), the failures here are documentation/structure, not behavior.
  __inferred:_ Re-Verification · _confidence:_ low_  ·  [blackjack-trainer/v16-reaudit.json](../../runs/blackjack-trainer/v16-reaudit.json)


## Source files

- [run-report.md](../../runs/blackjack-trainer/run-report.md)
- [verification report](../../runs/blackjack-trainer/output/verification/report.json)
- [discovery ledger](../../runs/blackjack-trainer/decisions/discovery/ledger-v1.json)
- [TD sections](../../runs/blackjack-trainer/decisions/technical-discovery/sections-v1.json)
- [final/](../../runs/blackjack-trainer/output/final/)
- [audit flags](../../runs/blackjack-trainer/audit/flags.jsonl)
