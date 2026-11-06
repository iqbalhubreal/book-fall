/* 10-recording-system: source fragment 10/17. Loaded in order by ../main.js. */
/* =========================================================
   RECORDING
   ========================================================= */
const recBtn = document.getElementById('recBtn'), recBadge = document.getElementById('recBadge');
const recTimeEl = document.getElementById('recTime'), recTag = document.getElementById('recTag');
const cdEl = document.getElementById('countdown'), cdNum = document.getElementById('cdNum');
const modal = document.getElementById('modal'), preview = document.getElementById('preview');
const dlBtn = document.getElementById('dlBtn'), vidInfo = document.getElementById('vidInfo');
let recorder = null, chunks = [], recording = false, stopping = false, countingDown = false;
let recElapsed = 0, recIsPro = false, recLimit = 0, lastUrl = null, lastName = '', recMime = '';
let recAspect = '', recWidth = 0, recHeight = 0, recFps = 30, loopRec = false;
let recStart = 0, recPausedAt = 0, recPausedTotal = 0;     // wall-clock timing, so lag can't stretch a timed recording

const QUALITY = {
  smooth: { short: 720,  fps: 30, mbps: 6 },
  high:   { short: 1080, fps: 30, mbps: 10 },
  ultra:  { short: 1080, fps: 60, mbps: 16 }
};

function pickMime() {
  // MP4/H.264 first: usually hardware-encoded (least lag) and plays everywhere. Falls back to WebM.
  const list = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
  for (const m of list) if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
  return '';
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function recNow() {
  const ref = recPausedAt || performance.now();
  return Math.max(0, (ref - recStart - recPausedTotal) / 1000);
}

async function startRecording() {
  if (recording || countingDown || exporting) return;
  if (proChk.checked && loopMode && canExportLoop()) { await exportLoopVideo(); return; }   // frame-exact path
  if (!window.MediaRecorder || !canvas.captureStream) { alert('Sorry, your browser does not support canvas recording.'); return; }
  initAudio();
  if (isSmallScreen()) setPanel(false);             // clear the scene while recording on phones
  recIsPro = proChk.checked;
  if (recIsPro) {
    countingDown = true; recBtn.disabled = true; recBtn.textContent = '⏳ Get ready…';
    lockProfessionalSettings(true);
    applyRendererOutput();                         // switch from half-size preview to the full recording size
    if (!loopMode) { director.start(); fadeTarget = 1; }   // a loop must not fade to black
    cdEl.style.display = 'flex';
    for (const n of [3, 2, 1]) {
      cdNum.textContent = n; cdNum.style.animation = 'none'; void cdNum.offsetWidth; cdNum.style.animation = '';
      await sleep(1000);
    }
    cdEl.style.display = 'none';
    countingDown = false; recBtn.disabled = false;
    if (paused) togglePause();
  }
  beginRecorder();
}
function beginRecorder() {
  lockProfessionalSettings(true);
  const q = QUALITY[proQuality.value] || QUALITY.high;
  recAspect = recIsPro ? proAspect.value : 'viewport';
  recWidth = canvas.width;
  recHeight = canvas.height;
  recFps = recIsPro ? q.fps : (recWidth * recHeight > 1.3e6 ? 30 : 60);
  const bitrate = recIsPro ? q.mbps * 1e6 : (recFps === 60 ? 8e6 : 6e6);
  const stream = canvas.captureStream(recFps);
  if (recSoundChk.checked && recDest) {
    const at = recDest.stream.getAudioTracks()[0];
    if (at) stream.addTrack(at);
  }
  recMime = pickMime();
  const opts = { videoBitsPerSecond: bitrate };
  if (recMime) opts.mimeType = recMime;
  try { recorder = new MediaRecorder(stream, opts); }
  catch (e) { recorder = new MediaRecorder(stream); }
  chunks = [];
  recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  recorder.onstop = showPreview;
  resetSounds();   // re-schedule so the recording gets its own timing
  recorder.start(500);
  recording = true; stopping = false; recElapsed = 0;
  recStart = performance.now(); recPausedAt = 0; recPausedTotal = 0;
  loopRec = recIsPro && loopMode;
  recLimit = loopRec ? parseInt(loopCycles.value, 10) * LOOP_T : (recIsPro ? parseInt(proLen.value, 10) : 0);
  if (recIsPro && !loopRec) {
    director.outro = false;
    director.queue = ['tracking'];                 // wide establishing intro → close tracking shot
    director.next('establishing');
    fadeTarget = 0;                                // fade in from black
  }
  recBtn.textContent = '⏹ Stop Recording'; recBtn.classList.add('recording');
  recBadge.style.display = 'flex'; recTag.style.display = recIsPro ? 'inline' : 'none';
}
function requestStop() {
  if (!recording || stopping) return;
  if (recIsPro && !loopRec) { stopping = true; fadeTarget = 1; recBtn.disabled = true; }   // fade out, then stop (loops stop instantly)
  else finalizeStop();
}
function finalizeStop() {
  if (!recorder) return;
  recElapsed = recNow();
  if (recorder.state !== 'inactive') recorder.stop();
  recording = false; stopping = false;
  recBtn.disabled = false; recBtn.textContent = '⏺ Start Recording'; recBtn.classList.remove('recording');
  recBadge.style.display = 'none';
  lockProfessionalSettings(false);
  applyRendererOutput();                           // back to the lighter preview size
  fadeTarget = 0;
}
function showPreview() {
  const type = recMime ? recMime.split(';')[0] : (chunks[0] && chunks[0].type) || 'video/webm';
  presentBlob(new Blob(chunks, { type }), type);
}
function presentBlob(blob, type) {
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(blob);
  const ext = type.includes('mp4') ? 'mp4' : 'webm';
  const d = new Date(), p = n => String(n).padStart(2, '0');
  const formatSuffix = recIsPro ? (recAspect === '9:16' ? '-9x16' : '-16x9') : '';
  lastName = `book-fall${recIsPro ? (loopRec ? '-loop' : '-pro') : ''}${formatSuffix}-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.${ext}`;
  preview.src = lastUrl;
  preview.loop = loopRec;                          // loop recordings replay on repeat so you can check the seam
  const formatInfo = recIsPro ? ` · ${recAspect} · ${recWidth}×${recHeight} · ${recFps}fps` : ` · ${recWidth}×${recHeight}`;
  vidInfo.textContent = `${fmt(recElapsed)} · ${(blob.size / 1048576).toFixed(1)} MB · .${ext}${recIsPro ? (loopRec ? ' · Seamless loop' : ' · Pro cinematic') : ''}${formatInfo}`;
  modal.style.display = 'flex';
  preview.play().catch(() => {});
}
function fmt(s) { s = Math.floor(s); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
dlBtn.onclick = () => { if (!lastUrl) return; const a = document.createElement('a'); a.href = lastUrl; a.download = lastName; document.body.appendChild(a); a.click(); a.remove(); };
document.getElementById('closeBtn').onclick = () => { preview.pause(); modal.style.display = 'none'; };
function toggleRecord() {
  if (exporting) exportCancel = true;
  else if (recording) requestStop();
  else startRecording();
}
recBtn.onclick = toggleRecord;
