// src/scoring.js — Position-Weighted Completion Score (PWCS) per IP5 / Researcher findings.
// Formula:
//   score = position_points(finish_position, field_size) * completion_weight(state)
//   position_points = round(100 * (1 - (position-1)/field_size) ^ 0.6)
//   completion_weight = 1.0 if finished, else max(0, players_eliminated / (starting_field - 1))

export function positionPoints(finishPosition, fieldSize) {
  if (fieldSize <= 0 || finishPosition < 1 || finishPosition > fieldSize) return 0;
  const ratio = 1 - (finishPosition - 1) / fieldSize;
  return Math.round(100 * Math.pow(ratio, 0.6));
}

export function completionWeight({ status, starting_field, players_eliminated }) {
  if (status === "finished") return 1.0;
  if (starting_field <= 1) return 0;
  return Math.max(0, players_eliminated / (starting_field - 1));
}

export function scoreTournament({ finish_position, field_size, status, starting_field, players_eliminated }) {
  const pp = positionPoints(finish_position, field_size);
  const cw = completionWeight({ status, starting_field, players_eliminated });
  // Edge case: when all but one player are eliminated in an unfinished tournament,
  // the chip leader is effectively finished → completion_weight saturates at 1.0.
  return Math.round(pp * cw);
}
