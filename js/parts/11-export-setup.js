/* 11-export-setup: source fragment 11/17. Loaded in order by ../main.js. */
/* =========================================================
   FRAME-EXACT LOOP EXPORT
   The live recorder (MediaRecorder) stamps every frame with the moment the browser happened to
   deliver it, so any hiccup nudges the loop by a few milliseconds and shows up as a stutter at the
   seam. Here each frame is rendered for an exact time (frame i = i / fps), encoded with a fixed
   timestamp and muxed directly. The video is exactly N x 10 s, and the audio is built offline so
   it also wraps around cleanly. Rendering runs as fast as the device allows, not in real time.
   ========================================================= */
const MUXERS = {
  mp4: 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/build/mp4-muxer.mjs',
  webm: 'https://cdn.jsdelivr.net/npm/webm-muxer@5.1.4/build/webm-muxer.mjs'
};
const canExportLoop = () => !!(window.VideoEncoder && window.VideoFrame && window.OfflineAudioContext);
/* Let the browser breathe between frames. One reusable MessageChannel (not throttled in background tabs, unlike setTimeout);
   creating a new channel per call, as a busy-wait would, floods the renderer with ports and eats gigabytes of memory. */
const _yc = new MessageChannel(); let _yr = null;
_yc.port1.onmessage = () => { const r = _yr; _yr = null; if (r) r(); };
const yieldUI = () => new Promise(r => { _yr = r; _yc.port2.postMessage(0); });
/* Wait until the encoder has worked its queue down (event-driven; the timeout is only a safety net). */
function waitEncoder(enc, max) {
  return new Promise(res => {
    if (enc.encodeQueueSize <= max) return res();
    const done = () => { clearTimeout(tm); enc.removeEventListener('dequeue', check); res(); };
    const check = () => { if (enc.encodeQueueSize <= max) done(); };
    const tm = setTimeout(done, 250);
    enc.addEventListener('dequeue', check);
  });
}

async function pickVideoConfig(w, h, fps, bitrate) {
  const tries = [
    { mux: 'mp4', codec: 'avc1.640034' }, { mux: 'mp4', codec: 'avc1.4d0034' }, { mux: 'mp4', codec: 'avc1.42003e' },
    { mux: 'webm', codec: 'vp09.00.40.08' }, { mux: 'webm', codec: 'vp8' }
  ];
  for (const c of tries) {
    const cfg = { codec: c.codec, width: w, height: h, bitrate, framerate: fps };
    if (c.mux === 'mp4') cfg.avc = { format: 'avc' };
    try { const r = await VideoEncoder.isConfigSupported(cfg); if (r && r.supported) return { mux: c.mux, cfg }; } catch (e) {}
  }
  return null;
}
async function pickAudioConfig(mux, sr, ch) {
  const tries = mux === 'mp4' ? [{ codec: 'mp4a.40.2', mc: 'aac' }, { codec: 'opus', mc: 'opus' }] : [{ codec: 'opus', mc: 'opus' }];
  if (!window.AudioEncoder || !window.AudioData) return null;
  for (const c of tries) {
    const cfg = { codec: c.codec, sampleRate: sr, numberOfChannels: ch, bitrate: 160000 };
    try { const r = await AudioEncoder.isConfigSupported(cfg); if (r && r.supported) return { cfg, mc: c.mc }; } catch (e) {}
  }
  return null;
}
