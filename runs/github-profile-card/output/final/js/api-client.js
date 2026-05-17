// api-client.js — GitHub API client for the GitHub Profile Card tool.
// Exports fetchProfilePayload(username, pat) and 5 typed error classes.
// No DOM access, no global state, no caching across calls.

export class UserNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class MissingTokenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MissingTokenError';
  }
}

const GITHUB_API_BASE = 'https://api.github.com';
const GRAPHQL_URL = `${GITHUB_API_BASE}/graphql`;

// Cap per-repo language fetches at 30 to stay within a single-session budget
// (PAT-authenticated REST limit is 5000/hr; per-repo /languages calls otherwise
// scale linearly with the user's owned-repo count). Inline-deviation: dev-001.
const MAX_LANGUAGE_FETCHES = 30;

const GRAPHQL_QUERY = `
  query ProfileQuery($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      pinnedItems(first: 6, types: [REPOSITORY]) {
        nodes {
          ... on Repository {
            name
            description
            url
            stargazerCount
            forkCount
            isFork
            isPrivate
            primaryLanguage { name color }
          }
        }
      }
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              weekday
            }
          }
        }
      }
    }
  }
`;

function isoZ(d) {
  // Returns full ISO-8601 with Z suffix.
  return d.toISOString();
}

function emptyContributionCalendar() {
  return { total_contributions: 0, days: [] };
}

async function safeFetch(url, init) {
  try {
    return await fetch(url, init);
  } catch (err) {
    throw new NetworkError(`Could not reach ${url}: ${err && err.message ? err.message : String(err)}`);
  }
}

function classifyRestStatus(status, headers, url) {
  if (status === 404) return new UserNotFoundError(`Not found: ${url}`);
  if (status === 401) return new AuthError(`Unauthorized: ${url}`);
  if (status === 403) {
    const rem = headers && headers.get ? headers.get('x-ratelimit-remaining') : null;
    if (rem === '0') return new RateLimitError(`Rate limit hit at ${url}`);
    // Some 403s are auth-related (bad PAT scopes); fall through to AuthError.
    return new AuthError(`Forbidden: ${url}`);
  }
  return new Error(`HTTP ${status} at ${url}`);
}

async function fetchUserBasic(username, pat) {
  const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`;
  const headers = { Accept: 'application/vnd.github+json' };
  if (pat) headers.Authorization = `Bearer ${pat}`;
  const res = await safeFetch(url, { headers });
  if (!res.ok) throw classifyRestStatus(res.status, res.headers, url);
  const data = await res.json();
  return {
    login: data.login,
    name: data.name ?? null,
    avatar_url: data.avatar_url,
    html_url: data.html_url,
    bio: data.bio ?? null,
    public_repos: data.public_repos ?? 0,
    followers: data.followers ?? 0,
    following: data.following ?? 0
  };
}

async function fetchOwnedReposWithLanguages(username, pat) {
  const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos?per_page=100&type=owner&sort=updated`;
  const headers = { Accept: 'application/vnd.github+json' };
  if (pat) headers.Authorization = `Bearer ${pat}`;
  const res = await safeFetch(url, { headers });
  if (!res.ok) throw classifyRestStatus(res.status, res.headers, url);
  const repos = await res.json();
  const nonForks = (repos || []).filter(r => r && r.fork === false);
  const out = [];
  const toFetch = nonForks.slice(0, MAX_LANGUAGE_FETCHES);
  for (const repo of toFetch) {
    const langsUrl = `${GITHUB_API_BASE}/repos/${repo.owner.login}/${repo.name}/languages`;
    let langs = {};
    try {
      const lres = await safeFetch(langsUrl, { headers });
      if (lres.ok) {
        langs = await lres.json();
      } else {
        // Skip individual failing repos rather than fail the whole payload;
        // most-used-language is best-effort across repos.
        langs = {};
      }
    } catch (_e) {
      langs = {};
    }
    out.push({
      name: repo.name,
      is_fork: false,
      languages_bytes: langs || {}
    });
  }
  return out;
}

function flattenContributionDays(contributionCalendar) {
  if (!contributionCalendar || !Array.isArray(contributionCalendar.weeks)) {
    return { total_contributions: 0, days: [] };
  }
  const days = [];
  for (const week of contributionCalendar.weeks) {
    if (!week || !Array.isArray(week.contributionDays)) continue;
    for (const d of week.contributionDays) {
      days.push({
        date: d.date,
        contribution_count: d.contributionCount ?? 0,
        weekday: d.weekday ?? 0
      });
    }
  }
  days.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  return {
    total_contributions: contributionCalendar.totalContributions ?? 0,
    days
  };
}

function mapPinnedRepos(pinnedItems) {
  if (!pinnedItems || !Array.isArray(pinnedItems.nodes)) return [];
  return pinnedItems.nodes.filter(Boolean).map(n => ({
    name: n.name,
    description: n.description ?? null,
    primary_language_name: n.primaryLanguage ? (n.primaryLanguage.name ?? null) : null,
    primary_language_color: n.primaryLanguage ? (n.primaryLanguage.color ?? null) : null,
    stargazer_count: n.stargazerCount ?? 0,
    fork_count: n.forkCount ?? 0,
    url: n.url
  }));
}

async function fetchGraphQL(username, pat) {
  // 1-year window ending now (UTC).
  const now = new Date();
  const from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const variables = {
    login: username,
    from: isoZ(from),
    to: isoZ(now)
  };
  const body = JSON.stringify({ query: GRAPHQL_QUERY, variables });
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${pat}`
  };
  const res = await safeFetch(GRAPHQL_URL, { method: 'POST', headers, body });
  if (res.status === 401) throw new AuthError('GraphQL 401 — token rejected');
  if (res.status === 403) {
    const rem = res.headers && res.headers.get ? res.headers.get('x-ratelimit-remaining') : null;
    if (rem === '0') throw new RateLimitError('GraphQL rate limit hit');
    throw new AuthError('GraphQL 403 — token forbidden');
  }
  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json && Array.isArray(json.errors) && json.errors.length > 0) {
    const msg = json.errors.map(e => e.message || '').join('; ');
    if (/rate limit/i.test(msg)) throw new RateLimitError(`GraphQL rate-limit: ${msg}`);
    if (/bad credentials|unauthorized|authentication/i.test(msg)) throw new AuthError(`GraphQL auth: ${msg}`);
    if (/could not resolve|not exist|not found/i.test(msg) && json.data && !json.data.user) {
      throw new UserNotFoundError(`GraphQL: user not found — ${msg}`);
    }
    // Any other GraphQL error: fall through but keep degraded behavior.
  }
  const user = json && json.data ? json.data.user : null;
  if (!user) {
    // Either errored above or null user — treat as user-not-found if REST hadn't already established the user.
    return { pinned_repos: [], contribution_calendar_year: emptyContributionCalendar() };
  }
  return {
    pinned_repos: mapPinnedRepos(user.pinnedItems),
    contribution_calendar_year: flattenContributionDays(user.contributionsCollection ? user.contributionsCollection.contributionCalendar : null)
  };
}

export async function fetchProfilePayload(username, pat) {
  if (!username || typeof username !== 'string') {
    throw new UserNotFoundError('Username is required.');
  }
  const trimmedPat = pat && typeof pat === 'string' && pat.trim().length > 0 ? pat.trim() : null;

  // REST: basic user info (also confirms user exists with a clean 404 path).
  const user = await fetchUserBasic(username, trimmedPat);

  // REST: owned non-fork repos + per-repo languages (works with or without PAT,
  // capped at MAX_LANGUAGE_FETCHES to keep within a session-sized budget).
  let owned_non_fork_repos_with_languages = [];
  try {
    owned_non_fork_repos_with_languages = await fetchOwnedReposWithLanguages(username, trimmedPat);
  } catch (err) {
    // If repo listing fails (e.g., rate-limited unauth path), surface a rate-limit /
    // auth error rather than silently returning an empty list.
    if (err instanceof RateLimitError || err instanceof AuthError || err instanceof NetworkError || err instanceof UserNotFoundError) {
      throw err;
    }
    owned_non_fork_repos_with_languages = [];
  }

  // GraphQL: pinned + contributions. Requires PAT — skip if absent (degraded path per FC.6 alt-a).
  let pinned_repos = [];
  let contribution_calendar_year = emptyContributionCalendar();
  if (trimmedPat) {
    const gql = await fetchGraphQL(username, trimmedPat);
    pinned_repos = gql.pinned_repos;
    contribution_calendar_year = gql.contribution_calendar_year;
  }

  return {
    user,
    pinned_repos,
    contribution_calendar_year,
    owned_non_fork_repos_with_languages
  };
}
