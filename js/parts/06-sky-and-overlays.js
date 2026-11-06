/* 06-sky-and-overlays: source fragment 06/17. Loaded in order by ../main.js. */
/* =========================================================
   SKY CYCLE (repeats every 320 m of height → truly endless)
   ========================================================= */
const SKY = [[0, 0x87c8ff], [0.32, 0x87c8ff], [0.45, 0xffa96b], [0.55, 0x7a5a9a], [0.65, 0x2a3f7a], [0.86, 0x2a3f7a], [0.93, 0xff9fb0], [1.0, 0x87c8ff]]
  .map(([p, c]) => [p, new THREE.Color(c)]);
const NIGHT = [[0, 0], [0.5, 0], [0.62, 1], [0.88, 1], [0.95, 0], [1, 0]];
const skyCol = new THREE.Color(), white = new THREE.Color(0xffffff);
function keyLerp(keys, p) {
  for (let i = 0; i < keys.length - 1; i++) if (p >= keys[i][0] && p <= keys[i+1][0]) return [i, (p - keys[i][0]) / (keys[i+1][0] - keys[i][0])];
  return [keys.length - 2, 1];
}
let nightness = 0;
function updateSky(h) {
  const p = ((h % 320) + 320) % 320 / 320;
  const [i, f] = keyLerp(SKY, p);
  skyCol.copy(SKY[i][1]).lerp(SKY[i+1][1], f);
  const [j, g] = keyLerp(NIGHT, p);
  nightness = lerp(NIGHT[j][1], NIGHT[j+1][1], g);
  scene.background.copy(skyCol); scene.fog.color.copy(skyCol);
  hemi.color.copy(skyCol); hemi.intensity = lerp(0.9, 0.85, nightness);
  sun.color.copy(white).lerp(skyCol, 0.45);
  sun.intensity = lerp(1.8, 1.0, nightness);
  stars.material.opacity = nightness;
}

/* =========================================================
   OVERLAY: vignette + fade (drawn INTO the canvas → recorded)
   The recorded frame itself is exactly 9:16 or 16:9, edge to edge.
   Only rendered when something is actually visible.
   ========================================================= */
const overlay = new THREE.Scene();
const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const vignetteTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 60, 128, 128, 182);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
})();
const vignette = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: vignetteTex, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
const fadeQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
overlay.add(vignette, fadeQuad);
let vigAmt = 0, fade = 0, fadeTarget = 0;
function updateOverlay(dt) {
  const want = proChk.checked ? 1 : 0;
  vigAmt += (want - vigAmt) * (1 - Math.exp(-dt * 4));
  vignette.material.opacity = vigAmt; vignette.visible = vigAmt > 0.01;
  const fs = 1.3 * dt;
  fade = fade < fadeTarget ? Math.min(fadeTarget, fade + fs) : Math.max(fadeTarget, fade - fs);
  fadeQuad.material.opacity = fade; fadeQuad.visible = fade > 0.001;
  return vignette.visible || fadeQuad.visible;
}
