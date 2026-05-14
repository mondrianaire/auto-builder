// hint-and-review.js — Section 5
// Wires Hint button -> strategyTable.recommendation; renders post-hand review rows.

export function wireHintAndReview(deps) {
  const { stateMachine, strategyTable, dom, helpers } = deps;

  function showHint() {
    const query = stateMachine.getCurrentHintQuery();
    if (!query) return;
    const action = strategyTable.recommendation(query.playerHandSnapshot, query.dealerUpcard);
    if (helpers && typeof helpers.renderHint === 'function') {
      helpers.renderHint(action);
    } else {
      dom.hintDisplay.textContent = action;
    }
  }

  function onHintClick() {
    showHint();
  }
  dom.btnHint.addEventListener('click', onHintClick);

  let prevPhase = null;

  function summarizeHand(snapshot) {
    if (!snapshot) return '';
    const cards = (snapshot.cards || []).map(c => c.rank).join(',');
    const totalBit = snapshot.isSoft ? ('soft ' + snapshot.total) : ('' + snapshot.total);
    const pairBit = snapshot.isPair ? ' pair' : '';
    return cards + ' (' + totalBit + pairBit + ')';
  }

  function renderReview(state) {
    const log = state.decisionLog || [];
    const rows = log.map(entry => {
      const matched = entry.chosenAction === entry.correctAction;
      return {
        chosenAction: entry.chosenAction,
        correctAction: entry.correctAction,
        matched,
        handSnapshotSummary: summarizeHand(entry.playerHandSnapshot)
      };
    });
    if (helpers && typeof helpers.renderReviewRows === 'function') {
      helpers.renderReviewRows(rows);
    } else {
      dom.reviewPanel.innerHTML = '';
      const table = document.createElement('table');
      table.className = 'bj-review-table';
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>#</th><th>Hand</th><th>You played</th><th>Correct</th><th>Match</th></tr>';
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      rows.forEach((row, i) => {
        const tr = document.createElement('tr');
        tr.className = row.matched ? 'bj-row-match' : 'bj-row-mismatch';
        tr.innerHTML = '<td>' + (i + 1) + '</td>'
          + '<td>' + (row.handSnapshotSummary || '') + '</td>'
          + '<td>' + row.chosenAction + '</td>'
          + '<td>' + row.correctAction + '</td>'
          + '<td>' + (row.matched ? 'Yes' : 'No') + '</td>';
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      dom.reviewPanel.appendChild(table);
    }
  }

  function onStateChange(state) {
    if ((state.phase === 'resolved' || state.phase === 'review') && prevPhase !== 'resolved' && prevPhase !== 'review') {
      renderReview(state);
    }
    if (state.phase === 'betting' && prevPhase !== 'betting') {
      if (helpers && typeof helpers.renderReviewRows === 'function') {
        helpers.renderReviewRows([]);
      } else {
        dom.reviewPanel.innerHTML = '';
      }
      if (helpers && typeof helpers.renderHint === 'function') {
        helpers.renderHint('');
      } else if (dom.hintDisplay) {
        dom.hintDisplay.textContent = '';
      }
    }
    prevPhase = state.phase;
  }

  const unsubscribe = stateMachine.subscribe(onStateChange);

  return {
    unwire() {
      dom.btnHint.removeEventListener('click', onHintClick);
      unsubscribe();
    }
  };
}
