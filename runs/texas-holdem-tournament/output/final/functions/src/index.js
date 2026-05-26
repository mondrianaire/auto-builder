// functions/src/index.js — Cloud Function exports (deploy-when-ready).
// Required exports per TD-IP-B.A1: dealHand, submitAction, advanceBlindLevel, recomputeLeaderboards.
const admin = require("firebase-admin");
admin.initializeApp();

exports.dealHand               = require("./dealHand").dealHand;
exports.submitAction           = require("./submitAction").submitAction;
exports.resolveHand            = require("./resolveHand").resolveHand;
exports.advanceBlindLevel      = require("./advanceBlindLevel").advanceBlindLevel;
exports.lobbyTimers            = require("./lobbyTimers").lobbyTimers;
exports.recomputeLeaderboards  = require("./recomputeLeaderboards").recomputeLeaderboards;
exports.fireEasterEgg          = require("./easterEggDispatch").fireEasterEgg;
