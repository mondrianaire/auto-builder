// functions/src/scoring.js — PWCS scoring formula (IP5). Mirrors src/scoring.js.
function positionPoints(finishPosition, fieldSize) {
  if (fieldSize <= 0 || finishPosition < 1 || finishPosition > fieldSize) return 0;
  const ratio = 1 - (finishPosition - 1) / fieldSize;
  return Math.round(100 * Math.pow(ratio, 0.6));
}
function completionWeight({ status, starting_field, players_eliminated }) {
  if (status === "finished") return 1.0;
  if (starting_field <= 1) return 0;
  return Math.max(0, players_eliminated / (starting_field - 1));
}
function scoreTournament(args) {
  return Math.round(positionPoints(args.finish_position, args.field_size) * completionWeight(args));
}
module.exports = { positionPoints, completionWeight, scoreTournament };
