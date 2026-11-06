/* 13-ui-controls: source fragment 13/17. Loaded in order by ../main.js. */
/* =========================================================
   UI
   ========================================================= */
const pauseBtn = document.getElementById('pauseBtn'), speedEl = document.getElementById('speed'), speedVal = document.getElementById('speedVal');
const muteBtn = document.getElementById('muteBtn'), volEl = document.getElementById('vol');
const windChk = document.getElementById('windChk'), recSoundChk = document.getElementById('recSoundChk');
const proChk = document.getElementById('proChk'), proLen = document.getElementById('proLen');
const proAspect = document.getElementById('proAspect'), proQuality = document.getElementById('proQuality');
const proStyle = document.getElementById('proStyle'), loopCycles = document.getElementById('loopCycles'), loopCam = document.getElementById('loopCam');
const loopOpts = document.getElementById('loopOpts'), loopHint = document.getElementById('loopHint');
const syncEl = document.getElementById('syncMs'), syncVal = document.getElementById('syncVal'), latHint = document.getElementById('latHint');
const sBall = document.getElementById('sBall'), sTree = document.getElementById('sTree'), sJumps = document.getElementById('sJumps'), sCam = document.getElementById('sCam'), sFps = document.getElementById('sFps');
let paused = false, speed = 1;
let activeOutputWidth = innerWidth, activeOutputHeight = innerHeight;

function proDims() {
  const q = QUALITY[proQuality.value] || QUALITY.high;
  const s = q.short, l = Math.round(s * 16 / 9);
  return proAspect.value === '9:16' ? [s, l] : [l, s];
}
function applyRendererOutput() {
  if (proChk.checked) {
    const [W, H] = proDims();
    const full = recording || countingDown || exporting;         // recording at full size; the live preview at half size to save GPU
    const k = full ? 1 : 0.5;
    activeOutputWidth = Math.round(W * k);
    activeOutputHeight = Math.round(H * k);
    renderer.setPixelRatio(1);
    renderer.setSize(activeOutputWidth, activeOutputHeight, false);
    // The canvas is fitted to the viewport with CSS while its buffer keeps the exact aspect ratio.
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    camera.aspect = W / H;
  } else {
    activeOutputWidth = innerWidth;
    activeOutputHeight = innerHeight;
    renderer.setPixelRatio(curPR);
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
  }
  camera.updateProjectionMatrix();
}

function lockProfessionalSettings(locked) {
  proChk.disabled = locked;
  const off = locked || !proChk.checked;
  proAspect.disabled = off; proQuality.disabled = off; proStyle.disabled = off;
  proLen.disabled = off || proStyle.value === 'loop';        // loops have their own length (repeats × 5 s)
  loopCycles.disabled = locked; loopCam.disabled = locked;
}

function togglePause() {
  paused = !paused;
  pauseBtn.textContent = paused ? '▶ Play' : '⏸ Pause';
  if (recorder && recording) {
    const now = performance.now();
    if (paused) { if (recorder.state === 'recording') recorder.pause(); recPausedAt = now; }
    else {
      if (recorder.state === 'paused') recorder.resume();
      if (recPausedAt) { recPausedTotal += now - recPausedAt; recPausedAt = 0; }
    }
  }
  if (paused) resetSounds();   // nothing stale plays after pausing
}
pauseBtn.onclick = togglePause;
speedEl.oninput = () => {
  speed = parseFloat(speedEl.value); speedVal.textContent = speed.toFixed(1) + '×';
  resetSounds();                   // re-time the pending clicks
};
function toggleMute() { muted = !muted; muteBtn.textContent = muted ? '🔇 Unmute' : '🔊 Mute'; applyVolume(); }
muteBtn.onclick = toggleMute;
volEl.oninput = () => { volume = parseFloat(volEl.value); applyVolume(); };

function setSync(ms) {
  syncMs = clamp(Math.round(ms / 5) * 5, -200, 300);
  syncEl.value = syncMs;
  syncVal.textContent = (syncMs > 0 ? '+' : '') + syncMs + ' ms';
  try { localStorage.setItem('bookFall.syncMs', String(syncMs)); } catch (e) {}
  resetSounds();                   // apply immediately
}
syncEl.oninput = () => setSync(parseInt(syncEl.value, 10));
document.getElementById('syncReset').onclick = () => setSync(0);
setSync(syncMs);
let lastLatTxt = '';
function updateLatencyHint() {
  if (!actx) return;
  const txt = `Auto-compensating ~${Math.round(deviceLatency() * 1000)} ms device latency · negative = sound earlier, positive = later (keys , and .)`;
  if (txt !== lastLatTxt) { lastLatTxt = txt; latHint.textContent = txt; }
}

proChk.onchange = () => {
  lockProfessionalSettings(false);
  controls.enabled = !proChk.checked;
  applyRendererOutput();
  if (proChk.checked) director.start();
  else { controls.target.copy(followTarget); camera.fov = 50; camera.updateProjectionMatrix(); }
  refreshLoopMode();
};
const refreshProOutput = () => { if (proChk.checked && !recording && !countingDown) applyRendererOutput(); };
proAspect.onchange = refreshProOutput;
proQuality.onchange = refreshProOutput;
function refreshLoopMode() {
  const want = proChk.checked && proStyle.value === 'loop';
  loopOpts.hidden = !want; loopHint.hidden = !want;
  if (want !== loopMode) setLoopWorld(want);
}
proStyle.onchange = () => { lockProfessionalSettings(false); refreshLoopMode(); };
document.getElementById('snapBtn').onclick = snapshot;
document.getElementById('restartBtn').onclick = restart;

/* No start screen: the audio engine is created immediately and unlocked by the first tap, click or key press
   (browsers don't allow sound before some user interaction). */
const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'];
function unlockAudio() {
  initAudio();
  if (!actx) return;
  actx.resume().then(() => {
    if (actx.state === 'running') UNLOCK_EVENTS.forEach(ev => removeEventListener(ev, unlockAudio));
  }).catch(() => {});
}
UNLOCK_EVENTS.forEach(ev => addEventListener(ev, unlockAudio));
try { initAudio(); } catch (e) {}
