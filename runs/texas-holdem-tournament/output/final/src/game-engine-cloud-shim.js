// src/game-engine-cloud-shim.js — thin wrapper around the deployed Cloud Functions
// callable endpoints. Only used when SERVER_ENGINE_MODE === "cloud-functions".

import { FIREBASE_SDK_VERSION, FIREBASE_CONFIG } from "./config.js";

const V = FIREBASE_SDK_VERSION;
const G = `https://www.gstatic.com/firebasejs/${V}`;
const { app } = await import("./firebase.js");
const fnMod = await import(`${G}/firebase-functions.js`);
const functions = fnMod.getFunctions(app);

export async function submitActionCallable(tid, action) {
  const fn = fnMod.httpsCallable(functions, "submitAction");
  const res = await fn({ tid, action });
  return res.data;
}

export async function dealHandCallable(tid) {
  const fn = fnMod.httpsCallable(functions, "dealHand");
  const res = await fn({ tid });
  return res.data;
}

export async function recomputeLeaderboardsCallable() {
  const fn = fnMod.httpsCallable(functions, "recomputeLeaderboards");
  const res = await fn({});
  return res.data;
}
