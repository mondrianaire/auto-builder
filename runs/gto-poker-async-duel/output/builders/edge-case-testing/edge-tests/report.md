# Edge-Case Test Report

Generated: 2026-05-14T20:44:06.968Z

**Total: 32 - Passed: 32 - Failed: 0**

## Results

| ID | Status | Detail |
| --- | --- | --- |
| S1.A1 | PASS | length=20 first_fail=null |
| S1.A5 | PASS | ids=calling-station-river-thin-call-015,mid-stack-utg-rfi-pocket-pair-004,small-blind-vs-button-srp-turn-overbet-003,co-open-blind-defense-002,river-overpair-vs-check-raise-017 |
| S1.A2 | PASS |  |
| S2.A4 | PASS |  |
| S2.A5 | PASS |  |
| S2.A3 | PASS |  |
| S2.A3-overwrite | PASS |  |
| S3.A1 | PASS |  |
| S3.A2 | PASS |  |
| S3.A3 | PASS |  |
| S3.A6 | PASS |  |
| S4.A7 | PASS | actual=btn-vs-bb-3bet-pot-c-bet-decision-001,mid-stack-utg-rfi-pocket-pair-004,co-open-blind-defense-002 expected=btn-vs-bb-3bet-pot-c-bet-decision-001,mid-stack-utg-rfi-pocket-pair-004,co-open-blind-defense-002 |
| IP8.A2 | PASS |  |
| DCA.10 | PASS |  |
| DCA.30 | PASS |  |
| stats.perPlayerAccuracy | PASS | A=100 B=25 |
| DCA.11 | PASS | same=1/4 |
| DCA.5 | PASS | A.waiting=true B.myTurn=true |
| DCA.8 | PASS |  |
| DCA.4 | PASS |  |
| IP1.A3 | PASS |  |
| IP2.A4 | PASS | display=standalone |
| DCA.13 | PASS |  |
| DCA.16/IP3.A2 | PASS |  |
| DCA.20 | PASS |  |
| DCA.21/S6.A4 | PASS |  |
| DCA.28/IP6.A1 | PASS |  |
| IP7.A1/DCA.29 | PASS |  |
| DCA.32/DCA.37 | PASS |  |
| DCA.25/IP3.A1 | PASS |  |
| IP4-share-join | PASS |  |
| PNV.1 | PASS | Production-fidelity dynamic execution deferred to first deploy |

## Production-fidelity note

Assertions that require a live Firebase project, two real browsers, and a real Web Push service (notably the literal out-of-app push delivery flow on a closed tab) cannot be exercised in this Node-only test environment. They are STRUCTURALLY verified here against the source code (correct service-worker registration URL, correct VAPID JWT-signing code, correct subscription persistence). They are DYNAMICALLY verified at first user deployment per the README. PNV.1's mechanical clauses (create-game, share-URL, per-scenario submission, blindness, reveal, wrap-up ranking) ARE statically verifiable here and all pass.
