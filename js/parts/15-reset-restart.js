/* 15-reset-restart: source fragment 15/17. Loaded in order by ../main.js. */
/* =========================================================
   RESET / RESTART
   ========================================================= */
const followTarget = new THREE.Vector3(0, 0.9, 0);
function restart() {
  if (loopMode) { loopU = 0; loopT = 0; resetSounds(); return; }   // loop world: just rewind the cycle
  simT = -2.0; resetSounds();
  worldFrame(simT);
  followTarget.copy(followGoal);
  if (!proChk.checked) { camera.position.set(followTarget.x - 4.2, 2.0, followTarget.z + 1.6); controls.target.copy(followTarget); }
  else director.start();
}
