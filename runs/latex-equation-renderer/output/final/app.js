/**
 * Output and Error wiring (section-3-output-and-errors)
 *
 * Subscribes to window.inputUi.onLatexChange and routes the renderer's
 * structured RenderResult into either the success output container or
 * the error region.
 *
 * Contracts:
 *  - section-1-renderer-core --> section-3: window.renderer.render(latex, target).
 *  - section-2-input-ui --> section-3: window.inputUi.onLatexChange(cb).
 *  - section-3 --> section-4: shell provides [data-role='latex-output'] and
 *    [data-role='latex-error'] containers, both with stable identity.
 */
(function (global) {
  "use strict";

  function isBlank(s) {
    return typeof s !== "string" || s.trim().length === 0;
  }

  function setHidden(el, hidden) {
    if (!el) return;
    if (hidden) {
      el.setAttribute("hidden", "");
      el.textContent = "";
    } else {
      el.removeAttribute("hidden");
    }
  }

  function clearChildren(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function init() {
    var outputEl =
      document.querySelector("[data-role='latex-output']") ||
      document.getElementById("latex-output");
    var errorEl =
      document.querySelector("[data-role='latex-error']") ||
      document.getElementById("latex-error");

    if (!outputEl || !errorEl) {
      // Shell did not provide the expected slots; fail loudly to logs only,
      // never throw.
      console.warn(
        "[app] Missing output or error region; expected [data-role='latex-output'] and [data-role='latex-error']."
      );
      return;
    }

    if (!global.inputUi || typeof global.inputUi.onLatexChange !== "function") {
      console.warn("[app] window.inputUi.onLatexChange is not available.");
      return;
    }
    if (!global.renderer || typeof global.renderer.render !== "function") {
      console.warn("[app] window.renderer.render is not available.");
      return;
    }

    function update(latex) {
      // Empty / whitespace -> hide error, clear output.
      if (isBlank(latex)) {
        clearChildren(outputEl);
        setHidden(errorEl, true);
        outputEl.removeAttribute("data-stale");
        return;
      }

      var result = global.renderer.render(latex, outputEl);
      if (result && result.ok === true) {
        // Success: clear error region, mark output fresh.
        setHidden(errorEl, true);
        outputEl.removeAttribute("data-stale");
      } else {
        // Failure: clear success output (renderer already cleared on failure
        // path, but be defensive) and show error message.
        clearChildren(outputEl);
        outputEl.setAttribute("data-stale", "true");
        var message =
          result && typeof result.message === "string" && result.message.length > 0
            ? result.message
            : "Unknown LaTeX error.";
        errorEl.textContent = message;
        setHidden(errorEl, false);
      }
    }

    global.inputUi.onLatexChange(update);

    // Initial paint: if the textarea has a starting value, render it.
    var initial = global.inputUi.getValue ? global.inputUi.getValue() : "";
    update(initial);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : this);
