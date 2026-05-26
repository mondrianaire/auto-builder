// src/app.js — application shell + simple hash router.
import { onAuthStateChange, applyFourColorDeck, getCurrentUser } from "./auth.js";
import { renderLanding } from "./ui/landing.js";
import { renderLobby } from "./lobby.js";
import { renderTable } from "./ui/table.js";
import { renderLeaderboards } from "./leaderboards.js";
import { renderAdmin } from "./admin.js";
import { renderUserCard } from "./ui/user-card.js";
import { initEasterEggListener } from "./easterEgg/twoSevenOff.js";

const appRoot = document.getElementById("app");
const eggRoot = document.getElementById("easter-egg-root");

let _user = null;
let _route = location.hash.replace(/^#/, "") || "/";

window.addEventListener("hashchange", () => {
  _route = location.hash.replace(/^#/, "") || "/";
  render();
});

onAuthStateChange((user) => {
  _user = user;
  if (user) applyFourColorDeck(!!user.four_color_deck);
  render();
});

// Once signed-in, listen for the easter-egg trigger across the user's session
// (the listener subscribes to the active tournament's current hand document).
initEasterEggListener(eggRoot);

function render() {
  if (!appRoot) return;
  appRoot.innerHTML = "";
  if (!_user) {
    renderLanding(appRoot);
    return;
  }
  // Shell: top-right user card always visible when signed in.
  const shell = document.createElement("div");
  shell.className = "shell";
  shell.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <div class="rainbow" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        <h1 class="wordmark">Texas Hold'em Tournament</h1>
      </div>
      <nav class="navtabs">
        <a href="#/lobby" class="${_route.startsWith("/lobby") || _route === "/" ? "active" : ""}">Lobby</a>
        <a href="#/leaderboards" class="${_route.startsWith("/leaderboards") ? "active" : ""}">Leaderboards</a>
        ${_user.is_admin ? `<a href="#/admin" class="${_route.startsWith("/admin") ? "active" : ""}">Admin</a>` : ""}
      </nav>
      <div id="user-card-slot"></div>
    </header>
    <main id="main-slot"></main>
  `;
  appRoot.appendChild(shell);

  renderUserCard(shell.querySelector("#user-card-slot"), _user);

  const main = shell.querySelector("#main-slot");
  if (_route.startsWith("/admin"))            renderAdmin(main, _user);
  else if (_route.startsWith("/leaderboards")) renderLeaderboards(main, _user);
  else if (_route.startsWith("/table"))       renderTable(main, _user);
  else                                         renderLobby(main, _user);
}

// First paint (no user yet).
renderLanding(appRoot);
