/**
 * interactions: event-delegation glue for non-DnD UI events.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Interactions = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function findAncestor(node, predicate) {
    while (node && node !== document) {
      if (node.nodeType === 1 && predicate(node)) return node;
      node = node.parentNode;
    }
    return null;
  }

  function inlineEdit(originalEl, initialValue, placeholder, onCommit) {
    var input = document.createElement('input');
    input.type = 'text';
    input.value = initialValue || '';
    input.className = 'inline-edit';
    if (placeholder) input.placeholder = placeholder;
    var done = false;
    function commit() { if (done) return; done = true; onCommit(input.value); }
    function cancel() {
      if (done) return;
      done = true;
      if (input.parentNode && originalEl) input.parentNode.replaceChild(originalEl, input);
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });
    input.addEventListener('blur', function () { commit(); });
    if (originalEl && originalEl.parentNode) originalEl.parentNode.replaceChild(input, originalEl);
    input.focus();
    if (typeof input.select === 'function') input.select();
    return input;
  }

  function inlineAddInput(parentEl, beforeEl, placeholder, onCommit) {
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-add';
    input.placeholder = placeholder || '';
    var done = false;
    function commit() {
      if (done) return;
      done = true;
      var v = input.value;
      if (input.parentNode) input.parentNode.removeChild(input);
      onCommit(v);
    }
    function cancel() {
      if (done) return;
      done = true;
      if (input.parentNode) input.parentNode.removeChild(input);
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });
    input.addEventListener('blur', commit);
    if (beforeEl && beforeEl.parentNode === parentEl) {
      parentEl.insertBefore(input, beforeEl);
    } else {
      parentEl.appendChild(input);
    }
    input.focus();
    return input;
  }

  function cssEscape(s) {
    return String(s).replace(/(['"\\])/g, '\\$1');
  }

  function wireInteractions(rootEl, stateModel) {
    if (!rootEl) throw new Error('wireInteractions: rootEl required');
    if (!stateModel) throw new Error('wireInteractions: stateModel required');

    function onClick(e) {
      var target = e.target;

      var actionEl = findAncestor(target, function (n) {
        return n.hasAttribute && n.hasAttribute('data-action');
      });
      var action = actionEl ? actionEl.getAttribute('data-action') : null;

      if (action === 'add-list') {
        e.preventDefault();
        var board = rootEl.querySelector('[data-role="board"]') || rootEl;
        inlineAddInput(board, actionEl, 'List name', function (v) {
          if (typeof v === 'string' && v.trim().length > 0) {
            stateModel.createList(v.trim());
          }
        });
        return;
      }

      if (action === 'add-card') {
        e.preventDefault();
        var listId = actionEl.getAttribute('data-list-id');
        var listEl = rootEl.querySelector(".list[data-list-id='" + cssEscape(listId) + "']");
        if (!listEl) return;
        var container = listEl.querySelector("[data-role='cards-container']");
        if (!container) return;
        inlineAddInput(container, null, 'Card title', function (v) {
          if (typeof v === 'string' && v.trim().length > 0) {
            stateModel.createCard(listId, v.trim());
          }
        });
        return;
      }

      if (action === 'delete-list') {
        e.preventDefault();
        var listId2 = actionEl.getAttribute('data-list-id');
        var state = stateModel.getState();
        var hasCards = false;
        for (var i = 0; i < state.lists.length; i++) {
          if (state.lists[i].id === listId2) {
            hasCards = state.lists[i].cards.length > 0;
            break;
          }
        }
        if (hasCards) {
          var ok = (typeof confirm === 'function')
            ? confirm('Delete this list and all its cards?')
            : true;
          if (!ok) return;
        }
        stateModel.deleteList(listId2);
        return;
      }

      if (action === 'delete-card') {
        e.preventDefault();
        e.stopPropagation();
        var cardId = actionEl.getAttribute('data-card-id');
        stateModel.deleteCard(cardId);
        return;
      }

      // Click on list title -> rename
      var titleEl = findAncestor(target, function (n) {
        return n.matches && n.matches("[data-role='list-title']");
      });
      if (titleEl) {
        e.preventDefault();
        var listId3 = titleEl.getAttribute('data-list-id');
        var current = titleEl.textContent;
        inlineEdit(titleEl, current, 'List name', function (v) {
          if (typeof v === 'string' && v.trim().length > 0 && v.trim() !== current) {
            stateModel.renameList(listId3, v.trim());
          } else {
            // No-op trigger re-render to restore the title element
            stateModel.subscribe && stateModel.getState && void stateModel.getState();
            // Also: directly trigger by pushing a benign no-op (rename with same value rejected by trim equality, so just call rename to force notify)
            // Actually call notify-equivalent via setState with current state:
            if (typeof stateModel.setState === 'function') stateModel.setState(stateModel.getState());
          }
        });
        return;
      }

      // Click on card (not delete) -> edit title
      var cardEl = findAncestor(target, function (n) {
        return n.matches && n.matches('.card[data-card-id]');
      });
      if (cardEl) {
        if (target.closest && target.closest("[data-action='delete-card']")) return;
        e.preventDefault();
        var cardId2 = cardEl.getAttribute('data-card-id');
        var titleSpan = cardEl.querySelector("[data-role='card-title']");
        if (!titleSpan) return;
        var currentTitle = titleSpan.textContent;
        inlineEdit(titleSpan, currentTitle, 'Card title', function (v) {
          if (typeof v === 'string' && v.trim().length > 0 && v.trim() !== currentTitle) {
            stateModel.editCard(cardId2, v.trim());
          } else {
            if (typeof stateModel.setState === 'function') stateModel.setState(stateModel.getState());
          }
        });
        return;
      }
    }

    rootEl.addEventListener('click', onClick);

    return {
      unwire: function () { rootEl.removeEventListener('click', onClick); }
    };
  }

  return { wireInteractions: wireInteractions };
}));
