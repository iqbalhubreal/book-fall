/* 05-marble-particles-world: source fragment 05/17. Loaded in order by ../main.js. */
/* ---- the ball that starts it all (endless mode only): rolls in along the straight lead-in and hits book 0 at t = 0 ---- */
const marbleTex = (() => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#f2f6ff'; x.fillRect(0, 0, 256, 128);
  const cols = ['#2f6df6', '#ff5a4f', '#ffc83d', '#2fc7a4'];
  for (let i = 0; i < 4; i++) {
    x.strokeStyle = cols[i]; x.lineWidth = 15; x.lineCap = 'round'; x.beginPath();
    for (let q = 0; q <= 256; q += 8) { const yy = 20 + i * 28 + Math.sin(q / 256 * TAU * 2 + i * 1.3) * 14; q ? x.lineTo(q, yy) : x.moveTo(q, yy); }
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
})();
const marbleG = new THREE.Group();
const marble = new THREE.Mesh(new THREE.SphereGeometry(R_M, 40, 28), new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.12, metalness: 0.12 }));
marble.castShadow = true; marbleG.add(marble); scene.add(marbleG); marbleG.visible = false;
const _bp2 = { x: 0, z: 0, fx: 1, fz: 0 }, _bbasis = new THREE.Matrix4(), _br = new THREE.Vector3(), _bf = new THREE.Vector3(), X_AXIS = new THREE.Vector3(1, 0, 0), _bq2 = new THREE.Quaternion();
const ballS = t => t <= 0 ? -(DOM_T + R_M) + BALL_V * t : -(DOM_T + R_M) - 0.3 * (1 - Math.exp(-t / 0.12));   // distance along the lead-in
function updateBall(t) {
  const on = !loopMode && t < 7;
  marbleG.visible = on; if (!on) return;
  const s = ballS(t);
  posOnPath(s / DS, _bp2);
  marbleG.position.set(_bp2.x, R_M, _bp2.z);
  _bbasis.makeBasis(_br.set(_bp2.fz, 0, -_bp2.fx), UP, _bf.set(_bp2.fx, 0, _bp2.fz));
  marbleG.quaternion.setFromRotationMatrix(_bbasis);
  marble.quaternion.copy(_bq2.setFromAxisAngle(X_AXIS, s / R_M));
}

let _seed = 20261105;
const rnd = () => (_seed = (_seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const LM = 50, MT = 6, LXM = 14, POLLEN = LM * MT;           // dust lattice: repeats every 14 units along x (1 per loop)
const poPos = new Float32Array(POLLEN * 3);
const mx = [], mz = [], my = [], mph = [];
for (let i = 0; i < LM; i++) { mx.push(rnd() * LXM); mz.push((rnd() - 0.5) * 34); my.push(0.3 + rnd() * 8.5); mph.push(rnd()); }
const poGeo = new THREE.BufferGeometry(); poGeo.setAttribute('position', new THREE.BufferAttribute(poPos, 3));
const pollen = new THREE.Points(poGeo, new THREE.PointsMaterial({ size: 0.08, color: 0xfff1b0, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
pollen.frustumCulled = false; scene.add(pollen);
function updateMotes(camX, t) {
  const base = Math.floor((camX - 42) / LXM), u = t / 10;
  for (let tile = 0; tile < MT; tile++) for (let i = 0; i < LM; i++) {
    const n = (tile * LM + i) * 3, a = TAU * (2 * u + mph[i]);
    poPos[n] = (base + tile) * LXM + mx[i] + 0.3 * Math.sin(a);
    poPos[n + 1] = my[i] + 0.25 * Math.cos(a);
    poPos[n + 2] = mz[i] + 0.3 * Math.cos(a + 1.7);
  }
  poGeo.attributes.position.needsUpdate = true;
}

/* ---- one frame of the world at time t -------------------------------------------------------------------------- */
const followGoal = new THREE.Vector3(), fwdVec = new THREE.Vector3(1, 0, 0), aheadPt = new THREE.Vector3();
let bGlow = 0;
const _mpw = { x: 0, z: 0, fx: 1, fz: 0 }, _mpw2 = { x: 0, z: 0, fx: 1, fz: 0 };
function worldFrame(t) {
  const kmin = Math.max(loopMode ? -1e9 : 0, Math.ceil((t - TLIE - TSINK) * RHO)), kmax = Math.floor((t + LSTAND + TRISE) * RHO);
  const n = Math.min(kmax - kmin + 1, DOM_MAX); _nextTh = 0;
  for (let k = kmin + n - 1; k >= kmin; k--) setDomino(k - kmin, k, t);   // front to back: each book is held up by the one ahead of it
  domMesh.count = n; domMesh.instanceMatrix.needsUpdate = true; domMesh.instanceColor.needsUpdate = true;
  updateBall(t);
  const q = loopMode ? t * RHO : (t < 0 ? ballS(t) / DS : t * RHO + (ballS(0) / DS) * Math.exp(-t / 0.6));
  const _mp = _mpw, _mp2 = _mpw2;
  posOnPath(q, _mp); followGoal.set(_mp.x, 0.9, _mp.z); fwdVec.set(_mp.fx, 0, _mp.fz);   // smooth point the camera follows
  posOnPath(q + 26, _mp2); aheadPt.set(_mp2.x, 0.6, _mp2.z);
  updateMotes(followGoal.x, t); updateCity(followGoal.x);
  for (const m of bMats) m.emissiveIntensity = 0.1 + bGlow * 1.7;
  sun.position.copy(followGoal).add(_t1.set(10, 20, 8));
  sun.target.position.copy(followGoal);
}
