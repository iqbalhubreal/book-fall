/* 03-city-environment: source fragment 03/17. Loaded in order by ../main.js. */
/* ---- ground and city blocks ---------------------------------------------------------------------------------- */
const BC = 7;                                                // city block size (a whole loop is exactly 2 blocks long)
const ground = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#3b4252'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`; x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  x.fillStyle = '#4d566a'; x.fillRect(0, 0, 128, 3); x.fillRect(0, 0, 3, 128);
  x.fillStyle = '#2f3644'; x.fillRect(0, 3, 128, 2); x.fillRect(3, 0, 2, 128);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(63, 63); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(441, 441), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; scene.add(m); return m;
})();

const FLOORS = [5, 9, 15], FLOOR_H = 0.75, ZC = 11.5, BCOLS = 15, BROWS = 5;
const bMats = [], bMeshes = [];
(function makeCity() {
  const mk = (lit) => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    x.fillStyle = lit ? '#000' : '#dfe4f0'; x.fillRect(0, 0, 128, 128);
    for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
      const on = hash3(q, r, 5) > 0.38;
      x.fillStyle = lit ? (on ? '#ffd58a' : '#000') : '#26314a';
      x.fillRect(q * 32 + 6, r * 32 + 7, 20, 18);
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const wall = mk(false), glow = mk(true);
  FLOORS.forEach((f, ci) => {
    const w = wall.clone(), g = glow.clone(); w.needsUpdate = g.needsUpdate = true;
    w.repeat.set(1, f / 4); g.repeat.set(1, f / 4);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: w, emissive: 0xffffff, emissiveMap: g, emissiveIntensity: 0, roughness: 0.85 });
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, f * FLOOR_H, 1), mat, BCOLS * BROWS * 2);
    mesh.frustumCulled = false; mesh.setColorAt(0, new THREE.Color(1, 1, 1)); scene.add(mesh);
    bMats.push(mat); bMeshes.push(mesh);
  });
})();
const _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion(), _bp = new THREE.Vector3(), _bs = new THREE.Vector3(), _col = new THREE.Color();
function updateCity(camX) {
  const ix0 = Math.floor(camX / BC) - 7, cnt = [0, 0, 0];
  for (let side = 0; side < 2; side++) for (let r = 0; r < BROWS; r++) for (let c = 0; c < BCOLS; c++) {
    const ix = ix0 + c, ixh = loopMode ? ((ix % 2) + 2) % 2 : ix;       // the loop repeats every 2 blocks
    const h1 = hash3(ixh, r, side), h2 = hash3(ixh, r + 17, side + 5), h3 = hash3(ixh, r + 31, side + 9), h4 = hash3(ixh, r + 7, side + 2);
    if (h1 < 0.14) continue;                                              // an occasional open plaza
    const cls = (r >= 3 && h2 > 0.3) || h2 > 0.82 ? 2 : (h2 < 0.42 ? 0 : 1);
    const ci = cnt[cls]++;
    _bp.set((ix + 0.5) * BC + (h3 - 0.5), FLOORS[cls] * FLOOR_H / 2, (side ? 1 : -1) * (ZC + 3.5 + r * BC) + (h1 - 0.5));
    _bs.set(3.2 + h3 * 2.4, 1, 3.2 + h4 * 2.4);
    _bm.compose(_bp, _bq.identity(), _bs); bMeshes[cls].setMatrixAt(ci, _bm);
    _col.setHSL(0.56 + h3 * 0.14, 0.16 + h1 * 0.2, 0.34 + h2 * 0.22); bMeshes[cls].setColorAt(ci, _col);
  }
  for (let i = 0; i < 3; i++) { bMeshes[i].count = cnt[i]; bMeshes[i].instanceMatrix.needsUpdate = true; bMeshes[i].instanceColor.needsUpdate = true; }
  ground.position.set(Math.floor(camX / BC) * BC, 0, 0);
}
