const fs = require('fs');
const path = require('path');
const stat = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-report.partial-static.json'), 'utf8'));
const der = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-report.partial-derivers.json'), 'utf8'));

// Merge: derivers tests REPLACE the corresponding "not_exercised_in_static_mode" entries from static report.
const derIds = new Set(der.results.map(r => r.id));
const merged = [
  ...stat.results.filter(r => !derIds.has(r.id)),
  ...der.results
];

const summary = {
  total: merged.length,
  pass: merged.filter(r => r.result === 'pass').length,
  fail: merged.filter(r => r.result === 'fail').length,
  not_exercised_in_static_mode: merged.filter(r => r.result === 'not_exercised_in_static_mode').length
};

const final = {
  generated_at: new Date().toISOString(),
  test_environment: {
    static_checks_env: stat.test_environment,
    derivers_tests_env: der.test_environment
  },
  github_endpoints_identified_from_source: stat.github_endpoints_identified_from_source,
  live_network_test_note: stat.live_network_test_note,
  results: merged,
  summary
};

fs.writeFileSync(path.join(__dirname, 'test-report.json'), JSON.stringify(final, null, 2));

// Markdown report
const lines = [];
lines.push('# Edge-Case Testing Report — github-profile-card');
lines.push('');
lines.push(`Generated: ${final.generated_at}`);
lines.push('');
lines.push('## Test Environment');
lines.push('');
lines.push(`- static-checks: Node ${stat.test_environment.node_version} on ${stat.test_environment.platform} (${stat.test_environment.arch})`);
lines.push(`- derivers-tests: Node ${der.test_environment.node_version} on ${der.test_environment.platform} (${der.test_environment.arch})`);
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`- **Total assertions:** ${summary.total}`);
lines.push(`- **Pass:** ${summary.pass}`);
lines.push(`- **Fail:** ${summary.fail}`);
lines.push(`- **Not exercised in static mode (deferred to CV Tier 2):** ${summary.not_exercised_in_static_mode}`);
lines.push('');
lines.push('## GitHub API endpoints exercised at runtime (by source inspection)');
lines.push('');
for (const u of final.github_endpoints_identified_from_source) lines.push(`- ${u}`);
lines.push('');
lines.push('## Live-network note');
lines.push('');
lines.push(final.live_network_test_note);
lines.push('');
lines.push('## Results by id');
lines.push('');
lines.push('| id | result | detail |');
lines.push('|---|---|---|');
for (const r of merged) {
  const d = (r.detail || '').replace(/\|/g, '\\|').slice(0, 200);
  lines.push(`| ${r.id} | ${r.result} | ${d} |`);
}
lines.push('');
fs.writeFileSync(path.join(__dirname, 'test-report.md'), lines.join('\n'));

console.log(`Final: ${summary.pass} pass, ${summary.fail} fail, ${summary.not_exercised_in_static_mode} deferred (total ${summary.total})`);
console.log('Wrote test-report.json and test-report.md');
