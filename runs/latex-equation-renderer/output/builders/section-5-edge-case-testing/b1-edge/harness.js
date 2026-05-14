// Edge-case test harness for section-5-edge-case-testing.
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const katex = require("katex");

const integrationDir = process.argv[2];
const reportPath = process.argv[3];

const html = fs.readFileSync(path.join(integrationDir, "index.html"), "utf8");
const rendererJs = fs.readFileSync(path.join(integrationDir, "renderer.js"), "utf8");
const inputJs = fs.readFileSync(path.join(integrationDir, "input.js"), "utf8");
const appJs = fs.readFileSync(path.join(integrationDir, "app.js"), "utf8");

const consoleErrors = [];

const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (err) => {
  consoleErrors.push({ kind: "jsdomError", message: String(err && err.message ? err.message : err) });
});
virtualConsole.on("error", (msg) => {
  consoleErrors.push({ kind: "error", message: String(msg) });
});

const dom = new JSDOM(html, {
  runScripts: "outside-only",
  url: "http://localhost/",
  pretendToBeVisual: true,
  virtualConsole,
});
const { window } = dom;

// KaTeX (Node module) references `document` as a global server-side. In a
// browser, KaTeX's CDN bundle naturally sees window.document. Hoist jsdom's
// document to a global so the same module reaches it under Node.
global.document = window.document;
global.window = window;
global.HTMLElement = window.HTMLElement;
global.Node = window.Node;
window.katex = katex;

window.eval(rendererJs);
window.eval(inputJs);
window.eval(appJs);

function fireReady() {
  const ev = new window.Event("DOMContentLoaded");
  window.document.dispatchEvent(ev);
}
fireReady();

const results = [];
function record(id, statement, passed, detail) {
  results.push({ id, statement, passed, detail });
}

const doc = window.document;
function setInput(value) {
  const ta = doc.querySelector("[data-role='latex-input']");
  ta.value = value;
  ta.dispatchEvent(new window.Event("input", { bubbles: true }));
  return ta;
}
const outputEl = doc.querySelector("[data-role='latex-output']");
const errorEl = doc.querySelector("[data-role='latex-error']");
const inputTa = doc.querySelector("[data-role='latex-input']");

// IP1.A1
{
  const count = doc.querySelectorAll("textarea[data-role='latex-input'], #latex-input").length;
  record("IP1.A1", "Exactly one LaTeX source input element.", count === 1, "count=" + count);
}
// IP1.A2
{
  const count = doc.querySelectorAll("[data-role='latex-output'], #latex-output").length;
  record("IP1.A2", "Exactly one rendered-output container.", count === 1, "count=" + count);
}
// IP1.A3
{
  const bad = doc.querySelectorAll(
    "[data-role='equation-list'], [class*='equation-list'], [class*='equations'], [data-role='add-equation'], [class*='add-equation'], [data-role='items']"
  ).length;
  record("IP1.A3", "No list/repeater UI.", bad === 0, "bad=" + bad);
}
// IP2.A1
{
  const buttons = Array.from(doc.querySelectorAll("button, a"));
  const hits = buttons.filter((b) => /export|download|copy|save|share/i.test(b.textContent || ""));
  record("IP2.A1", "No export/download/copy/save controls.", hits.length === 0, "hits=" + hits.length);
}
// IP2.A2
{
  const allJs = rendererJs + "\n" + inputJs + "\n" + appJs;
  const bad = /navigator\.clipboard/.test(allJs) || /URL\.createObjectURL/.test(allJs) || /execCommand\(['"]copy['"]\)/.test(allJs);
  record("IP2.A2", "No clipboard or download API usage.", !bad, bad ? "found a forbidden API" : "clean");
}
// IP3.A1
{
  const bad = doc.querySelectorAll("[class*='palette'], [class*='symbols'], [class*='snippets'], [class*='templates'], [class*='examples-list'], [data-role*='palette']").length;
  record("IP3.A1", "No palette/snippets/examples UI.", bad === 0, "bad=" + bad);
}
// IP3.A2
{
  record("IP3.A2", "Input element is a plain <textarea>.", inputTa && inputTa.tagName.toLowerCase() === "textarea", "tag=" + (inputTa && inputTa.tagName));
}
// IP4.A1
{
  const links = Array.from(doc.querySelectorAll("link[rel='stylesheet']"));
  const scripts = Array.from(doc.querySelectorAll("script"));
  const linkOk = links.some((l) => /katex/i.test(l.getAttribute("href") || ""));
  const scriptOk = scripts.some((s) => /katex/i.test(s.getAttribute("src") || ""));
  record("IP4.A1", "Page loads KaTeX from a CDN.", linkOk && scriptOk, "linkOk=" + linkOk + " scriptOk=" + scriptOk);
}
// IP4.A2
{
  const scripts = Array.from(doc.querySelectorAll("script"));
  const bad = scripts.some((s) => /mathjax/i.test(s.getAttribute("src") || ""));
  record("IP4.A2", "Page does not load MathJax.", !bad, bad ? "MathJax tag present" : "clean");
}
// IP4.A3
{
  const ok = /katex\.render|katex\.renderToString/.test(rendererJs);
  record("IP4.A3", "Renderer module calls KaTeX render API.", ok, ok ? "found katex.render" : "missing");
}
// S1.A2
{
  const target = doc.createElement("div");
  doc.body.appendChild(target);
  const result = window.renderer.render("x^2 + y^2 = z^2", target);
  const hasKatex = !!target.querySelector(".katex");
  record("S1.A2", "Valid LaTeX populates target with KaTeX-generated DOM.", result && result.ok === true && hasKatex && target.children.length > 0, "ok=" + (result && result.ok) + " hasKatex=" + hasKatex);
}
// S1.A3
{
  const target = doc.createElement("div");
  doc.body.appendChild(target);
  let threw = false;
  let result;
  try { result = window.renderer.render("\\frac{1}{", target); } catch (e) { threw = true; }
  record("S1.A3", "Malformed LaTeX returns structured error without throwing.", !threw && result && result.ok === false && typeof result.message === "string" && result.message.length > 0, "threw=" + threw + " result=" + JSON.stringify(result));
}
// S1.A5
{
  const target = doc.createElement("div");
  doc.body.appendChild(target);
  window.renderer.render("\\sum_{i=1}^n i", target);
  const hasDisplay = !!target.querySelector(".katex-display");
  record("S1.A5", "Output uses display-mode KaTeX (.katex-display).", hasDisplay, "hasDisplay=" + hasDisplay);
}
// S2.A2
{
  const got = [];
  window.inputUi.onLatexChange((v) => got.push(v));
  inputTa.value = "";
  ["a", "a^", "a^2"].forEach((v) => {
    inputTa.value = v;
    inputTa.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  const ok = got.length >= 3 && got[got.length - 3] === "a" && got[got.length - 2] === "a^" && got[got.length - 1] === "a^2";
  record("S2.A2", "Subscriber gets per-keystroke cumulative values.", ok, "got=" + JSON.stringify(got));
}
// S3.A3
{
  setInput("x+y");
  const afterValid = outputEl.children.length > 0 && !!outputEl.querySelector(".katex");
  setInput("\\frac{1}{");
  const stale = outputEl.getAttribute("data-stale") === "true" || outputEl.children.length === 0;
  record("S3.A3", "On error, success output is cleared or marked stale.", afterValid && stale, "afterValid=" + afterValid + " stale=" + stale + " children=" + outputEl.children.length + " data-stale=" + outputEl.getAttribute("data-stale"));
}
// S4.A4
{
  record("S4.A4", "No console errors on initial load.", consoleErrors.length === 0, "errors=" + JSON.stringify(consoleErrors));
}
// S5.A2
{
  setInput("");
  const noError = errorEl.hasAttribute("hidden") || (errorEl.textContent || "").trim() === "";
  const outputEmpty = outputEl.children.length === 0;
  record("S5.A2", "Empty input -> no error, output empty.", noError && outputEmpty, "noError=" + noError + " outputEmpty=" + outputEmpty);
}
// S5.A3
{
  setInput("   \n\t  ");
  const noError = errorEl.hasAttribute("hidden") || (errorEl.textContent || "").trim() === "";
  const outputEmpty = outputEl.children.length === 0;
  record("S5.A3", "Whitespace-only input behaves as empty.", noError && outputEmpty, "noError=" + noError + " outputEmpty=" + outputEmpty);
}
// S5.A4
{
  setInput("\\frac{1}{");
  const errVisible = !errorEl.hasAttribute("hidden") && (errorEl.textContent || "").trim().length > 0;
  const stale = outputEl.getAttribute("data-stale") === "true" || outputEl.children.length === 0;
  record("S5.A4", "Malformed input shows non-empty error and clears/marks-stale output.", errVisible && stale, "errVisible=" + errVisible + " stale=" + stale);
}
// S5.A5
{
  setInput("\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}");
  const hasKatex = !!(outputEl.querySelector(".katex") || outputEl.querySelector(".katex-display"));
  const errHidden = errorEl.hasAttribute("hidden") || (errorEl.textContent || "").trim() === "";
  record("S5.A5", "Valid input renders KaTeX DOM and hides error region.", hasKatex && errHidden, "hasKatex=" + hasKatex + " errHidden=" + errHidden);
}
// S5.A6
{
  record("S5.A6", "Zero error-level console messages on initial load.", consoleErrors.length === 0, "errors=" + JSON.stringify(consoleErrors));
}
// S5.A1
{
  const others = results.filter((r) => r.id !== "S5.A1" && r.id.startsWith("S"));
  const allPass = others.every((r) => r.passed);
  const failing = others.filter((r) => !r.passed).map((r) => r.id);
  record("S5.A1", "Every edge_case_testing assertion passes against the integrated artifact.", allPass, failing.length ? "failing=" + failing.join(",") : "all pass");
}

const summary = {
  generated_at: new Date().toISOString(),
  integration_dir: integrationDir,
  total: results.length,
  passed: results.filter((r) => r.passed).length,
  failed: results.filter((r) => !r.passed).length,
  console_errors: consoleErrors,
  results,
};
fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ passed: summary.passed, failed: summary.failed, total: summary.total }));
process.exit(summary.failed > 0 ? 1 : 0);
