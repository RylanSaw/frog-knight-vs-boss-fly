// Frog Knight vs Boss Fly - Created by Rylan Saw
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlaySubtitle = document.getElementById('overlaySubtitle');
const startBtn = document.getElementById('startBtn');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const restartBtn = document.getElementById('restartBtn');
const btnAttack = document.getElementById('btnAttack');
const btnItem = document.getElementById('btnItem');
const itemBtnIcon = document.getElementById('itemBtnIcon');
const itemBtnLabel = document.getElementById('itemBtnLabel');
const joystickZone = document.getElementById('joystickZone');
const joystickStick = document.getElementById('joystickStick');

// --- 16-BIT WEB AUDIO SYNTHESIZER ---
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  if (!soundEnabled || !audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'slash') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.16);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    osc.start(now);
    osc.stop(now + 0.16);
  } else if (type === 'hit') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc.start(now);
    osc.stop(now + 0.18);
  } else if (type === 'mega') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(480, now + 0.06);
    osc.frequency.setValueAtTime(720, now + 0.12);
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    osc.start(now);
    osc.stop(now + 0.28);
  } else if (type === 'itemGet') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(554, now + 0.07);
    osc.frequency.setValueAtTime(659, now + 0.14);
    osc.frequency.setValueAtTime(880, now + 0.21);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
    osc.start(now);
    osc.stop(now + 0.32);
  } else if (type === 'itemUse') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  } else if (type === 'bossRoar') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(65, now + 0.55);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
    osc.start(now);
    osc.stop(now + 0.55);
  } else if (type === 'jump') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.15);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === 'buzz') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.linearRampToValueAtTime(165, now + 0.1);
    osc.frequency.linearRampToValueAtTime(130, now + 0.2);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'hurt') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(70, now + 0.25);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

// --- GAME CONSTANTS & STATE ---
const GROUND_Y = 330;
const BOSS_SPAWN_SECONDS = 50;

let gameRunning = false;
let screenShake = 0;
let startTime = 0;
let elapsedSeconds = 0;
let stage = 1;
let score = 0;

const keys = { left: false, right: false, up: false };
let joyX = 0;

let popups = [];
let particles = [];
let shockwaves = [];
let smallFlies = [];
let items = [];
let smallFlySpawnTimer = 0;
let itemSpawnTimer = 180;

const ITEM_TYPES = [
  {
    id: 'HEAL',
    name: 'HEAL POTION',
    shortName: 'HEAL',
    icon: '+HP',
    color: '#2ecc71',
    desc: '+45 HP RESTORED!'
  },
  {
    id: 'SHIELD',
    name: 'GOLD SHIELD',
    shortName: 'SHIELD',
    icon: 'SHD',
    color: '#f1c40f',
    desc: 'INVINCIBLE SHIELD!'
  },
  {
    id: 'MEGA_WAVE',
    name: 'SONIC WAVE',
    shortName: 'WAVE',
    icon: 'WAV',
    color: '#4deeea',
    desc: 'GIANT SLASH WAVE!'
  },
  {
    id: 'THUNDER',
    name: 'THUNDER ORB',
    shortName: 'ZAP',
    icon: 'ZAP',
    color: '#ffe700',
    desc: 'LIGHTNING STRIKE!'
  },
  {
    id: 'RAGE',
    name: 'DRAGON RAGE',
    shortName: 'RAGE',
    icon: '2X',
    color: '#ff3b30',
    desc: '2X GIANT SLASH!'
  }
];

const frog = {
  x: 180,
  y: GROUND_Y,
  w: 44,
  h: 48,
  vx: 0,
  vy: 0,
  speed: 4.8,
  jumpPower: -12.8,
  grounded: true,
  facing: 1,
  hp: 100,
  maxHp: 100,
  invuln: 0,
  shieldTimer: 0,
  rageTimer: 0,
  attackTimer: 0,
  attackCooldown: 0,
  hitIdsThisSwing: new Set(),
  combo: 0,
  comboTimer: 0,
  heldItem: null
};

const boss = {
  active: false,
  x: 620,
  y: -100,
  w: 112,
  h: 98,
  hp: 600,
  maxHp: 600,
  vx: -2,
  vy: 0,
  state: 'entering',
  stateTimer: 90,
  wingFrame: 0,
  flashTimer: 0
};

function updateItemButtonUI() {
  if (frog.heldItem) {
    btnItem.disabled = false;
    btnItem.classList.remove('disabled');
    btnItem.style.background = `radial-gradient(circle at 35% 35%, #ffffff, ${frog.heldItem.color} 70%, #111 100%)`;
    itemBtnIcon.textContent = frog.heldItem.icon;
    itemBtnLabel.textContent = frog.heldItem.shortName;
    itemBtnLabel.style.color = frog.heldItem.color;
  } else {
    btnItem.disabled = true;
    btnItem.classList.add('disabled');
    btnItem.style.background = '';
    itemBtnIcon.textContent = '?';
    itemBtnLabel.textContent = 'ITEM LOCK';
    itemBtnLabel.style.color = '#e6d5c3';
  }
}

function resetGame() {
  frog.x = 180;
  frog.y = GROUND_Y;
  frog.vx = 0;
  frog.vy = 0;
  frog.hp = 100;
  frog.invuln = 0;
  frog.shieldTimer = 0;
  frog.rageTimer = 0;
  frog.attackTimer = 0;
  frog.combo = 0;
  frog.comboTimer = 0;
  frog.heldItem = null;
  updateItemButtonUI();

  boss.active = false;
  boss.x = 620;
  boss.y = -100;
  boss.hp = 600;
  boss.maxHp = 600;
  boss.state = 'entering';
  boss.flashTimer = 0;

  smallFlies = [];
  items = [];
  popups = [];
  particles = [];
  shockwaves = [];

  stage = 1;
  score = 0;
  startTime = performance.now();
  elapsedSeconds = 0;
  smallFlySpawnTimer = 30;
  itemSpawnTimer = 140;

  spawnSmallFly();
  spawnSmallFly();
  spawnItem();

  gameRunning = true;
  overlay.classList.add('hidden');
}

function spawnSmallFly() {
  const fromLeft = Math.random() < 0.35;
  smallFlies.push({
    id: Math.random(),
    x: fromLeft ? -30 : canvas.width + 30,
    y: 110 + Math.random() * 165,
    w: 34,
    h: 30,
    hp: 24,
    maxHp: 24,
    vx: fromLeft ? 2.4 + Math.random() * 1.5 : -(2.4 + Math.random() * 1.5),
    vy: 0,
    wingFrame: Math.random() * 6,
    flashTimer: 0,
    swoopCooldown: 60 + Math.random() * 90
  });
}

function spawnItem() {
  if (items.length >= 2) return;
  const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
  items.push({
    id: Math.random(),
    type,
    x: 140 + Math.random() * (canvas.width - 280),
    y: 130 + Math.random() * 155,
    bobOffset: Math.random() * Math.PI * 2,
    life: 650
  });
}

function spawnPopup(text, x, y, color = '#ffffff', scale = 1) {
  popups.push({
    text,
    x,
    y,
    vy: -1.35,
    life: 46,
    color,
    scale
  });
}

function spawnSparks(x, y, color, count = 14) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 5.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 22 + Math.random() * 14,
      color,
      size: 3 + Math.random() * 4
    });
  }
}

function triggerJump() {
  if (!gameRunning) return;
  if (frog.grounded) {
    frog.vy = frog.jumpPower;
    frog.grounded = false;
    playSound('jump');
    spawnPopup('SWISH!', frog.x + 10, frog.y - 45, '#4deeea', 0.85);
  }
}

function triggerSlash() {
  if (!gameRunning) return;
  if (frog.attackCooldown <= 0) {
    frog.attackTimer = 16;
    frog.attackCooldown = 19;
    frog.hitIdsThisSwing.clear();
    playSound('slash');
    const isRage = frog.rageTimer > 0;
    spawnPopup(
      isRage ? 'MEGA SLASH!' : 'GIANT SLASH!',
      frog.x + frog.facing * 50,
      frog.y - 68,
      isRage ? '#ff3b30' : '#ffffff',
      isRage ? 1.15 : 1.0
    );
  }
}

function triggerUseItem() {
  if (!gameRunning || !frog.heldItem) return;

  const item = frog.heldItem;
  frog.heldItem = null;
  updateItemButtonUI();
  playSound('itemUse');
  screenShake = 10;

  spawnPopup(item.desc, frog.x, frog.y - 75, item.color, 1.1);
  spawnSparks(frog.x, frog.y - 30, item.color, 26);

  if (item.id === 'HEAL') {
    frog.hp = Math.min(frog.maxHp, frog.hp + 45);
  } else if (item.id === 'SHIELD') {
    frog.shieldTimer = 420;
  } else if (item.id === 'RAGE') {
    frog.rageTimer = 480;
  } else if (item.id === 'MEGA_WAVE') {
    shockwaves.push({
      x: frog.x + frog.facing * 40,
      y: frog.y - 50,
      vx: frog.facing * 11,
      radius: 75,
      damage: 85,
      life: 65,
      color: '#4deeea'
    });
  } else if (item.id === 'THUNDER') {
    smallFlies.forEach((fly) => {
      fly.hp = 0;
      score += 50;
      spawnSparks(fly.x, fly.y, '#ffe700', 15);
      spawnPopup('ZAP!', fly.x, fly.y - 20, '#ffe700', 1.0);
    });
    if (boss.active) {
      boss.hp = Math.max(0, boss.hp - 95);
      boss.flashTimer = 14;
      spawnSparks(boss.x, boss.y, '#ffe700', 28);
      spawnPopup('-95 ZAP!', boss.x, boss.y - 50, '#ffe700', 1.3);
      if (boss.hp <= 0) endGame(true);
    }
  }
}

// --- CONTROLS: KEYBOARD ---
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
    if (!keys.up) triggerJump();
    keys.up = true;
  }
  if (e.code === 'KeyZ' || e.code === 'KeyJ') {
    triggerSlash();
  }
  if (e.code === 'KeyX' || e.code === 'KeyK' || e.code === 'ShiftLeft') {
    triggerUseItem();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.up = false;
});

// --- CONTROLS: VIRTUAL JOYSTICK (Move & Up-Flick Jump) ---
let draggingStick = false;
const maxRadius = 28;

function handleJoystickMove(clientX, clientY) {
  const rect = joystickZone.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  let dx = clientX - centerX;
  let dy = clientY - centerY;
  const dist = Math.hypot(dx, dy);

  if (dist > maxRadius) {
    dx = (dx / dist) * maxRadius;
    dy = (dy / dist) * maxRadius;
  }

  joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;
  joyX = dx / maxRadius;

  if (dy < -17 && frog.grounded) {
    triggerJump();
  }
}

function resetJoystick() {
  draggingStick = false;
  joyX = 0;
  joystickStick.style.transform = `translate(0px, 0px)`;
}

joystickZone.addEventListener('pointerdown', (e) => {
  initAudio();
  draggingStick = true;
  joystickZone.setPointerCapture(e.pointerId);
  handleJoystickMove(e.clientX, e.clientY);
});

joystickZone.addEventListener('pointermove', (e) => {
  if (draggingStick) handleJoystickMove(e.clientX, e.clientY);
});

joystickZone.addEventListener('pointerup', resetJoystick);
joystickZone.addEventListener('pointercancel', resetJoystick);

// Right SLASH & ITEM Buttons
btnAttack.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  initAudio();
  btnAttack.classList.add('pressed');
  triggerSlash();
});
btnAttack.addEventListener('pointerup', () => btnAttack.classList.remove('pressed'));
btnAttack.addEventListener('pointerleave', () => btnAttack.classList.remove('pressed'));

btnItem.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  initAudio();
  if (!btnItem.disabled) {
    btnItem.classList.add('pressed');
    triggerUseItem();
  }
});
btnItem.addEventListener('pointerup', () => btnItem.classList.remove('pressed'));
btnItem.addEventListener('pointerleave', () => btnItem.classList.remove('pressed'));

startBtn.addEventListener('click', () => {
  initAudio();
  resetGame();
});

restartBtn.addEventListener('click', () => {
  initAudio();
  resetGame();
});

soundToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggleBtn.style.opacity = soundEnabled ? '1' : '0.4';
});

// --- UPDATE LOOP ---
function update() {
  if (!gameRunning) return;

  if (screenShake > 0) screenShake--;

  elapsedSeconds = (performance.now() - startTime) / 1000;
  if (stage === 1 && elapsedSeconds >= BOSS_SPAWN_SECONDS) {
    stage = 2;
    boss.active = true;
    boss.state = 'entering';
    boss.x = 600;
    boss.y = -80;
    screenShake = 18;
    playSound('bossRoar');
    spawnPopup('WARNING! GIANT BOSS FLY!', canvas.width / 2, 160, '#ff3b30', 1.35);
  }

  let moveDir = 0;
  if (keys.left) moveDir -= 1;
  if (keys.right) moveDir += 1;
  if (Math.abs(joyX) > 0.15) moveDir = joyX;

  frog.vx = moveDir * frog.speed;
  if (moveDir > 0.1) frog.facing = 1;
  if (moveDir < -0.1) frog.facing = -1;

  frog.x += frog.vx;
  frog.x = Math.max(60, Math.min(canvas.width - 100, frog.x));

  frog.vy += 0.62;
  frog.y += frog.vy;
  if (frog.y >= GROUND_Y) {
    frog.y = GROUND_Y;
    frog.vy = 0;
    frog.grounded = true;
  }

  if (frog.invuln > 0) frog.invuln--;
  if (frog.shieldTimer > 0) frog.shieldTimer--;
  if (frog.rageTimer > 0) frog.rageTimer--;
  if (frog.attackCooldown > 0) frog.attackCooldown--;
  if (frog.attackTimer > 0) frog.attackTimer--;

  if (frog.combo > 0) {
    frog.comboTimer--;
    if (frog.comboTimer <= 0) frog.combo = 0;
  }

  smallFlySpawnTimer--;
  if (smallFlySpawnTimer <= 0) {
    const maxFlies = stage === 1 ? 5 : 2;
    if (smallFlies.length < maxFlies) {
      spawnSmallFly();
    }
    smallFlySpawnTimer = stage === 1 ? 85 : 220;
  }

  itemSpawnTimer--;
  if (itemSpawnTimer <= 0) {
    spawnItem();
    itemSpawnTimer = 260;
  }

  if (frog.attackTimer > 0) {
    const isRage = frog.rageTimer > 0;
    const slashReach = isRage ? 165 : 130;
    const slashHeight = isRage ? 135 : 110;
    const swordX = frog.facing === 1 ? frog.x + 5 : frog.x - slashReach - 5;
    const swordY = frog.y - slashHeight + 10;

    items.forEach((it) => {
      if (
        !frog.hitIdsThisSwing.has(it.id) &&
        swordX < it.x + 24 &&
        swordX + slashReach > it.x - 24 &&
        swordY < it.y + 24 &&
        swordY + slashHeight > it.y - 24
      ) {
        frog.hitIdsThisSwing.add(it.id);
        it.life = 0;
        frog.heldItem = it.type;
        updateItemButtonUI();
        playSound('itemGet');
        spawnPopup(`GOT ${it.type.name}!`, it.x, it.y - 25, it.type.color, 1.0);
        spawnPopup('ITEM UNLOCKED!', frog.x, frog.y - 80, '#ffffff', 0.85);
        spawnSparks(it.x, it.y, it.type.color, 18);
      }
    });

    smallFlies.forEach((fly) => {
      if (
        !frog.hitIdsThisSwing.has(fly.id) &&
        swordX < fly.x + fly.w / 2 &&
        swordX + slashReach > fly.x - fly.w / 2 &&
        swordY < fly.y + fly.h / 2 &&
        swordY + slashHeight > fly.y - fly.h / 2
      ) {
        frog.hitIdsThisSwing.add(fly.id);
        frog.combo++;
        frog.comboTimer = 150;
        const dmg = isRage ? 30 : 15;
        fly.hp -= dmg;
        fly.flashTimer = 6;
        fly.vx = frog.facing * 5;
        screenShake = 5;

        playSound('hit');
        spawnPopup('KAPOW!', fly.x, fly.y - 25, '#4deeea', 1.0);
        spawnSparks(fly.x, fly.y, '#ff9f1c', 12);

        if (fly.hp <= 0) {
          score += 50;
          if (Math.random() < 0.35) spawnItem();
        }
      }
    });

    if (
      boss.active &&
      !frog.hitIdsThisSwing.has('boss') &&
      swordX < boss.x + boss.w / 2 &&
      swordX + slashReach > boss.x - boss.w / 2 &&
      swordY < boss.y + boss.h / 2 &&
      swordY + slashHeight > boss.y - boss.h / 2
    ) {
      frog.hitIdsThisSwing.add('boss');
      frog.combo++;
      frog.comboTimer = 150;

      const isMega = frog.combo >= 5 || isRage;
      const damage = isMega ? 34 : 18;
      boss.hp = Math.max(0, boss.hp - damage);
      boss.flashTimer = 8;
      screenShake = isMega ? 11 : 6;

      if (isMega) {
        playSound('mega');
        spawnPopup('MEGA KAPOW!', boss.x - 20, boss.y - 50, '#ff3b30', 1.3);
        spawnSparks(boss.x, boss.y, '#ffe700', 22);
      } else {
        playSound('hit');
        spawnPopup('KAPOW!', boss.x - 15, boss.y - 45, '#4deeea', 1.1);
        spawnSparks(boss.x, boss.y, '#ff9f1c', 14);
      }

      if (boss.hp <= 0) {
        score += 1000;
        endGame(true);
      }
    }
  }

  shockwaves.forEach((sw) => {
    sw.x += sw.vx;
    sw.life--;
    smallFlies.forEach((fly) => {
      if (Math.hypot(fly.x - sw.x, fly.y - sw.y) < sw.radius) {
        fly.hp = 0;
        score += 50;
        spawnSparks(fly.x, fly.y, '#4deeea', 12);
      }
    });
    if (boss.active && Math.hypot(boss.x - sw.x, boss.y - sw.y) < sw.radius + 30) {
      boss.hp = Math.max(0, boss.hp - sw.damage);
      boss.flashTimer = 12;
      sw.life = 0;
      spawnPopup(`-${sw.damage} WAVE!`, boss.x, boss.y - 45, '#4deeea', 1.3);
      spawnSparks(boss.x, boss.y, '#4deeea', 24);
      if (boss.hp <= 0) endGame(true);
    }
  });
  shockwaves = shockwaves.filter((sw) => sw.life > 0);

  smallFlies.forEach((fly) => {
    fly.wingFrame += 0.6;
    if (fly.flashTimer > 0) fly.flashTimer--;

    const dirToFrog = frog.x > fly.x ? 1 : -1;
    fly.vx += dirToFrog * 0.08;
    fly.vx = Math.max(-3.5, Math.min(3.5, fly.vx));
    fly.x += fly.vx;
    fly.y += Math.sin(Date.now() * 0.008 + fly.id * 10) * 1.4;

    fly.swoopCooldown--;
    if (fly.swoopCooldown <= 0) {
      fly.swoopCooldown = 120;
      fly.y = Math.min(GROUND_Y - 25, fly.y + 35);
      playSound('buzz');
    }

    if (
      frog.invuln <= 0 &&
      frog.shieldTimer <= 0 &&
      Math.abs(frog.x - fly.x) < 28 &&
      Math.abs(frog.y - 24 - fly.y) < 28
    ) {
      frog.hp = Math.max(0, frog.hp - 10);
      frog.invuln = 50;
      frog.combo = 0;
      screenShake = 6;
      playSound('hurt');
      spawnPopup('OUCH!', frog.x, frog.y - 55, '#ff3b30', 0.9);
      if (frog.hp <= 0) endGame(false);
    }
  });
  smallFlies = smallFlies.filter((fly) => fly.hp > 0);

  items.forEach((it) => {
    it.life--;
  });
  items = items.filter((it) => it.life > 0);

  if (boss.active) {
    boss.wingFrame += 0.45;
    if (boss.flashTimer > 0) boss.flashTimer--;

    if (boss.state === 'entering') {
      boss.y += (150 - boss.y) * 0.05;
      if (Math.abs(boss.y - 150) < 5) {
        boss.state = 'hover';
        boss.stateTimer = 75;
      }
    } else if (boss.state === 'hover') {
      const targetX = 400 + Math.cos(Date.now() * 0.0022) * 250;
      const targetY = 140 + Math.sin(Date.now() * 0.005) * 35;
      boss.x += (targetX - boss.x) * 0.05;
      boss.y += (targetY - boss.y) * 0.05;

      boss.stateTimer--;
      if (boss.stateTimer <= 0) {
        boss.state = 'swoop';
        boss.stateTimer = 65;
        const angle = Math.atan2(frog.y - 25 - boss.y, frog.x - boss.x);
        boss.vx = Math.cos(angle) * 7.2;
        boss.vy = Math.sin(angle) * 7.2;
        playSound('buzz');
        spawnPopup('BUZZZ!', boss.x + 30, boss.y - 45, '#ffe700', 1.15);
      }
    } else if (boss.state === 'swoop') {
      boss.x += boss.vx;
      boss.y += boss.vy;
      if (boss.y > GROUND_Y - 30) {
        boss.y = GROUND_Y - 30;
        boss.vy = -3.2;
      }
      boss.stateTimer--;
      if (boss.stateTimer <= 0) {
        boss.state = 'hover';
        boss.stateTimer = 80;
      }
    }

    if (
      frog.invuln <= 0 &&
      frog.shieldTimer <= 0 &&
      Math.abs(frog.x - boss.x) < 52 &&
      Math.abs(frog.y - 24 - boss.y) < 52
    ) {
      frog.hp = Math.max(0, frog.hp - 18);
      frog.invuln = 55;
      frog.combo = 0;
      screenShake = 9;
      playSound('hurt');
      spawnPopup('OUCH!', frog.x - 10, frog.y - 60, '#ff3b30', 1.05);
      spawnSparks(frog.x, frog.y - 20, '#ff3b30', 14);
      if (frog.hp <= 0) endGame(false);
    }
  }

  popups.forEach((p) => {
    p.y += p.vy;
    p.life--;
  });
  popups = popups.filter((p) => p.life > 0);

  particles.forEach((pt) => {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.vy += 0.2;
    pt.life--;
  });
  particles = particles.filter((pt) => pt.life > 0);
}

function endGame(victory) {
  gameRunning = false;
  overlay.classList.remove('hidden');
  if (victory) {
    overlayTitle.textContent = 'VICTORY!';
    overlayTitle.style.color = '#ffe700';
    overlaySubtitle.textContent = `GIANT BOSS FLY DEFEATED! SCORE: ${score}`;
  } else {
    overlayTitle.textContent = 'GAME OVER';
    overlayTitle.style.color = '#ff3b30';
    overlaySubtitle.textContent = 'TRY AGAIN, FROG KNIGHT!';
  }
  startBtn.textContent = 'PLAY AGAIN';
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (stage === 2) {
    grad.addColorStop(0, '#1f0d14');
    grad.addColorStop(0.6, '#2b1b24');
    grad.addColorStop(1, '#0c1c12');
  } else {
    grad.addColorStop(0, '#0f2318');
    grad.addColorStop(0.6, '#1b3b28');
    grad.addColorStop(1, '#0c1c12');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#12291c';
  const treePositions = [50, 170, 310, 490, 640, 750];
  treePositions.forEach((tx, idx) => {
    const w = 36 + (idx % 3) * 14;
    ctx.fillRect(tx, 0, w, 310);
    ctx.fillStyle = '#1b3d29';
    ctx.fillRect(tx - 8, 0, 6, 130 + (idx * 25) % 90);
    ctx.fillRect(tx + w + 4, 0, 5, 110 + (idx * 35) % 80);
    ctx.fillStyle = '#12291c';
  });

  ctx.fillStyle = '#143326';
  ctx.fillRect(0, 335, canvas.width, 85);
  ctx.fillStyle = '#24543e';
  for (let i = 0; i < 12; i++) {
    const wx = (i * 75 + Date.now() * 0.02) % canvas.width;
    ctx.fillRect(wx, 355 + (i % 3) * 18, 45, 4);
  }

  ctx.fillStyle = '#4a3219';
  ctx.fillRect(45, GROUND_Y, canvas.width - 90, 34);
  ctx.fillStyle = '#2e1d0d';
  ctx.fillRect(45, GROUND_Y + 22, canvas.width - 90, 12);

  ctx.fillStyle = '#49a038';
  ctx.fillRect(50, GROUND_Y - 4, canvas.width - 100, 10);
  ctx.fillStyle = '#74d647';
  for (let x = 60; x < canvas.width - 70; x += 32) {
    ctx.fillRect(x, GROUND_Y - 6, 18, 5);
  }
}

function drawItems() {
  items.forEach((it) => {
    const bobY = it.y + Math.sin(Date.now() * 0.006 + it.bobOffset) * 6;
    ctx.save();
    ctx.translate(it.x, bobY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = it.type.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = it.type.color;
    ctx.fillRect(-11, -11, 22, 22);

    ctx.fillStyle = '#000';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(it.type.icon, 0, 3);

    ctx.fillStyle = '#fff';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText('SLASH ME!', 0, -25);

    ctx.restore();
  });
}

function drawSmallFlies() {
  smallFlies.forEach((fly) => {
    ctx.save();
    ctx.translate(fly.x, fly.y);
    const dir = fly.vx >= 0 ? -1 : 1;
    ctx.scale(dir, 1);

    const wingY = Math.sin(fly.wingFrame) * 6;
    ctx.fillStyle = 'rgba(220, 245, 255, 0.8)';
    ctx.beginPath();
    ctx.ellipse(2, -12 + wingY * 0.4, 12, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fly.flashTimer > 0 ? '#ffffff' : '#3a6b35';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff1e1e';
    ctx.beginPath();
    ctx.arc(-8, -3, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

function drawFrogKnight() {
  if (frog.invuln > 0 && Math.floor(frog.invuln / 4) % 2 === 0) return;

  ctx.save();
  ctx.translate(frog.x, frog.y);

  if (frog.shieldTimer > 0) {
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -26, 36, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.scale(frog.facing, 1);

  ctx.fillStyle = '#1b6ca8';
  ctx.fillRect(-14, -14, 10, 14);
  ctx.fillRect(4, -14, 10, 14);

  ctx.fillStyle = frog.rageTimer > 0 ? '#ff5252' : '#279af1';
  ctx.fillRect(-14, -34, 28, 22);
  ctx.fillStyle = '#74d647';
  ctx.fillRect(-8, -30, 16, 15);

  ctx.fillStyle = frog.rageTimer > 0 ? '#ff5252' : '#279af1';
  ctx.fillRect(-16, -48, 32, 16);

  ctx.fillStyle = '#bdc3c7';
  ctx.fillRect(-18, -54, 36, 12);
  ctx.fillStyle = '#ecf0f1';
  ctx.fillRect(-14, -52, 24, 4);
  ctx.fillStyle = '#95a5a6';
  ctx.fillRect(2, -46, 5, 10);

  ctx.fillStyle = '#ffe700';
  ctx.fillRect(6, -44, 7, 6);
  ctx.fillStyle = '#000';
  ctx.fillRect(10, -43, 3, 4);

  const isRage = frog.rageTimer > 0;
  const bladeLen = isRage ? 76 : 62;

  ctx.save();
  if (frog.attackTimer > 0) {
    ctx.translate(14, -26);
    ctx.rotate(0.45);
  } else {
    ctx.translate(12, -26);
    ctx.rotate(-0.5);
  }

  ctx.fillStyle = '#f1c40f';
  ctx.fillRect(-4, -5, 14, 10);
  ctx.fillStyle = isRage ? '#ff3b30' : '#4deeea';
  ctx.fillRect(10, -6, bladeLen + 4, 12);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(10, -3, bladeLen, 6);
  ctx.restore();

  if (frog.attackTimer > 2) {
    const arcRadius = isRage ? 115 : 92;
    ctx.save();
    ctx.strokeStyle = isRage ? 'rgba(255, 59, 48, 0.65)' : 'rgba(77, 238, 234, 0.65)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(8, -26, arcRadius, -1.25, 0.85);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(8, -26, arcRadius + 4, -1.2, 0.8);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawBossFly() {
  if (!boss.active) return;

  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.scale(1.35, 1.35);

  const wingOffset = Math.sin(boss.wingFrame) * 16;
  ctx.fillStyle = 'rgba(220, 245, 255, 0.78)';
  ctx.beginPath();
  ctx.ellipse(-20, -34 + wingOffset * 0.5, 32, 16, -0.4, 0, Math.PI * 2);
  ctx.ellipse(22, -34 - wingOffset * 0.5, 32, 16, 0.4, 0, Math.PI * 2);
  ctx.fill();

  const isFlashing = boss.flashTimer > 0;

  ctx.fillStyle = isFlashing ? '#ffffff' : '#2d5a27';
  ctx.beginPath();
  ctx.ellipse(16, 10, 30, 24, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isFlashing ? '#ffffff' : '#193316';
  ctx.fillRect(6, -6, 6, 34);
  ctx.fillRect(20, -4, 6, 30);

  ctx.fillStyle = isFlashing ? '#ffffff' : '#3e7a36';
  ctx.beginPath();
  ctx.arc(-12, 0, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isFlashing ? '#ffff00' : '#ff1e1e';
  ctx.beginPath();
  ctx.ellipse(-22, -6, 12, 15, -0.2, 0, Math.PI * 2);
  ctx.ellipse(-6, -8, 11, 14, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff9999';
  ctx.fillRect(-25, -12, 4, 5);
  ctx.fillRect(-9, -13, 4, 5);

  ctx.fillStyle = '#d4e157';
  ctx.fillRect(-26, 12, 6, 14);
  ctx.fillRect(-14, 14, 6, 14);

  ctx.restore();
}

function drawShockwaves() {
  shockwaves.forEach((sw) => {
    ctx.save();
    ctx.strokeStyle = sw.color;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, -1.1, 1.1);
    ctx.stroke();
    ctx.restore();
  });
}

function drawHUD() {
  ctx.textAlign = 'center';
  if (stage === 1) {
    const remaining = Math.max(0, Math.ceil(BOSS_SPAWN_SECONDS - elapsedSeconds));
    ctx.font = '13px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffe700';
    ctx.fillText(`STAGE 1: BOSS IN ${remaining}s`, canvas.width / 2, 28);

    const barW = 340;
    const barH = 14;
    const barX = (canvas.width - barW) / 2;
    const barY = 36;
    ctx.fillStyle = '#111';
    ctx.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);
    ctx.fillStyle = '#4deeea';
    ctx.fillRect(barX, barY, barW * Math.min(1, elapsedSeconds / BOSS_SPAWN_SECONDS), barH);
  } else {
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = '#ff5252';
    ctx.fillText(`GIANT BOSS FLY HP: ${boss.hp}/${boss.maxHp}`, canvas.width / 2, 28);

    const barW = 420;
    const barH = 18;
    const barX = (canvas.width - barW) / 2;
    const barY = 36;

    ctx.fillStyle = '#111';
    ctx.fillRect(barX - 4, barY - 4, barW + 8, barH + 8);
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 3;
    ctx.strokeRect(barX - 4, barY - 4, barW + 8, barH + 8);

    const hpRatio = boss.hp / boss.maxHp;
    ctx.fillStyle = hpRatio > 0.35 ? '#e74c3c' : '#ff9f1c';
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
  }

  ctx.textAlign = 'left';
  ctx.font = '11px "Press Start 2P", monospace';
  ctx.fillStyle = '#4deeea';
  ctx.fillText('FROG HP', 24, 28);
  ctx.fillStyle = '#111';
  ctx.fillRect(24, 36, 120, 12);
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(24, 36, 120 * (frog.hp / frog.maxHp), 12);

  if (frog.shieldTimer > 0) {
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('SHIELD ON!', 24, 66);
  }
  if (frog.rageTimer > 0) {
    ctx.fillStyle = '#ff3b30';
    ctx.fillText('2X RAGE!', 24, 82);
  }

  ctx.textAlign = 'right';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = '#e6d5c3';
  ctx.fillText('SKILL SLOT', canvas.width - 24, 28);
  if (frog.heldItem) {
    ctx.fillStyle = frog.heldItem.color;
    ctx.fillText(`[${frog.heldItem.shortName}] READY!`, canvas.width - 24, 46);
  } else {
    ctx.fillStyle = '#777';
    ctx.fillText('SLASH AN ITEM', canvas.width - 24, 46);
  }

  if (frog.combo > 0) {
    ctx.textAlign = 'left';
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffe700';
    ctx.fillText('COMBO!', 24, 385);

    ctx.fillStyle = '#ff3b30';
    ctx.fillText(`x${frog.combo}`, 152, 385);

    if (frog.combo >= 5) {
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillStyle = '#ff6b6b';
      ctx.fillText('(Mega Strike!)', 24, 406);
    }
  }
}

function drawPopupsAndParticles() {
  particles.forEach((pt) => {
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
  });

  popups.forEach((p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale, p.scale);
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textAlign = 'center';

    ctx.fillStyle = '#000';
    ctx.fillText(p.text, 3, 3);
    ctx.fillText(p.text, -2, -2);

    ctx.fillStyle = p.color;
    ctx.fillText(p.text, 0, 0);
    ctx.restore();
  });
}

function loop() {
  update();

  ctx.save();
  if (screenShake > 0) {
    const dx = (Math.random() - 0.5) * screenShake;
    const dy = (Math.random() - 0.5) * screenShake;
    ctx.translate(dx, dy);
  }

  drawBackground();
  drawItems();
  drawSmallFlies();
  drawFrogKnight();
  drawBossFly();
  drawShockwaves();
  drawPopupsAndParticles();
  drawHUD();

  ctx.restore();
  requestAnimationFrame(loop);
}

loop();
