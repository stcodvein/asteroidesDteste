(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const counterEl = document.getElementById("counter");
  const winOverlay = document.getElementById("winOverlay");
  const restartBtn = document.getElementById("restartBtn");

  const TARGET_HITS = 13;
  const MAX_ACTIVE_CUPIDS = 5;

  let width = 0;
  let height = 0;
  let dpr = 1;

  let hits = 0;
  let isFinished = false;
  let lastTime = 0;
  let spawnTimer = 0;

  let stars = [];
  let cupids = [];
  let particles = [];
  let laserEffects = [];
  let crosshair = { x: -100, y: -100, active: false };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (stars.length === 0) {
      createStars();
    }
  }

  function createStars() {
    const count = Math.min(90, Math.floor((width * height) / 11000));
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.8 + 0.5,
        alpha: Math.random() * 0.65 + 0.2,
        twinkleSpeed: Math.random() * 2 + 0.8,
        phase: Math.random() * Math.PI * 2,
        tint: Math.random() > 0.78 ? "#ffc2da" : "#dbe7ff"
      });
    }
  }

  function spawnCupid() {
    if (isFinished) return;

    const remaining = TARGET_HITS - hits;
    if (cupids.length >= Math.min(MAX_ACTIVE_CUPIDS, remaining)) return;

    const isMobile = width < 640;
    const baseRadius = isMobile ? 34 : 30;
    const edge = Math.floor(Math.random() * 4);
    const margin = baseRadius + 16;

    let x = 0;
    let y = 0;

    // Entra pelas bordas mirando um ponto interno aleatório para atravessar a tela
    const targetX = width * (0.2 + Math.random() * 0.6);
    const targetY = height * (0.2 + Math.random() * 0.6);

    if (edge === 0) {
      x = Math.random() * width;
      y = -margin;
    } else if (edge === 1) {
      x = width + margin;
      y = Math.random() * height;
    } else if (edge === 2) {
      x = Math.random() * width;
      y = height + margin;
    } else {
      x = -margin;
      y = Math.random() * height;
    }

    const angle = Math.atan2(targetY - y, targetX - x);
    const speed = (isMobile ? 95 : 125) + Math.random() * 95;

    cupids.push({
      id: Symbol(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: baseRadius,
      hitRadius: baseRadius + (isMobile ? 16 : 12),
      wingPhase: Math.random() * Math.PI * 2,
      bobPhase: Math.random() * Math.PI * 2,
      facing: Math.cos(angle) >= 0 ? 1 : -1,
      hit: false
    });
  }

  function createHitEffect(x, y) {
    // Disparo rápido estilo Among Us vindo da base da tela
    laserEffects.push({
      startX: width * 0.5,
      startY: height,
      endX: x,
      endY: y,
      life: 0.14,
      maxLife: 0.14
    });

    // Partículas de coração e brilho
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 55 + Math.random() * 130;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        size: 5 + Math.random() * 5,
        life: 0.65 + Math.random() * 0.25,
        maxLife: 0.9,
        isHeart: i % 2 === 0,
        color: i % 3 === 0 ? "#ffd1e3" : "#ff7eb3",
        rotation: (Math.random() - 0.5) * 0.8
      });
    }
  }

  function updateCounter() {
    counterEl.textContent = `${hits}/${TARGET_HITS}`;
  }

  function finishGame() {
    isFinished = true;
    cupids = [];
    winOverlay.classList.remove("hidden");
  }

  function resetGame() {
    hits = 0;
    isFinished = false;
    cupids = [];
    particles = [];
    laserEffects = [];
    spawnTimer = 0;
    updateCounter();
    winOverlay.classList.add("hidden");

    for (let i = 0; i < 3; i++) {
      spawnCupid();
    }
  }

  function handlePointerDown(event) {
    if (isFinished) return;

    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;

    crosshair.x = px;
    crosshair.y = py;
    crosshair.active = true;

    // Verifica do cupido mais recente (na frente) para o mais antigo
    for (let i = cupids.length - 1; i >= 0; i--) {
      const c = cupids[i];
      if (c.hit) continue;

      const dx = px - c.x;
      const dy = py - c.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= c.hitRadius) {
        c.hit = true;
        cupids.splice(i, 1);

        hits = Math.min(TARGET_HITS, hits + 1);
        updateCounter();
        createHitEffect(c.x, c.y);

        if (hits >= TARGET_HITS) {
          setTimeout(finishGame, 220);
        } else {
          spawnCupid();
        }
        break;
      }
    }
  }

  function handlePointerMove(event) {
    if (event.pointerType === "mouse") {
      const rect = canvas.getBoundingClientRect();
      crosshair.x = event.clientX - rect.left;
      crosshair.y = event.clientY - rect.top;
      crosshair.active = true;
    }
  }

  function drawHeart(x, y, size, color, alpha, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = color;

    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(0, topCurveHeight);
    ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
    ctx.bezierCurveTo(-size / 2, (size + topCurveHeight) / 2, 0, (size + topCurveHeight) / 1.4, 0, size);
    ctx.bezierCurveTo(0, (size + topCurveHeight) / 1.4, size / 2, (size + topCurveHeight) / 2, size / 2, topCurveHeight);
    ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCupid(c, time) {
    const bobOffset = Math.sin(time * 4 + c.bobPhase) * 4;
    const wingFlap = Math.sin(time * 14 + c.wingPhase) * 0.38;

    ctx.save();
    ctx.translate(c.x, c.y + bobOffset);
    ctx.scale(c.facing, 1);

    // Brilho sutil ao redor do cupido
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, c.radius * 1.15);
    glow.addColorStop(0, "rgba(255, 166, 201, 0.22)");
    glow.addColorStop(1, "rgba(255, 166, 201, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, c.radius * 1.15, 0, Math.PI * 2);
    ctx.fill();

    // Asas
    ctx.save();
    ctx.translate(-6, -2);
    ctx.rotate(-0.25 + wingFlap);
    ctx.fillStyle = "#f4f7ff";
    ctx.strokeStyle = "#ffc2da";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-10, -4, 12, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(-8, 3, 9, 4.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Túnica / corpo delicado
    ctx.fillStyle = "#ffe6f0";
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(5, -2);
    ctx.lineTo(8, 13);
    ctx.lineTo(-7, 13);
    ctx.closePath();
    ctx.fill();

    // Faixa rosa na túnica
    ctx.strokeStyle = "#ff85b3";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 2);
    ctx.lineTo(6, 7);
    ctx.stroke();

    // Cabeça
    ctx.fillStyle = "#ffd9c9";
    ctx.beginPath();
    ctx.arc(1, -10, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Cabelo dourado suave
    ctx.fillStyle = "#f7cf78";
    ctx.beginPath();
    ctx.arc(0, -12, 7.5, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();

    // Auréola
    ctx.strokeStyle = "#ffe082";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(1, -21, 6.5, 2.2, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Arco
    ctx.strokeStyle = "#d99b66";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(9, 1, 12, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    // Corda do arco
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(11, -10.5);
    ctx.lineTo(7, 1);
    ctx.lineTo(11, 12.5);
    ctx.stroke();

    // Flecha com ponta de coração
    ctx.strokeStyle = "#f3d2b3";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(4, 1);
    ctx.lineTo(24, 1);
    ctx.stroke();

    drawHeart(26, -2.5, 7, "#ff6b9d", 1, -Math.PI / 2);

    ctx.restore();
  }

  function update(dt) {
    if (!isFinished) {
      spawnTimer += dt;
      if (spawnTimer >= 0.65) {
        spawnTimer = 0;
        spawnCupid();
      }
    }

    const boundMargin = 65;

    for (let i = 0; i < cupids.length; i++) {
      const c = cupids[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;

      // Mantém os cupidos circulando dentro da área sem escapar para sempre
      if (c.x < -boundMargin && c.vx < 0) {
        c.vx = Math.abs(c.vx);
      } else if (c.x > width + boundMargin && c.vx > 0) {
        c.vx = -Math.abs(c.vx);
      }

      if (c.y < -boundMargin && c.vy < 0) {
        c.vy = Math.abs(c.vy);
      } else if (c.y > height + boundMargin && c.vy > 0) {
        c.vy = -Math.abs(c.vy);
      }

      c.facing = c.vx >= 0 ? 1 : -1;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    for (let i = laserEffects.length - 1; i >= 0; i--) {
      laserEffects[i].life -= dt;
      if (laserEffects[i].life <= 0) {
        laserEffects.splice(i, 1);
      }
    }
  }

  function render(timeSeconds) {
    ctx.clearRect(0, 0, width, height);

    // Estrelas discretas no fundo espacial
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const twinkle = 0.65 + 0.35 * Math.sin(timeSeconds * s.twinkleSpeed + s.phase);
      ctx.globalAlpha = s.alpha * twinkle;
      ctx.fillStyle = s.tint;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Mira sutil no centro/ponteiro (inspiração HUD Among Us)
    if (crosshair.active && !isFinished) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 166, 201, 0.35)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(crosshair.x, crosshair.y, 16, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(crosshair.x - 22, crosshair.y);
      ctx.lineTo(crosshair.x - 10, crosshair.y);
      ctx.moveTo(crosshair.x + 10, crosshair.y);
      ctx.lineTo(crosshair.x + 22, crosshair.y);
      ctx.moveTo(crosshair.x, crosshair.y - 22);
      ctx.lineTo(crosshair.x, crosshair.y - 10);
      ctx.moveTo(crosshair.x, crosshair.y + 10);
      ctx.lineTo(crosshair.x, crosshair.y + 22);
      ctx.stroke();
      ctx.restore();
    }

    // Feixe de disparo ao acertar
    for (let i = 0; i < laserEffects.length; i++) {
      const l = laserEffects[i];
      const alpha = l.life / l.maxLife;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 143, 184, ${alpha * 0.85})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(l.startX, l.startY);
      ctx.lineTo(l.endX, l.endY);
      ctx.stroke();
      ctx.restore();
    }

    // Cupidos
    for (let i = 0; i < cupids.length; i++) {
      drawCupid(cupids[i], timeSeconds);
    }

    // Partículas de acerto
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const alpha = Math.max(0, p.life / p.maxLife);
      if (p.isHeart) {
        drawHeart(p.x, p.y - p.size / 2, p.size * 1.4, p.color, alpha, p.rotation);
      } else {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    update(dt);
    render(timestamp / 1000);
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  restartBtn.addEventListener("click", resetGame);

  resize();
  resetGame();
  requestAnimationFrame(loop);
})();
