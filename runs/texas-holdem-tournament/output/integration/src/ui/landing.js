// src/ui/landing.js — pre-sign-in landing surface with the Sign in with Google button.
import { signInWithGoogle } from "../auth.js";

export function renderLanding(root) {
  root.innerHTML = "";
  const landing = document.createElement("div");
  landing.className = "landing";
  landing.innerHTML = `
    <div class="landing-card">
      <div class="rainbow" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      <h1 class="landing-title">Texas Hold'em Tournament</h1>
      <p class="landing-sub">
        A live multiplayer Texas Hold'em tournament. Sign in with Google to join the lobby.
      </p>
      <button id="signin-btn" class="signin-btn" type="button">
        <span class="g-logo" aria-hidden="true">G</span>
        Sign in with Google
      </button>
      <div class="landing-footer">
        <span class="footer-label">PROJECT</span>
        <span class="footer-value">gto-poker-qui</span>
        <span class="footer-label">DEPLOY</span>
        <span class="footer-value">github.io / auto-builder</span>
      </div>
    </div>
  `;
  root.appendChild(landing);
  landing.querySelector("#signin-btn").addEventListener("click", async () => {
    try { await signInWithGoogle(); }
    catch (e) {
      console.error("Sign-in failed:", e);
      const err = document.createElement("div");
      err.className = "landing-error";
      err.textContent = "Sign-in failed: " + (e.message || e.code || "Unknown error");
      landing.appendChild(err);
    }
  });
}
