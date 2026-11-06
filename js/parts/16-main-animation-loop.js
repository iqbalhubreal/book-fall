/* 16-main-animation-loop: source fragment 16/17. Loaded in order by ../main.js. */
/* =========================================================
   MAIN LOOP
   ========================================================= */
/* Adaptive resolution (live view only): if the frame rate stays low, render fewer pixels. */
let emaMs = 16.7, slowFrames = 0, frameNo = 0;
function adaptQuality(rawDt) {
  emaMs += (Math.min(rawDt, 0.25) * 1000 - emaMs) * 0.05;
  if (proChk.checked || recording || countingDown || paused || document.hidden) { slowFrames = 0; return; }
  if (emaMs > 28 && curPR > 0.75) slowFrames++; else slowFrames = 0;
  if (slowFrames > 90) {
    curPR = Math.max(0.75, curPR - 0.25);
    renderer.setPixelRatio(curPR); renderer.setSize(innerWidth, innerHeight);
    slowFrames = 0; emaMs = 16.7;
  }
}

function runLoop(dt) {
  if (recording) loopU = recNow() + LOOP_PHASE;               // fallback recorder only: wall clock, so dropped frames can't shift the loop
  else if (!paused) loopU += dt * speed;
  loopT = loopU % LOOP_T;
  worldFrame(loopT);
  loopCamera(loopT);
  scheduleSoundsLive(loopU, recording ? 1 : speed);
  sCam.textContent = 'Seamless loop';
}

const clock = new THREE.Clock();
let statTimer = 0, latTimer = 0;
applyCover(null);
restart();

function animate() {
  requestAnimationFrame(animate);
  if (exporting) return;                           // the exporter owns the renderer while it runs
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  adaptQuality(rawDt);
  frameNo++;

  if (loopMode) {
    runLoop(dt);
  } else {
    if (!paused) simT += dt * speed;
    bGlow = nightness;
    worldFrame(simT);
    scheduleSoundsLive(simT, speed);
    followTarget.copy(followGoal);

    if (proChk.checked) {
      director.update(dt, followTarget, aheadPt, !paused);
      sCam.textContent = NAMES[director.type] || 'Auto';
    } else {
      // keep the free camera riding along with the marble
      const delta = _b.subVectors(followTarget, controls.target);
      camera.position.add(delta); controls.target.add(delta);
      controls.autoRotate = !paused;
      controls.update();
      sCam.textContent = 'Free orbit';
    }
    updateSky(Math.max(simT, 0) * VM * (320 / 600));            // day / dusk / night / dawn, about every 90 s
  }

  stars.position.copy(camera.position);
  updateWind(0, dt);
  const overlayOn = updateOverlay(dt);

  // recording clock (wall time) / auto stop / outro
  if (recording) {
    recElapsed = recNow();
    if (loopRec) {
      // stop half a frame before the next cycle would begin, so the last frame leads straight back into the first
      if (!stopping && recElapsed >= recLimit - 0.5 / recFps) requestStop();
    } else if (recIsPro && recLimit > 0 && !stopping) {
      if (!director.outro && recLimit >= 12 && recElapsed >= recLimit - 5.2) {
        director.outro = true;
        director.next('craneUp', { cut: false, dur: 4.4 });   // smooth closing crane shot
      }
      if (recElapsed >= recLimit - 0.8) requestStop();
    }
    recTimeEl.textContent = `REC ${fmt(recElapsed)}${recIsPro && recLimit ? ' / ' + fmt(recLimit) : ''}`;
  }
  if (stopping && fade >= 0.999) finalizeStop();

  statTimer += dt; latTimer += dt;
  if (statTimer > 0.25) {
    statTimer = 0;
    if (loopMode) {
      sBall.textContent = 'looping'; sTree.textContent = '∞';
      sJumps.textContent = loopT.toFixed(1) + ' / ' + LOOP_T + ' s';
    } else {
      sBall.textContent = (Math.max(0, simT) * VM).toFixed(0) + ' m';
      sTree.textContent = Math.max(0, Math.floor(simT * RHO) + 1);
      sJumps.textContent = Math.max(0, simT).toFixed(0) + ' s';
    }
    quickRec.classList.toggle('recording', recording);
    quickRec.textContent = recording ? '⏹' : '⏺';
    quickPause.textContent = paused ? '▶' : '⏸';
    sFps.textContent = Math.round(1000 / emaMs) + (curPR < BASE_PR && !proChk.checked ? ' · res ' + Math.round(curPR * 100) + '%' : '');
  }
  if (latTimer > 1) { latTimer = 0; updateLatencyHint(); }

  renderer.clear();
  renderer.render(scene, camera);
  if (overlayOn) { renderer.clearDepth(); renderer.render(overlay, orthoCam); }
  if (snapRequested) doSnapshot();
}
animate();
