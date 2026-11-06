/* 12-offline-loop-renderer: source fragment 12/17. Loaded in order by ../main.js. */
/* One cycle of audio (a click per domino + steady hum), built offline, as stereo Float32 arrays.
   Click tails that run past the end are folded back onto the start; the wind is cross-faded with itself,
   so the last sample leads straight into the first with nothing to hear at the seam. */
async function renderLoopAudio(sr) {
  const n = Math.round(LOOP_T * sr), TAIL = 0.5, nt = Math.round(TAIL * sr);
  let s = 987654321;
  const lcg = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const mkNoise = ctx => { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = lcg() * 2 - 1; return b; };
  const vol = volume, off = syncMs / 1000;

  // clicks: domino k is hit at video time k / RHO - LOOP_PHASE
  const tc = new OfflineAudioContext(2, n + nt, sr);
  const tb = tc.createGain(); tb.gain.value = vol; tb.connect(tc.destination);
  const tn = mkNoise(tc);
  for (let k = 0; k < Math.round(LOOP_T * RHO); k++) {
    const v = k / RHO - LOOP_PHASE;
    const when = (((v + off) % LOOP_T) + LOOP_T) % LOOP_T;
    playClackAt(when, k, tb, tc, tn);
  }
  const tw = await tc.startRendering();

  // wind
  let wind = null;
  if (windChk.checked) {
    const nx = Math.round(0.6 * sr);
    const wc = new OfflineAudioContext(2, n + nx, sr);
    const src = wc.createBufferSource(); src.buffer = mkNoise(wc); src.loop = true;
    const bp = wc.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 450; bp.Q.value = 0.6;
    const lp = wc.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
    const wg = wc.createGain(); wg.gain.value = 0.06 * vol;
    src.connect(bp); bp.connect(lp); lp.connect(wg); wg.connect(wc.destination); src.start();
    wind = { buf: await wc.startRendering(), nx };
  }

  const out = [new Float32Array(n), new Float32Array(n)];
  for (let c = 0; c < 2; c++) {
    const T = tw.getChannelData(c), o = out[c];
    for (let i = 0; i < n; i++) o[i] = T[i];
    for (let i = 0; i < nt; i++) o[i] += T[n + i];               // fold the tail back onto the start
    if (wind) {
      const W = wind.buf.getChannelData(c), nx = wind.nx;
      for (let i = 0; i < n; i++) {
        if (i < nx) { const a = (i / nx) * Math.PI / 2; o[i] += W[i] * Math.sin(a) + W[n + i] * Math.cos(a); }
        else o[i] += W[i];
      }
    }
  }
  return out;
}

async function exportLoopVideo() {
  const q = QUALITY[proQuality.value] || QUALITY.high;
  const fps = q.fps, cycles = parseInt(loopCycles.value, 10);
  const total = Math.round(cycles * LOOP_T * fps);
  exporting = true; exportCancel = false; offlineRender = true;
  initAudio();
  if (isSmallScreen()) setPanel(false);
  lockProfessionalSettings(true);
  recBtn.textContent = '⏹ Cancel'; recBtn.classList.add('recording');
  recBadge.style.display = 'flex'; recTag.style.display = 'inline'; recTag.textContent = 'LOOP';
  recTimeEl.textContent = 'Preparing…';
  cancelTwiks();
  applyRendererOutput();                                          // full recording size
  await yieldUI();
  let venc = null, aenc = null, ok = false;
  try {
    const W = canvas.width, H = canvas.height;
    const vc = await pickVideoConfig(W, H, fps, q.mbps * 1e6);
    if (!vc) throw new Error('This browser cannot encode ' + W + '×' + H + ' video.');
    const lib = await import(MUXERS[vc.mux]);
    const SR = 48000;
    const wantAudio = recSoundChk.checked && !muted;
    const ac = wantAudio ? await pickAudioConfig(vc.mux, SR, 2) : null;
    const target = new lib.ArrayBufferTarget();
    const mopts = { target, video: { codec: vc.mux === 'mp4' ? 'avc' : (vc.cfg.codec.startsWith('vp09') ? 'V_VP9' : 'V_VP8'), width: W, height: H, frameRate: fps }, firstTimestampBehavior: 'offset' };
    if (vc.mux === 'mp4') mopts.fastStart = 'in-memory';
    if (ac) mopts.audio = { codec: vc.mux === 'mp4' ? ac.mc : 'A_OPUS', sampleRate: SR, numberOfChannels: 2 };
    const muxer = new lib.Muxer(mopts);
    let encErr = null;
    venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { encErr = e; } });
    venc.configure(vc.cfg);

    // audio first (fast): one cycle, tiled
    if (ac) {
      recTimeEl.textContent = 'Building audio…'; await yieldUI();
      const cyc = await renderLoopAudio(SR);
      // the encoder pads the end by one packet; drop it so the audio is exactly as long as the video
      const endUs = Math.round(total / fps * 1e6) - 1000;
      aenc = new AudioEncoder({ output: (c, m) => { if (c.timestamp < endUs) muxer.addAudioChunk(c, m); }, error: e => { encErr = e; } });
      aenc.configure(ac.cfg);
      const per = cyc[0].length, all = per * cycles, CH = 4800;
      for (let p = 0; p < all; p += CH) {
        const len = Math.min(CH, all - p), data = new Float32Array(len * 2);
        for (let i = 0; i < len; i++) { data[i] = cyc[0][(p + i) % per]; data[len + i] = cyc[1][(p + i) % per]; }
        const ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: len, numberOfChannels: 2, timestamp: Math.round(p * 1e6 / SR), data });
        aenc.encode(ad); ad.close();
      }
    }

    // video: frame i is the scene at exactly LOOP_PHASE + i / fps
    const t0 = performance.now();
    for (let i = 0; i < total; i++) {
      if (exportCancel || encErr) break;
      drawLoopAt((LOOP_PHASE + i / fps) % LOOP_T);
      const vf = new VideoFrame(canvas, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
      venc.encode(vf, { keyFrame: i % (fps * 2) === 0 });
      vf.close();
      if (i % 3 === 2) {
        recTimeEl.textContent = `Rendering ${Math.round(100 * (i + 1) / total)}%`;
        await yieldUI();
        while (venc.encodeQueueSize > 8 && !exportCancel) await waitEncoder(venc, 8);
      }
    }
    if (encErr) throw encErr;
    if (!exportCancel) {
      recTimeEl.textContent = 'Finishing…'; await yieldUI();
      await venc.flush(); if (aenc) await aenc.flush();
      if (encErr) throw encErr;
      muxer.finalize();
      const type = vc.mux === 'mp4' ? 'video/mp4' : 'video/webm';
      recIsPro = true; loopRec = true; recAspect = proAspect.value; recWidth = W; recHeight = H; recFps = fps; recElapsed = total / fps;
      presentBlob(new Blob([target.buffer], { type }), type);
      ok = true;
    }
  } catch (e) {
    console.error(e);
    alert('Loop export failed: ' + (e && e.message ? e.message : e));
  } finally {
    try { if (venc && venc.state !== 'closed') venc.close(); } catch (e) {}
    try { if (aenc && aenc.state !== 'closed') aenc.close(); } catch (e) {}
    exporting = false; offlineRender = false; exportCancel = false;
    recBtn.textContent = '⏺ Start Recording'; recBtn.classList.remove('recording');
    recBadge.style.display = 'none'; recTag.textContent = 'PRO';
    lockProfessionalSettings(false);
    applyRendererOutput();
    loopT = 0; loopU = 0; resetSounds();
  }
  return ok;
}

let snapRequested = false;
function snapshot() { snapRequested = true; }       // taken in animate(), right after the frame is drawn
function doSnapshot() {
  snapRequested = false;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `book-fall-${Date.now()}.png`;
  document.body.appendChild(a); a.click(); a.remove();
}
