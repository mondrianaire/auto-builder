/**
 * ui-render: pure renderer. Reads BoardState from state-model and produces DOM.
 * Re-renders on subscribe. Does NOT mutate state, does NOT handle drag events.
 *
 * Contract guarantees:
 *  - Card elements: [data-card-id], draggable=true, inside an element with [data-list-id].
 *  - List elements: [data-list-id]. Drop zone for dnd.
 *  - Stable selectors (per ui-render--interactions contract):
 *      [data-action='add-list']
 *      [data-action='add-card'][data-list-id]
 *      [data-role='list-title'][data-list-id]
 *      [data-action='delete-list'][data-list-id]
 *      [data-action='delete-card'][data-card-id]
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.UiRender = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (k === 'className') { n.className = v; }
        else if (k === 'text') { n.textContent = v; }
        else { n.setAttribute(k, v); }
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i++) {
        if (children[i] != null) n.appendChild(children[i]);
      }
    }
    return n;
  }

  function renderCard(card, listId) {
    var titleEl = el('span', { className: 'card-title', 'data-role': 'card-title' });
    titleEl.textContent = card.title;

    var del = el('button', {
      className: 'card-delete',
      'data-action': 'delete-card',
      'data-card-id': card.id,
      type: 'button',
      'aria-label': 'Delete card'
    });
    del.textContent = '×';

    var cardEl = el('div', {
      className: 'card',
      'data-card-id': card.id,
      'data-list-id': listId,
      draggable: 'true'
    }, [titleEl, del]);
    return cardEl;
  }

  function renderList(list) {
    var titleEl = el('h2', {
      className: 'list-title',
      'data-role': 'list-title',
      'data-list-id': list.id
    });
    titleEl.textContent = list.name;

    var deleteBtn = el('button', {
      className: 'list-delete',
      'data-action': 'delete-list',
      'data-list-id': list.id,
      type: 'button',
      'aria-label': 'Delete list'
    });
    deleteBtn.textContent = '×';

    var header = el('div', { className: 'list-header' }, [titleEl, deleteBtn]);

    var cardsContainer = el('div', { className: 'list-cards', 'data-role': 'cards-container', 'data-list-id': list.id });
    for (var i = 0; i < list.cards.length; i++) {
      cardsContainer.appendChild(renderCard(list.cards[i], list.id));
    }

    var addCardBtn = el('button', {
      className: 'add-card',
      'data-action': 'add-card',
      'data-list-id': list.id,
      type: 'button'
    });
    addCardBtn.textContent = '+ Add card';

    var listEl = el('section', {
      className: 'list',
      'data-list-id': list.id
    }, [header, cardsContainer, addCardBtn]);
    return listEl;
  }

  function renderAddListAffordance() {
    var btn = el('button', {
      className: 'add-list',
      'data-action': 'add-list',
      type: 'button'
    });
    btn.textContent = '+ Add list';
    return btn;
  }

  function renderBoard(state) {
    var board = el('div', { className: 'board', 'data-role': 'board' });
    for (var i = 0; i < state.lists.length; i++) {
      board.appendChild(renderList(state.lists[i]));
    }
    board.appendChild(renderAddListAffordance());
    return board;
  }

  function mountRenderer(rootEl, stateModel) {
    if (!rootEl || typeof rootEl.appendChild !== 'function') {
      throw new Error('mountRenderer: rootEl must be an HTMLElement');
    }
    if (!stateModel || typeof stateModel.getState !== 'function' || typeof stateModel.subscribe !== 'function') {
      throw new Error('mountRenderer: stateModel must expose getState and subscribe');
    }

    function doRender() {
      var state = stateModel.getState();
      // Clear and re-render. Simple approach; preserves selectors.
      while (rootEl.firstChild) rootEl.removeChild(rootEl.firstChild);
      rootEl.appendChild(renderBoard(state));
    }

    doRender();
    var unsubscribe = stateModel.subscribe(function () { doRender(); });

    return {
      unmount: function () {
        if (typeof unsubscribe === 'function') unsubscribe();
        while (rootEl.firstChild) rootEl.removeChild(rootEl.firstChild);
      },
      rerender: doRender
    };
  }

  return {
    mountRenderer: mountRenderer,
    _renderBoard: renderBoard
  };
}));
