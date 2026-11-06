/*
 * Book Fall loader
 * Reads the ordered source fragments, joins them into one ES module, then runs it.
 * The original program relies on shared top-level state, so the fragments are
 * intentionally concatenated before execution rather than imported separately.
 */
const sourceParts = [
  './parts/01-scene-camera.js',
  './parts/02-helpers-world-path.js',
  './parts/03-city-environment.js',
  './parts/04-book-model-cover.js',
  './parts/05-marble-particles-world.js',
  './parts/06-sky-and-overlays.js',
  './parts/07-camera-director.js',
  './parts/08-audio-engine.js',
  './parts/09-seamless-loop.js',
  './parts/10-recording-system.js',
  './parts/11-export-setup.js',
  './parts/12-offline-loop-renderer.js',
  './parts/13-ui-controls.js',
  './parts/14-panel-events.js',
  './parts/15-reset-restart.js',
  './parts/16-main-animation-loop.js',
  './parts/17-cover-upload-hooks.js'
];

async function startBookFall() {
  const pieces = [];
  for (const path of sourceParts) {
    const response = await fetch(new URL(path, import.meta.url));
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
    pieces.push(await response.text());
  }

  const combinedSource = pieces.join('\n\n');
  const moduleBlob = new Blob([combinedSource], { type: 'text/javascript' });
  const moduleUrl = URL.createObjectURL(moduleBlob);
  try {
    await import(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
}

startBookFall().catch(error => {
  console.error('Book Fall failed to start:', error);
  const notice = document.createElement('pre');
  notice.style.cssText = 'position:fixed;inset:12px auto auto 12px;max-width:calc(100vw - 24px);padding:12px;background:#351515;color:#fff;border:1px solid #b44;border-radius:8px;white-space:pre-wrap;z-index:9999';
  notice.textContent = 'Book Fall could not load its JavaScript pieces. Run this folder through VS Code Live Server or another local web server.\n\n' + error.message;
  document.body.appendChild(notice);
});
