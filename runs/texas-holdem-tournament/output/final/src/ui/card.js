// src/ui/card.js — inline-SVG card faces. Standard 52-card deck identity (A16).
// Suit colors read CSS variables --suit-spade / --suit-heart / --suit-diamond / --suit-club
// so the 4-color toggle is a one-variable swap (TD-IP-D).

const SUIT_GLYPHS = {
  s: { glyph: "♠", varname: "--suit-spade" },   // ♠
  h: { glyph: "♥", varname: "--suit-heart" },   // ♥
  d: { glyph: "♦", varname: "--suit-diamond" }, // ♦
  c: { glyph: "♣", varname: "--suit-club" }     // ♣
};

const VALID_RANKS = new Set(["2","3","4","5","6","7","8","9","10","T","J","Q","K","A"]);

export function renderCard(card, options = {}) {
  // Returns an <svg> element representing the card face.
  const wid = options.width  || 60;
  const hgt = options.height || 88;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "card-svg");
  svg.setAttribute("viewBox", `0 0 ${wid} ${hgt}`);
  svg.setAttribute("width", String(wid));
  svg.setAttribute("height", String(hgt));
  if (!card || card === null) {
    // Face-down back.
    svg.innerHTML = `
      <rect x="2" y="2" width="${wid-4}" height="${hgt-4}" rx="6" ry="6" fill="#1a3a5e" stroke="#0d1f2f" stroke-width="2"/>
      <rect x="6" y="6" width="${wid-12}" height="${hgt-12}" rx="4" ry="4" fill="none" stroke="#c8c0aa" stroke-width="1" stroke-dasharray="3 2"/>
      <text x="${wid/2}" y="${hgt/2+5}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="14" fill="#f5efe2" letter-spacing="0.12em">THT</text>
    `;
    return svg;
  }
  const rank = String(card.rank).toUpperCase();
  const suitInfo = SUIT_GLYPHS[card.suit];
  if (!VALID_RANKS.has(rank) || !suitInfo) {
    svg.innerHTML = `<rect width="${wid}" height="${hgt}" fill="#c83a3a"/>`;
    return svg;
  }
  const rankLabel = rank === "T" ? "10" : rank;
  svg.innerHTML = `
    <rect x="1" y="1" width="${wid-2}" height="${hgt-2}" rx="6" ry="6" fill="#f5efe2" stroke="#1a3a5e" stroke-width="1.2"/>
    <text class="card-rank" x="6" y="20" font-family="Georgia, serif" font-weight="700" font-size="16" fill="var(${suitInfo.varname})">${rankLabel}</text>
    <text class="card-suit-tl" x="6" y="36" font-size="14" fill="var(${suitInfo.varname})">${suitInfo.glyph}</text>
    <text class="card-suit-center" x="${wid/2}" y="${hgt/2+10}" text-anchor="middle" font-size="${Math.round(wid*0.55)}" fill="var(${suitInfo.varname})">${suitInfo.glyph}</text>
    <text class="card-rank-br" x="${wid-6}" y="${hgt-8}" text-anchor="end" font-family="Georgia, serif" font-weight="700" font-size="16" fill="var(${suitInfo.varname})" transform="rotate(180 ${wid-6} ${hgt-12})">${rankLabel}</text>
  `;
  return svg;
}

export function renderCardRow(root, cards, options = {}) {
  root.innerHTML = "";
  for (const c of cards) {
    const cardEl = renderCard(c, options);
    root.appendChild(cardEl);
  }
}
