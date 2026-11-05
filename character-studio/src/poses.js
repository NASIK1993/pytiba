// Procedural poses / animations. Each pose writes target joint rotations;
// the animator eases the skeleton toward them so switching poses blends smoothly.

export const POSES = [
  { id: 'idle', label: 'Idle', icon: '🧍' },
  { id: 'wave', label: 'Wave', icon: '👋' },
  { id: 'walk', label: 'Walk', icon: '🚶' },
  { id: 'dance', label: 'Dance', icon: '💃' },
  { id: 'jump', label: 'Jump', icon: '🦘' },
  { id: 'cheer', label: 'Cheer', icon: '🙌' },
  { id: 'think', label: 'Think', icon: '🤔' },
  { id: 'sit', label: 'Sit', icon: '🪑' },
  { id: 'spin', label: 'Twirl', icon: '🌀' },
];

const JOINTS = ['hips', 'spine', 'neck', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'legL', 'legR', 'kneeL', 'kneeR'];
const HIP_Y = 0.78;

function blankTarget() {
  const t = { hipY: HIP_Y, hipZ: 0, yaw: 0 };
  for (const j of JOINTS) t[j] = [0, 0, 0];
  t.shoulderL[2] = 0.12;
  t.shoulderR[2] = -0.12;
  t.elbowL[0] = -0.12;
  t.elbowR[0] = -0.12;
  return t;
}

const S = Math.sin;

const poseFns = {
  idle(t, T) {
    T.spine[0] = S(t * 1.6) * 0.02;
    T.head[2] = S(t * 0.7) * 0.06;
    T.head[1] = S(t * 0.45) * 0.12;
    T.shoulderL[2] = 0.12 + S(t * 1.6) * 0.02;
    T.shoulderR[2] = -0.12 - S(t * 1.6) * 0.02;
    T.hips[2] = S(t * 0.8) * 0.02;
  },
  wave(t, T) {
    poseFns.idle(t, T);
    T.shoulderR[2] = -2.35;
    T.shoulderR[0] = -0.2;
    T.elbowR[2] = -0.35 + S(t * 9) * 0.4;
    T.elbowR[0] = 0;
    T.head[2] = 0.12;
    T.spine[2] = 0.05;
  },
  walk(t, T) {
    const w = t * 6;
    T.legL[0] = S(w) * 0.55;
    T.legR[0] = -S(w) * 0.55;
    T.kneeL[0] = Math.max(0, -Math.cos(w)) * 0.8 + 0.05;
    T.kneeR[0] = Math.max(0, Math.cos(w)) * 0.8 + 0.05;
    T.shoulderL[0] = -S(w) * 0.5;
    T.shoulderR[0] = S(w) * 0.5;
    T.elbowL[0] = -0.35;
    T.elbowR[0] = -0.35;
    T.hipY = HIP_Y - 0.015 + Math.abs(Math.cos(w)) * 0.025;
    T.spine[1] = S(w) * 0.08;
    T.spine[0] = 0.05;
  },
  dance(t, T) {
    const b = t * 7;
    T.hipY = HIP_Y - 0.04 + Math.abs(S(b)) * 0.05;
    T.hips[2] = S(b) * 0.1;
    T.spine[2] = -S(b) * 0.15;
    T.spine[1] = S(b * 0.5) * 0.3;
    T.head[2] = S(b) * 0.15;
    T.shoulderL[2] = 1.4 + S(b) * 0.9;
    T.shoulderR[2] = -1.4 + S(b) * 0.9;
    T.elbowL[0] = -0.9;
    T.elbowR[0] = -0.9;
    T.legL[0] = -0.1;
    T.kneeL[0] = 0.2 + Math.max(0, S(b)) * 0.3;
    T.kneeR[0] = 0.2 + Math.max(0, -S(b)) * 0.3;
    T.legL[2] = 0.08;
    T.legR[2] = -0.08;
  },
  jump(t, T) {
    const p = (t * 1.1) % 1; // cycle
    let h = 0, crouch = 0;
    if (p < 0.25) crouch = S((p / 0.25) * Math.PI);
    else if (p < 0.75) h = S(((p - 0.25) / 0.5) * Math.PI);
    else crouch = S(((p - 0.75) / 0.25) * Math.PI) * 0.6;
    T.hipY = HIP_Y - crouch * 0.12 + h * 0.4;
    T.legL[0] = T.legR[0] = -crouch * 0.7 - h * 0.25;
    T.kneeL[0] = T.kneeR[0] = crouch * 1.3 + h * 0.5;
    T.spine[0] = crouch * 0.35;
    T.shoulderL[2] = 0.2 + h * 2.4;
    T.shoulderR[2] = -0.2 - h * 2.4;
    T.shoulderL[0] = T.shoulderR[0] = crouch * 0.6;
  },
  cheer(t, T) {
    const b = t * 8;
    T.shoulderL[2] = 2.7 + S(b) * 0.15;
    T.shoulderR[2] = -2.7 - S(b) * 0.15;
    T.elbowL[0] = T.elbowR[0] = -0.2;
    T.hipY = HIP_Y + Math.max(0, S(b)) * 0.06;
    T.head[0] = -0.15;
    T.spine[0] = -0.05;
  },
  think(t, T) {
    T.shoulderR[0] = -0.5;
    T.shoulderR[2] = -0.25;
    T.elbowR[0] = -2.35;
    T.elbowR[1] = -0.3;
    T.shoulderL[0] = -0.55;
    T.shoulderL[2] = -0.25;
    T.elbowL[0] = -1.4;
    T.head[2] = 0.18 + S(t * 0.8) * 0.04;
    T.head[0] = -0.1;
    T.head[1] = -0.2;
    T.hips[2] = 0.04;
    T.legL[2] = 0.05;
  },
  sit(t, T) {
    T.hipY = 0.42;
    T.hipZ = -0.05;
    T.legL[0] = T.legR[0] = -1.45;
    T.legL[2] = 0.12;
    T.legR[2] = -0.12;
    T.kneeL[0] = T.kneeR[0] = 1.45;
    T.shoulderL[0] = T.shoulderR[0] = -0.45;
    T.elbowL[0] = T.elbowR[0] = -0.7;
    T.spine[0] = S(t * 1.6) * 0.02;
    T.head[1] = S(t * 0.4) * 0.25;
    T.head[2] = S(t * 0.7) * 0.06;
  },
  spin(t, T) {
    poseFns.idle(t, T);
    T.yaw = t * 4;
    T.shoulderL[2] = 1.2;
    T.shoulderR[2] = -1.2;
    T.head[0] = -0.1;
    T.legL[0] = -0.1;
    T.kneeL[0] = 0.15;
  },
};

export class Animator {
  constructor() {
    this.pose = 'idle';
    this.time = 0;
    this.react = 0; // tap reaction timer
    this.blinkT = 2;
    this.yaw = 0;
  }
  setPose(p) {
    this.pose = p;
    this.time = 0;
  }
  poke() {
    this.react = 0.7;
  }
  update(char, dt) {
    if (!char) return;
    this.time += dt;
    const B = char.bones;
    const T = blankTarget();
    (poseFns[this.pose] || poseFns.idle)(this.time, T);

    // tap reaction: quick happy hop layered on top of the pose
    if (this.react > 0) {
      this.react = Math.max(0, this.react - dt);
      const k = S((1 - this.react / 0.7) * Math.PI);
      if (this.pose !== 'sit') T.hipY += k * 0.14;
      T.head[0] -= k * 0.2;
      T.shoulderL[2] += k * 0.9;
      T.shoulderR[2] -= k * 0.9;
    }

    const a = 1 - Math.exp(-dt * 12);
    for (const j of JOINTS) {
      const r = B[j].rotation;
      r.x += (T[j][0] - r.x) * a;
      r.y += (T[j][1] - r.y) * a;
      r.z += (T[j][2] - r.z) * a;
    }
    B.hips.position.y += (T.hipY - B.hips.position.y) * a;
    B.hips.position.z += (T.hipZ - B.hips.position.z) * a;

    // continuous yaw for twirl, eased back to facing camera otherwise
    if (this.pose === 'spin') this.yaw = T.yaw;
    else {
      const target = Math.round(this.yaw / (Math.PI * 2)) * Math.PI * 2;
      this.yaw += (target - this.yaw) * a * 0.6;
    }
    char.root.rotation.y = this.yaw;

    // ponytail sway
    const tail = char.root.getObjectByName('tail');
    if (tail) tail.rotation.x = 0.35 + S(this.time * 3) * 0.08 - B.spine.rotation.x;
    if (tail) tail.rotation.z = S(this.time * 2.3) * 0.12;

    // blinking
    this.blinkT -= dt;
    let eyeS = 1;
    if (this.blinkT < 0.12) eyeS = Math.abs(this.blinkT - 0.06) / 0.06;
    if (this.blinkT <= 0) this.blinkT = 2 + Math.random() * 3;
    if (char.face) for (const e of char.face.eyes) e.scale.y = Math.max(0.08, eyeS);
  }
}
