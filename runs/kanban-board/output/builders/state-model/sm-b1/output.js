/**
 * state-model: pure JS data model for the kanban board.
 * No DOM, no localStorage. Reducer-style mutations + subscribe/notify.
 *
 * BoardState shape:
 *   { lists: Array<{ id: string, name: string, cards: Array<{ id: string, title: string }> }> }
 *
 * Per IP1: cards have ONLY {id, title}.
 * Per IP2: there is no reorderList — list order is creation order.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StateModel = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // --- id generation ----------------------------------------------------
  var __idCounter = 0;
  function genId(prefix) {
    __idCounter += 1;
    // Combine timestamp, counter, and random for uniqueness even across rapid calls.
    var rand = Math.random().toString(36).slice(2, 8);
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + __idCounter.toString(36) + '-' + rand;
  }

  // --- helpers ----------------------------------------------------------
  function isNonEmptyString(s) {
    return typeof s === 'string' && s.trim().length > 0;
  }

  function deepCloneState(state) {
    return {
      lists: state.lists.map(function (l) {
        return {
          id: l.id,
          name: l.name,
          cards: l.cards.map(function (c) { return { id: c.id, title: c.title }; })
        };
      })
    };
  }

  function findListIndex(state, listId) {
    for (var i = 0; i < state.lists.length; i++) {
      if (state.lists[i].id === listId) return i;
    }
    return -1;
  }

  function findCardLocation(state, cardId) {
    for (var i = 0; i < state.lists.length; i++) {
      for (var j = 0; j < state.lists[i].cards.length; j++) {
        if (state.lists[i].cards[j].id === cardId) {
          return { listIndex: i, cardIndex: j };
        }
      }
    }
    return null;
  }

  function buildDefaultSeed() {
    return {
      lists: [
        { id: genId('list'), name: 'To Do', cards: [] },
        { id: genId('list'), name: 'Doing', cards: [] },
        { id: genId('list'), name: 'Done', cards: [] }
      ]
    };
  }

  // --- factory ----------------------------------------------------------
  function createStateModel(initialState) {
    var state;
    if (initialState && typeof initialState === 'object' && Array.isArray(initialState.lists)) {
      state = deepCloneState(initialState);
    } else {
      state = buildDefaultSeed();
    }

    var listeners = [];

    function notify() {
      var snapshot = getState();
      for (var i = 0; i < listeners.length; i++) {
        try { listeners[i](snapshot); } catch (e) { /* swallow listener errors */ }
      }
    }

    function getState() {
      return deepCloneState(state);
    }

    function setState(newState) {
      if (!newState || typeof newState !== 'object' || !Array.isArray(newState.lists)) return;
      state = deepCloneState(newState);
      notify();
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') return function () {};
      listeners.push(listener);
      return function unsubscribe() {
        var idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    }

    // --- mutations ------------------------------------------------------
    function createList(name) {
      if (!isNonEmptyString(name)) return null;
      var id = genId('list');
      state.lists.push({ id: id, name: name.trim(), cards: [] });
      notify();
      return id;
    }

    function renameList(listId, name) {
      if (!isNonEmptyString(name)) return false;
      var idx = findListIndex(state, listId);
      if (idx < 0) return false;
      state.lists[idx].name = name.trim();
      notify();
      return true;
    }

    function deleteList(listId) {
      var idx = findListIndex(state, listId);
      if (idx < 0) return false;
      state.lists.splice(idx, 1);
      notify();
      return true;
    }

    function createCard(listId, title) {
      if (!isNonEmptyString(title)) return null;
      var idx = findListIndex(state, listId);
      if (idx < 0) return null;
      var id = genId('card');
      state.lists[idx].cards.push({ id: id, title: title.trim() });
      notify();
      return id;
    }

    function editCard(cardId, title) {
      if (!isNonEmptyString(title)) return false;
      var loc = findCardLocation(state, cardId);
      if (!loc) return false;
      state.lists[loc.listIndex].cards[loc.cardIndex].title = title.trim();
      notify();
      return true;
    }

    function deleteCard(cardId) {
      var loc = findCardLocation(state, cardId);
      if (!loc) return false;
      state.lists[loc.listIndex].cards.splice(loc.cardIndex, 1);
      notify();
      return true;
    }

    function moveCard(cardId, fromListId, toListId, toIndex) {
      if (typeof cardId !== 'string' || typeof fromListId !== 'string' || typeof toListId !== 'string') return false;
      if (typeof toIndex !== 'number' || toIndex < 0) return false;
      // Per contract: moveCard with fromListId === toListId is not used; dnd should call reorderCard.
      // But defensively, we'll route same-list calls through reorder logic instead of erroring.
      if (fromListId === toListId) return reorderCard(cardId, toListId, toIndex);
      var fromIdx = findListIndex(state, fromListId);
      var toIdx = findListIndex(state, toListId);
      if (fromIdx < 0 || toIdx < 0) return false;
      var fromList = state.lists[fromIdx];
      var cardIdx = -1;
      for (var i = 0; i < fromList.cards.length; i++) {
        if (fromList.cards[i].id === cardId) { cardIdx = i; break; }
      }
      if (cardIdx < 0) return false;
      var card = fromList.cards.splice(cardIdx, 1)[0];
      var clamped = Math.max(0, Math.min(toIndex, state.lists[toIdx].cards.length));
      state.lists[toIdx].cards.splice(clamped, 0, card);
      notify();
      return true;
    }

    function reorderCard(cardId, listId, toIndex) {
      if (typeof cardId !== 'string' || typeof listId !== 'string') return false;
      if (typeof toIndex !== 'number' || toIndex < 0) return false;
      var listIdx = findListIndex(state, listId);
      if (listIdx < 0) return false;
      var list = state.lists[listIdx];
      var cardIdx = -1;
      for (var i = 0; i < list.cards.length; i++) {
        if (list.cards[i].id === cardId) { cardIdx = i; break; }
      }
      if (cardIdx < 0) return false;
      var card = list.cards.splice(cardIdx, 1)[0];
      var clamped = Math.max(0, Math.min(toIndex, list.cards.length));
      list.cards.splice(clamped, 0, card);
      notify();
      return true;
    }

    return {
      getState: getState,
      setState: setState,
      subscribe: subscribe,
      createList: createList,
      renameList: renameList,
      deleteList: deleteList,
      createCard: createCard,
      editCard: editCard,
      deleteCard: deleteCard,
      moveCard: moveCard,
      reorderCard: reorderCard
    };
  }

  return {
    createStateModel: createStateModel,
    DEFAULT_SEED: buildDefaultSeed,
    _genId: genId
  };
}));
