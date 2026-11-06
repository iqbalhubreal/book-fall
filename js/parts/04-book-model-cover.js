/* 04-book-model-cover: source fragment 04/17. Loaded in order by ../main.js. */
/* ---- the books (one InstancedMesh; the cover comes from the uploaded wrap image) ------------------------------- */
const BOOK = { img: null, spine: 0.6, bleed: false, note: '' };
const MAXANI = renderer.capabilities.getMaxAnisotropy();
const mkTex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, MAXANI); return t; };
const pageCanvas = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#efe6cf'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#d9ceb0';
  for (let i = 0; i < 64; i += 3) x.fillRect(0, i, 64, 1);
  return c;
})();
const pageTex = mkTex(pageCanvas);
const matPages = new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.9 });
const matFront = new THREE.MeshStandardMaterial({ roughness: 0.55 });
const matBack = new THREE.MeshStandardMaterial({ roughness: 0.55 });
const matSpine = new THREE.MeshStandardMaterial({ roughness: 0.55 });
const domMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(DOM_W, DOM_H, DOM_T), [matSpine, matPages, matPages, matPages, matBack, matFront], DOM_MAX);
domMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
domMesh.castShadow = true; domMesh.receiveShadow = true; domMesh.frustumCulled = false;
domMesh.setColorAt(0, new THREE.Color(1, 1, 1)); scene.add(domMesh);

function placeholderWrap(sp) {                                // shown until a cover is uploaded
  const H = 900, ppi = H / 9, cw = 6 * ppi, sw = Math.max(8, sp * ppi), c = document.createElement('canvas');
  c.width = Math.round(2 * cw + sw); c.height = H; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, c.width, H); g.addColorStop(0, '#1f3a5f'); g.addColorStop(1, '#2e8a8f');
  x.fillStyle = g; x.fillRect(0, 0, c.width, H);
  x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 6; x.strokeRect(cw + sw + 30, 30, cw - 60, H - 60); x.strokeRect(30, 30, cw - 60, H - 60);
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = 'bold 54px sans-serif';
  x.fillText('YOUR', cw + sw + cw / 2, H / 2 - 30); x.fillText('BOOK COVER', cw + sw + cw / 2, H / 2 + 40);
  x.font = '30px sans-serif'; x.fillText('open ⚙ → Upload', cw + sw + cw / 2, H / 2 + 100);
  x.save(); x.translate(cw + sw / 2, H / 2); x.rotate(Math.PI / 2); x.font = 'bold 34px sans-serif'; x.fillText('YOUR BOOK COVER', 0, 12); x.restore();
  return c;
}
/* Cut the wrap (back | spine | front, left to right) into three textures and size the 3D book to match. */
function applyCover(img, spineIn, bleed) {
  BOOK.img = img; BOOK.bleed = !!bleed; BOOK.note = '';
  let src = img, sp = spineIn;
  if (!img) { sp = 0.6; src = placeholderWrap(sp); bleed = false; }
  const W = src.naturalWidth || src.width, H = src.naturalHeight || src.height;
  const x0 = bleed ? 0.125 : 0, trimH = 9 + 2 * x0;
  if (img && !(sp > 0)) {                                     // auto-detect the spine from the image proportions
    sp = trimH * W / H - 12 - 2 * x0;
    if (!(sp >= 0.1 && sp <= 3)) { BOOK.note = 'Could not read the spine width from the image shape; using 0.6 in. Set it by hand.'; sp = 0.6; }
    else BOOK.note = 'Spine width detected: ' + sp.toFixed(2) + ' in.';
  }
  BOOK.spine = sp;
  const totalIn = 12 + sp + 2 * x0, ppx = W / totalIn, ppy = H / trimH, OH = 1152, OW = 768;
  const cut = (a0, a1, ow) => {
    const c = document.createElement('canvas'); c.width = ow; c.height = OH;
    c.getContext('2d').drawImage(src, (x0 + a0) * ppx, x0 * ppy, (a1 - a0) * ppx, 9 * ppy, 0, 0, ow, OH);
    return mkTex(c);
  };
  const tBack = cut(0, 6, OW), tSpine = cut(6, 6 + sp, Math.max(16, Math.round(OH * sp / 9))), tFront = cut(6 + sp, 12 + sp, OW);
  for (const [m, t] of [[matBack, tBack], [matSpine, tSpine], [matFront, tFront]]) { if (m.map) m.map.dispose(); m.map = t; m.needsUpdate = true; }
  setThick(clamp(sp / 9 * DOM_H, 0.05, 0.45));
  domMesh.geometry.dispose(); domMesh.geometry = new THREE.BoxGeometry(DOM_W, DOM_H, DOM_T);
  return sp;
}

const _m4 = new THREE.Matrix4(), _dP = { x: 0, z: 0, fx: 1, fz: 0 }, _dO = { x: 0, z: 0, fx: 1, fz: 0 }, _dF = { x: 0, z: 0, fx: 1, fz: 0 };
const SIN_A = Math.sin(FALL_A), COS_A = Math.cos(FALL_A);
let LY_CU = DOM_T / 2 * SIN_A + DOM_H / 2 * COS_A, LY_CF = -DOM_T / 2 * COS_A + DOM_H / 2 * SIN_A;   // centre of a lying book
function setThick(t) { DOM_T = t; FALL_A = Math.min(Math.acos(clamp(DOM_T / DS, 0, 0.99)), THREE.MathUtils.degToRad(84)); { const thc = Math.asin(clamp((DS - DOM_T) / DOM_H, 0.05, 0.9)); FALL = (1 / RHO) / Math.pow(thc / FALL_A, 1 / FALL_P); } LY_CU = DOM_T / 2 * SIN_A + DOM_H / 2 * COS_A; LY_CF = -DOM_T / 2 * COS_A + DOM_H / 2 * SIN_A; }
function writeDomino(idx, F, th, cx, cy, cz, sc = 1) {
  const c = Math.cos(th), s = Math.sin(th);                   // tilt about the lateral axis; columns = lateral, tilted-up, tilted-forward
  _m4.set(F.fz, F.fx * s, F.fx * c, cx,
          0,    c,        -s,       cy,
          -F.fx, F.fz * s, F.fz * c, cz,
          0, 0, 0, 1);
  if (sc !== 1) _m4.scale(_sv.set(sc, sc, sc));
  domMesh.setMatrixAt(idx, _m4);
}
/* A book can lean no further than the book in front of it allows: its top front corner must stay on or behind the next book's back face.
   H sin(th - phi) <= DS cos(phi) - T   ->   th <= phi + asin((DS cos(phi) - T) / H).   (phi = lean of the next book; 0 gives the contact angle) */
const thMax = phi => phi + Math.asin(clamp((DS * Math.cos(phi) - DOM_T) / DOM_H, -1, 1));
let _nextTh = 0;                                                                                 // lean of book k+1 in this frame (books are processed from the front backwards)
const _sv = new THREE.Vector3();
function setDomino(idx, k, t) {
  const tau = t - k / RHO;
  pathPt(k, _dP);
  let th = 0, cx = _dP.x, cy = DOM_H / 2, cz = _dP.z, dim = 0, sc = 1;
  if (tau < -LSTAND) {                                                                           // rising out of the ground
    const e = smooth01((tau + LSTAND + TRISE) / TRISE);
    cy = DOM_H / 2 - (1 - e) * (DOM_H + 0.15);
    _nextTh = 0;
  } else {
    if (tau >= 0) {
      if (tau < FALL) th = FALL_A * Math.pow(tau / FALL, FALL_P);
      else { const w = tau - FALL; th = FALL_A - 0.03 * Math.exp(-w * 13) * Math.sin(w * 32); dim = smooth01(w / 1.0); }
    }
    if (th > 0) th = Math.min(th, thMax(_nextTh));                                               // held up by the book in front
    _nextTh = th;
    if (th > 0) {
      const c = Math.cos(th), s = Math.sin(th), cf = -DOM_T / 2 * c + DOM_H / 2 * s;
      cx = _dP.x + _dP.fx * cf; cz = _dP.z + _dP.fz * cf; cy = DOM_T / 2 * s + DOM_H / 2 * c;
    }
    if (tau > TLIE) sc = 1 - smooth01((tau - TLIE) / TSINK);                                     // finally shrinks away (it rests on others, so no sinking)
  }
  if (sc <= 0.001) sc = 0.001;
  writeDomino(idx, _dP, th, cx, cy, cz, sc);
  { const g = clamp(1 - dim * 0.3, 0, 1.3); _col.setRGB(g, g, g); domMesh.setColorAt(idx, _col); }
}
