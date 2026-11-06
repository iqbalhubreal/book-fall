/* 07-camera-director: source fragment 07/17. Loaded in order by ../main.js. */
/* =========================================================
   AUTO PROFESSIONAL CAMERA DIRECTOR
   - aspect-aware framing (portrait gets pulled back so the action stays in frame)
   - intro: wide establishing shot, then a close tracking shot
   - outro: smooth crane-up during the last seconds of a timed recording
   ========================================================= */
const DUR = { establishing: [5, 7], tracking: [4, 6], lowHero: [3.5, 5], orbit: [5, 7], dollyIn: [4, 5.5], craneUp: [4.5, 6], topDown: [3.5, 5], reveal: [4.5, 6], side: [4, 5.5] };
const POOL = ['tracking', 'tracking', 'lowHero', 'lowHero', 'side', 'side', 'orbit', 'dollyIn', 'reveal'];   // close shots only, so the covers stay readable
const NAMES = { establishing: 'Wide establishing', tracking: 'Close tracking', lowHero: 'Ground-level hero', orbit: 'Orbit sweep', dollyIn: 'Dolly-in', craneUp: 'Crane up', topDown: 'Top-down', reveal: 'Look-ahead reveal', side: 'Side tracking' };
const director = {
  type: null, last: null, t: 0, dur: 5, angle: 0, side: 1, cut: true, snap: false, outro: false, queue: [],
  camPos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50,
  P: new THREE.Vector3(), L: new THREE.Vector3(), C: new THREE.Vector3(), d: new THREE.Vector3(), T: new THREE.Vector3(),
  start() {
    this.camPos.copy(camera.position); this.look.copy(controls.target); this.fov = camera.fov;
    this.outro = false; this.queue = [];
    this.next('tracking');
  },
  next(force, opt = {}) {
    const pick = () => POOL[(Math.random() * POOL.length) | 0];
    let ty = force;
    if (!ty && this.queue.length) ty = this.queue.shift();
    if (!ty) { ty = pick(); while (ty === this.last) ty = pick(); }
    this.type = ty; this.last = ty; this.t = 0;
    const [a, b] = DUR[ty]; this.dur = opt.dur || (a + Math.random() * (b - a));
    this.angle = Math.random() * Math.PI * 2;
    this.side = Math.random() < 0.5 ? -1 : 1;
    this.cut = opt.cut !== undefined ? opt.cut : (force ? true : Math.random() < 0.6);   // mix of hard cuts and smooth glides
    this.snap = this.cut;
  },
  rot(v, a) { const c = Math.cos(a), s = Math.sin(a); return this.d.set(c * v.x - s * v.z, 0, s * v.x + c * v.z); },
  update(dt, B, ahead, advance) {
    if (advance) { this.t += dt; if (this.t > this.dur && !this.outro) this.next(); }
    const s = clamp(this.t / this.dur, 0, 1), e = easeInOut(s);
    const C = this.C.copy(B);
    const hd = _dir.set(-fwdVec.x, 0, -fwdVec.z);                    // "behind the marble" direction
    if (hd.lengthSq() < 1e-4) hd.set(-1, 0, 0); hd.normalize();
    const fit = camera.aspect < 1 ? Math.pow(1 / camera.aspect, 0.5) : 1;
    const P = this.P, L = this.L; let fov = 50, a, r, d;
    switch (this.type) {
      case 'establishing': a = this.angle + s * 0.35 * this.side;
        P.set(C.x + Math.cos(a) * 7 * fit, 2.2 + s * 0.8, C.z + Math.sin(a) * 7 * fit); L.copy(C).addScaledVector(fwdVec, 2); L.y = 0.5; fov = 42; break;
      case 'tracking': d = this.rot(hd, this.side * (0.6 + s * 0.3));
        P.copy(C).addScaledVector(d, 2.9 * fit); P.y = 1.0; L.copy(C).addScaledVector(fwdVec, 0.9); L.y = 0.5; fov = 46; break;
      case 'lowHero': d = this.rot(hd, this.side * 0.55);
        P.copy(C).addScaledVector(d, 2.3 * fit); P.y = 0.25; L.copy(C).addScaledVector(fwdVec, 0.8); L.y = 0.6; fov = 58; break;
      case 'orbit': a = this.angle + e * 2.4 * this.side;
        P.set(C.x + Math.cos(a) * 3.6 * fit, 1.2, C.z + Math.sin(a) * 3.6 * fit); L.copy(C); L.y = 0.5; fov = 44; break;
      case 'dollyIn': r = lerp(6.5, 2.6, e) * fit; d = this.rot(hd, this.side * 0.9);
        P.copy(C).addScaledVector(d, r); P.y = lerp(2.4, 0.9, e); L.copy(C); L.y = 0.5; fov = 40; break;
      case 'craneUp': a = this.angle;
        P.set(C.x + Math.cos(a) * 4.2 * fit, 0.7 + e * 3.2, C.z + Math.sin(a) * 4.2 * fit); L.copy(C); L.y = 0.4; fov = 44; break;
      case 'topDown': a = this.angle + s * 0.6;
        P.set(C.x + Math.cos(a) * 1.4, 5.5 - e * 1.5, C.z + Math.sin(a) * 1.4); L.copy(C).addScaledVector(fwdVec, 1.5); L.y = 0; fov = 55; break;
      case 'reveal': d = this.rot(hd, this.side * 1.1);
        P.copy(C).addScaledVector(d, 3.8 * fit); P.y = 0.9 + e * 0.8;
        this.T.copy(ahead); L.copy(C).lerp(this.T, e * 0.5); L.y = 0.5; fov = 44; break;
      case 'side': d = this.d.set(fwdVec.z, 0, -fwdVec.x).multiplyScalar(this.side);
        P.copy(C).addScaledVector(d, 3.0 * fit).addScaledVector(fwdVec, -0.6 + s * 1.2); P.y = 0.8; L.copy(C).addScaledVector(fwdVec, 0.6); L.y = 0.5; fov = 48; break;
    }
    if (this.snap) { this.camPos.copy(P); this.look.copy(L); this.fov = fov; this.snap = false; }
    else {
      const k = this.cut ? 6 : lerp(1.2, 6, clamp(this.t / 1.8, 0, 1));
      const al = 1 - Math.exp(-k * dt);
      this.camPos.lerp(P, al); this.look.lerp(L, al); this.fov += (fov - this.fov) * al;
    }
    const T = performance.now() / 1000;
    const amp = 0.5 * (this.type === 'tracking' || this.type === 'lowHero' || this.type === 'side') ? 0.05 : 0.02;  // subtle handheld feel
    camera.position.copy(this.camPos);
    camera.position.x += (Math.sin(T * 1.7) * 0.6 + Math.sin(T * 3.1) * 0.4) * amp;
    camera.position.y += (Math.sin(T * 1.3 + 1) * 0.6 + Math.sin(T * 2.7) * 0.4) * amp;
    if (camera.position.y < 0.15) camera.position.y = 0.15;
    camera.lookAt(this.look);
    if (Math.abs(camera.fov - this.fov) > 0.01) { camera.fov = this.fov; camera.updateProjectionMatrix(); }
  }
};
