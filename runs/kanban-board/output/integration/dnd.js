/**
 * dnd: HTML5 drag-and-drop wiring (event delegation).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Dnd = factory();
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

  function getListEl(node) {
    return findAncestor(node, function (n) {
      return n.matches && n.matches('.list[data-list-id]');
    });
  }

  function getCardEl(node) {
    return findAncestor(node, function (n) {
      return n.matches && n.matches('.card[data-card-id]');
    });
  }

  function getCardsContainer(listEl) {
    if (!listEl) return null;
    return listEl.querySelector('[data-role="cards-container"]');
  }

  function computeDropIndex(container, clientY, draggedCardEl) {
    if (!container) return 0;
    var cards = Array.prototype.slice.call(container.querySelectorAll('.card[data-card-id]'));
    var siblings = cards.filter(function (c) { return c !== draggedCardEl; });
    for (var i = 0; i < siblings.length; i++) {
      var rect = siblings[i].getBoundingClientRect();
      var midY = rect.top + rect.height / 2;
      if (clientY < midY) return i;
    }
    return siblings.length;
  }

  function wireDnd(rootEl, stateModel) {
    if (!rootEl) throw new Error('wireDnd: rootEl required');
    if (!stateModel || typeof stateModel.moveCard !== 'function' || typeof stateModel.reorderCard !== 'function') {
      throw new Error('wireDnd: stateModel must expose moveCard and reorderCard');
    }

    var dragging = null;
    var lastOverList = null;

    function clearDragOver() {
      var any = rootEl.querySelectorAll('.list.drag-over');
      for (var i = 0; i < any.length; i++) any[i].classList.remove('drag-over');
      lastOverList = null;
    }

    function onDragStart(e) {
      var cardEl = getCardEl(e.target);
      if (!cardEl) return;
      var cardId = cardEl.getAttribute('data-card-id');
      var fromListId = cardEl.getAttribute('data-list-id');
      if (!cardId || !fromListId) return;
      dragging = { cardId: cardId, fromListId: fromListId, cardEl: cardEl };
      try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', cardId);
      } catch (err) {}
      cardEl.classList.add('dragging');
    }

    function onDragOver(e) {
      if (!dragging) return;
      var listEl = getListEl(e.target);
      if (!listEl) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
      if (lastOverList && lastOverList !== listEl) lastOverList.classList.remove('drag-over');
      listEl.classList.add('drag-over');
      lastOverList = listEl;
    }

    function onDragEnter(e) {
      if (!dragging) return;
      var listEl = getListEl(e.target);
      if (!listEl) return;
      listEl.classList.add('drag-over');
      lastOverList = listEl;
    }

    function onDragLeave(e) {
      var listEl = getListEl(e.target);
      if (!listEl) return;
      var related = e.relatedTarget;
      if (related && listEl.contains(related)) return;
      listEl.classList.remove('drag-over');
      if (lastOverList === listEl) lastOverList = null;
    }

    function onDrop(e) {
      if (!dragging) { clearDragOver(); return; }
      var listEl = getListEl(e.target);
      if (!listEl) {
        clearDragOver();
        if (dragging.cardEl) dragging.cardEl.classList.remove('dragging');
        dragging = null;
        return;
      }
      e.preventDefault();
      var toListId = listEl.getAttribute('data-list-id');
      var container = getCardsContainer(listEl);
      var toIndex = computeDropIndex(container, e.clientY, dragging.cardEl);

      if (toListId === dragging.fromListId) {
        stateModel.reorderCard(dragging.cardId, toListId, toIndex);
      } else {
        stateModel.moveCard(dragging.cardId, dragging.fromListId, toListId, toIndex);
      }
      clearDragOver();
      if (dragging.cardEl) dragging.cardEl.classList.remove('dragging');
      dragging = null;
    }

    function onDragEnd() {
      clearDragOver();
      if (dragging && dragging.cardEl) dragging.cardEl.classList.remove('dragging');
      dragging = null;
    }

    rootEl.addEventListener('dragstart', onDragStart);
    rootEl.addEventListener('dragover', onDragOver);
    rootEl.addEventListener('dragenter', onDragEnter);
    rootEl.addEventListener('dragleave', onDragLeave);
    rootEl.addEventListener('drop', onDrop);
    rootEl.addEventListener('dragend', onDragEnd);

    return {
      unwire: function () {
        rootEl.removeEventListener('dragstart', onDragStart);
        rootEl.removeEventListener('dragover', onDragOver);
        rootEl.removeEventListener('dragenter', onDragEnter);
        rootEl.removeEventListener('dragleave', onDragLeave);
        rootEl.removeEventListener('drop', onDrop);
        rootEl.removeEventListener('dragend', onDragEnd);
      }
    };
  }

  return { wireDnd: wireDnd };
}));
