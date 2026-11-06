/* 02-helpers-world-path: source fragment 02/17. Loaded in order by ../main.js. */
/* =========================================================
   HELPERS
   ========================================================= */
const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _dir = new THREE.Vector3();
const _t1 = new THREE.Vector3();
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const easeInOut = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const smooth01 = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const TAU = Math.PI * 2;
function hash3(a, b, c) {                                    // small integer hash -> [0, 1)
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
let loopMode = false;                                        // world functions read this: the loop uses a periodic path

/* =========================================================
   BOOK FALL WORLD — every object is a pure function of time t

   Life of one domino, in seconds relative to the moment the wave reaches it (tau):
     tau < -LSTAND            it is still flying in from the old, fallen track (or rising from the ground at the start)
     -LSTAND .. 0             standing and waiting
     0 .. FALL                toppling forward onto the next one
     FALL .. TLIE             lying flat: this is the "track" the marble has already crossed
     after TLIE               it sinks into the ground
   The marble hops along the tops of the dominoes and lands on every 4th one just as it begins to fall.
   ========================================================= */
const RHO = 3;                         // books toppled per second (slow enough to see every cover)
const DS = 0.55;                       // spacing along the path
const VM = RHO * DS;                   // speed of the wave, units / s
const DOM_H = 1.0, DOM_W = 6 / 9; let DOM_T = 0.07;   // a 6 x 9 in book: 1 unit = 9 in
let FALL_A = THREE.MathUtils.degToRad(80); const FALL_P = 1.6;   // FALL_A = resting angle, set from the book thickness in setThick()
let FALL = 0.6;                        // time to topple fully; set in setThick() so that book k+1 starts exactly when book k touches it
const LSTAND = 10.0, TRISE = 1.2, TLIE = 3.0, TSINK = 1.0;   // standing wait, rise from the ground, lying time, sink into the ground
const DOM_MAX = Math.ceil((LSTAND + TRISE + TLIE + TSINK) * RHO) + 6;
const HOP = 4, HOP_T = HOP / RHO, R_M = 0.22, BALL_V = 3.6;
let simT = -0.9, loopU = 0, loopT = 0; // endless time, loop time (unwrapped / wrapped)

/* ---- the winding path -------------------------------------------------------------------------------------- */
const pathN = { xs: [0], zs: [], fx: [], fz: [] };           // endless path, generated as far as needed, by arc length
const zEnd = x => 4.6 * Math.sin(x / 9.3 + 0.6) + 2.7 * Math.sin(x / 4.1 + 1.9) + 1.1 * Math.sin(x / 2.05 + 0.3);
const dzEnd = x => 4.6 / 9.3 * Math.cos(x / 9.3 + 0.6) + 2.7 / 4.1 * Math.cos(x / 4.1 + 1.9) + 1.1 / 2.05 * Math.cos(x / 2.05 + 0.3);
(function () { pathN.zs[0] = zEnd(0); const sl = dzEnd(0), l = Math.hypot(1, sl); pathN.fx[0] = 1 / l; pathN.fz[0] = sl / l; })();
function extendEndless(n) {
  while (pathN.xs.length <= n) {
    const i = pathN.xs.length, px = pathN.xs[i - 1];
    let dx = DS;
    for (let it = 0; it < 4; it++) { const sl = dzEnd(px + dx / 2); dx = DS / Math.sqrt(1 + sl * sl); }
    const x = px + dx; pathN.xs.push(x); pathN.zs.push(zEnd(x));
    const sl = dzEnd(x), l = Math.hypot(1, sl); pathN.fx.push(1 / l); pathN.fz.push(sl / l);
  }
}

/* Loop path: translation-periodic. 60 dominoes per period; the shape repeats every LP_PX units along x. */
const LP_N = 30, LP_PX = 14;
const LP = { A: 0, xs: new Float64Array(LP_N), zs: new Float64Array(LP_N), fx: new Float64Array(LP_N), fz: new Float64Array(LP_N) };
const zLoop = (x, A) => A * (Math.sin(TAU * x / LP_PX) + 0.35 * Math.sin(2 * TAU * x / LP_PX + 1.1));
const dzLoop = (x, A) => A * (Math.cos(TAU * x / LP_PX) + 0.7 * Math.cos(2 * TAU * x / LP_PX + 1.1)) * TAU / LP_PX;
(function buildLoopTable() {
  const arc = A => { const N = 4000; let s = 0; for (let i = 0; i < N; i++) { const d = dzLoop((i + 0.5) * LP_PX / N, A); s += Math.sqrt(1 + d * d); } return s * LP_PX / N; };
  const target = LP_N * DS; let lo = 0, hi = 9;
  for (let it = 0; it < 60; it++) { const mid = (lo + hi) / 2; if (arc(mid) < target) lo = mid; else hi = mid; }
  LP.A = (lo + hi) / 2;
  const M = 8000, S = new Float64Array(M + 1);
  for (let i = 0; i < M; i++) {
    const xa = i * LP_PX / M, xb = (i + 1) * LP_PX / M, da = dzLoop(xa, LP.A), db = dzLoop(xb, LP.A);
    S[i + 1] = S[i] + (Math.sqrt(1 + da * da) + Math.sqrt(1 + db * db)) * 0.5 * (xb - xa);
  }
  const step = S[M] / LP_N; let j = 0;
  for (let i = 0; i < LP_N; i++) {
    const want = i * step; while (S[j + 1] < want) j++;
    const x = (j + (want - S[j]) / (S[j + 1] - S[j])) * LP_PX / M, sl = dzLoop(x, LP.A), l = Math.hypot(1, sl);
    LP.xs[i] = x; LP.zs[i] = zLoop(x, LP.A); LP.fx[i] = 1 / l; LP.fz[i] = sl / l;
  }
})();

function pathPt(k, o) {                                      // position and heading of domino number k
  if (loopMode) { const n = Math.floor(k / LP_N), r = k - n * LP_N; o.x = LP.xs[r] + n * LP_PX; o.z = LP.zs[r]; o.fx = LP.fx[r]; o.fz = LP.fz[r]; }
  else if (k < 0) { o.x = pathN.xs[0] + k * DS * pathN.fx[0]; o.z = pathN.zs[0] + k * DS * pathN.fz[0]; o.fx = pathN.fx[0]; o.fz = pathN.fz[0]; }
  else { extendEndless(k); o.x = pathN.xs[k]; o.z = pathN.zs[k]; o.fx = pathN.fx[k]; o.fz = pathN.fz[k]; }
  return o;
}
const _pa = { x: 0, z: 0, fx: 1, fz: 0 }, _pb = { x: 0, z: 0, fx: 1, fz: 0 };
function posOnPath(q, o) {                                   // same, at a fractional domino index
  const i = Math.floor(q), f = q - i;
  pathPt(i, _pa); pathPt(i + 1, _pb);
  o.x = _pa.x + (_pb.x - _pa.x) * f; o.z = _pa.z + (_pb.z - _pa.z) * f;
  const fx = _pa.fx + (_pb.fx - _pa.fx) * f, fz = _pa.fz + (_pb.fz - _pa.fz) * f, l = Math.hypot(fx, fz) || 1;
  o.fx = fx / l; o.fz = fz / l; return o;
}
