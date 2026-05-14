/**
 * Renderer Core (section-1-renderer-core)
 *
 * Single public entry point: window.renderer.render(latex, target)
 * Returns: { ok: true } on success, or { ok: false, message: string } on failure.
 * Never throws past the boundary.
 *
 * Empty/whitespace input is treated as a success with target cleared (no DOM).
 * KaTeX is used in display mode (displayMode: true).
 */
(function (global) {
  "use strict";

  function isBlank(s) {
    return typeof s !== "string" || s.trim().length === 0;
  }

  function render(latex, target) {
    if (!target || typeof target.appendChild !== "function") {
      return { ok: false, message: "Renderer target is not a valid HTMLElement." };
    }

    // Empty / whitespace-only -> clear target, success.
    if (isBlank(latex)) {
      while (target.firstChild) target.removeChild(target.firstChild);
      return { ok: true };
    }

    if (typeof global.katex === "undefined" || typeof global.katex.render !== "function") {
      return { ok: false, message: "KaTeX library is not loaded." };
    }

    try {
      // Clear previous content first so a partial failure does not leave stale DOM.
      while (target.firstChild) target.removeChild(target.firstChild);
      global.katex.render(latex, target, {
        throwOnError: true,
        displayMode: true
      });
      return { ok: true };
    } catch (err) {
      // Per contract: do not modify target on failure beyond what was already cleared.
      // Clear again to ensure we never present partial/stale render on failure.
      while (target.firstChild) target.removeChild(target.firstChild);
      var message = (err && err.message) ? String(err.message) : "Unknown LaTeX render error.";
      return { ok: false, message: message };
    }
  }

  // Expose under a single global namespace.
  global.renderer = { render: render };
})(typeof window !== "undefined" ? window : this);
