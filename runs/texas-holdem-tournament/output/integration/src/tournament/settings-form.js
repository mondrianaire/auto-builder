// src/tournament/settings-form.js — preset selector + custom-edit form.
import { TOURNAMENT_PRESETS, getPresetById } from "./presets.js";

export function renderSettingsForm(root, onConfirm) {
  root.innerHTML = "";
  const form = document.createElement("div");
  form.className = "settings-form";
  form.innerHTML = `
    <div class="form-row">
      <label class="form-label" for="preset-select">PRESET</label>
      <select id="preset-select" class="form-input">
        ${TOURNAMENT_PRESETS.map(p => `<option value="${p.id}">${p.display_name}</option>`).join("")}
        <option value="__custom__">Custom (edit any field below)</option>
      </select>
      <span class="form-mode" id="form-mode">Preset</span>
    </div>
    <div class="form-row"><label class="form-label" for="starting-stack">STARTING STACK (chips)</label>
      <input id="starting-stack" class="form-input" type="number" min="100" step="100"></div>
    <div class="form-row"><label class="form-label" for="level-duration">LEVEL DURATION (min)</label>
      <input id="level-duration" class="form-input" type="number" min="1" max="120"></div>
    <div class="form-row"><label class="form-label" for="action-clock">ACTION CLOCK (sec)</label>
      <input id="action-clock" class="form-input" type="number" min="5" max="120"></div>
    <div class="form-row"><label class="form-label" for="break-after">BREAK AFTER N LEVELS</label>
      <input id="break-after" class="form-input" type="number" min="0" max="20"></div>
    <div class="form-row"><label class="form-label" for="break-duration">BREAK DURATION (min)</label>
      <input id="break-duration" class="form-input" type="number" min="0" max="60"></div>
    <div class="form-row level-row">
      <label class="form-label">LEVEL 1 BLINDS</label>
      <div class="blind-trio">
        <input id="sb" class="form-input small" type="number" min="0" placeholder="SB">
        <input id="bb" class="form-input small" type="number" min="0" placeholder="BB">
        <input id="bba" class="form-input small" type="number" min="0" placeholder="BB-Ante">
      </div>
    </div>
    <div class="form-actions">
      <button id="confirm-btn" class="form-confirm" type="button">Confirm settings</button>
    </div>
  `;
  root.appendChild(form);

  const fields = {
    startingStack: form.querySelector("#starting-stack"),
    levelDur:      form.querySelector("#level-duration"),
    clock:         form.querySelector("#action-clock"),
    breakAfter:    form.querySelector("#break-after"),
    breakDur:      form.querySelector("#break-duration"),
    sb:            form.querySelector("#sb"),
    bb:            form.querySelector("#bb"),
    bba:           form.querySelector("#bba")
  };
  const select   = form.querySelector("#preset-select");
  const modeChip = form.querySelector("#form-mode");

  let activePreset = TOURNAMENT_PRESETS[0];
  let activeLevels = activePreset.levels.slice();
  applyPreset(activePreset);

  function applyPreset(p) {
    activePreset = p;
    activeLevels = p.levels.map(l => ({ ...l }));
    fields.startingStack.value = p.starting_stack_chips;
    fields.levelDur.value      = p.level_duration_minutes;
    fields.clock.value         = p.action_clock_seconds;
    fields.breakAfter.value    = p.break_after_levels;
    fields.breakDur.value      = p.break_duration_minutes;
    fields.sb.value            = p.levels[0].small_blind;
    fields.bb.value            = p.levels[0].big_blind;
    fields.bba.value           = p.levels[0].big_blind_ante;
    modeChip.textContent = "Preset";
    modeChip.classList.remove("custom");
  }

  function markCustom() {
    if (select.value !== "__custom__") {
      select.value = "__custom__";
    }
    modeChip.textContent = "Custom";
    modeChip.classList.add("custom");
  }

  select.addEventListener("change", () => {
    if (select.value === "__custom__") { markCustom(); return; }
    const p = getPresetById(select.value);
    if (p) applyPreset(p);
  });

  for (const k of Object.keys(fields)) {
    fields[k].addEventListener("input", markCustom);
  }

  form.querySelector("#confirm-btn").addEventListener("click", () => {
    // Build the tournament config from current values.
    const level1 = {
      level: 1,
      small_blind: parseInt(fields.sb.value, 10) || 0,
      big_blind: parseInt(fields.bb.value, 10) || 0,
      big_blind_ante: parseInt(fields.bba.value, 10) || 0
    };
    // If a preset is selected, we keep its full ladder (overwriting L1 with edited values
    // only if the user actually edited L1); otherwise derive a simple linear ladder.
    const useFullLadder = (select.value !== "__custom__");
    const levels = useFullLadder
      ? [level1].concat(activePreset.levels.slice(1))
      : deriveLinearLadder(level1, 12);
    const config = {
      preset_id: select.value === "__custom__" ? null : select.value,
      starting_stack_chips: parseInt(fields.startingStack.value, 10),
      level_duration_minutes: parseInt(fields.levelDur.value, 10),
      action_clock_seconds: parseInt(fields.clock.value, 10),
      break_after_levels: parseInt(fields.breakAfter.value, 10),
      break_duration_minutes: parseInt(fields.breakDur.value, 10),
      levels
    };
    onConfirm(config);
  });
}

function deriveLinearLadder(level1, count) {
  const out = [level1];
  for (let i = 2; i <= count; i++) {
    const prev = out[out.length - 1];
    out.push({
      level: i,
      small_blind: Math.round(prev.small_blind * 1.5),
      big_blind:   Math.round(prev.big_blind   * 1.5),
      big_blind_ante: Math.round((prev.big_blind_ante || prev.big_blind) * 1.5)
    });
  }
  return out;
}
