/* 14-panel-events: source fragment 14/17. Loaded in order by ../main.js. */
/* Controls sheet + quick buttons */
const panelEl = document.getElementById('panel'), panelToggle = document.getElementById('panelToggle');
const quickPause = document.getElementById('quickPause'), quickRec = document.getElementById('quickRec');
const isSmallScreen = () => matchMedia('(max-width: 700px), (pointer: coarse)').matches;
function setPanel(open) { panelEl.classList.toggle('open', open); panelToggle.textContent = open ? '✕' : '⚙'; }
panelToggle.onclick = () => setPanel(!panelEl.classList.contains('open'));
quickPause.onclick = () => pauseBtn.click();
quickRec.onclick = () => recBtn.click();
setPanel(!isSmallScreen());                        // open on desktop, hidden on phones so the scene is clear

addEventListener('keydown', e => {
  if (e.target.tagName === 'SELECT') return;
  const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); togglePause(); }
  else if (k === 'r') toggleRecord();
  else if (k === 'm') toggleMute();
  else if (k === 'p') snapshot();
  else if (k === ',') setSync(syncMs - 5);
  else if (k === '.') setSync(syncMs + 5);
});
addEventListener('resize', () => {
  if (exporting) return;
  if (recording && !recIsPro) return;               // never change the canvas size while a normal recording is running
  applyRendererOutput();
});
// A hidden tab stops drawing frames; pause so the recording doesn't contain a frozen stretch.
document.addEventListener('visibilitychange', () => { if (document.hidden && recording && !paused) togglePause(); });
