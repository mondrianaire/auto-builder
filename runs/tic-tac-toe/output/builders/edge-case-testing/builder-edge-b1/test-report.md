# Edge Case Test Report
Generated: 2026-05-09T21:20:53.649Z

Pass: 46 / 46

[PASS] win line row 1 for X
[PASS] win line row 2 for X
[PASS] win line row 3 for X
[PASS] win line col 1 for X
[PASS] win line col 2 for X
[PASS] win line col 3 for X
[PASS] win line diag TL-BR for X
[PASS] win line diag TR-BL for X
[PASS] win line row 1 for O
[PASS] win line row 2 for O
[PASS] win line row 3 for O
[PASS] win line col 1 for O
[PASS] win line col 2 for O
[PASS] win line col 3 for O
[PASS] win line diag TL-BR for O
[PASS] win line diag TR-BL for O
[PASS] draw detection on full non-winning board
[PASS] illegal click on filled cell rejected via WRONG-state error
[PASS] illegal click out of range rejected
[PASS] wrong player rejected
[PASS] input not mutated by applyMove
[PASS] legalMoves returns ascending indices
[PASS] legalMoves on full board is empty
[PASS] AI takes immediate win when available (row)
[PASS] AI takes immediate win when available (column)
[PASS] AI takes immediate win when available (diagonal)
[PASS] AI blocks immediate loss (row)
[PASS] AI blocks immediate loss (column)
[PASS] AI blocks immediate loss (diagonal)
[PASS] AI takes center when nothing forces it
[PASS] AI takes corner when center is filled
[PASS] AI takes edge when no win/block, center taken, no free corner
[PASS] AI win-priority beats block-priority
[PASS] AI does not mutate input state
[PASS] AI returns a legal move on a near-full board
[PASS] ui-render: mount + initial render produces 9 empty cells, status, restart
[PASS] ui-render: filled cell shows symbol, has --filled and --x/--o, button.disabled=true
[PASS] ui-render: winning line applies --win class to the 3 indices
[PASS] ui-render: cell click on empty enabled cell fires handler with index; ignored when disabled
[PASS] ui-render: restart handler fires on restart click
[PASS] index.html: loads CSS + 4 JS in correct order, no external URLs
[PASS] controller.js: composes RE + AI + UI; uses setTimeout for AI delay; no DOM mutation outside UI
[PASS] controller.js: defensive ignore of clicks on filled cell or after game-over
[PASS] no-network / no-persistence: no fetch/XMLHttpRequest/localStorage in any artifact
[PASS] integrated turn flow simulation (controller-level) using rules-engine + ai-opponent
[PASS] restart logic: createBoard from any state returns clean GameState
