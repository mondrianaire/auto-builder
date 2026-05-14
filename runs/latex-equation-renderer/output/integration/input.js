/**
 * Input UI (section-2-input-ui)
 *
 * Locates the textarea[data-role='latex-input'] inside the page shell's
 * input region container and exposes window.inputUi.onLatexChange(cb)
 * which invokes cb(currentValue) on every user edit.
 *
 * The textarea itself also fires the standard 'input' DOM event, so a
 * consumer can subscribe via either form (per contract S2 -> S3).
 */
(function (global) {
  "use strict";

  var subscribers = [];
  var inputEl = null;

  function notify(value) {
    for (var i = 0; i < subscribers.length; i++) {
      try {
        subscribers[i](value);
      } catch (_e) {
        // Subscriber errors must not break other subscribers or the input loop.
      }
    }
  }

  function attach() {
    inputEl =
      document.querySelector("textarea[data-role='latex-input']") ||
      document.getElementById("latex-input");

    if (!inputEl) {
      return false;
    }
    inputEl.addEventListener("input", function () {
      notify(inputEl.value);
    });
    return true;
  }

  function onLatexChange(cb) {
    if (typeof cb !== "function") return function () {};
    subscribers.push(cb);
    // Return an unsubscribe handle.
    return function unsubscribe() {
      var idx = subscribers.indexOf(cb);
      if (idx >= 0) subscribers.splice(idx, 1);
    };
  }

  function getInputElement() {
    return inputEl;
  }

  function getValue() {
    return inputEl ? inputEl.value : "";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }

  global.inputUi = {
    onLatexChange: onLatexChange,
    getInputElement: getInputElement,
    getValue: getValue
  };
})(typeof window !== "undefined" ? window : this);
