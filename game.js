// Frog Knight vs Boss Fly & Spider - Created by Rylan Saw
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const overlay = document.getElementById('overlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlaySubtitle = document.getElementById('overlaySubtitle');
const startBtn = document.getElementById('startBtn');
const resumeBtn = document.getElementById('resumeBtn');
const pauseBtn = document.getElementById('pauseBtn');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const restartBtn = document.getElementById('restartBtn');
const btnAttack = document.getElementById('btnAttack');
const joystickZone = document.getElementById('joystickZone');
const joystickStick = document.getElementById('joystickStick');
const itemSlotButtons = Array.from(document.querySelectorAll('.item-key-slot'));

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
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.linearRampToValueAtTime(55, now + 0.6);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);
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
// Wave Flow:
// 1 = Small Flies (0s to 50s)
// 2 = Giant Boss Fly (at 50s)
// 3 = Small Spiders (after Boss Fly is defeated)
// 4 = Giant Boss Spider (after Small Spiders wave is cleared)
const GROUND_Y = 400;
const BOSS_FLY_SPAWN_SECONDS = 50;
const SMALL_SPIDERS_TO_CLEAR = 8;

let gameRunning = false;
let gamePaused = false;
let pausedAt = 0;
let screenShake = 0;
let startTime = 0;
let elapsedSeconds = 0;
let wavePhase = 1;
let score = 0;
let spidersDefeatedInWave = 0;

const keys = { left: false, right: false, up: false };
let joyX = 0;

let popups = [];
let particles = [];
let shockwaves = [];
let smallFlies = [];
let smallSpiders = [];
let items = [];
let smallFlySpawnTimer = 0;
let smallSpiderSpawnTimer = 0;
let itemSpawnTimer = 180;

// --- ITEM TYPES WITH DEDICATED KEYS ---
const ITEM_TYPES = [
  {
    id: 'HEAL',
    name: 'HEAL POTION',
    shortName: '+HP',
    keys: ['Digit1', 'Numpad1', 'KeyH'],
    color: '#2ecc71',
    desc: '+45 HP RESTORED!'
  },
  {
    id: 'SHIELD',
    name: 'GOLD SHIELD',
    shortName: 'SHD',
    keys: ['Digit2', 'Numpad2', 'KeyS'],
    color: '#f1c40f',
    desc: 'INVINCIBLE SHIELD!'
  },
  {
    id: 'MEGA_WAVE',
    name: 'SONIC WAVE',
    shortName: 'WAV',
    keys: ['Digit3', 'Numpad3', 'KeyW'],
    color: '#4deeea',
    desc: 'GIANT SLASH WAVE!'
  },
  {
    id: 'THUNDER',
    name: 'THUNDER ORB',
    shortName: 'ZAP',
    keys: ['Digit4', 'Numpad4', 'KeyT'],
    color: '#ffe700',
    desc: 'LIGHTNING STRIKE!'
  },
  {
    id: 'RAGE',
    name: 'DRAGON RAGE',
    shortName: '2X',
    keys: ['Digit5', 'Numpad5', 'KeyR'],
    color: '#ff3b30',
    desc: '2X GIANT SLASH!'
  }
];

const frog = {
  x: 200,
  y: GROUND_Y,
  w: 44,
  h: 48,
  vx: 0,
  vy: 0,
  speed: 5.2,
  jumpPower: -13.5,
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
  unlockedItems: {
    HEAL: false,
    SHIELD: false,
    MEGA_WAVE: false,
    THUNDER: false,
    RAGE: false
  }
};

const bossFly = {
  active: false,
  defeated: false,
  x: 720,
  y: -100,
  w: 112,
  h: 98,
  hp: 520,
  maxHp: 520,
  vx: -2,
  vy: 0,
  state: 'entering',
  stateTimer: 80,
  wingFrame: 0,
  flashTimer: 0
};

const bossSpider = {
  active: false,
  defeated: false,
  x: 760,
  y: GROUND_Y,
  w: 136,
  h: 96,
  hp: 750,
  maxHp: 750,
  vx: -2.4,
  vy: 0,
  state: 'walk',
  stateTimer: 95,
  legFrame: 0,
  flashTimer: 0
};

function syncItemSlotsUI() {
  itemSlotButtons.forEach((btn) => {
    const id = btn.dataset.itemId;
    const itemDef = ITEM_TYPES.find((it) => it.id === id);
    const unlocked = Boolean(frog.unlockedItems[id]);
    btn.disabled = !unlocked;
    btn.classList.toggle('unlocked', unlocked);
    btn.classList.toggle('locked', !unlocked);
    if (itemDef) {
      btn.style.setProperty('--slot-color', itemDef.color);
    }
  });
}

function togglePause(forceState = null) {
  if (!gameRunning) return;
  const nextPaused = forceState !== null ? forceState : !gamePaused;
  if (nextPaused === gamePaused) return;

  if (nextPaused) {
    gamePaused = true;
    pausedAt = performance.now();
    pauseOverlay.classList.remove('hidden');
  } else {
    gamePaused = false;
    startTime += performance.now() - pausedAt;
    pauseOverlay.classList.add('hidden');
  }
}

function resetGame() {
  frog.x = 200;
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
  Object.keys(frog.unlockedItems).forEach((k) => {
    frog.unlockedItems[k] = false;
  });
  syncItemSlotsUI();

  bossFly.active = false;
  bossFly.defeated = false;
  bossFly.x = 720;
  bossFly.y = -100;
  bossFly.hp = 520;
  bossFly.maxHp = 520;
  bossFly.state = 'entering';
  bossFly.flashTimer = 0;

  bossSpider.active = false;
  bossSpider.defeated = false;
  bossSpider.x = 760;
  bossSpider.y = GROUND_Y;
  bossSpider.hp = 750;
  bossSpider.maxHp = 750;
  bossSpider.state = 'walk';
  bossSpider.flashTimer = 0;

  smallFlies = [];
  smallSpiders = [];
  items = [];
  popups = [];
  particles = [];
  shockwaves = [];

  wavePhase = 1;
  score = 0;
  spidersDefeatedInWave = 0;
  gamePaused = false;
  pauseOverlay.classList.add('hidden');

  startTime = performance.now();
  elapsedSeconds = 0;
  smallFlySpawnTimer = 25;
  smallSpiderSpawnTimer = 40;
  itemSpawnTimer = 130;

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
    y: 130 + Math.random() * 190,
    w: 36,
    h: 32,
    hp: 24,
    maxHp: 24,
    vx: fromLeft ? 2.6 + Math.random() * 1.5 : -(2.6 + Math.random() * 1.5),
    vy: 0,
    wingFrame: Math.random() * 6,
    flashTimer: 0,
    swoopCooldown: 60 + Math.random() * 90
  });
}

function spawnSmallSpider() {
  const fromLeft = Math.random() < 0.45;
  smallSpiders.push({
    id: Math.random(),
    x: fromLeft ? -35 : canvas.width + 35,
    y: GROUND_Y,
    w: 44,
    h: 34,
    hp: 30,
    maxHp: 30,
    vx: fromLeft ? 2.7 + Math.random() * 1.3 : -(2.7 + Math.random() * 1.3),
    vy: 0,
    legFrame: Math.random() * 6,
    flashTimer: 0,
    hopCooldown: 55 + Math.random() * 75
  });
}

function spawnItem(specificType = null) {
  if (items.length >= 3) return;
  const type = specificType || ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
  items.push({
    id: Math.random(),
    type,
    x: 150 + Math.random() * (canvas.width - 300),
    y: 150 + Math.random() * 185,
    bobOffset: Math.random() * Math.PI * 2,
    life: 720
  });
}

function spawnPopup(text, x, y, color = '#ffffff', scale = 1) {
  popups.push({
    text,
    x,
    y,
    vy: -1.35,
    life: 48,
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
  if (!gameRunning || gamePaused) return;
  if (frog.grounded) {
    frog.vy = frog.jumpPower;
    frog.grounded = false;
    playSound('jump');
    spawnPopup('SWISH!', frog.x + 10, frog.y - 45, '#4deeea', 0.85);
  }
}

function triggerSlash() {
  if (!gameRunning || gamePaused) return;
  if (frog.attackCooldown <= 0) {
    frog.attackTimer = 16;
    frog.attackCooldown = 19;
    frog.hitIdsThisSwing.clear();
    playSound('slash');
    const isRage = frog.rageTimer > 0;
    spawnPopup(
      isRage ? 'MEGA SLASH!' : 'GIANT SLASH!',
      frog.x + frog.facing * 55,
      frog.y - 72,
      isRage ? '#ff3b30' : '#ffffff',
      isRage ? 1.15 : 1.0
    );
  }
}

function activateItemById(itemId) {
  if (!gameRunning || gamePaused) return;
  if (!frog.unlockedItems[itemId]) return;

  const itemDef = ITEM_TYPES.find((it) => it.id === itemId);
  if (!itemDef) return;

  frog.unlockedItems[itemId] = false;
  syncItemSlotsUI();
  playSound('itemUse');
  screenShake = 10;

  spawnPopup(itemDef.desc, frog.x, frog.y - 78, itemDef.color, 1.1);
  spawnSparks(frog.x, frog.y - 30, itemDef.color, 26);

  if (itemId === 'HEAL') {
    frog.hp = Math.min(frog.maxHp, frog.hp + 45);
  } else if (itemId === 'SHIELD') {
    frog.shieldTimer = 420;
  } else if (itemId === 'RAGE') {
    frog.rageTimer = 480;
  } else if (itemId === 'MEGA_WAVE') {
    shockwaves.push({
      x: frog.x + frog.facing * 45,
      y: frog.y - 52,
      vx: frog.facing * 12,
      radius: 85,
      damage: 95,
      life: 75,
      color: '#4deeea'
    });
  } else if (itemId === 'THUNDER') {
    smallFlies.forEach((fly) => {
      fly.hp = 0;
      score += 50;
      spawnSparks(fly.x, fly.y, '#ffe700', 15);
      spawnPopup('ZAP!', fly.x, fly.y - 20, '#ffe700', 1.0);
    });
    smallSpiders.forEach((sp) => {
      sp.hp = 0;
      score += 60;
      spidersDefeatedInWave++;
      spawnSparks(sp.x, sp.y - 15, '#ffe700', 15);
      spawnPopup('ZAP!', sp.x, sp.y - 30, '#ffe700', 1.0);
    });
    if (bossFly.active) {
      bossFly.hp = Math.max(0, bossFly.hp - 105);
      bossFly.flashTimer = 14;
      spawnSparks(bossFly.x, bossFly.y, '#ffe700', 28);
      spawnPopup('-105 ZAP!', bossFly.x, bossFly.y - 50, '#ffe700', 1.3);
    }
    if (bossSpider.active) {
      bossSpider.hp = Math.max(0, bossSpider.hp - 115);
      bossSpider.flashTimer = 14;
      spawnSparks(bossSpider.x, bossSpider.y - 30, '#ffe700', 28);
      spawnPopup('-115 ZAP!', bossSpider.x, bossSpider.y - 65, '#ffe700', 1.3);
      if (bossSpider.hp <= 0) {
        score += 2000;
        endGame(true);
      }
    }
  }
}

function handleSmallSpiderDefeated(sp) {
  score += 60;
  spidersDefeatedInWave++;
  if (Math.random() < 0.35) spawnItem();

  if (wavePhase === 3 && spidersDefeatedInWave >= SMALL_SPIDERS_TO_CLEAR) {
    smallSpiders = [];
    wavePhase = 4;
    bossSpider.active = true;
    bossSpider.x = canvas.width - 130;
    bossSpider.y = GROUND_Y;
    bossSpider.state = 'walk';
    bossSpider.stateTimer = 80;
    screenShake = 20;
    playSound('bossRoar');
    spawnPopup('WARNING! GIANT BOSS SPIDER!', canvas.width / 2, 180, '#ff3b30', 1.35);
  }
}

// --- CONTROLS: KEYBOARD ---
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' || e.code === 'Escape') {
    e.preventDefault();
    togglePause();
    return;
  }

  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
    if (!keys.up) triggerJump();
    keys.up = true;
  }
  if (e.code === 'KeyZ' || e.code === 'KeyJ') {
    triggerSlash();
  }

  // Dedicated per-item keys
  ITEM_TYPES.forEach((itemDef) => {
    if (itemDef.keys.includes(e.code)) {
      activateItemById(itemDef.id);
    }
  });
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.up = false;
});

// --- CONTROLS: VIRTUAL JOYSTICK ---
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

btnAttack.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  initAudio();
  btnAttack.classList.add('pressed');
  triggerSlash();
});
btnAttack.addEventListener('pointerup', () => btnAttack.classList.remove('pressed'));
btnAttack.addEventListener('pointerleave', () => btnAttack.classList.remove('pressed'));

itemSlotButtons.forEach((btn) => {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    initAudio();
    if (!btn.disabled) {
      btn.classList.add('pressed');
      activateItemById(btn.dataset.itemId);
    }
  });
  btn.addEventListener('pointerup', () => btn.classList.remove('pressed'));
  btn.addEventListener('pointerleave', () => btn.classList.remove('pressed'));
});

pauseBtn.addEventListener('click', () => {
  initAudio();
  togglePause();
});

resumeBtn.addEventListener('click', () => {
  initAudio();
  togglePause(false);
});

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
  if (!gameRunning || gamePaused) return;

  if (screenShake > 0) screenShake--;

  // Wave 1 (0-50s Small Flies) -> Wave 2 (50s Giant Boss Fly)
  if (wavePhase === 1) {
    elapsedSeconds = (performance.now() - startTime) / 1000;
    if (elapsedSeconds >= BOSS_FLY_SPAWN_SECONDS) {
      wavePhase = 2;
      bossFly.active = true;
      bossFly.state = 'entering';
      bossFly.x = 700;
      bossFly.y = -90;
      screenShake = 18;
      playSound('bossRoar');
      spawnPopup('WARNING! GIANT BOSS FLY!', canvas.width / 2, 180, '#ff3b30', 1.35);
    }
  }

  // Frog Movement
  let moveDir = 0;
  if (keys.left) moveDir -= 1;
  if (keys.right) moveDir += 1;
  if (Math.abs(joyX) > 0.15) moveDir = joyX;

  frog.vx = moveDir * frog.speed;
  if (moveDir > 0.1) frog.facing = 1;
  if (moveDir < -0.1) frog.facing = -1;

  frog.x += frog.vx;
  frog.x = Math.max(70, Math.min(canvas.width - 110, frog.x));

  frog.vy += 0.65;
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

  // Spawn Small Flies in Wave 1 & Wave 2
  if (wavePhase === 1 || wavePhase === 2) {
    smallFlySpawnTimer--;
    if (smallFlySpawnTimer <= 0) {
      const maxFlies = wavePhase === 1 ? 6 : 2;
      if (smallFlies.length < maxFlies) spawnSmallFly();
      smallFlySpawnTimer = wavePhase === 1 ? 80 : 220;
    }
  }

  // Spawn Small Spiders in Wave 3 (after Boss Fly dies)
  if (wavePhase === 3) {
    smallSpiderSpawnTimer--;
    if (smallSpiderSpawnTimer <= 0) {
      const remainingNeeded = SMALL_SPIDERS_TO_CLEAR - spidersDefeatedInWave;
      if (smallSpiders.length < Math.min(4, remainingNeeded)) {
        spawnSmallSpider();
      }
      smallSpiderSpawnTimer = 75;
    }
  }

  // Spawn Items periodically
  itemSpawnTimer--;
  if (itemSpawnTimer <= 0) {
    spawnItem();
    itemSpawnTimer = 240;
  }

  // --- GIANT SLASH HITBOX ---
  if (frog.attackTimer > 0) {
    const isRage = frog.rageTimer > 0;
    const slashReach = isRage ? 185 : 148;
    const slashHeight = isRage ? 150 : 122;
    const swordX = frog.facing === 1 ? frog.x + 5 : frog.x - slashReach - 5;
    const swordY = frog.y - slashHeight + 10;

    // 1. Slash Floating Items -> Unlock its dedicated key slot!
    items.forEach((it) => {
      if (
        !frog.hitIdsThisSwing.has(it.id) &&
        swordX < it.x + 26 &&
        swordX + slashReach > it.x - 26 &&
        swordY < it.y + 26 &&
        swordY + slashHeight > it.y - 26
      ) {
        frog.hitIdsThisSwing.add(it.id);
        it.life = 0;
        frog.unlockedItems[it.type.id] = true;
        syncItemSlotsUI();
        playSound('itemGet');
        const keyHint = it.type.keys.includes('Digit1')
          ? '[1 / H]'
          : it.type.keys.includes('Digit2')
          ? '[2 / S]'
          : it.type.keys.includes('Digit3')
          ? '[3 / W]'
          : it.type.keys.includes('Digit4')
          ? '[4 / T]'
          : '[5 / R]';
        spawnPopup(`GOT ${it.type.shortName} ${keyHint}!`, it.x, it.y - 25, it.type.color, 1.0);
        spawnSparks(it.x, it.y, it.type.color, 18);
      }
    });

    // 2. Slash Small Flies
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
        fly.hp -= isRage ? 30 : 15;
        fly.flashTimer = 6;
        fly.vx = frog.facing * 5.5;
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

    // 3. Slash Small Spiders (behaving like small flies in ground/hop motion)
    smallSpiders.forEach((sp) => {
      if (
        !frog.hitIdsThisSwing.has(sp.id) &&
        swordX < sp.x + sp.w / 2 &&
        swordX + slashReach > sp.x - sp.w / 2 &&
        swordY < sp.y + 10 &&
        swordY + slashHeight > sp.y - sp.h - 15
      ) {
        frog.hitIdsThisSwing.add(sp.id);
        frog.combo++;
        frog.comboTimer = 150;
        sp.hp -= isRage ? 32 : 16;
        sp.flashTimer = 6;
        sp.vx = frog.facing * 6;
        sp.vy = -5.5;
        screenShake = 6;
        playSound('hit');
        spawnPopup('KAPOW!', sp.x, sp.y - 40, '#c084fc', 1.0);
        spawnSparks(sp.x, sp.y - 16, '#c084fc', 12);
        if (sp.hp <= 0) {
          handleSmallSpiderDefeated(sp);
        }
      }
    });

    // 4. Slash Giant Boss Fly (Wave 2)
    if (
      bossFly.active &&
      !frog.hitIdsThisSwing.has('bossFly') &&
      swordX < bossFly.x + bossFly.w / 2 &&
      swordX + slashReach > bossFly.x - bossFly.w / 2 &&
      swordY < bossFly.y + bossFly.h / 2 &&
      swordY + slashHeight > bossFly.y - bossFly.h / 2
    ) {
      frog.hitIdsThisSwing.add('bossFly');
      frog.combo++;
      frog.comboTimer = 150;
      const isMega = frog.combo >= 5 || isRage;
      const damage = isMega ? 36 : 20;
      bossFly.hp = Math.max(0, bossFly.hp - damage);
      bossFly.flashTimer = 8;
      screenShake = isMega ? 12 : 6;
      playSound(isMega ? 'mega' : 'hit');
      spawnPopup(isMega ? 'MEGA KAPOW!' : 'KAPOW!', bossFly.x - 20, bossFly.y - 50, isMega ? '#ff3b30' : '#4deeea', isMega ? 1.3 : 1.1);
      spawnSparks(bossFly.x, bossFly.y, isMega ? '#ffe700' : '#ff9f1c', isMega ? 22 : 14);

      if (bossFly.hp <= 0 && !bossFly.defeated) {
        bossFly.defeated = true;
        bossFly.active = false;
        smallFlies = [];
        score += 1000;
        wavePhase = 3;
        spidersDefeatedInWave = 0;
        smallSpiderSpawnTimer = 25;
        screenShake = 18;
        playSound('bossRoar');
        spawnPopup('BOSS FLY DOWN! SPIDERS INCOMING!', canvas.width / 2, 160, '#c084fc', 1.25);
        spawnSmallSpider();
        spawnSmallSpider();
      }
    }

    // 5. Slash Giant Boss Spider (Wave 4)
    if (
      bossSpider.active &&
      !frog.hitIdsThisSwing.has('bossSpider') &&
      swordX < bossSpider.x + bossSpider.w / 2 &&
      swordX + slashReach > bossSpider.x - bossSpider.w / 2 &&
      swordY < bossSpider.y + 15 &&
      swordY + slashHeight > bossSpider.y - bossSpider.h - 20
    ) {
      frog.hitIdsThisSwing.add('bossSpider');
      frog.combo++;
      frog.comboTimer = 150;
      const isMega = frog.combo >= 5 || isRage;
      const damage = isMega ? 38 : 22;
      bossSpider.hp = Math.max(0, bossSpider.hp - damage);
      bossSpider.flashTimer = 8;
      screenShake = isMega ? 13 : 7;
      playSound(isMega ? 'mega' : 'hit');
      spawnPopup(isMega ? 'MEGA KAPOW!' : 'KAPOW!', bossSpider.x - 20, bossSpider.y - 70, isMega ? '#ff3b30' : '#c084fc', isMega ? 1.35 : 1.15);
      spawnSparks(bossSpider.x, bossSpider.y - 35, isMega ? '#ffe700' : '#c084fc', isMega ? 24 : 15);

      if (bossSpider.hp <= 0 && !bossSpider.defeated) {
        bossSpider.defeated = true;
        bossSpider.active = false;
        score += 2000;
        endGame(true);
      }
    }
  }

  // Shockwaves
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
    smallSpiders.forEach((sp) => {
      if (Math.hypot(sp.x - sw.x, sp.y - 16 - sw.y) < sw.radius) {
        sp.hp = 0;
        handleSmallSpiderDefeated(sp);
        spawnSparks(sp.x, sp.y - 16, '#4deeea', 12);
      }
    });
    if (bossFly.active && Math.hypot(bossFly.x - sw.x, bossFly.y - sw.y) < sw.radius + 35) {
      bossFly.hp = Math.max(0, bossFly.hp - sw.damage);
      bossFly.flashTimer = 12;
      sw.life = 0;
      spawnPopup(`-${sw.damage} WAVE!`, bossFly.x, bossFly.y - 45, '#4deeea', 1.3);
      spawnSparks(bossFly.x, bossFly.y, '#4deeea', 24);
      if (bossFly.hp <= 0 && !bossFly.defeated) {
        bossFly.defeated = true;
        bossFly.active = false;
        smallFlies = [];
        score += 1000;
        wavePhase = 3;
        spidersDefeatedInWave = 0;
        spawnPopup('BOSS FLY DOWN! SPIDERS INCOMING!', canvas.width / 2, 160, '#c084fc', 1.25);
      }
    }
    if (bossSpider.active && Math.hypot(bossSpider.x - sw.x, bossSpider.y - 35 - sw.y) < sw.radius + 45) {
      bossSpider.hp = Math.max(0, bossSpider.hp - sw.damage);
      bossSpider.flashTimer = 12;
      sw.life = 0;
      spawnPopup(`-${sw.damage} WAVE!`, bossSpider.x, bossSpider.y - 65, '#4deeea', 1.3);
      spawnSparks(bossSpider.x, bossSpider.y - 35, '#4deeea', 24);
      if (bossSpider.hp <= 0) {
        score += 2000;
        endGame(true);
      }
    }
  });
  shockwaves = shockwaves.filter((sw) => sw.life > 0);

  // Small Flies AI
  smallFlies.forEach((fly) => {
    fly.wingFrame += 0.6;
    if (fly.flashTimer > 0) fly.flashTimer--;
    const dirToFrog = frog.x > fly.x ? 1 : -1;
    fly.vx += dirToFrog * 0.08;
    fly.vx = Math.max(-3.6, Math.min(3.6, fly.vx));
    fly.x += fly.vx;
    fly.y += Math.sin(Date.now() * 0.008 + fly.id * 10) * 1.4;

    fly.swoopCooldown--;
    if (fly.swoopCooldown <= 0) {
      fly.swoopCooldown = 120;
      fly.y = Math.min(GROUND_Y - 30, fly.y + 35);
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

  // Small Spiders AI (Mirroring small flies behavior with ground/hop movement)
  smallSpiders.forEach((sp) => {
    sp.legFrame += 0.45;
    if (sp.flashTimer > 0) sp.flashTimer--;

    const dirToFrog = frog.x > sp.x ? 1 : -1;
    sp.vx += dirToFrog * 0.1;
    sp.vx = Math.max(-3.8, Math.min(3.8, sp.vx));
    sp.x += sp.vx;

    sp.hopCooldown--;
    if (sp.hopCooldown <= 0 && sp.y >= GROUND_Y - 1) {
      sp.hopCooldown = 95 + Math.random() * 55;
      sp.vy = -8.5;
      playSound('buzz');
    }

    sp.vy += 0.55;
    sp.y += sp.vy;
    if (sp.y >= GROUND_Y) {
      sp.y = GROUND_Y;
      sp.vy = 0;
    }

    if (
      frog.invuln <= 0 &&
      frog.shieldTimer <= 0 &&
      Math.abs(frog.x - sp.x) < 32 &&
      Math.abs(frog.y - 18 - (sp.y - 14)) < 28
    ) {
      frog.hp = Math.max(0, frog.hp - 12);
      frog.invuln = 50;
      frog.combo = 0;
      screenShake = 7;
      playSound('hurt');
      spawnPopup('OUCH!', frog.x, frog.y - 55, '#ff3b30', 0.95);
      if (frog.hp <= 0) endGame(false);
    }
  });
  smallSpiders = smallSpiders.filter((sp) => sp.hp > 0);

  // Items
  items.forEach((it) => {
    it.life--;
  });
  items = items.filter((it) => it.life > 0);

  // Giant Boss Fly AI (Wave 2)
  if (bossFly.active) {
    bossFly.wingFrame += 0.45;
    if (bossFly.flashTimer > 0) bossFly.flashTimer--;

    if (bossFly.state === 'entering') {
      bossFly.y += (175 - bossFly.y) * 0.05;
      if (Math.abs(bossFly.y - 175) < 5) {
        bossFly.state = 'hover';
        bossFly.stateTimer = 75;
      }
    } else if (bossFly.state === 'hover') {
      const targetX = canvas.width / 2 + Math.cos(Date.now() * 0.0022) * 300;
      const targetY = 165 + Math.sin(Date.now() * 0.005) * 40;
      bossFly.x += (targetX - bossFly.x) * 0.05;
      bossFly.y += (targetY - bossFly.y) * 0.05;

      bossFly.stateTimer--;
      if (bossFly.stateTimer <= 0) {
        bossFly.state = 'swoop';
        bossFly.stateTimer = 65;
        const angle = Math.atan2(frog.y - 25 - bossFly.y, frog.x - bossFly.x);
        bossFly.vx = Math.cos(angle) * 7.6;
        bossFly.vy = Math.sin(angle) * 7.6;
        playSound('buzz');
        spawnPopup('BUZZZ!', bossFly.x + 30, bossFly.y - 45, '#ffe700', 1.15);
      }
    } else if (bossFly.state === 'swoop') {
      bossFly.x += bossFly.vx;
      bossFly.y += bossFly.vy;
      if (bossFly.y > GROUND_Y - 35) {
        bossFly.y = GROUND_Y - 35;
        bossFly.vy = -3.4;
      }
      bossFly.stateTimer--;
      if (bossFly.stateTimer <= 0) {
        bossFly.state = 'hover';
        bossFly.stateTimer = 80;
      }
    }

    if (
      frog.invuln <= 0 &&
      frog.shieldTimer <= 0 &&
      Math.abs(frog.x - bossFly.x) < 54 &&
      Math.abs(frog.y - 24 - bossFly.y) < 54
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

  // Giant Boss Spider AI (Wave 4)
  if (bossSpider.active) {
    bossSpider.legFrame += 0.35;
    if (bossSpider.flashTimer > 0) bossSpider.flashTimer--;

    bossSpider.stateTimer--;
    if (bossSpider.state === 'walk') {
      const dir = frog.x > bossSpider.x ? 1 : -1;
      bossSpider.vx += dir * 0.14;
      bossSpider.vx = Math.max(-4.2, Math.min(4.2, bossSpider.vx));
      bossSpider.x += bossSpider.vx;
      bossSpider.x = Math.max(120, Math.min(canvas.width - 120, bossSpider.x));

      if (bossSpider.stateTimer <= 0) {
        bossSpider.state = 'lunge';
        bossSpider.stateTimer = 45;
        bossSpider.vy = -12.5;
        bossSpider.vx = (frog.x > bossSpider.x ? 1 : -1) * 7.5;
        playSound('bossRoar');
        spawnPopup('HISS-LUNGE!', bossSpider.x, bossSpider.y - 85, '#c084fc', 1.2);
      }
    } else if (bossSpider.state === 'lunge') {
      bossSpider.x += bossSpider.vx;
      bossSpider.vy += 0.62;
      bossSpider.y += bossSpider.vy;
      if (bossSpider.y >= GROUND_Y) {
        bossSpider.y = GROUND_Y;
        bossSpider.vy = 0;
        screenShake = 11;
        spawnSparks(bossSpider.x, GROUND_Y, '#c084fc', 16);
      }
      if (bossSpider.stateTimer <= 0 && bossSpider.y >= GROUND_Y) {
        bossSpider.state = 'walk';
        bossSpider.stateTimer = 85;
      }
    }

    if (
      frog.invuln <= 0 &&
      frog.shieldTimer <= 0 &&
      Math.abs(frog.x - bossSpider.x) < 62 &&
      Math.abs(frog.y - 24 - (bossSpider.y - 34)) < 54
    ) {
      frog.hp = Math.max(0, frog.hp - 22);
      frog.invuln = 55;
      frog.combo = 0;
      screenShake = 10;
      playSound('hurt');
      spawnPopup('OUCH!', frog.x - 10, frog.y - 60, '#ff3b30', 1.1);
      spawnSparks(frog.x, frog.y - 20, '#ff3b30', 16);
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
  gamePaused = false;
  pauseOverlay.classList.add('hidden');
  overlay.classList.remove('hidden');
  if (victory) {
    overlayTitle.textContent = 'VICTORY!';
    overlayTitle.style.color = '#ffe700';
    overlaySubtitle.textContent = `ALL BOSSES DEFEATED! SCORE: ${score}`;
  } else {
    overlayTitle.textContent = 'GAME OVER';
    overlayTitle.style.color = '#ff3b30';
    overlaySubtitle.textContent = 'TRY AGAIN, FROG KNIGHT!';
  }
  startBtn.textContent = 'PLAY AGAIN';
}

// --- DRAWING & 16-BIT PIXEL ART RENDERING ---
function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (wavePhase === 2) {
    grad.addColorStop(0, '#240f16');
    grad.addColorStop(0.6, '#331d27');
    grad.addColorStop(1, '#0c1c12');
  } else if (wavePhase === 3 || wavePhase === 4) {
    grad.addColorStop(0, '#180e29');
    grad.addColorStop(0.6, '#27193d');
    grad.addColorStop(1, '#0d1424');
  } else {
    grad.addColorStop(0, '#0f2318');
    grad.addColorStop(0.6, '#1b3b28');
    grad.addColorStop(1, '#0c1c12');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Background Trees
  ctx.fillStyle = '#12291c';
  const treePositions = [60, 210, 380, 580, 760, 890];
  treePositions.forEach((tx, idx) => {
    const w = 42 + (idx % 3) * 14;
    ctx.fillRect(tx, 0, w, 380);
    ctx.fillStyle = '#1b3d29';
    ctx.fillRect(tx - 8, 0, 6, 150 + (idx * 25) % 100);
    ctx.fillRect(tx + w + 4, 0, 5, 130 + (idx * 35) % 90);
    ctx.fillStyle = '#12291c';
  });

  // Swamp Water below log
  ctx.fillStyle = '#143326';
  ctx.fillRect(0, GROUND_Y + 8, canvas.width, 95);
  ctx.fillStyle = '#24543e';
  for (let i = 0; i < 14; i++) {
    const wx = (i * 80 + Date.now() * 0.02) % canvas.width;
    ctx.fillRect(wx, GROUND_Y + 28 + (i % 3) * 20, 52, 4);
  }

  // Mossy Log Platform
  ctx.fillStyle = '#4a3219';
  ctx.fillRect(50, GROUND_Y, canvas.width - 100, 38);
  ctx.fillStyle = '#2e1d0d';
  ctx.fillRect(50, GROUND_Y + 24, canvas.width - 100, 14);

  ctx.fillStyle = '#49a038';
  ctx.fillRect(56, GROUND_Y - 4, canvas.width - 112, 11);
  ctx.fillStyle = '#74d647';
  for (let x = 70; x < canvas.width - 80; x += 36) {
    ctx.fillRect(x, GROUND_Y - 7, 20, 5);
  }
}

function drawItems() {
  items.forEach((it) => {
    const bobY = it.y + Math.sin(Date.now() * 0.006 + it.bobOffset) * 6;
    ctx.save();
    ctx.translate(it.x, bobY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = it.type.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = it.type.color;
    ctx.fillRect(-12, -12, 24, 24);

    ctx.fillStyle = '#000';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(it.type.shortName, 0, 3);

    ctx.fillStyle = '#fff';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText('SLASH ME!', 0, -27);

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

function drawSmallSpiders() {
  smallSpiders.forEach((sp) => {
    ctx.save();
    ctx.translate(sp.x, sp.y);
    const dir = sp.vx >= 0 ? 1 : -1;
    ctx.scale(dir, 1);

    const legSwing = Math.sin(sp.legFrame) * 5;
    ctx.strokeStyle = sp.flashTimer > 0 ? '#ffffff' : '#6b21a8';
    ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      const lx = i * 9;
      ctx.beginPath();
      ctx.moveTo(lx, -12);
      ctx.lineTo(lx - 8 + legSwing * i, 0);
      ctx.moveTo(lx, -12);
      ctx.lineTo(lx + 8 - legSwing * i, 0);
      ctx.stroke();
    }

    ctx.fillStyle = sp.flashTimer > 0 ? '#ffffff' : '#4c1d95';
    ctx.beginPath();
    ctx.ellipse(0, -15, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff2a55';
    ctx.fillRect(6, -18, 4, 4);
    ctx.fillRect(11, -18, 4, 4);

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
  const bladeLen = isRage ? 82 : 66;

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
    const arcRadius = isRage ? 125 : 102;
    ctx.save();
    ctx.strokeStyle = isRage ? 'rgba(255, 59, 48, 0.65)' : 'rgba(77, 238, 234, 0.65)';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(8, -26, arcRadius, -1.25, 0.85);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(8, -26, arcRadius + 5, -1.2, 0.8);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawBossFly() {
  if (!bossFly.active) return;

  ctx.save();
  ctx.translate(bossFly.x, bossFly.y);
  ctx.scale(1.38, 1.38);

  const wingOffset = Math.sin(bossFly.wingFrame) * 16;
  ctx.fillStyle = 'rgba(220, 245, 255, 0.78)';
  ctx.beginPath();
  ctx.ellipse(-20, -34 + wingOffset * 0.5, 32, 16, -0.4, 0, Math.PI * 2);
  ctx.ellipse(22, -34 - wingOffset * 0.5, 32, 16, 0.4, 0, Math.PI * 2);
  ctx.fill();

  const isFlashing = bossFly.flashTimer > 0;

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

function drawBossSpider() {
  if (!bossSpider.active) return;

  ctx.save();
  ctx.translate(bossSpider.x, bossSpider.y);
  const dir = bossSpider.vx >= 0 ? 1 : -1;
  ctx.scale(dir * 1.45, 1.45);

  const legWave = Math.sin(bossSpider.legFrame) * 8;
  ctx.strokeStyle = bossSpider.flashTimer > 0 ? '#ffffff' : '#7e22ce';
  ctx.lineWidth = 4.5;
  for (let i = -2; i <= 2; i++) {
    const baseX = i * 9;
    ctx.beginPath();
    ctx.moveTo(baseX, -24);
    ctx.lineTo(baseX - 16 + legWave, -38);
    ctx.lineTo(baseX - 24, 0);

    ctx.moveTo(baseX, -24);
    ctx.lineTo(baseX + 16 - legWave, -38);
    ctx.lineTo(baseX + 24, 0);
    ctx.stroke();
  }

  // Abdomen
  ctx.fillStyle = bossSpider.flashTimer > 0 ? '#ffffff' : '#3b0764';
  ctx.beginPath();
  ctx.ellipse(-14, -32, 26, 20, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Hourglass marking
  ctx.fillStyle = '#ff1e1e';
  ctx.fillRect(-20, -37, 10, 10);

  // Head & Thorax
  ctx.fillStyle = bossSpider.flashTimer > 0 ? '#ffffff' : '#581c87';
  ctx.beginPath();
  ctx.arc(12, -24, 18, 0, Math.PI * 2);
  ctx.fill();

  // Glowing Red Eyes
  ctx.fillStyle = '#ff1e1e';
  ctx.fillRect(16, -30, 6, 6);
  ctx.fillRect(24, -30, 6, 6);

  // Fangs
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(18, -12, 4, 9);
  ctx.fillRect(25, -12, 4, 9);

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

  if (wavePhase === 1) {
    const remaining = Math.max(0, Math.ceil(BOSS_FLY_SPAWN_SECONDS - elapsedSeconds));
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffe700';
    ctx.fillText(`WAVE 1: BOSS FLY IN ${remaining}s`, canvas.width / 2, 30);

    const barW = 400;
    const barH = 15;
    const barX = (canvas.width - barW) / 2;
    const barY = 39;
    ctx.fillStyle = '#111';
    ctx.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);
    ctx.fillStyle = '#4deeea';
    ctx.fillRect(barX, barY, barW * Math.min(1, elapsedSeconds / BOSS_FLY_SPAWN_SECONDS), barH);
  } else if (wavePhase === 2 && bossFly.active) {
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = '#ff5252';
    ctx.fillText(`GIANT BOSS FLY HP: ${bossFly.hp}/${bossFly.maxHp}`, canvas.width / 2, 30);

    const barW = 460;
    const barH = 18;
    const barX = (canvas.width - barW) / 2;
    const barY = 39;
    ctx.fillStyle = '#111';
    ctx.fillRect(barX - 4, barY - 4, barW + 8, barH + 8);
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 3;
    ctx.strokeRect(barX - 4, barY - 4, barW + 8, barH + 8);

    const hpRatio = bossFly.hp / bossFly.maxHp;
    ctx.fillStyle = hpRatio > 0.35 ? '#e74c3c' : '#ff9f1c';
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
  } else if (wavePhase === 3) {
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = '#c084fc';
    ctx.fillText(
      `WAVE 3: SPIDERS ${spidersDefeatedInWave}/${SMALL_SPIDERS_TO_CLEAR}`,
      canvas.width / 2,
      30
    );

    const barW = 400;
    const barH = 15;
    const barX = (canvas.width - barW) / 2;
    const barY = 39;
    ctx.fillStyle = '#111';
    ctx.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(barX, barY, barW * Math.min(1, spidersDefeatedInWave / SMALL_SPIDERS_TO_CLEAR), barH);
  } else if (wavePhase === 4 && bossSpider.active) {
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = '#e879f9';
    ctx.fillText(`GIANT BOSS SPIDER HP: ${bossSpider.hp}/${bossSpider.maxHp}`, canvas.width / 2, 30);

    const barW = 460;
    const barH = 18;
    const barX = (canvas.width - barW) / 2;
    const barY = 39;
    ctx.fillStyle = '#111';
    ctx.fillRect(barX - 4, barY - 4, barW + 8, barH + 8);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    ctx.strokeRect(barX - 4, barY - 4, barW + 8, barH + 8);

    const hpRatio = bossSpider.hp / bossSpider.maxHp;
    ctx.fillStyle = hpRatio > 0.35 ? '#9333ea' : '#f43f5e';
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
  }

  // Top Left: Frog HP & Buffs
  ctx.textAlign = 'left';
  ctx.font = '11px "Press Start 2P", monospace';
  ctx.fillStyle = '#4deeea';
  ctx.fillText('FROG HP', 24, 30);
  ctx.fillStyle = '#111';
  ctx.fillRect(24, 39, 130, 13);
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(24, 39, 130 * (frog.hp / frog.maxHp), 13);

  if (frog.shieldTimer > 0) {
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('SHIELD ON!', 24, 70);
  }
  if (frog.rageTimer > 0) {
    ctx.fillStyle = '#ff3b30';
    ctx.fillText('2X RAGE!', 24, 86);
  }

  // Top Right: Score & Author
  ctx.textAlign = 'right';
  ctx.font = '11px "Press Start 2P", monospace';
  ctx.fillStyle = '#ffe700';
  ctx.fillText(`SCORE: ${score}`, canvas.width - 24, 30);
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#74d647';
  ctx.fillText('BY RYLAN SAW', canvas.width - 24, 48);

  // Bottom Left: Combo Counter
  if (frog.combo > 0) {
    ctx.textAlign = 'left';
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffe700';
    ctx.fillText('COMBO!', 24, canvas.height - 42);

    ctx.fillStyle = '#ff3b30';
    ctx.fillText(`x${frog.combo}`, 152, canvas.height - 42);

    if (frog.combo >= 5) {
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillStyle = '#ff6b6b';
      ctx.fillText('(Mega Strike!)', 24, canvas.height - 20);
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
  drawSmallSpiders();
  drawFrogKnight();
  drawBossFly();
  drawBossSpider();
  drawShockwaves();
  drawPopupsAndParticles();
  drawHUD();

  ctx.restore();
  requestAnimationFrame(loop);
}

loop();
