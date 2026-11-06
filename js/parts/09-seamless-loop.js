/* 09-seamless-loop: source fragment 09/17. Loaded in order by ../main.js. */
/* =========================================================
   SEAMLESS LOOP
   The world above is already a pure function of time, so a seamless loop only needs three things:
     1. the path is translation-periodic (60 dominoes per period; 120 dominoes = exactly 10 s = 2 periods),
     2. every look (colour, pips, city blocks, dust) repeats with the same period, and
     3. the camera is a periodic function of the loop time too.
   At t = 10 s everything is the picture at t = 0, shifted along x by exactly 2 periods.
   ========================================================= */
const LOOP_T = 10;                                           // seconds per cycle (120 dominoes, 30 marble hops)
const LOOP_PHASE = 0.2;                                      // recordings start 0.2 s into the cycle so no landing sits on the seam
const LOOP_FOG_NEAR = 15, LOOP_FOG_FAR = 60;
const LOOP_SKY = new THREE.Color(0x6f86cf), LOOP_NIGHT = 0.55;
let offlineRender = false;        // true while the frame-exact exporter drives the scene
let exporting = false, exportCancel = false;

function loopCamera(t) {
  const u = t / LOOP_T;
  const fit = camera.aspect < 1 ? Math.pow(1 / camera.aspect, 0.5) : 1;
  const D = 3.3 * fit, pm = followGoal;
  if (loopCam.value === 'sway') {                            // chase from behind, swinging gently from side to side
    const sw = 0.55 * Math.sin(TAU * 2 * u), c = Math.cos(sw), s = Math.sin(sw), bx = -fwdVec.x, bz = -fwdVec.z;
    camera.position.set(pm.x + (bx * c - bz * s) * D, 1.3 + 0.3 * Math.sin(TAU * u), pm.z + (bx * s + bz * c) * D);
    camera.lookAt(pm.x + fwdVec.x * 1.2, 0.5, pm.z + fwdVec.z * 1.2);
  } else {                                                   // one full orbit per cycle
    const az = 0.6 + TAU * u;
    camera.position.set(pm.x + Math.cos(az) * D, 1.5, pm.z + Math.sin(az) * D);
    camera.lookAt(pm.x, 0.5, pm.z);
  }
}
/* Draw one loop frame at exactly time t (used by the frame-exact exporter and the seam tests). */
function drawLoopAt(t) {
  worldFrame(t);
  camera.fov = 50; camera.updateProjectionMatrix();
  loopCamera(t);
  vigAmt = 1; fade = 0; fadeTarget = 0;
  const overlayOn = updateOverlay(0);
  renderer.clear();
  renderer.render(scene, camera);
  if (overlayOn) { renderer.clearDepth(); renderer.render(overlay, orthoCam); }
}
function setLoopWorld(on) {
  loopMode = on;
  stars.visible = !on;
  scene.fog.near = on ? LOOP_FOG_NEAR : 15; scene.fog.far = on ? LOOP_FOG_FAR : 60;
  if (on) {
    scene.background.copy(LOOP_SKY); scene.fog.color.copy(LOOP_SKY);
    hemi.color.copy(LOOP_SKY); hemi.intensity = 1.35;
    sun.color.copy(white).lerp(LOOP_SKY, 0.45); sun.intensity = 1.9;
    nightness = LOOP_NIGHT; bGlow = LOOP_NIGHT;
    camera.fov = 50; camera.updateProjectionMatrix();
    loopU = 0; loopT = 0;
  } else {
    restart();
  }
  resetSounds();
}
