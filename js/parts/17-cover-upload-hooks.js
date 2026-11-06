/* 17-cover-upload-hooks: source fragment 17/17. Loaded in order by ../main.js. */
/* ---- cover upload ---- */
const coverFile = document.getElementById('coverFile'), spineIn = document.getElementById('spineIn'), bleedChk = document.getElementById('bleedChk');
const coverHint = document.getElementById('coverHint'), coverReset = document.getElementById('coverReset');
let coverURL = null;
function loadCoverFile(f) {
  if (!f || !/^image\//.test(f.type)) return;
  const url = URL.createObjectURL(f), img = new Image();
  img.onload = () => {
    if (coverURL) URL.revokeObjectURL(coverURL); coverURL = url;
    spineIn.value = '';                                             // empty = detect from the image shape
    const sp = applyCover(img, 0, bleedChk.checked);
    spineIn.value = sp.toFixed(2); coverHint.textContent = (BOOK.note || 'Cover loaded.') + ' ' + img.naturalWidth + '×' + img.naturalHeight + ' px.';
  };
  img.onerror = () => { coverHint.textContent = 'That image could not be read.'; URL.revokeObjectURL(url); };
  img.src = url;
}
coverFile.onchange = () => { loadCoverFile(coverFile.files[0]); coverFile.value = ''; };
function reapplyCover() {
  if (!BOOK.img) return;
  const v = parseFloat(spineIn.value);
  applyCover(BOOK.img, v > 0 ? v : 0, bleedChk.checked);
  if (!(v > 0)) spineIn.value = BOOK.spine.toFixed(2);
}
spineIn.onchange = reapplyCover; bleedChk.onchange = reapplyCover;
spineIn.addEventListener('keydown', e => e.stopPropagation());
coverReset.onclick = () => { applyCover(null); spineIn.value = '0.60'; coverHint.textContent = 'Placeholder restored. Upload the full wrap (back + spine + front) of your 6×9 in book.'; };
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) loadCoverFile(f); });
loopCam.value = 'sway';
window.__book = { loadCoverFile, applyCover, BOOK };
window.__endlessLoop = { drawLoopAt, canvas, LOOP_T, LOOP_PHASE, setT(t) { simT = t; }, angles() { const e = new Float32Array(16), o = []; for (let i = 0; i < Math.min(domMesh.count, 12); i++) { domMesh.getMatrixAt(i, _m4); o.push(+(Math.atan2(-_m4.elements[9], _m4.elements[5]) * 57.3).toFixed(1)); } return o; }, full() { exporting = true; applyRendererOutput(); } };   // small hook used for automated seam tests
