/* 01-scene-camera: source fragment 01/17. Loaded in order by ../main.js. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* =========================================================
   RENDERER / SCENE / CAMERA
   (no preserveDrawingBuffer: it forces an extra copy every frame;
    snapshots are taken right after rendering instead)
   ========================================================= */
const BASE_PR = Math.min(window.devicePixelRatio || 1, 1.5);
let curPR = BASE_PR;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(curPR);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);
const canvas = renderer.domElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87c8ff);
scene.fog = new THREE.Fog(0x87c8ff, 15, 60);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(9, 4, 9);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;
controls.minDistance = 3;
controls.maxDistance = 30;
controls.target.set(0, 1, 0);

/* Lights */
const hemi = new THREE.HemisphereLight(0x87c8ff, 0x55627f, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
const sc = sun.shadow.camera;
sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 80;
scene.add(sun, sun.target);


/* Stars */
const stars = (() => {
  const n = 1500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 300;
    const s = Math.sqrt(1 - u * u);
    pos[i*3] = r * s * Math.cos(th); pos[i*3+1] = r * Math.abs(u) * 0.9 + 20; pos[i*3+2] = r * s * Math.sin(th);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: true, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const p = new THREE.Points(g, m); scene.add(p); return p;
})();
