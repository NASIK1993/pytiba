// Procedural, stylized (chibi-proportioned) 3D character built entirely from
// three.js primitives — no external model files needed.
import * as THREE from 'three';

// ---------- option catalog ----------
export const OPTIONS = {
  skin: ['#ffe0c7', '#f5c9a6', '#e0a982', '#c68863', '#9a6646', '#6b4430'],
  eyes: ['#3b2a1e', '#2f6db5', '#3f8f5a', '#8a5a2b', '#6b6b7a', '#7b4fb0'],
  hairColors: ['#2a1d17', '#5a3825', '#a0662f', '#e3c07a', '#c4442e', '#e8e8ee', '#ff7fb0', '#5f8cff', '#45b38d'],
  clothColors: ['#f4f4f6', '#25262b', '#e24a4a', '#f29b38', '#f2d45c', '#5cc47a', '#3fa7d6', '#3d5ad6', '#8d5ad6', '#f07bb8', '#8a6a4f', '#5c6b7a'],
  hair: ['short', 'bob', 'long', 'ponytail', 'buns', 'curly', 'spiky'],
  top: ['tshirt', 'hoodie', 'sweater', 'jacket'],
  bottom: ['jeans', 'cargo', 'shorts', 'skirt', 'longskirt'],
  shoes: ['sneakers', 'boots', 'slipons'],
  headwear: ['none', 'beanie', 'cap', 'headphones', 'flower'],
  face: ['none', 'glasses', 'sunglasses'],
  back: ['none', 'backpack', 'scarf'],
  expression: ['happy', 'neutral', 'grin', 'surprised'],
};

export const LABELS = {
  short: 'Short', bob: 'Bob', long: 'Long', ponytail: 'Ponytail', buns: 'Buns', curly: 'Curly', spiky: 'Spiky',
  tshirt: 'T-shirt', hoodie: 'Hoodie', sweater: 'Sweater', jacket: 'Jacket',
  jeans: 'Jeans', cargo: 'Cargo', shorts: 'Shorts', skirt: 'Skirt', longskirt: 'Long skirt',
  sneakers: 'Sneakers', boots: 'Boots', slipons: 'Slip-ons',
  none: 'None', beanie: 'Beanie', cap: 'Cap', headphones: 'Headphones', flower: 'Flower clip',
  glasses: 'Glasses', sunglasses: 'Sunglasses', backpack: 'Backpack', scarf: 'Scarf',
  happy: 'Happy', neutral: 'Calm', grin: 'Grin', surprised: 'Surprised',
};

export const DEFAULT_LOOK = {
  skin: '#f5c9a6',
  eyes: '#3b2a1e',
  height: 1.0,
  hair: 'long',
  hairColor: '#5a3825',
  top: 'hoodie',
  topColor: '#3fa7d6',
  bottom: 'jeans',
  bottomColor: '#3d5ad6',
  shoes: 'sneakers',
  shoesColor: '#f4f4f6',
  headwear: 'none',
  headwearColor: '#e24a4a',
  face: 'none',
  back: 'none',
  backColor: '#f29b38',
  expression: 'happy',
};

export function randomLook() {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  return {
    skin: pick(OPTIONS.skin),
    eyes: pick(OPTIONS.eyes),
    height: +(0.9 + Math.random() * 0.2).toFixed(2),
    hair: pick(OPTIONS.hair),
    hairColor: pick(OPTIONS.hairColors),
    top: pick(OPTIONS.top),
    topColor: pick(OPTIONS.clothColors),
    bottom: pick(OPTIONS.bottom),
    bottomColor: pick(OPTIONS.clothColors),
    shoes: pick(OPTIONS.shoes),
    shoesColor: pick(OPTIONS.clothColors),
    headwear: Math.random() < 0.5 ? 'none' : pick(OPTIONS.headwear),
    headwearColor: pick(OPTIONS.clothColors),
    face: Math.random() < 0.6 ? 'none' : pick(OPTIONS.face),
    back: Math.random() < 0.6 ? 'none' : pick(OPTIONS.back),
    backColor: pick(OPTIONS.clothColors),
    expression: pick(OPTIONS.expression),
  };
}

// ---------- materials ----------
let gradientMap = null;
function toonGradient() {
  if (gradientMap) return gradientMap;
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  gradientMap = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;
  return gradientMap;
}
const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...opts }));
  }
  return matCache.get(key);
}
function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return '#' + c.getHexString();
}

// ---------- geometry helpers ----------
function mesh(geo, material, parent, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
// A capsule hanging downward from its parent's origin.
function limb(parent, radius, length, material, offsetTop = 0) {
  return mesh(new THREE.CapsuleGeometry(radius, length, 6, 14), material, parent, [0, -offsetTop - length / 2, 0]);
}
function sphere(r, w = 20, h = 14) {
  return new THREE.SphereGeometry(r, w, h);
}
function group(parent, pos = [0, 0, 0], name) {
  const g = new THREE.Group();
  g.position.set(...pos);
  if (name) g.name = name;
  parent.add(g);
  return g;
}

// ---------- dimensions ----------
const HIP_Y = 0.78;
const THIGH = 0.3, SHIN = 0.29;
const KNEE_Y = -0.37, ANKLE_Y = -0.36;
const UPPER_ARM = 0.17, FOREARM = 0.15;
const ELBOW_Y = -0.23, WRIST_Y = -0.22;
const HEAD_R = 0.24;
const HEAD_C = 0.2; // head center relative to head pivot

export function buildCharacter(look) {
  const L = { ...DEFAULT_LOOK, ...look };
  const root = new THREE.Group();
  root.name = 'character';
  root.scale.setScalar(L.height);

  const skin = mat(L.skin);
  const B = {};
  B.hips = group(root, [0, HIP_Y, 0], 'hips');
  B.spine = group(B.hips, [0, 0, 0], 'spine');
  B.neck = group(B.spine, [0, 0.46, 0], 'neck');
  B.head = group(B.neck, [0, 0.06, 0], 'head');
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    B['shoulder' + s] = group(B.spine, [0.19 * sx, 0.38, 0]);
    B['elbow' + s] = group(B['shoulder' + s], [0, ELBOW_Y, 0]);
    B['leg' + s] = group(B.hips, [0.085 * sx, -0.03, 0]);
    B['knee' + s] = group(B['leg' + s], [0, KNEE_Y, 0]);
  }

  // ---- base body (skin) ----
  mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.12, 14), skin, B.neck, [0, 0.03, 0]);
  mesh(sphere(HEAD_R, 32, 24), skin, B.head, [0, HEAD_C, 0]);
  // ears
  for (const sx of [1, -1]) mesh(sphere(0.045), skin, B.head, [0.235 * sx, HEAD_C - 0.01, 0], [0, 0, 0], [0.6, 1, 0.8]);
  mesh(new THREE.CapsuleGeometry(0.135, 0.2, 6, 16), skin, B.spine, [0, 0.22, 0]);
  mesh(sphere(0.15), skin, B.hips, [0, 0.0, 0], [0, 0, 0], [1, 0.7, 0.85]);
  for (const s of ['L', 'R']) {
    limb(B['shoulder' + s], 0.048, UPPER_ARM, skin, 0.02);
    limb(B['elbow' + s], 0.043, FOREARM, skin, 0.01);
    mesh(sphere(0.055), skin, B['elbow' + s], [0, WRIST_Y - 0.03, 0.005], [0, 0, 0], [0.85, 1.1, 0.7]);
    limb(B['leg' + s], 0.065, THIGH, skin, 0.03);
    limb(B['knee' + s], 0.055, SHIN, skin, 0.02);
  }

  buildFace(B.head, L);
  buildHair(B.head, L);
  buildTop(B, L);
  buildBottom(B, L);
  buildShoes(B, L);
  buildHeadwear(B.head, L);
  buildFaceAcc(B.head, L);
  buildBack(B, L);

  return { root, bones: B, look: L, face: root.userData.face };
}

// ---------- face ----------
function buildFace(head, L) {
  const face = group(head, [0, HEAD_C, 0], 'face');
  const white = mat('#ffffff');
  const dark = mat('#1d1620');
  const eyes = [];
  for (const sx of [1, -1]) {
    const eye = group(face, [0.085 * sx, -0.015, 0.205]);
    mesh(sphere(0.048, 20, 14), white, eye, [0, 0, 0], [0, 0, 0], [0.85, 1.05, 0.45]);
    mesh(sphere(0.036, 20, 14), mat(L.eyes), eye, [0, -0.004, 0.012], [0, 0, 0], [0.85, 1.05, 0.5]);
    mesh(sphere(0.02, 16, 10), dark, eye, [0, -0.004, 0.024], [0, 0, 0], [1, 1, 0.5]);
    mesh(sphere(0.011, 10, 8), white, eye, [0.012 * sx, 0.014, 0.032]);
    eye.rotation.y = 0.32 * sx;
    eyes.push(eye);
    // brows
    mesh(new THREE.CapsuleGeometry(0.008, 0.045, 4, 8), mat(shade(L.hairColor, 0.8)), face,
      [0.085 * sx, 0.06, 0.215], [0, 0.3 * sx, Math.PI / 2 + 0.12 * sx]);
    // blush
    mesh(new THREE.CircleGeometry(0.03, 16), mat('#ff8fa3', { transparent: true, opacity: 0.45 }), face,
      [0.135 * sx, -0.075, 0.191], [0, 0.6 * sx, 0]).castShadow = false;
  }
  // nose
  mesh(sphere(0.012), mat(shade(L.skin, 0.92)), face, [0, -0.06, 0.237]);
  // mouth
  const mouthMat = mat('#8a2f3f');
  let mouth;
  switch (L.expression) {
    case 'neutral':
      mouth = mesh(new THREE.CapsuleGeometry(0.006, 0.035, 4, 8), mouthMat, face, [0, -0.105, 0.222], [0, 0, Math.PI / 2]);
      break;
    case 'grin': {
      const g = new THREE.CircleGeometry(0.04, 20, Math.PI, Math.PI);
      mouth = mesh(g, mouthMat, face, [0, -0.09, 0.226], [-0.2, 0, 0]);
      mouth.material = mat('#8a2f3f', { side: THREE.DoubleSide });
      mesh(new THREE.PlaneGeometry(0.06, 0.012), white, face, [0, -0.095, 0.228], [-0.2, 0, 0]);
      break;
    }
    case 'surprised':
      mouth = mesh(sphere(0.022), mouthMat, face, [0, -0.105, 0.215], [0, 0, 0], [0.85, 1.1, 0.5]);
      break;
    default:
      mouth = mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16, Math.PI), mouthMat, face, [0, -0.085, 0.222], [0.25, 0, Math.PI]);
  }
  head.parent.parent.parent.parent.userData.face = { eyes, mouth };
}

// ---------- hair ----------
function buildHair(head, L) {
  const hm = mat(L.hairColor);
  const hmD = mat(L.hairColor, { side: THREE.DoubleSide });
  const h = group(head, [0, HEAD_C, 0], 'hair');
  const R = HEAD_R + 0.014;
  // Tilted skull cap: lower edge sits on forehead in front, at the nape behind.
  const cap = mesh(new THREE.SphereGeometry(R, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.6), hm, h, [0, 0, -0.005], [-0.6, 0, 0]);
  if (L.hair !== 'spiky' && L.hair !== 'curly') {
    // bangs
    for (const [x, rz, s] of [[-0.11, 0.5, 1], [-0.035, 0.15, 1.15], [0.05, -0.15, 1.1], [0.12, -0.5, 0.95]]) {
      mesh(sphere(0.07), hm, h, [x, 0.12, 0.17], [0.4, 0, rz], [1 * s, 0.75 * s, 0.55]);
    }
  }
  // back of the skull, pulled back so it never pokes through the face
  const backSkull = () => mesh(sphere(R), hm, h, [0, -0.02, -0.08], [0, 0, 0], [1, 0.96, 0.88]);
  const sideCurtain = (len, rBottom) => {
    // open-ended cylinder around the back/sides leaving the face open
    const geo = new THREE.CylinderGeometry(R + 0.004, rBottom, len, 32, 1, true, Math.PI * 0.3, Math.PI * 1.4);
    mesh(geo, hmD, h, [0, -len / 2 + 0.06, -0.01]);
  };
  switch (L.hair) {
    case 'short':
      backSkull();
      break;
    case 'bob':
      sideCurtain(0.27, R + 0.035);
      backSkull();
      break;
    case 'long':
      sideCurtain(0.62, R + 0.07);
      backSkull();
      break;
    case 'ponytail': {
      backSkull();
      const tie = group(h, [0, 0.08, -0.25]);
      mesh(new THREE.TorusGeometry(0.035, 0.014, 8, 16), mat(L.headwearColor), tie, [0, 0, 0], [0.4, 0, 0]);
      const tail = group(tie, [0, 0, -0.02], 'tail');
      tail.rotation.x = 0.35;
      mesh(new THREE.CapsuleGeometry(0.06, 0.28, 6, 12), hm, tail, [0, -0.17, -0.02], [0, 0, 0], [1, 1, 0.85]);
      mesh(sphere(0.055), hm, tail, [0, -0.36, -0.01]);
      h.userData.tail = tail;
      break;
    }
    case 'buns':
      backSkull();
      for (const sx of [1, -1]) {
        mesh(sphere(0.085), hm, h, [0.16 * sx, 0.2, -0.04]);
        mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16), mat(L.headwearColor), h, [0.12 * sx, 0.15, -0.04], [0, 0, 0.7 * sx]);
      }
      break;
    case 'curly':
      backSkull();
      for (let i = 0; i < 46; i++) {
        const th = (i * 2.399963) % (Math.PI * 2);
        const ph = Math.acos(1 - 2 * ((i + 0.5) / 46)) * 0.68;
        const v = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
        v.applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.55);
        mesh(sphere(0.06, 12, 10), hm, h, [v.x * (R + 0.02), v.y * (R + 0.02), v.z * (R + 0.02) - 0.01]);
      }
      break;
    case 'spiky':
      backSkull();
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const tilt = 0.55 + (i % 2) * 0.25;
        const dir = new THREE.Vector3(Math.sin(a) * Math.sin(tilt), Math.cos(tilt), Math.cos(a) * Math.sin(tilt));
        dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.35);
        const spike = mesh(new THREE.ConeGeometry(0.06, 0.16, 8), hm, h, dir.clone().multiplyScalar(R + 0.04).toArray());
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      }
      break;
  }
  void cap;
}

// ---------- clothing ----------
function buildTop(B, L) {
  const c = mat(L.topColor);
  const cD = mat(shade(L.topColor, 0.82));
  const longSleeve = L.top !== 'tshirt';
  mesh(new THREE.CapsuleGeometry(0.15, 0.22, 6, 18), c, B.spine, [0, 0.22, 0]);
  mesh(sphere(0.165), c, B.hips, [0, 0.03, 0], [0, 0, 0], [1, 0.55, 0.88]);
  for (const s of ['L', 'R']) {
    if (longSleeve) {
      limb(B['shoulder' + s], 0.06, UPPER_ARM + 0.02, c, 0.01);
      limb(B['elbow' + s], 0.055, FOREARM - 0.02, c, 0.0);
      mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14), cD, B['elbow' + s], [0, -0.19, 0], [Math.PI / 2, 0, 0]);
    } else {
      limb(B['shoulder' + s], 0.062, 0.07, c, 0.0);
    }
  }
  switch (L.top) {
    case 'tshirt':
      mesh(new THREE.TorusGeometry(0.07, 0.014, 6, 18), cD, B.spine, [0, 0.43, 0.01], [Math.PI / 2 - 0.15, 0, 0]);
      break;
    case 'hoodie': {
      // hood resting behind the neck
      mesh(new THREE.TorusGeometry(0.11, 0.045, 8, 20, Math.PI * 1.3), cD, B.spine, [0, 0.45, -0.03], [Math.PI / 2 - 0.25, 0, Math.PI * 1.85 - 0.06]);
      mesh(new THREE.BoxGeometry(0.17, 0.08, 0.03), cD, B.spine, [0, 0.08, 0.135], [0.1, 0, 0]);
      for (const sx of [1, -1]) {
        mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), mat('#f4f4f6'), B.spine, [0.035 * sx, 0.33, 0.15], [0.1, 0, 0]);
      }
      break;
    }
    case 'sweater':
      mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.08, 18), cD, B.spine, [0, 0.47, 0]);
      for (const y of [0.12, 0.22, 0.32]) {
        mesh(new THREE.TorusGeometry(0.152, 0.008, 6, 28), cD, B.spine, [0, y, 0], [Math.PI / 2, 0, 0]);
      }
      break;
    case 'jacket': {
      mesh(new THREE.BoxGeometry(0.1, 0.32, 0.02), mat('#f4f4f6'), B.spine, [0, 0.24, 0.146]);
      for (const sx of [1, -1]) {
        mesh(new THREE.BoxGeometry(0.05, 0.16, 0.02), cD, B.spine, [0.07 * sx, 0.36, 0.14], [0.15, 0, 0.35 * sx]);
        mesh(new THREE.BoxGeometry(0.06, 0.012, 0.02), cD, B.spine, [0.09 * sx, 0.1, 0.147]);
      }
      mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 18), cD, B.spine, [0, 0.45, -0.01], [Math.PI / 2 - 0.2, 0, 0]);
      break;
    }
  }
}

function buildBottom(B, L) {
  const c = mat(L.bottomColor);
  const cD = mat(shade(L.bottomColor, 0.8));
  const cDS = mat(L.bottomColor, { side: THREE.DoubleSide });
  mesh(sphere(0.162), c, B.hips, [0, -0.01, 0], [0, 0, 0], [1, 0.68, 0.88]);
  mesh(new THREE.TorusGeometry(0.145, 0.016, 6, 28), cD, B.hips, [0, 0.07, 0], [Math.PI / 2, 0, 0], [1, 0.88, 1]);
  const pants = L.bottom === 'jeans' || L.bottom === 'cargo';
  for (const s of ['L', 'R']) {
    if (pants || L.bottom === 'shorts') {
      limb(B['leg' + s], 0.078, pants ? THIGH + 0.02 : 0.14, c, 0.02);
    }
    if (pants) {
      limb(B['knee' + s], 0.068, SHIN - 0.04, c, 0.0);
      mesh(new THREE.TorusGeometry(0.066, 0.012, 6, 14), cD, B['knee' + s], [0, -0.3, 0], [Math.PI / 2, 0, 0]);
    }
    if (L.bottom === 'cargo') {
      const sx = s === 'L' ? 1 : -1;
      mesh(new THREE.BoxGeometry(0.03, 0.1, 0.08), cD, B['leg' + s], [0.075 * sx, -0.22, 0]);
    }
  }
  if (L.bottom === 'skirt' || L.bottom === 'longskirt') {
    const len = L.bottom === 'skirt' ? 0.36 : 0.62;
    const rb = L.bottom === 'skirt' ? 0.27 : 0.3;
    const skirt = mesh(new THREE.CylinderGeometry(0.155, rb, len, 32, 4, true), cDS, B.hips, [0, 0.06 - len / 2, 0]);
    skirt.name = 'skirt';
    // simple pleats
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      mesh(new THREE.BoxGeometry(0.006, len * 0.9, 0.006), cD, B.hips,
        [Math.sin(a) * (0.155 + rb) / 2 * 1.02, 0.06 - len / 2, Math.cos(a) * (0.155 + rb) / 2 * 1.02],
        [Math.cos(a) * -Math.atan((rb - 0.155) / len), 0, Math.sin(a) * Math.atan((rb - 0.155) / len)]);
    }
  }
}

function buildShoes(B, L) {
  const c = mat(L.shoesColor);
  const sole = mat(L.shoes === 'boots' ? '#3a2c24' : '#fafafa');
  for (const s of ['L', 'R']) {
    const foot = group(B['knee' + s], [0, ANKLE_Y, 0]);
    if (L.shoes === 'boots') {
      mesh(new THREE.CylinderGeometry(0.066, 0.07, 0.17, 16), c, foot, [0, 0.07, 0]);
      mesh(new THREE.TorusGeometry(0.066, 0.012, 6, 14), mat(shade(L.shoesColor, 0.7)), foot, [0, 0.155, 0], [Math.PI / 2, 0, 0]);
    }
    mesh(sphere(0.075), c, foot, [0, -0.005, 0.045], [0, 0, 0], [0.9, 0.62, 1.55]);
    mesh(new THREE.BoxGeometry(0.13, 0.03, 0.24), sole, foot, [0, -0.045, 0.045]);
    if (L.shoes === 'sneakers') {
      mesh(new THREE.BoxGeometry(0.07, 0.01, 0.05), mat('#ffffff'), foot, [0, 0.035, 0.07], [0.35, 0, 0]);
    }
  }
}

// ---------- accessories ----------
function buildHeadwear(head, L) {
  const c = mat(L.headwearColor);
  const cD = mat(shade(L.headwearColor, 0.8));
  const g = group(head, [0, HEAD_C, 0]);
  switch (L.headwear) {
    case 'beanie':
      mesh(new THREE.SphereGeometry(HEAD_R + 0.035, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), c, g, [0, 0.03, -0.01], [-0.35, 0, 0]);
      mesh(new THREE.TorusGeometry(HEAD_R + 0.02, 0.03, 8, 32), cD, g, [0, 0.04, 0.0], [Math.PI / 2 - 0.35, 0, 0]);
      mesh(sphere(0.05), cD, g, [0, 0.28, -0.08]);
      break;
    case 'cap':
      mesh(new THREE.SphereGeometry(HEAD_R + 0.03, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), c, g, [0, 0.05, -0.01], [-0.2, 0, 0]);
      mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.015, 24, 1, false, -Math.PI / 2, Math.PI), cD, g, [0, 0.07, 0.2], [0.15, 0, 0], [1, 1, 1]);
      break;
    case 'headphones':
      mesh(new THREE.TorusGeometry(HEAD_R + 0.04, 0.018, 8, 32, Math.PI), c, g, [0, 0.0, 0]);
      for (const sx of [1, -1]) {
        mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 20), cD, g, [(HEAD_R + 0.03) * sx, 0, 0], [0, 0, Math.PI / 2]);
      }
      break;
    case 'flower': {
      const f = group(g, [0.17, 0.13, 0.1]);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        mesh(sphere(0.03), c, f, [Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0], [0, 0, 0], [1, 1, 0.5]);
      }
      mesh(sphere(0.022), mat('#ffd34d'), f, [0, 0, 0.012]);
      f.lookAt(new THREE.Vector3(0.6, 0.4, 0.7).add(f.position));
      break;
    }
  }
}

function buildFaceAcc(head, L) {
  if (L.face === 'none') return;
  const g = group(head, [0, HEAD_C - 0.015, 0]);
  const frame = mat(L.face === 'sunglasses' ? '#1b1b1f' : '#2c2c34');
  for (const sx of [1, -1]) {
    mesh(new THREE.TorusGeometry(0.052, 0.008, 6, 20), frame, g, [0.085 * sx, 0, 0.235], [0, 0.3 * sx, 0]);
    if (L.face === 'sunglasses') {
      mesh(new THREE.CircleGeometry(0.05, 20), mat('#202030', { transparent: true, opacity: 0.85 }), g, [0.085 * sx, 0, 0.236], [0, 0.3 * sx, 0]);
    }
    mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 6), frame, g, [0.2 * sx, 0.01, 0.12], [Math.PI / 2, 0, 0.0]);
  }
  mesh(new THREE.CapsuleGeometry(0.006, 0.035, 4, 6), frame, g, [0, 0.01, 0.245], [0, 0, Math.PI / 2]);
}

function buildBack(B, L) {
  const c = mat(L.backColor);
  const cD = mat(shade(L.backColor, 0.78));
  if (L.back === 'backpack') {
    mesh(new THREE.BoxGeometry(0.26, 0.3, 0.12), c, B.spine, [0, 0.24, -0.2]);
    mesh(new THREE.BoxGeometry(0.18, 0.12, 0.05), cD, B.spine, [0, 0.16, -0.27]);
    for (const sx of [1, -1]) {
      mesh(new THREE.TorusGeometry(0.15, 0.015, 6, 20, Math.PI), cD, B.spine, [0.1 * sx, 0.28, -0.03], [0, Math.PI / 2, Math.PI / 2]);
    }
  } else if (L.back === 'scarf') {
    mesh(new THREE.TorusGeometry(0.09, 0.04, 10, 24), c, B.spine, [0, 0.46, 0], [Math.PI / 2 - 0.1, 0, 0]);
    mesh(new THREE.BoxGeometry(0.07, 0.2, 0.03), c, B.spine, [0.06, 0.34, 0.16], [0.15, 0, 0.1]);
    mesh(new THREE.BoxGeometry(0.07, 0.01, 0.031), cD, B.spine, [0.07, 0.26, 0.17], [0.15, 0, 0.1]);
  }
}
