/* Neon Serpent — Playnix Original. Self-contained canvas game. */
(() => {
  "use strict";
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const speedEl = document.getElementById("speed");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const hintEl = document.getElementById("hint");

  const COLS = 20;
  const ROWS = 20;
  const STORAGE_KEY = "playnix.neon-serpent.best";

  let cell = canvas.width / COLS;
  let cssSize = 600;
  let snake, dir, nextDir, food, score, best, running, paused, tickMs, acc, last, particles;

  best = Number(localStorage.getItem(STORAGE_KEY) || 0);
  bestEl.textContent = String(best);

  function resize() {
    const stage = canvas.parentElement;
    const size = Math.min(stage.clientWidth - 16, stage.clientHeight - 16, 620);
    const px = Math.max(240, Math.floor(size));
    canvas.style.width = `${px}px`;
    canvas.style.height = `${px}px`;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(px * dpr);
    canvas.height = Math.floor(px * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cssSize = px;
    cell = px / COLS;
    draw();
  }

  function reset() {
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    score = 0;
    tickMs = 150;
    acc = 0;
    particles = [];
    placeFood();
    scoreEl.textContent = "0";
    speedEl.textContent = "1";
    draw();
  }

  function placeFood() {
    const open = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (!snake.some((s) => s.x === x && s.y === y)) open.push({ x, y });
      }
    }
    food = open[Math.floor(Math.random() * open.length)] || { x: 0, y: 0 };
  }

  function start() {
    reset();
    running = true;
    paused = false;
    overlay.classList.add("hidden");
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function gameOver() {
    running = false;
    if (score > best) {
      best = score;
      localStorage.setItem(STORAGE_KEY, String(best));
      bestEl.textContent = String(best);
    }
    overlay.classList.remove("hidden");
    hintEl.textContent = `Game over — score ${score}. ${score >= best && score > 0 ? "New personal best!" : "Try again?"}`;
    startBtn.textContent = "Play again";
  }

  function step() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) return gameOver();
    if (snake.some((s, i) => i < snake.length - 1 && s.x === head.x && s.y === head.y)) return gameOver();

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      scoreEl.textContent = String(score);
      for (let i = 0; i < 14; i += 1) {
        particles.push({ x: food.x * cell + cell / 2, y: food.y * cell + cell / 2, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 1 });
      }
      placeFood();
      if (score % 50 === 0) {
        tickMs = Math.max(65, tickMs - 12);
        speedEl.textContent = String(Math.round(150 / tickMs));
      }
    } else {
      snake.pop();
    }
  }

  function draw() {
    if (!ctx || !cell) return;
    const size = cssSize;
    ctx.clearRect(0, 0, size, size);

    // grid
    ctx.strokeStyle = "rgba(139,92,246,0.09)";
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i += 1) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(size, i * cell); ctx.stroke();
    }

    // food
    if (food) {
      const cx = food.x * cell + cell / 2;
      const cy = food.y * cell + cell / 2;
      const pulse = 1 + Math.sin(performance.now() / 220) * 0.12;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cell * 0.9 * pulse);
      grad.addColorStop(0, "#FFF3D6");
      grad.addColorStop(0.35, "#FF7A18");
      grad.addColorStop(1, "rgba(255,122,24,0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, cell * 0.9 * pulse, 0, Math.PI * 2); ctx.fill();
    }

    // snake
    snake.forEach((seg, index) => {
      const t = index / Math.max(snake.length, 1);
      const x = seg.x * cell + 1.5;
      const y = seg.y * cell + 1.5;
      const w = cell - 3;
      const r = Math.max(3, cell * 0.26);
      ctx.fillStyle = index === 0 ? "#22D3EE" : `hsl(${200 - t * 45} 90% ${62 - t * 22}%)`;
      ctx.shadowColor = index === 0 ? "rgba(34,211,238,.85)" : "rgba(139,92,246,.45)";
      ctx.shadowBlur = index === 0 ? 18 : 8;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, w, r);
      else ctx.rect(x, y, w, w);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // particles
    particles = particles.filter((p) => p.life > 0);
    particles.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.life -= 0.04;
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = "#FF7A18";
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (paused && running) {
      ctx.fillStyle = "rgba(9,11,20,.6)";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#F8FAFC";
      ctx.font = `600 ${Math.round(size / 18)}px system-ui,sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("Paused", size / 2, size / 2);
    }
  }

  function loop(now) {
    if (!running) return;
    if (!paused) {
      acc += now - last;
      while (acc >= tickMs) { acc -= tickMs; step(); if (!running) return; }
      draw();
    }
    last = now;
    requestAnimationFrame(loop);
  }

  function setDir(x, y) {
    if (!running || paused) return;
    if (dir.x === -x && dir.y === -y) return;
    nextDir = { x, y };
  }

  startBtn.addEventListener("click", start);
  window.addEventListener("keydown", (event) => {
    const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] };
    if (event.code === "Space") {
      event.preventDefault();
      if (!running) return start();
      paused = !paused; draw(); return;
    }
    const next = map[event.code];
    if (next) { event.preventDefault(); setDir(next[0], next[1]); }
  });

  document.getElementById("pad").addEventListener("click", (event) => {
    const dirName = event.target.getAttribute("data-dir");
    const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    if (dirName) setDir(map[dirName][0], map[dirName][1]);
  });

  let touchStart = null;
  canvas.addEventListener("touchstart", (event) => {
    const t = event.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener("touchend", (event) => {
    if (!touchStart) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
    else setDir(0, dy > 0 ? 1 : -1);
    touchStart = null;
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) { paused = true; draw(); }
  });
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "playnix:pause" && running) { paused = true; draw(); }
    if (event.data && event.data.type === "playnix:resume" && running) { paused = false; last = performance.now(); }
  });
  window.addEventListener("resize", resize);

  reset();
  running = false;
  resize();
})();
