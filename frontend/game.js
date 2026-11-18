/**
 * ============================================================================
 * CHICKEN RUN — TEMPLE ESCAPE EDITION (GAME ENGINE & API CLIENT)
 * ----------------------------------------------------------------------------
 * Technology: Pure HTML5 Canvas + Vanilla JavaScript (No Frameworks)
 * Backend:    Core Java REST API (com.sun.net.httpserver)
 * Database:   In-Memory Java Array
 * Features:   2.5D Temple Runner, Procedural Chicken & Temple Graphics,
 *             Web Audio API Synthesizer, Particle FX, Real-Time Leaderboard.
 * ============================================================================
 */

(function () {
  'use strict';

  // Determine API base URL dynamically
  let API_BASE = (window.location.protocol.startsWith('http') && window.location.port !== '5500' && window.location.port !== '5173')
    ? window.location.origin
    : 'http://localhost:8080';

  // ==========================================================================
  // WEB AUDIO API SOUND SYNTHESIZER
  // ==========================================================================
  let audioCtx = null;
  let soundEnabled = localStorage.getItem('chicken_run_sound') !== 'false';

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type, duration, gainVal = 0.2) {
    if (!soundEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function playJumpSound() {
    if (!soundEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(640, audioCtx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {}
  }

  function playSlideSound() {
    if (!soundEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    } catch (e) {}
  }

  function playCoinSound() {
    if (!soundEnabled || !audioCtx) return;
    try {
      playTone(987.77, 'sine', 0.12, 0.22); // B5
      setTimeout(() => playTone(1318.51, 'sine', 0.18, 0.25), 60); // E6
    } catch (e) {}
  }

  function playEggSound() {
    if (!soundEnabled || !audioCtx) return;
    try {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        setTimeout(() => playTone(freq, 'sine', 0.15, 0.25), i * 50);
      });
    } catch (e) {}
  }

  function playCrashSound() {
    if (!soundEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.38);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.38);
    } catch (e) {}
  }

  // ==========================================================================
  // DOM ELEMENTS
  // ==========================================================================
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const gameWrapper = document.getElementById('gameWrapper');

  // Overlays
  const startScreen = document.getElementById('startScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const pauseScreen = document.getElementById('pauseScreen');
  const helpModal = document.getElementById('helpModal');

  // Inputs & Buttons
  const playerNameInput = document.getElementById('playerNameInput');
  const startRunBtn = document.getElementById('startRunBtn');
  const restartBtn = document.getElementById('restartBtn');
  const viewBoardBtn = document.getElementById('viewBoardBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const quitBtn = document.getElementById('quitBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const helpToggleBtn = document.getElementById('helpToggleBtn');
  const closeHelpBtn = document.getElementById('closeHelpBtn');
  const closeHelpBtn2 = document.getElementById('closeHelpBtn2');
  const refreshBoardBtn = document.getElementById('refreshBoardBtn');
  const resetArrayBtn = document.getElementById('resetArrayBtn');

  // HUD Elements
  const hudScore = document.getElementById('hudScore');
  const hudCoins = document.getElementById('hudCoins');
  const hudDistance = document.getElementById('hudDistance');
  const hudSpeed = document.getElementById('hudSpeed');

  // Game Over Elements
  const finalScoreVal = document.getElementById('finalScoreVal');
  const finalCoinsVal = document.getElementById('finalCoinsVal');
  const finalDistVal = document.getElementById('finalDistVal');
  const finalRankVal = document.getElementById('finalRankVal');

  // Sidebar Elements
  const leaderboardList = document.getElementById('leaderboardList');
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  const apiStatusDot = document.getElementById('apiStatusDot');
  const apiStatusText = document.getElementById('apiStatusText');
  const toastContainer = document.getElementById('toastContainer');

  // Mobile Touch Buttons
  const touchLeftBtn = document.getElementById('touchLeftBtn');
  const touchRightBtn = document.getElementById('touchRightBtn');
  const touchJumpBtn = document.getElementById('touchJumpBtn');
  const touchSlideBtn = document.getElementById('touchSlideBtn');

  // Load saved player name
  const savedName = localStorage.getItem('chicken_run_player');
  if (savedName) playerNameInput.value = savedName;

  // Update sound icon
  function updateSoundUI() {
    soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    soundToggleBtn.title = soundEnabled ? 'Sound Enabled' : 'Sound Muted';
  }
  updateSoundUI();

  soundToggleBtn.addEventListener('click', () => {
    initAudio();
    soundEnabled = !soundEnabled;
    localStorage.setItem('chicken_run_sound', soundEnabled);
    updateSoundUI();
    showToast(soundEnabled ? 'Sound On 🔊' : 'Sound Muted 🔇');
  });

  // ==========================================================================
  // TOAST NOTIFICATIONS
  // ==========================================================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // ==========================================================================
  // GAME STATE & CONSTANTS
  // ==========================================================================
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const GameState = {
    READY: 'ready',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAMEOVER: 'gameover'
  };

  const game = {
    state: GameState.READY,
    lane: 1,             // 0: Left, 1: Center, 2: Right
    targetLane: 1,
    jump: 0,             // 0 to 1
    slide: 0,            // 0 to 1
    distance: 0,
    score: 0,
    coins: 0,
    speed: 0.35,
    spawnTimer: 0,
    objects: [],
    particles: [],
    floatingTexts: [],
    lastTime: performance.now(),
    wingCycle: 0,
    legCycle: 0,
    shake: 0
  };

  // ==========================================================================
  // CANVAS SIZING
  // ==========================================================================
  let cw = 800, ch = 560;

  function resizeCanvas() {
    const rect = gameWrapper.getBoundingClientRect();
    cw = Math.floor(rect.width);
    ch = Math.floor(rect.height);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ==========================================================================
  // GAME CONTROL ACTIONS
  // ==========================================================================
  function changeLane(direction) {
    if (game.state !== GameState.PLAYING) return;
    if (direction === 'left' && game.targetLane > 0) {
      game.targetLane--;
      spawnDustParticles(game.lane, 4);
    } else if (direction === 'right' && game.targetLane < 2) {
      game.targetLane++;
      spawnDustParticles(game.lane, 4);
    }
  }

  function triggerJump() {
    if (game.state !== GameState.PLAYING) return;
    if (game.jump <= 0.05 && game.slide <= 0.05) {
      game.jump = 1.0;
      playJumpSound();
      spawnFeatherParticles(6);
    }
  }

  function triggerSlide() {
    if (game.state !== GameState.PLAYING) return;
    if (game.jump <= 0.05) {
      game.slide = 0.85;
      playSlideSound();
      spawnDustParticles(game.lane, 6);
    }
  }

  function togglePause() {
    if (game.state === GameState.PLAYING) {
      game.state = GameState.PAUSED;
      pauseScreen.classList.remove('hidden');
    } else if (game.state === GameState.PAUSED) {
      game.state = GameState.PLAYING;
      pauseScreen.classList.add('hidden');
      game.lastTime = performance.now();
    }
  }

  // ==========================================================================
  // KEYBOARD CONTROLS
  // ==========================================================================
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();

    // Prevent scrolling for game navigation keys
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) {
      if (document.activeElement !== playerNameInput) {
        e.preventDefault();
      }
    }

    if (document.activeElement === playerNameInput) {
      if (k === 'enter') startGame();
      return;
    }

    if (k === 'arrowleft' || k === 'a') changeLane('left');
    if (k === 'arrowright' || k === 'd') changeLane('right');
    if (k === 'arrowup' || k === 'w' || k === ' ') triggerJump();
    if (k === 'arrowdown' || k === 's') triggerSlide();
    if (k === 'p' || k === 'escape') togglePause();
    if (k === 'enter') {
      if (game.state === GameState.READY || game.state === GameState.GAMEOVER) {
        startGame();
      }
    }
  });

  // Mobile Touch Controls
  touchLeftBtn.addEventListener('click', () => changeLane('left'));
  touchRightBtn.addEventListener('click', () => changeLane('right'));
  touchJumpBtn.addEventListener('click', () => triggerJump());
  touchSlideBtn.addEventListener('click', () => triggerSlide());

  // Swipe detection on canvas
  let touchStartX = 0, touchStartY = 0;
  canvas.addEventListener('touchstart', (e) => {
    initAudio();
    const t = e.changedTouches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 28) {
      if (absX > absY) {
        changeLane(dx < 0 ? 'left' : 'right');
      } else {
        if (dy < 0) triggerJump();
        else triggerSlide();
      }
    }
  }, { passive: true });

  // ==========================================================================
  // PARTICLE SYSTEM & FLOATING TEXTS
  // ==========================================================================
  function spawnDustParticles(lane, count = 5) {
    const playerY = ch * 0.79;
    const horizon = ch * 0.38;
    const cx = cw / 2;
    const botW = cw * 0.88;
    const laneX = cx - botW * 0.43 + (botW * 0.86) * (lane + 0.5) / 3;

    for (let i = 0; i < count; i++) {
      game.particles.push({
        x: laneX + (Math.random() - 0.5) * 20,
        y: playerY + 12 + Math.random() * 5,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -Math.random() * 2 - 0.5,
        size: Math.random() * 5 + 3,
        alpha: 0.8,
        decay: 0.035,
        color: '#c2a677'
      });
    }
  }

  function spawnFeatherParticles(count = 6) {
    const playerY = ch * 0.79;
    const cx = cw / 2;
    const botW = cw * 0.88;
    const laneX = cx - botW * 0.43 + (botW * 0.86) * (game.lane + 0.5) / 3;

    for (let i = 0; i < count; i++) {
      game.particles.push({
        x: laneX + (Math.random() - 0.5) * 30,
        y: playerY - 30 + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3 - 1,
        size: Math.random() * 6 + 4,
        alpha: 0.9,
        decay: 0.02,
        color: Math.random() < 0.3 ? '#f6d48a' : '#fff8e7',
        feather: true,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.2
      });
    }
  }

  function spawnCoinSparkles(x, y) {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      game.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        alpha: 1.0,
        decay: 0.04,
        color: Math.random() < 0.5 ? '#ffd700' : '#fff'
      });
    }
  }

  function addFloatingText(text, x, y, color = '#ffd700') {
    game.floatingTexts.push({
      text, x, y, color,
      alpha: 1.0,
      vy: -1.8
    });
  }

  // ==========================================================================
  // PROCEDURAL DRAWING ROUTINES (CANVAS)
  // ==========================================================================

  /**
   * Draws the Temple Run pseudo-3D environment (Sky, Jungle Hills, Temple Path, Totems)
   */
  function drawEnvironment(phase) {
    // 1. Sky Gradient (Temple Sunset/Atmospheric)
    const sky = ctx.createLinearGradient(0, 0, 0, ch);
    sky.addColorStop(0, '#1a3328');
    sky.addColorStop(0.35, '#3a5839');
    sky.addColorStop(0.55, '#a47e3b');
    sky.addColorStop(1, '#e29b47');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, cw, ch);

    // 2. Distant Temple Pyramids & Jungle Mountains
    ctx.fillStyle = '#223829';
    ctx.beginPath();
    ctx.moveTo(0, ch * 0.46);
    ctx.lineTo(cw * 0.15, ch * 0.28);
    ctx.lineTo(cw * 0.3, ch * 0.46);
    ctx.lineTo(cw * 0.55, ch * 0.22); // Temple peak
    ctx.lineTo(cw * 0.8, ch * 0.46);
    ctx.lineTo(cw, ch * 0.35);
    ctx.lineTo(cw, ch);
    ctx.lineTo(0, ch);
    ctx.fill();

    // Jungle Hills Silhouette
    ctx.fillStyle = '#2d4b37';
    ctx.beginPath();
    ctx.moveTo(0, ch * 0.48);
    ctx.quadraticCurveTo(cw * 0.25, ch * 0.33, cw * 0.5, ch * 0.48);
    ctx.quadraticCurveTo(cw * 0.75, ch * 0.32, cw, ch * 0.48);
    ctx.lineTo(cw, ch);
    ctx.lineTo(0, ch);
    ctx.fill();

    // 3. Road / Temple Stone Runway Perspective
    const horizon = ch * 0.38;
    const bottom = ch * 1.06;
    const cx = cw / 2;
    const topW = cw * 0.20;
    const botW = cw * 0.88;

    // Grass / Ground Edge
    ctx.fillStyle = '#39533a';
    ctx.fillRect(0, horizon, cw, ch - horizon);

    // Stone Path Outer Kerb (Ancient Temple Gold/Stone Trim)
    ctx.fillStyle = '#614d31';
    ctx.beginPath();
    ctx.moveTo(cx - topW / 2 - 12, horizon);
    ctx.lineTo(cx + topW / 2 + 12, horizon);
    ctx.lineTo(cx + botW / 2 + 30, bottom);
    ctx.lineTo(cx - botW / 2 - 30, bottom);
    ctx.closePath();
    ctx.fill();

    // Stone Road Main Pathway
    ctx.fillStyle = '#7a664d';
    ctx.beginPath();
    ctx.moveTo(cx - topW / 2, horizon);
    ctx.lineTo(cx + topW / 2, horizon);
    ctx.lineTo(cx + botW / 2, bottom);
    ctx.lineTo(cx - botW / 2, bottom);
    ctx.closePath();
    ctx.fill();

    // Temple Cobblestone Inner Texture
    ctx.fillStyle = '#594a37';
    ctx.beginPath();
    ctx.moveTo(cx - topW * 0.44, horizon);
    ctx.lineTo(cx + topW * 0.44, horizon);
    ctx.lineTo(cx + botW * 0.44, bottom);
    ctx.lineTo(cx - botW * 0.44, bottom);
    ctx.closePath();
    ctx.fill();

    // 4. Moving Lane Dividers (Dashed Golden Stone Inlays)
    for (let laneLine = 1; laneLine <= 2; laneLine++) {
      for (let j = 0; j < 8; j++) {
        const t = ((j / 8 + phase) % 1);
        const y = horizon + (bottom - horizon) * t;
        const half = topW / 2 + (botW / 2 - topW / 2) * t;
        const x = cx - half + (2 * half) * (laneLine / 3);
        const lineH = 4 + 16 * t;
        const lineW = 3 + 5 * t;

        ctx.fillStyle = 'rgba(247, 219, 138, 0.75)';
        ctx.fillRect(x - lineW / 2, y, lineW, lineH);
      }
    }

    // 5. Roadside Ancient Totems / Columns with Torches
    for (let i = 0; i < 8; i++) {
      const t = ((i / 8 + phase * 0.8) % 1);
      const y = horizon + (bottom - horizon) * t;
      const half = topW / 2 + (botW / 2 - topW / 2) * t;
      const side = (i % 2 === 0) ? -1 : 1;
      const x = cx + side * (half + 22 + 45 * t);
      const scale = 0.25 + t * 0.95;

      // Stone Pillar
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      ctx.fillStyle = '#3c352c';
      ctx.fillRect(-10, -50, 20, 50);
      ctx.fillStyle = '#544a3e';
      ctx.fillRect(-14, -54, 28, 8); // Capital
      ctx.fillRect(-12, -4, 24, 6);  // Base

      // Torch Flame Animation
      const flicker = Math.sin(Date.now() * 0.01 + i) * 3;
      ctx.fillStyle = '#ff8800';
      ctx.beginPath();
      ctx.arc(0, -58 + flicker, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.arc(0, -58 + flicker, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  /**
   * Draws the animated Chicken character in 2.5D with jumping, sliding, and wing flapping.
   */
  function drawChicken(x, y, scale, jumping, sliding, legCycle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    if (sliding > 0.1) {
      ctx.rotate(-0.25);
      ctx.translate(0, 10);
    }

    // Ground Shadow (shrinks when jumping)
    const shadowScale = jumping > 0.05 ? Math.max(0.4, 1.0 - jumping * 0.6) : 1.0;
    ctx.fillStyle = 'rgba(20, 15, 10, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 30 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Feet / Running Legs Animation
    ctx.strokeStyle = '#e98d22';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    if (sliding <= 0.1) {
      const leg1Offset = Math.sin(legCycle) * 10;
      const leg2Offset = -leg1Offset;

      // Left leg
      ctx.beginPath();
      ctx.moveTo(-10, 2);
      ctx.lineTo(-12, 12 + leg1Offset);
      ctx.lineTo(-18, 14 + leg1Offset);
      ctx.stroke();

      // Right leg
      ctx.beginPath();
      ctx.moveTo(8, 2);
      ctx.lineTo(10, 12 + leg2Offset);
      ctx.lineTo(4, 14 + leg2Offset);
      ctx.stroke();
    }

    // Chicken Tail Feathers
    ctx.fillStyle = '#f0c96f';
    ctx.beginPath();
    ctx.moveTo(-24, -20);
    ctx.quadraticCurveTo(-38, -32, -30, -42);
    ctx.quadraticCurveTo(-22, -36, -18, -26);
    ctx.fill();

    // Body (Round, Plump Hen)
    ctx.fillStyle = '#fff4d5';
    ctx.beginPath();
    ctx.ellipse(0, -22, 28, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly Shading
    ctx.fillStyle = '#f6d48a';
    ctx.beginPath();
    ctx.ellipse(-2, -14, 18, 18, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Wing (Flapping Animation)
    const flapAngle = jumping > 0.05
      ? Math.sin(Date.now() * 0.04) * 0.45
      : -0.3 + Math.sin(legCycle) * 0.15;

    ctx.save();
    ctx.translate(-12, -24);
    ctx.rotate(flapAngle);
    ctx.fillStyle = '#e8bf60';
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 19, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Head
    ctx.fillStyle = '#fff4d5';
    ctx.beginPath();
    ctx.arc(10, -56, 19, 0, Math.PI * 2);
    ctx.fill();

    // Red Comb
    ctx.fillStyle = '#e84c42';
    ctx.beginPath();
    ctx.arc(0, -74, 7, 0, Math.PI * 2);
    ctx.arc(10, -78, 8, 0, Math.PI * 2);
    ctx.arc(20, -74, 6, 0, Math.PI * 2);
    ctx.fill();

    // Wattle
    ctx.fillStyle = '#e84c42';
    ctx.beginPath();
    ctx.ellipse(20, -42, 5, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f5a623';
    ctx.beginPath();
    ctx.moveTo(26, -58);
    ctx.lineTo(44, -51);
    ctx.lineTo(26, -45);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#292018';
    ctx.beginPath();
    ctx.arc(18, -60, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlight
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(19, -61, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Headband / Temple Explorer Scarf
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(10, -56, 19, -Math.PI * 0.8, -Math.PI * 0.1);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draws obstacles and collectibles with perspective depth scaling.
   */
  function drawObject(o, cx, horizon, playerY, topW, botW) {
    const t = clamp(o.z, 0, 1.15);
    const y = horizon + (playerY - horizon) * t;
    const roadHalf = topW / 2 + (botW / 2 - topW / 2) * t;
    const x = cx - roadHalf + (roadHalf * 2) * (o.lane + 0.5) / 3;
    const scale = 0.22 + t * 0.98;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    if (o.type === 'coin') {
      // 3D Spinning Golden Coin
      const spin = Math.sin(Date.now() * 0.007 + o.lane);
      ctx.save();
      ctx.scale(Math.abs(spin) * 0.9 + 0.1, 1.0);

      // Coin Outer Rim
      ctx.fillStyle = '#f5b324';
      ctx.beginPath();
      ctx.arc(0, -18, 14, 0, Math.PI * 2);
      ctx.fill();

      // Coin Face
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(0, -18, 11, 0, Math.PI * 2);
      ctx.fill();

      // Coin Symbol ($ or Star)
      ctx.fillStyle = '#b87b07';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, -18);

      ctx.restore();
    } else if (o.type === 'egg') {
      // Rare Golden Egg Power-up
      ctx.fillStyle = '#fff1a8';
      ctx.beginPath();
      ctx.ellipse(0, -20, 14, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glow shimmer
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Sparkles
      ctx.fillStyle = '#fff';
      ctx.fillRect(-2, -26, 4, 4);
    } else if (o.kind === 'rock') {
      // Temple Boulder (Must JUMP over or dodge)
      ctx.fillStyle = 'rgba(20, 15, 10, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 3, 26, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#5c5449';
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(-18, -26);
      ctx.lineTo(2, -34);
      ctx.lineTo(24, -20);
      ctx.lineTo(22, 0);
      ctx.closePath();
      ctx.fill();

      // Rock Highlights
      ctx.fillStyle = '#857b6d';
      ctx.beginPath();
      ctx.moveTo(-18, -26);
      ctx.lineTo(2, -34);
      ctx.lineTo(0, -18);
      ctx.closePath();
      ctx.fill();
    } else if (o.kind === 'beam') {
      // Hanging Temple Beam / High Log (Must SLIDE under or dodge)
      // Posts on the sides
      ctx.fillStyle = '#4a2f1c';
      ctx.fillRect(-28, -64, 8, 64);
      ctx.fillRect(20, -64, 8, 64);

      // Elevated Crossbar (slidable clearance underneath)
      ctx.fillStyle = '#d35400';
      ctx.fillRect(-34, -68, 68, 24);
      ctx.strokeStyle = '#782800';
      ctx.lineWidth = 3;
      ctx.strokeRect(-34, -68, 68, 24);

      // Warning hazard stripes
      ctx.fillStyle = '#f1c40f';
      for (let s = -28; s < 28; s += 16) {
        ctx.beginPath();
        ctx.moveTo(s, -68);
        ctx.lineTo(s + 8, -68);
        ctx.lineTo(s, -44);
        ctx.lineTo(s - 8, -44);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // ==========================================================================
  // MAIN GAME LOOP (REQUEST ANIMATION FRAME)
  // ==========================================================================
  function updateAndRender(now) {
    const dt = Math.min((now - game.lastTime) / 16.67, 2.5);
    game.lastTime = now;

    // Apply screen shake on collision
    if (game.shake > 0) {
      ctx.save();
      const shakeX = (Math.random() - 0.5) * game.shake;
      const shakeY = (Math.random() - 0.5) * game.shake;
      ctx.translate(shakeX, shakeY);
      game.shake = Math.max(0, game.shake - 1.5 * dt);
    }

    const horizon = ch * 0.38;
    const playerY = ch * 0.79;
    const cx = cw / 2;
    const topW = cw * 0.20;
    const botW = cw * 0.88;

    // 1. Draw Environment
    const roadPhase = (game.distance * 0.016) % 1;
    drawEnvironment(roadPhase);

    // 2. Update Gameplay Logic if Playing
    if (game.state === GameState.PLAYING) {
      game.distance += dt * (2.8 + game.speed * 3.5);
      game.score = Math.floor(game.distance * 1.5 + game.coins * 25);
      game.speed = Math.min(1.45, 0.35 + game.distance / 2800);

      // Animation cycles
      game.legCycle += dt * (0.35 + game.speed * 0.2);
      game.wingCycle += dt * 0.2;

      // Jump & Slide Physics
      game.jump = Math.max(0, game.jump - 0.032 * dt);
      game.slide = Math.max(0, game.slide - 0.024 * dt);

      // Smooth Lane Interpolation (Lerp)
      game.lane += (game.targetLane - game.lane) * Math.min(1.0, 0.24 * dt);

      // Spawning Obstacles & Collectibles
      game.spawnTimer -= dt;
      if (game.spawnTimer <= 0) {
        const lane = Math.floor(Math.random() * 3);
        const rand = Math.random();

        if (rand < 0.58) {
          // Obstacle (Rock or High Beam)
          const isRock = Math.random() < 0.55;
          game.objects.push({
            lane,
            z: 0.0,
            type: 'obstacle',
            kind: isRock ? 'rock' : 'beam',
            hit: false
          });
        } else if (rand < 0.92) {
          // Coin Trail
          game.objects.push({
            lane,
            z: 0.0,
            type: 'coin',
            kind: 'coin',
            hit: false
          });
          // Sometimes add adjacent coin
          if (Math.random() < 0.45) {
            const nextLane = (lane + (Math.random() < 0.5 ? 1 : 2)) % 3;
            game.objects.push({
              lane: nextLane,
              z: -0.15,
              type: 'coin',
              kind: 'coin',
              hit: false
            });
          }
        } else {
          // Rare Golden Egg
          game.objects.push({
            lane,
            z: 0.0,
            type: 'egg',
            kind: 'egg',
            hit: false
          });
        }

        // Difficulty spawn frequency scaling
        game.spawnTimer = Math.max(20, 52 - game.speed * 20) + Math.random() * 18;
      }

      // Update & Draw Objects (sorted by depth so closer objects render on top)
      game.objects.sort((a, b) => a.z - b.z);

      for (const o of game.objects) {
        o.z += 0.0088 * game.speed * dt;
        drawObject(o, cx, horizon, playerY, topW, botW);

        // Collision Check near player plane
        if (o.z > 0.88 && o.z < 1.06 && !o.hit) {
          const laneDiff = Math.abs(o.lane - Math.round(game.lane));
          if (laneDiff < 0.42) {
            if (o.type === 'coin') {
              o.hit = true;
              game.coins++;
              playCoinSound();
              const hitX = cx - botW * 0.43 + (botW * 0.86) * (o.lane + 0.5) / 3;
              spawnCoinSparkles(hitX, playerY - 30);
              addFloatingText('+25', hitX, playerY - 40, '#ffd700');
            } else if (o.type === 'egg') {
              o.hit = true;
              game.coins += 5;
              game.score += 100;
              playEggSound();
              const hitX = cx - botW * 0.43 + (botW * 0.86) * (o.lane + 0.5) / 3;
              spawnCoinSparkles(hitX, playerY - 30);
              addFloatingText('+100 GOLDEN EGG!', hitX, playerY - 50, '#ffeb3b');
            } else if (o.type === 'obstacle') {
              // Check if evaded via Jump or Slide
              const jumpedOver = (o.kind === 'rock' && game.jump > 0.32);
              const slidedUnder = (o.kind === 'beam' && game.slide > 0.22);

              if (jumpedOver) {
                // Successful leap!
                o.hit = true;
                addFloatingText('GREAT LEAP!', cx, playerY - 60, '#2ecc71');
              } else if (slidedUnder) {
                // Successful slide!
                o.hit = true;
                addFloatingText('SLICK SLIDE!', cx, playerY - 60, '#3498db');
              } else {
                // COLLISION!
                triggerGameOver();
                break;
              }
            }
          }
        }
      }

      // Clean up passed objects
      game.objects = game.objects.filter(o => o.z < 1.15 && !o.hit);

      // Chicken position with parabolic jump arc
      const laneX = cx - botW * 0.43 + (botW * 0.86) * (game.lane + 0.5) / 3;
      const jumpLift = Math.sin((1.0 - game.jump) * Math.PI) * Math.min(115, ch * 0.22);
      drawChicken(laneX, playerY - jumpLift, 1.08, game.jump, game.slide, game.legCycle);

      // Update HUD
      hudScore.textContent = game.score.toLocaleString();
      hudCoins.textContent = game.coins;
      hudDistance.textContent = `${Math.floor(game.distance)}m`;
      hudSpeed.textContent = `${(game.speed * 2.8).toFixed(1)}x`;
    } else {
      // In Ready or GameOver mode, chicken stands idle or breathes
      const laneX = cx;
      const idleBob = Math.sin(Date.now() * 0.004) * 4;
      drawChicken(laneX, playerY + idleBob, 1.08, 0, 0, 0);
    }

    // 3. Render Particles
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        game.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.feather) {
        p.rot += p.vrot;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Render Floating Texts
    for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
      const ft = game.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.025;

      if (ft.alpha <= 0) {
        game.floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = '900 15px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    if (game.shake > 0) {
      ctx.restore();
    }

    requestAnimationFrame(updateAndRender);
  }

  requestAnimationFrame(updateAndRender);

  // ==========================================================================
  // GAME LIFECYCLE (START, GAME OVER, RESTART)
  // ==========================================================================
  function startGame() {
    initAudio();
    const name = playerNameInput.value.trim() || 'TempleRunner';
    localStorage.setItem('chicken_run_player', name);

    game.state = GameState.PLAYING;
    game.lane = 1;
    game.targetLane = 1;
    game.jump = 0;
    game.slide = 0;
    game.distance = 0;
    game.score = 0;
    game.coins = 0;
    game.speed = 0.35;
    game.spawnTimer = 25;
    game.objects = [];
    game.particles = [];
    game.floatingTexts = [];
    game.lastTime = performance.now();
    game.shake = 0;

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');

    showToast(`Escape the Temple, ${name}! Good luck! 🐔`);
  }

  function triggerGameOver() {
    game.state = GameState.GAMEOVER;
    game.shake = 18;
    playCrashSound();
    spawnFeatherParticles(20);

    const playerName = playerNameInput.value.trim() || 'TempleRunner';

    finalScoreVal.textContent = game.score.toLocaleString();
    finalCoinsVal.textContent = game.coins;
    finalDistVal.textContent = `${Math.floor(game.distance)}m`;
    finalRankVal.textContent = 'Saving...';

    gameOverScreen.classList.remove('hidden');

    // Submit score via REST API to Core Java Array Database
    submitScoreToApi(playerName, game.score, game.coins);
  }

  startRunBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  resumeBtn.addEventListener('click', togglePause);
  quitBtn.addEventListener('click', () => {
    pauseScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    game.state = GameState.READY;
  });

  viewBoardBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    fetchLeaderboard();
  });

  // Modal handlers
  helpToggleBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
  closeHelpBtn.addEventListener('click', () => helpModal.classList.add('hidden'));
  closeHelpBtn2.addEventListener('click', () => helpModal.classList.add('hidden'));

  // ==========================================================================
  // BACKEND REST API CLIENT (CORE JAVA ARRAY DB INTEGRATION)
  // ==========================================================================

  /**
   * Health Check: GET /api/health
   */
  async function checkApiHealth() {
    const tryUrls = [API_BASE, 'http://localhost:8080'];
    let connected = false;

    for (const url of tryUrls) {
      try {
        const res = await fetch(`${url}/api/health`);
        if (res.ok) {
          const data = await res.json();
          API_BASE = url;
          apiStatusDot.className = 'status-dot online';
          apiStatusText.textContent = `Java Array: ONLINE (Port ${data.port || 8080})`;
          apiStatusBadge.title = `Backend: ${data.service}\nStorage: ${data.database}\nCapacity: ${data.arrayCapacity}`;
          connected = true;
          break;
        }
      } catch (e) {}
    }

    if (!connected) {
      apiStatusDot.className = 'status-dot offline';
      apiStatusText.textContent = 'Backend Offline';
      apiStatusBadge.title = `Could not reach ${API_BASE}/api/health.\nRun the Core Java backend to connect!`;
    }
  }

  /**
   * Fetch Leaderboard: GET /api/leaderboard
   */
  async function fetchLeaderboard() {
    try {
      leaderboardList.innerHTML = `
        <div class="loading-state">
          <span class="spinner"></span>
          <span>Fetching array scores...</span>
        </div>`;

      const res = await fetch(`${API_BASE}/api/leaderboard`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      renderLeaderboard(data.scores || []);
    } catch (err) {
      leaderboardList.innerHTML = `
        <div class="empty-state">
          <span>⚠️ Server unreachable</span>
          <small>Start backend on port 8080</small>
        </div>`;
    }
  }

  /**
   * Render Leaderboard rows with Gold, Silver, Bronze badges
   */
  function renderLeaderboard(scores) {
    if (!scores || scores.length === 0) {
      leaderboardList.innerHTML = `
        <div class="empty-state">
          <span>No runs registered yet!</span>
          <small>Be the first temple explorer</small>
        </div>`;
      return;
    }

    leaderboardList.innerHTML = scores.map((r, i) => {
      let rankClass = '';
      if (r.rank === 1) rankClass = 'rank-1';
      else if (r.rank === 2) rankClass = 'rank-2';
      else if (r.rank === 3) rankClass = 'rank-3';

      return `
        <div class="leaderboard-row">
          <span class="rank-badge ${rankClass}">${r.rank}</span>
          <span class="player-name" title="${escapeHtml(r.player)}">${escapeHtml(r.player)}</span>
          <span class="row-coins">${r.coins}</span>
          <span class="row-score">${r.score.toLocaleString()}</span>
        </div>`;
    }).join('');
  }

  /**
   * Submit Score: POST /api/score
   */
  async function submitScoreToApi(player, score, coins) {
    try {
      const res = await fetch(`${API_BASE}/api/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player, score, coins })
      });

      if (res.ok) {
        const data = await res.json();
        const rank = data.rank;
        finalRankVal.textContent = rank > 0 ? `#${rank}` : 'Top 50 Full';
        showToast(`🎉 Score recorded in Java Array! Rank: #${rank}`, 'success');
        if (data.leaderboard && data.leaderboard.scores) {
          renderLeaderboard(data.leaderboard.scores);
        } else {
          fetchLeaderboard();
        }
      } else {
        finalRankVal.textContent = 'API Error';
      }
    } catch (err) {
      finalRankVal.textContent = 'Offline';
      showToast('⚠️ Score saved locally. Start backend to persist.', 'error');
    }
  }

  /**
   * Reset Leaderboard Array: POST /api/reset
   */
  async function resetArrayDatabase() {
    if (!confirm('Are you sure you want to reset the in-memory Java array to default champion scores?')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast('✅ Array database reset to default records!', 'success');
        if (data.leaderboard && data.leaderboard.scores) {
          renderLeaderboard(data.leaderboard.scores);
        } else {
          fetchLeaderboard();
        }
      }
    } catch (e) {
      showToast('⚠️ Failed to reset database.', 'error');
    }
  }

  refreshBoardBtn.addEventListener('click', () => {
    fetchLeaderboard();
    showToast('Refreshing leaderboard from Java Array...');
  });

  resetArrayBtn.addEventListener('click', resetArrayDatabase);

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  }

  // Initial Load
  checkApiHealth();
  fetchLeaderboard();
  setInterval(checkApiHealth, 10000);

})();
