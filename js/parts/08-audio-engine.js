/* 08-audio-engine: source fragment 08/17. Loaded in order by ../main.js. */
/* =========================================================
   AUDIO – soft paper taps, one per book (no melody, no beat)

   SYNC MODEL
   Every contact time is known in advance (domino k is hit at exactly k / RHO seconds), so each
   click is scheduled slightly ahead on the audio clock instead of being fired when a frame is drawn:
     speakers : contact time + display lag - device output latency + user offset
     recording: contact time + user offset   (the recorder taps the audio before the speakers)
   ========================================================= */
let actx = null, master, recMix, sfxBus, recSfxBus, windGain, windFilter, recDest, noiseBuf;
let muted = false, volume = 0.7;
const LOOKAHEAD = 0.7;          // seconds before a contact at which its sound is scheduled
const DISPLAY_LAG = 0.025;      // ~1.5 frames between simulating a frame and seeing it
let syncMs = 0;                 // user offset: negative = earlier, positive = later
try { const v = parseInt(localStorage.getItem('bookFall.syncMs'), 10); if (!isNaN(v)) syncMs = clamp(v, -200, 300); } catch (e) {}
let pendingVoices = [];
let soundK = 0;                 // next domino whose click has not been scheduled yet

function initAudio() {
  if (actx) { actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  try { actx = new AC({ latencyHint: 'interactive' }); } catch (e) { actx = new AC(); }
  master = actx.createGain(); master.gain.value = muted ? 0 : volume;
  master.connect(actx.destination);
  recMix = actx.createGain(); recMix.gain.value = master.gain.value;
  recDest = actx.createMediaStreamDestination();
  recMix.connect(recDest);
  sfxBus = actx.createGain(); sfxBus.connect(master);
  recSfxBus = actx.createGain(); recSfxBus.connect(recMix);

  noiseBuf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  // Soft, steady city hum
  const src = actx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  windFilter = actx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 500; windFilter.Q.value = 0.6;
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
  windGain = actx.createGain(); windGain.gain.value = 0;
  src.connect(windFilter); windFilter.connect(lp); lp.connect(windGain);
  windGain.connect(master); windGain.connect(recMix);
  src.start();
  updateLatencyHint();
}
function deviceLatency() {
  if (!actx) return 0;
  return clamp((actx.outputLatency || 0) + (actx.baseLatency || 0), 0, 0.35);
}
/* One book being hit: a soft paper "thup" (band-passed noise + a tiny low thud). Pitch varies a little per book,
   but always the same for the same book number, so the loop sounds identical every time round. */
function playClackAt(t, k, bus, ctx = actx, nbuf = noiseBuf) {
  const kk = ((k % LP_N) + LP_N) % LP_N, h = hash3(kk, 7, 3), v = 0.075;
  const vg = ctx.createGain(); vg.connect(bus);
  const n = ctx.createBufferSource(); n.buffer = nbuf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800 + h * 800; bp.Q.value = 1.1;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(v, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  n.connect(bp); bp.connect(ng); ng.connect(vg); n.start(t, (h * 1.7) % 1.6, 0.08);
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(190 + h * 60, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.06);
  const og = ctx.createGain();
  og.gain.setValueAtTime(v * 1.1, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(og); og.connect(vg); o.start(t); o.stop(t + 0.09);
  if (ctx === actx) pendingVoices.push({ vg, end: t + 0.12 });
}
/* delaySec = real seconds from now until domino k is hit on screen. */
function scheduleClack(delaySec, k) {
  if (!actx || actx.state !== 'running') return;    // a suspended context would queue sounds and burst them out on resume
  const now = actx.currentTime;
  pendingVoices = pendingVoices.filter(v => v.end > now);
  const off = syncMs / 1000;
  const tLive = Math.max(now + 0.002, now + delaySec + DISPLAY_LAG + off - deviceLatency());
  playClackAt(tLive, k, sfxBus);
  if (recording && recSoundChk.checked) {
    const tRec = Math.max(now + 0.002, now + delaySec + off);
    playClackAt(tRec, k, recSfxBus);
  }
}
function cancelTwiks() {
  for (const v of pendingVoices) { try { v.vg.disconnect(); } catch (e) {} }
  pendingVoices = [];
}
/* Forget what was scheduled and start again from the current moment (pause, speed change, sync change, restart...). */
function resetSounds() {
  cancelTwiks();
  soundK = loopMode ? Math.ceil(loopU * RHO) : Math.max(0, Math.ceil(simT * RHO));
}
/* Called once per frame: schedule every click that falls inside the look-ahead window. */
function scheduleSoundsLive(tU, spd) {
  if (!actx || actx.state !== 'running' || paused) return;
  const horizon = tU + LOOKAHEAD * spd;
  for (let guard = 0; soundK / RHO <= horizon && guard < 40; guard++) {
    const k = soundK++, delay = (k / RHO - tU) / spd;
    if (delay >= -0.02) scheduleClack(Math.max(0, delay), k);
  }
}
function applyVolume() {
  if (!master) return;
  const v = muted ? 0 : volume;
  master.gain.setTargetAtTime(v, actx.currentTime, 0.03);
  recMix.gain.setTargetAtTime(v, actx.currentTime, 0.03);
}
let windT = 0;
function updateWind(h, dt) {
  if (!actx) return;
  windT += dt; if (windT < 0.1) return;             // 10 Hz is plenty; per-frame automation events add up
  windT = 0;
  const T = actx.currentTime;
  // Loop mode: steady hum, no slow drifting, so the audio has nothing that could reveal the seam
  const base = windChk.checked && !paused ? (loopMode ? 0.06 : 0.04 + Math.min(h / 600, 1) * 0.05) : 0;
  const mod = loopMode ? 1 : 0.7 + 0.2 * Math.sin(T * 0.31) + 0.1 * Math.sin(T * 0.77 + 2);
  windGain.gain.setTargetAtTime(base * mod, T, 0.4);
  windFilter.frequency.setTargetAtTime(loopMode ? 450 : 420 + 180 * Math.sin(T * 0.23), T, 0.5);
}
