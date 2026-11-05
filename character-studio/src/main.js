import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildCharacter, DEFAULT_LOOK, OPTIONS, LABELS, randomLook } from './character.js';
import { Animator, POSES } from './poses.js';
import './style.css';

// ---------------- persistence ----------------
const STORE_KEY = 'character-studio:v1';
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (s && s.look) return s;
  } catch { /* storage unavailable */ }
  return null;
}
function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ look, scene: sceneOpts, pose: animator.pose }));
  } catch { /* storage unavailable */ }
}

const BACKGROUNDS = [
  { id: 'sky', top: '#bfe3ff', bottom: '#fdf3e7', floor: '#ffffff' },
  { id: 'peach', top: '#ffd6c9', bottom: '#fff4e6', floor: '#fffaf5' },
  { id: 'mint', top: '#c9f2e0', bottom: '#f4fff9', floor: '#ffffff' },
  { id: 'lilac', top: '#dcd2ff', bottom: '#f7f3ff', floor: '#ffffff' },
  { id: 'night', top: '#1c2140', bottom: '#3d3366', floor: '#4b4470' },
  { id: 'studio', top: '#3a3d45', bottom: '#8d919c', floor: '#c9ccd3' },
];

const saved = loadState();
let look = { ...DEFAULT_LOOK, ...(saved?.look || {}) };
const sceneOpts = { bg: 'sky', autoRotate: false, ...(saved?.scene || {}) };

// ---------------- three.js setup ----------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
const HOME_CAM = new THREE.Vector3(0, 1.15, 3.9);
const HOME_TARGET = new THREE.Vector3(0, 0.85, 0);
camera.position.copy(HOME_CAM);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME_TARGET);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 1.2;
controls.maxDistance = 6;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = Math.PI * 0.53;
controls.autoRotateSpeed = 1.6;

scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a99a, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(2.2, 4, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -1.5, right: 1.5, top: 2.5, bottom: -0.5, near: 0.5, far: 12 });
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.02;
scene.add(sun);
const rim = new THREE.DirectionalLight(0xbfd8ff, 0.8);
rim.position.set(-3, 2.5, -3);
scene.add(rim);

// gradient background via a big inverted sphere
const bgUniforms = { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } };
const bgMesh = new THREE.Mesh(
  new THREE.SphereGeometry(20, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: bgUniforms,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = smoothstep(-0.2,0.6,vP.y); gl_FragColor = vec4(mix(bottom, top, h),1.0);\n#include <colorspace_fragment>\n}',
  }),
);
scene.add(bgMesh);

const floorMat = new THREE.MeshToonMaterial({ color: 0xffffff });
const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.45, 0.08, 64), floorMat);
floor.position.y = -0.04;
floor.receiveShadow = true;
scene.add(floor);
const ring = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.015, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.002;
scene.add(ring);

// stool shown while sitting
const stool = new THREE.Group();
{
  const wood = new THREE.MeshToonMaterial({ color: 0xc58b5a });
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 24), wood);
  seat.position.y = 0.32;
  stool.add(seat);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.32, 8), wood);
    leg.position.set(Math.cos(a) * 0.13, 0.16, Math.sin(a) * 0.13);
    stool.add(leg);
  }
  stool.traverse((o) => { o.castShadow = o.receiveShadow = true; });
  stool.position.z = -0.08;
  stool.visible = false;
  scene.add(stool);
}

function applyBackground() {
  const b = BACKGROUNDS.find((x) => x.id === sceneOpts.bg) || BACKGROUNDS[0];
  bgUniforms.top.value.set(b.top);
  bgUniforms.bottom.value.set(b.bottom);
  floorMat.color.set(b.floor);
  document.documentElement.style.setProperty('--stage-top', b.top);
  controls.autoRotate = sceneOpts.autoRotate;
}

// ---------------- character ----------------
const animator = new Animator();
if (saved?.pose && POSES.some((p) => p.id === saved.pose)) animator.setPose(saved.pose);
let character = null;

function rebuild() {
  const prev = character;
  character = buildCharacter(look);
  if (prev) {
    // carry the current skeleton state over so the rebuild is seamless
    for (const k of Object.keys(prev.bones)) {
      character.bones[k].rotation.copy(prev.bones[k].rotation);
      character.bones[k].position.copy(prev.bones[k].position);
    }
    scene.remove(prev.root);
    prev.root.traverse((o) => o.geometry?.dispose());
  }
  scene.add(character.root);
  saveState();
}

// ---------------- tap interaction ----------------
const EMOTES = ['💖', '✨', '🎵', '⭐', '😊', '🌸'];
const emoteTextures = new Map();
function emoteTexture(ch) {
  if (emoteTextures.has(ch)) return emoteTextures.get(ch);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.font = '96px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, 64, 72);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  emoteTextures.set(ch, t);
  return t;
}
const floaters = [];
function spawnEmote(point) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emoteTexture(EMOTES[Math.floor(Math.random() * EMOTES.length)]), transparent: true, depthWrite: false }));
  s.position.copy(point).add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.1, 0));
  s.scale.setScalar(0.22);
  s.userData = { life: 1.2, vx: (Math.random() - 0.5) * 0.3 };
  scene.add(s);
  floaters.push(s);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = null;
canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  const quick = performance.now() - downAt.t < 350;
  downAt = null;
  if (moved > 8 || !quick || !character) return;
  const r = canvas.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(character.root, true)[0];
  if (hit) {
    animator.poke();
    spawnEmote(hit.point);
    vibrate(15);
  }
});
function vibrate(ms) {
  try { navigator.vibrate?.(ms); } catch { /* not supported */ }
}

// ---------------- render loop ----------------
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  resize();
  animator.update(character, dt);
  stool.visible = animator.pose === 'sit';
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.userData.life -= dt;
    f.position.y += dt * 0.45;
    f.position.x += f.userData.vx * dt;
    f.material.opacity = Math.min(1, f.userData.life * 2);
    if (f.userData.life <= 0) {
      scene.remove(f);
      f.material.dispose();
      floaters.splice(i, 1);
    }
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------------- UI ----------------
const TABS = [
  { id: 'body', label: 'Body', icon: '🙂' },
  { id: 'hair', label: 'Hair', icon: '💇' },
  { id: 'outfit', label: 'Outfit', icon: '👕' },
  { id: 'extras', label: 'Extras', icon: '🎀' },
  { id: 'pose', label: 'Pose', icon: '🕺' },
  { id: 'scene', label: 'Scene', icon: '🎨' },
];
let activeTab = 'body';
try { activeTab = localStorage.getItem(STORE_KEY + ':tab') || 'body'; } catch { /* ignore */ }

const tabsEl = document.getElementById('tabs');
const panelEl = document.getElementById('panel-body');

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function section(title) {
  const s = el('div', 'section');
  s.appendChild(el('div', 'section-title', title));
  panelEl.appendChild(s);
  return s;
}
function chips(parent, values, key) {
  const row = el('div', 'chips');
  for (const v of values) {
    const b = el('button', 'chip' + (look[key] === v ? ' on' : ''), LABELS[v] || v);
    b.onclick = () => { set(key, v); };
    row.appendChild(b);
  }
  parent.appendChild(row);
}
function swatches(parent, colors, key) {
  const row = el('div', 'swatches');
  for (const c of colors) {
    const b = el('button', 'swatch' + (look[key] === c ? ' on' : ''));
    b.style.background = c;
    b.setAttribute('aria-label', c);
    b.onclick = () => set(key, c);
    row.appendChild(b);
  }
  const custom = el('label', 'swatch custom');
  custom.title = 'Custom colour';
  const input = el('input');
  input.type = 'color';
  input.value = look[key];
  input.oninput = () => set(key, input.value, false);
  input.onchange = () => renderPanel();
  custom.appendChild(input);
  row.appendChild(custom);
  parent.appendChild(row);
}
function set(key, value, rerender = true) {
  look[key] = value;
  rebuild();
  vibrate(8);
  if (rerender) renderPanel();
}

function renderTabs() {
  tabsEl.innerHTML = '';
  for (const t of TABS) {
    const b = el('button', 'tab' + (t.id === activeTab ? ' on' : ''));
    b.innerHTML = `<span class="tab-icon">${t.icon}</span><span class="tab-label">${t.label}</span>`;
    b.onclick = () => {
      activeTab = t.id;
      try { localStorage.setItem(STORE_KEY + ':tab', t.id); } catch { /* ignore */ }
      renderTabs();
      renderPanel();
      document.getElementById('panel').classList.remove('collapsed');
    };
    tabsEl.appendChild(b);
  }
}

function renderPanel() {
  panelEl.innerHTML = '';
  panelEl.scrollTop = 0;
  switch (activeTab) {
    case 'body': {
      swatches(section('Skin tone'), OPTIONS.skin, 'skin');
      swatches(section('Eye colour'), OPTIONS.eyes, 'eyes');
      chips(section('Expression'), OPTIONS.expression, 'expression');
      const s = section('Height');
      const row = el('div', 'slider-row');
      const r = el('input');
      r.type = 'range';
      r.min = '0.85'; r.max = '1.15'; r.step = '0.01';
      r.value = look.height;
      const val = el('span', 'slider-val', Math.round(look.height * 100) + '%');
      r.oninput = () => { look.height = +r.value; val.textContent = Math.round(look.height * 100) + '%'; character.root.scale.setScalar(look.height); };
      r.onchange = () => saveState();
      row.append(r, val);
      s.appendChild(row);
      break;
    }
    case 'hair':
      chips(section('Style'), OPTIONS.hair, 'hair');
      swatches(section('Colour'), OPTIONS.hairColors, 'hairColor');
      break;
    case 'outfit':
      chips(section('Top'), OPTIONS.top, 'top');
      swatches(panelEl.lastChild, OPTIONS.clothColors, 'topColor');
      chips(section('Bottom'), OPTIONS.bottom, 'bottom');
      swatches(panelEl.lastChild, OPTIONS.clothColors, 'bottomColor');
      chips(section('Shoes'), OPTIONS.shoes, 'shoes');
      swatches(panelEl.lastChild, OPTIONS.clothColors, 'shoesColor');
      break;
    case 'extras':
      chips(section('Headwear & hair ties'), OPTIONS.headwear, 'headwear');
      swatches(panelEl.lastChild, OPTIONS.clothColors, 'headwearColor');
      chips(section('Eyewear'), OPTIONS.face, 'face');
      chips(section('Bag & scarf'), OPTIONS.back, 'back');
      swatches(panelEl.lastChild, OPTIONS.clothColors, 'backColor');
      break;
    case 'pose': {
      const s = section('Animations — tap the character to make them react!');
      const grid = el('div', 'pose-grid');
      for (const p of POSES) {
        const b = el('button', 'pose' + (animator.pose === p.id ? ' on' : ''));
        b.innerHTML = `<span class="pose-icon">${p.icon}</span><span>${p.label}</span>`;
        b.onclick = () => { animator.setPose(p.id); saveState(); vibrate(8); renderPanel(); };
        grid.appendChild(b);
      }
      s.appendChild(grid);
      break;
    }
    case 'scene': {
      const s = section('Backdrop');
      const row = el('div', 'swatches');
      for (const b of BACKGROUNDS) {
        const btn = el('button', 'swatch big' + (sceneOpts.bg === b.id ? ' on' : ''));
        btn.style.background = `linear-gradient(${b.top}, ${b.bottom})`;
        btn.setAttribute('aria-label', b.id);
        btn.onclick = () => { sceneOpts.bg = b.id; applyBackground(); saveState(); renderPanel(); };
        row.appendChild(btn);
      }
      s.appendChild(row);
      const s2 = section('Camera');
      const row2 = el('div', 'chips');
      const auto = el('button', 'chip' + (sceneOpts.autoRotate ? ' on' : ''), sceneOpts.autoRotate ? 'Auto-rotate: on' : 'Auto-rotate: off');
      auto.onclick = () => { sceneOpts.autoRotate = !sceneOpts.autoRotate; applyBackground(); saveState(); renderPanel(); };
      const reset = el('button', 'chip', 'Reset view');
      reset.onclick = resetView;
      const resetLook = el('button', 'chip', 'Reset character');
      resetLook.onclick = () => { look = { ...DEFAULT_LOOK }; rebuild(); renderPanel(); };
      row2.append(auto, reset, resetLook);
      s2.appendChild(row2);
      const help = el('p', 'help', 'Drag to rotate · pinch to zoom · tap the character for a reaction.');
      s2.appendChild(help);
      break;
    }
  }
}

function resetView() {
  camera.position.copy(HOME_CAM);
  controls.target.copy(HOME_TARGET);
  controls.update();
}

document.getElementById('btn-random').onclick = () => {
  look = randomLook();
  rebuild();
  renderPanel();
  animator.poke();
  vibrate(20);
};
document.getElementById('btn-reset').onclick = resetView;
document.getElementById('btn-toggle').onclick = () => document.getElementById('panel').classList.toggle('collapsed');

// photo
const modal = document.getElementById('photo-modal');
document.getElementById('btn-photo').onclick = () => {
  renderer.render(scene, camera);
  const url = canvas.toDataURL('image/png');
  document.getElementById('photo-img').src = url;
  const a = document.getElementById('photo-download');
  a.href = url;
  a.download = `character-${Date.now()}.png`;
  modal.classList.add('open');
};
document.getElementById('photo-close').onclick = () => modal.classList.remove('open');
modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('open'); };

// boot
applyBackground();
rebuild();
renderTabs();
renderPanel();
frame();
