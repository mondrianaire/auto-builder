// src/ui/ring.js — animated oval poker ring with adaptive seat positions (IP10, A20).

export function computeSeatPositions(activeSeatCount, ringRadius = 220) {
  // Return [{x, y, angleDeg}] for each seat, evenly distributed around the oval.
  // For heads-up (count===2), seats are 180 degrees apart per IP10.A1.
  const positions = [];
  if (activeSeatCount <= 0) return positions;
  // Use ellipse: rx = ringRadius * 1.5, ry = ringRadius * 0.9 (oval, not circular).
  const rx = ringRadius * 1.5, ry = ringRadius * 0.9;
  for (let i = 0; i < activeSeatCount; i++) {
    const angle = (2 * Math.PI * i) / activeSeatCount - Math.PI / 2; // start at top
    positions.push({
      x: rx * Math.cos(angle),
      y: ry * Math.sin(angle),
      angleDeg: (angle * 180 / Math.PI + 90) % 360
    });
  }
  return positions;
}

export function renderRing(root, hand) {
  const seats = hand.seats || [];
  const n = seats.length;
  const positions = computeSeatPositions(n);
  const W = 760, H = 480;
  root.innerHTML = `
    <div class="ring-stage">
      <svg class="ring-svg" viewBox="-${W/2} -${H/2} ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-label="Poker ring">
        <defs>
          <radialGradient id="ring-felt" cx="50%" cy="50%" r="60%">
            <stop offset="0%"  stop-color="#3a7a5a" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#1f4a37" stop-opacity="1"/>
          </radialGradient>
          <linearGradient id="ring-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stop-color="#5a3a1a"/>
            <stop offset="100%" stop-color="#2a1a08"/>
          </linearGradient>
        </defs>
        <!-- Outer rim -->
        <ellipse cx="0" cy="0" rx="340" ry="200" fill="url(#ring-rim)"/>
        <!-- Felt -->
        <ellipse class="ring-felt" cx="0" cy="0" rx="320" ry="180" fill="url(#ring-felt)"/>
        <!-- Animated subtle glow (CSS @keyframes ring-glow in animations.css) -->
        <ellipse class="ring-glow" cx="0" cy="0" rx="320" ry="180" fill="none"
                 stroke="#a8c8b8" stroke-width="1.5" opacity="0.4"/>
        <!-- Pot -->
        <g class="pot-display" transform="translate(0, -10)">
          <text class="pot-label" text-anchor="middle" y="-14">POT</text>
          <text class="pot-value" text-anchor="middle" y="14">${hand.pot_total || 0}</text>
        </g>
        <!-- Community cards slot (filled later) -->
        <g id="community-slot" transform="translate(0, 30)"></g>
        <!-- Seats -->
        ${positions.map((p, i) => seatMarkup(seats[i], p, i, hand)).join("")}
      </svg>
    </div>
  `;
}

function seatMarkup(seat, pos, idx, hand) {
  if (!seat) return "";
  const isButton = idx === hand.button_seat_index;
  const isSB     = idx === hand.small_blind_seat_index;
  const isBB     = idx === hand.big_blind_seat_index;
  const isActing = hand.current_turn && hand.current_turn.seat_index === idx;
  const folded   = seat.hand_state === "folded";
  const xOff     = pos.x, yOff = pos.y;
  // Note: no holder identity reference in any easter-egg overlay path (covered in twoSevenOff.js).
  return `
    <g class="seat ${isActing ? "acting" : ""} ${folded ? "folded" : ""}" transform="translate(${xOff}, ${yOff})">
      <circle class="seat-bg" r="46" />
      <image href="${seat.photo_url || ""}" x="-30" y="-30" width="60" height="60" clip-path="circle(30px at 30px 30px)" />
      <text class="seat-name" y="58" text-anchor="middle">${escapeHtml(seat.nickname || "")}</text>
      <text class="seat-stack" y="76" text-anchor="middle">${seat.chip_stack || 0}</text>
      ${isButton ? `<g class="button-chip" transform="translate(40, -28)">
        <circle r="11" fill="#f5efe2" stroke="#1a3a5e" stroke-width="2"/>
        <text text-anchor="middle" y="4" font-size="11" fill="#1a3a5e" font-weight="700">D</text>
      </g>` : ""}
      ${isSB ? `<g class="sb-chip" transform="translate(40, -4)">
        <circle r="9" fill="#c83a3a" stroke="#1a3a5e" stroke-width="1.5"/>
        <text text-anchor="middle" y="3" font-size="9" fill="#f5efe2" font-weight="700">SB</text>
      </g>` : ""}
      ${isBB ? `<g class="bb-chip" transform="translate(40, 20)">
        <circle r="9" fill="#4a6a8a" stroke="#1a3a5e" stroke-width="1.5"/>
        <text text-anchor="middle" y="3" font-size="9" fill="#f5efe2" font-weight="700">BB</text>
      </g>` : ""}
    </g>
  `;
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
