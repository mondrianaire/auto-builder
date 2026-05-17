// main.js — entry-point module for the GitHub Profile Card.
// Wires the form to api-client + data-derivers + card-renderer.

import {
  fetchProfilePayload,
  UserNotFoundError,
  AuthError,
  RateLimitError,
  NetworkError,
  MissingTokenError
} from './api-client.js';
import {
  computeCurrentStreak,
  computeMostUsedLanguage,
  sliceLast90Days
} from './data-derivers.js';
import { renderCard } from './card-renderer.js';

const usernameInput = document.getElementById('username-input');
const patInput = document.getElementById('pat-input');
const lookupButton = document.getElementById('lookup-button');
const statusRegion = document.getElementById('status-region');
const cardContainer = document.getElementById('card-container');

function setStatus(message, kind) {
  if (!statusRegion) return;
  statusRegion.className = '';
  if (kind) statusRegion.classList.add(`status-${kind}`);
  statusRegion.textContent = message || '';
}

function todayUtcDateString() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function errorToMessage(err, username) {
  if (!err) return 'An unknown error occurred.';
  switch (err.name) {
    case 'UserNotFoundError':
      return `No GitHub user found with handle "${username}". Check the spelling and try again.`;
    case 'AuthError':
      return 'GitHub rejected the token. Check that your PAT is valid and hasn\'t expired.';
    case 'RateLimitError':
      return 'GitHub\'s rate limit was hit. Wait a few minutes and try again, or use a PAT with a higher limit.';
    case 'NetworkError':
      return 'Could not reach api.github.com. Check your internet connection.';
    case 'MissingTokenError':
      return 'A Personal Access Token is required to fetch pinned repos and contribution data. Paste a token in the field above (link: github.com/settings/tokens).';
    default:
      return `Unexpected error: ${err.message || err.name || 'unknown'}`;
  }
}

async function runLookup() {
  if (!usernameInput) return;
  const username = (usernameInput.value || '').trim();
  if (!username) {
    setStatus('Enter a GitHub username to look up.', 'info');
    return;
  }
  const pat = (patInput && patInput.value) ? patInput.value.trim() : '';

  // Clear card so the previous lookup doesn't visibly linger while we fetch.
  while (cardContainer && cardContainer.firstChild) {
    cardContainer.removeChild(cardContainer.firstChild);
  }

  setStatus(`Loading profile for ${username}…`, 'loading');
  if (lookupButton) lookupButton.disabled = true;

  try {
    const payload = await fetchProfilePayload(username, pat || null);

    const days = (payload.contribution_calendar_year && Array.isArray(payload.contribution_calendar_year.days))
      ? payload.contribution_calendar_year.days
      : [];
    const today = todayUtcDateString();
    const ninetyDaySlice = sliceLast90Days(days, today);
    const streak = computeCurrentStreak(days);
    const language = computeMostUsedLanguage(payload.owned_non_fork_repos_with_languages || []);

    renderCard(cardContainer, payload, {
      streak,
      language,
      ninety_day_slice: ninetyDaySlice
    });

    if (!pat) {
      setStatus(
        'Loaded basic profile and language stats. Pinned repos and contribution data require a Personal Access Token — paste one above and look up again.',
        'info'
      );
    } else {
      setStatus(`Showing profile for ${username}.`, 'success');
    }
  } catch (err) {
    setStatus(errorToMessage(err, username), 'error');
  } finally {
    if (lookupButton) lookupButton.disabled = false;
  }
}

if (lookupButton) {
  lookupButton.addEventListener('click', () => { runLookup(); });
}
if (usernameInput) {
  usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runLookup();
    }
  });
}
if (patInput) {
  patInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runLookup();
    }
  });
}

// Surface unexpected module-load failures so the user sees something other than
// a blank page if the browser blocks ES modules under file:// or similar.
window.addEventListener('error', (event) => {
  if (event && event.error) {
    setStatus(`Page error: ${event.error.message || event.error.name || 'unknown'}. If you opened this file directly (file://), try serving it via a tiny local server — see README-RUN.md.`, 'error');
  }
});
