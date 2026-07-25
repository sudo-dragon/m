/* js/canvas.js */

class BackgroundCanvasManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;

    // Arrays for animatable particles
    this.stars = [];
    this.shootingStars = [];
    this.sakura = [];
    this.auroraTime = 0;

    // Render loop state
    this.animationFrameId = null;
    this.isRunning = false;

    // Reduced motion: fewer particles, no shooting stars, slower everything
    this.reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Parameters (trimmed slightly on small/low-power screens)
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.numStars = 100;
    this.numSakura = 18;

    this.resizeTimeout = null;
  }

  init() {
    this.canvas = document.getElementById('background-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.tuneForViewport();
    this.resize();

    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => this.resize(), 150);
    });

    this.spawnStars();
    this.spawnSakura();

    this.startLoop();
  }

  tuneForViewport() {
    const smallScreen = window.innerWidth < 640;
    if (smallScreen) {
      this.numStars = 60;
      this.numSakura = 10;
    }
    if (this.reducedMotion) {
      this.numSakura = Math.min(this.numSakura, 6);
    }
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.stars.length === 0) {
      this.spawnStars();
    }
  }

  get cssWidth() { return this.canvas.width / this.dpr; }
  get cssHeight() { return this.canvas.height / this.dpr; }

  spawnStars() {
    this.stars = [];
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push({
        x: Math.random() * this.cssWidth,
        y: Math.random() * this.cssHeight * 0.8,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random(),
        twinkleSpeed: 0.005 + Math.random() * 0.015,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  spawnSakura() {
    this.sakura = [];
    for (let i = 0; i < this.numSakura; i++) {
      this.sakura.push({
        x: Math.random() * this.cssWidth,
        y: Math.random() * this.cssHeight - this.cssHeight,
        size: Math.random() * 6 + 4,
        speedY: 0.4 + Math.random() * 0.6,
        speedX: -0.2 + Math.random() * 0.4,
        swayRange: 15 + Math.random() * 25,
        swaySpeed: 0.01 + Math.random() * 0.02,
        swayPhase: Math.random() * Math.PI * 2,
        rotation: Math.random() * 360,
        rotationSpeed: -1 + Math.random() * 2
      });
    }
  }

  triggerShootingStar() {
    if (this.reducedMotion) return;
    if (this.shootingStars.length >= 2) return;

    const startX = Math.random() * this.cssWidth * 0.8;
    const startY = Math.random() * this.cssHeight * 0.4;
    const length = 60 + Math.random() * 120;
    const speed = 6 + Math.random() * 10;

    this.shootingStars.push({
      x: startX,
      y: startY,
      length: length,
      speedX: speed,
      speedY: speed * 0.35,
      alpha: 1.0,
      fadeSpeed: 0.015 + Math.random() * 0.015
    });
  }

  startLoop() {
    if (this.isRunning) return;
    this.isRunning = true;

    const render = () => {
      if (!this.isRunning) return;
      this.draw();

      if (Math.random() < 0.003) {
        this.triggerShootingStar();
      }

      this.animationFrameId = requestAnimationFrame(render);
    };
    this.animationFrameId = requestAnimationFrame(render);
  }

  stopLoop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  draw() {
    const width = this.cssWidth;
    const height = this.cssHeight;

    this.ctx.clearRect(0, 0, width, height);

    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#05070e');
    skyGrad.addColorStop(0.5, '#0b1020');
    skyGrad.addColorStop(1, '#15102d');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, width, height);

    this.drawAurora();

    this.stars.forEach(star => {
      star.twinklePhase += star.twinkleSpeed;
      const opacity = 0.2 + (Math.sin(star.twinklePhase) + 1) * 0.4 * star.alpha;

      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(216, 180, 254, ${opacity})`;
      this.ctx.fill();

      if (star.size > 1.2 && opacity > 0.6) {
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(216, 180, 254, ${opacity * 0.15})`;
        this.ctx.fill();
      }
    });

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const ss = this.shootingStars[i];
      ss.x += ss.speedX;
      ss.y += ss.speedY;
      ss.alpha -= ss.fadeSpeed;

      if (ss.alpha <= 0 || ss.x > width || ss.y > height) {
        this.shootingStars.splice(i, 1);
        continue;
      }

      const grad = this.ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.length, ss.y - ss.speedY * (ss.length / ss.speedX));
      grad.addColorStop(0, `rgba(255, 255, 255, ${ss.alpha})`);
      grad.addColorStop(0.5, `rgba(244, 114, 182, ${ss.alpha * 0.4})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.ctx.strokeStyle = grad;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(ss.x, ss.y);
      this.ctx.lineTo(ss.x - ss.length, ss.y - ss.speedY * (ss.length / ss.speedX));
      this.ctx.stroke();
    }

    this.sakura.forEach(petal => {
      petal.y += petal.speedY;
      petal.swayPhase += petal.swaySpeed;
      const curX = petal.x + Math.sin(petal.swayPhase) * petal.swayRange;
      petal.rotation += petal.rotationSpeed;

      if (petal.y > height + 20) {
        petal.y = -20;
        petal.x = Math.random() * width;
        petal.speedY = 0.4 + Math.random() * 0.6;
        petal.rotation = Math.random() * 360;
      }

      this.ctx.save();
      this.ctx.translate(curX, petal.y);
      this.ctx.rotate(petal.rotation * Math.PI / 180);

      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.bezierCurveTo(-petal.size / 2, -petal.size / 2, -petal.size, petal.size / 2, 0, petal.size);
      this.ctx.bezierCurveTo(petal.size, petal.size / 2, petal.size / 2, -petal.size / 2, 0, 0);

      const petalGrad = this.ctx.createLinearGradient(0, 0, 0, petal.size);
      petalGrad.addColorStop(0, 'rgba(254, 205, 211, 0.7)');
      petalGrad.addColorStop(1, 'rgba(244, 114, 182, 0.35)');

      this.ctx.fillStyle = petalGrad;
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  drawAurora() {
    this.auroraTime += this.reducedMotion ? 0.0005 : 0.002;
    const height = this.cssHeight;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    this.drawAuroraRibbon(
      height * 0.25,
      height * 0.08,
      0.003,
      'rgba(168, 85, 247, 0.04)',
      this.auroraTime
    );

    this.drawAuroraRibbon(
      height * 0.35,
      height * 0.12,
      0.002,
      'rgba(236, 72, 153, 0.03)',
      this.auroraTime + 5.0
    );

    this.ctx.restore();
  }

  drawAuroraRibbon(baseY, amp, freq, color, time) {
    const width = this.cssWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(0, baseY);

    for (let x = 0; x < width; x += 15) {
      const y = baseY +
                Math.sin(x * freq + time) * amp +
                Math.cos(x * freq * 0.5 - time * 0.7) * (amp * 0.4);
      this.ctx.lineTo(x, y);
    }

    this.ctx.lineTo(width, this.cssHeight);
    this.ctx.lineTo(0, this.cssHeight);
    this.ctx.closePath();

    const grad = this.ctx.createLinearGradient(0, baseY - amp * 1.5, 0, baseY + amp * 3);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.3, color);
    grad.addColorStop(0.8, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = grad;
    this.ctx.fill();
  }
}

// Global Canvas Manager Instance
const canvasManager = new BackgroundCanvasManager();
window.canvasManager = canvasManager;
