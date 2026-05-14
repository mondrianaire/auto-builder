/**
 * interactions: event delegation for non-DnD UI events.
 * Click + keyboard handlers for:
 *   - [data-action='add-list']     -> inline input for new list name -> createList
 *   - [data-action='add-card']     -> inline input for new card title -> createCard
 *   - [data-role='list-title']     -> click to rename -> renameList
 *   - [data-action='delete-list']  -> deleteList (confirms only if list has cards)
 *   - [data-card-id] (card click)  -> edit card title -> editCard
 *   - [data-action='delete-card']  -> deleteCard
 *
 * Empty/whitespace input is rejected client-side without calling the mutation.
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

  function matchAction(node) {
    if (!node || !node.matches) return null;
    if (node.matches("[data-action='add-list']")) return 'add-list';
    if (node.matches("[data-action='add-card']")) return 'add-card';
    if (node.matches("[data-action='delete-list']")) return 'delete-list';
    if (node.matches("[data-action='delete-card']")) return 'delete-card';
    return null;
  }

  function nearestActionable(target) {
    return findAncestor(target, function (n) {
      return n.hasAttribute && (n.hasAttribute('data-action'));
    });
  }

  // Replace `el` with a temporary input field. On commit (Enter/blur), call
  // onCommit(value); on cancel (Escape), call onCancel(). The element is
  // restored when the renderer next runs (state mutation triggers re-render).
  function inlineEdit(originalEl, initialValue, placeholder, onCommit, onCancel) {
    var input = document.createElement('input');
    input.type = 'text';
    input.value = initialValue || '';
    input.className = 'inline-edit';
    if (placeholder) input.placeholder = placeholder;
    var done = false;

    function commit() {
      if (done) return;
      done = true;
      var v = input.value;
      onCommit(v);
    }
    function cancel() {
      if (done) return;
      done = true;
      if (onCancel) onCancel();
      // Restore original element if still attached
      if (input.parentNode && originalEl && !originalEl.parentNode) {
        input.parentNode.replaceChild(originalEl, input);
      } else if (input.parentNode) {
        input.parentNode.removeChild(input);
        if (originalEl && !originalEl.parentNode && originalEl.__parent) {
          originalEl.__parent.appendChild(originalEl);
        }
      }
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });
    input.addEventListener('blur', function () { commit(); });

    if (originalEl && originalEl.parentNode) {
      originalEl.parentNode.replaceChild(input, originalEl);
    }
    input.focus();
    if (typeof input.select === 'function') input.select();
    return input;
  }

  // Append an inline input as a new child of `parentEl` (used for "add card"
  // and "add list" where there's no element to replace).
  function inlineAddInput(parentEl, placeholder, onCommit) {
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
    input.addEventListener('blur', function () { commit(); });
    parentEl.appendChild(input);
    input.focus();
    return input;
  }

  function wireInteractions(rootEl, stateModel) {
    if (!rootEl) throw new Error('wireInteractions: rootEl required');
    if (!stateModel) throw new Error('wireInteractions: stateModel required');

    function onClick(e) {
      var target = e.target;

      // Action buttons
      var actionEl = nearestActionable(target);
      var action = actionEl ? matchAction(actionEl) : null;

      if (action === 'add-list') {
        e.preventDefault();
        var board = rootEl.querySelector('[data-role="board"]') || rootEl;
        // Insert input before the add-list button
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'inline-add';
        input.placeholder = 'List name';
        var done = false;
        function commitList() {
          if (done) return;
          done = true;
          var v = input.value;
          if (input.parentNode) input.parentNode.removeChild(input);
          if (typeof v === 'string' && v.trim().length > 0) {
            stateModel.createList(v.trim());
          }
        }
        input.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') { ev.preventDefault(); commitList(); }
          else if (ev.key === 'Escape') { ev.preventDefault(); done = true; if (input.parentNode) input.parentNode.removeChild(input); }
        });
        input.addEventListener('blur', commitList);
        board.insertBefore(input, actionEl);
        input.focus();
        return;
      }

      if (action === 'add-card') {
        e.preventDefault();
        var listId = actionEl.getAttribute('data-list-id');
        var listEl = rootEl.querySelector(".list[data-list-id='" + cssEscape(listId) + "']");
        if (!listEl) return;
        var container = listEl.querySelector("[data-role='cards-container']");
        if (!container) return;
        inlineAddInput(container, 'Card title', function (v) {
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
        var input2 = inlineEdit(titleEl, current, 'List name', function (v) {
          if (typeof v === 'string' && v.trim().length > 0 && v.trim() !== current) {
            stateModel.renameList(listId3, v.trim());
          } else if (input2.parentNode) {
            // No change; trigger a re-render by getState (no-op) — render survives
            input2.parentNode.replaceChild(titleEl, input2);
          }
        });
        return;
      }

      // Click on card (but not on the delete control) -> edit title
      var cardEl = findAncestor(target, function (n) {
        return n.matches && n.matches('.card[data-card-id]');
      });
      if (cardEl) {
        // Ignore clicks that are actually on a button inside the card (already handled)
        if (target.closest && target.closest("[data-action='delete-card']")) return;
        e.preventDefault();
        var cardId2 = cardEl.getAttribute('data-card-id');
        var titleSpan = cardEl.querySelector("[data-role='card-title']");
        if (!titleSpan) return;
        var currentTitle = titleSpan.textContent;
        var inp = inlineEdit(titleSpan, currentTitle, 'Card title', function (v) {
          if (typeof v === 'string' && v.trim().length > 0 && v.trim() !== currentTitle) {
            stateModel.editCard(cardId2, v.trim());
          } else if (inp.parentNode) {
            inp.parentNode.replaceChild(titleSpan, inp);
          }
        });
        return;
      }
    }

    function cssEscape(s) {
      // Minimal escape for attribute selector embedding
      return String(s).replace(/(['"\\])/g, '\\$1');
    }

    rootEl.addEventListener('click', onClick);

    return {
      unwire: function () {
        rootEl.removeEventListener('click', onClick);
      }
    };
  }

  return { wireInteractions: wireInteractions };
}));
