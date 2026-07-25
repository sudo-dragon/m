/* js/app.js */

class AppController {
  constructor() {
    this.currentSlideIndex = 0;
    this.slides = [];
    this.autoPlayDuration = 16000; // base; randomized per-slide within 15-18s
    this.progressStartTime = 0;
    this.progressElapsed = 0;
    this.isPlaying = false; // Is slideshow auto-playing
    this.animationFrameId = null;

    // Idle/Interaction handling
    this.idleTimeout = null;
    this.idleDuration = 10000; // 10 seconds idle to resume autoplay

    // Mouse coords
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    // Opening screen timeouts
    this.openingTimeouts = [];

    // Respect user's reduced-motion preference
    this.reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Cinematic transitions rotate so the same one never plays twice in a row
    this.transitionStyles = ['transition-blur', 'transition-rise', 'transition-drift', 'transition-bloom'];
    this.lastTransitionStyle = null;

    // Coarse-pointer (touch) detection — skip cursor-follow effects
    this.isTouchDevice = window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;

    this.isTabVisible = true;
  }

  init() {
    this.slides = Array.from(document.querySelectorAll('.slide'));
    if (this.slides.length === 0) return;

    // Elements Setup
    this.setupCursor();
    this.setupEvents();
    this.setupMusicPlayer();
    this.setupVisibilityHandling();

    // Initialize Progress Bar segments in UI
    this.initProgressBar();

    // Activate first slide
    this.goToSlide(0);

    // Initialize Canvas
    if (window.canvasManager) {
      window.canvasManager.init();
    }
  }

  // Pause heavy work when the tab is hidden (battery/perf friendliness)
  setupVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      this.isTabVisible = document.visibilityState === 'visible';

      if (!this.isTabVisible) {
        if (window.canvasManager) window.canvasManager.stopLoop();
        if (window.audioEngine && window.audioEngine.ctx && window.audioEngine.isPlaying) {
          window.audioEngine.ctx.suspend();
        }
      } else {
        if (window.canvasManager) window.canvasManager.startLoop();
        if (window.audioEngine && window.audioEngine.ctx && window.audioEngine.isPlaying) {
          window.audioEngine.ctx.resume();
        }
      }
    });
  }

  // Segmented Progress Bar Setup
  initProgressBar() {
    const container = document.getElementById('progress-bar-container');
    if (!container) return;

    container.innerHTML = '';
    this.slides.forEach((_, idx) => {
      const segBg = document.createElement('div');
      segBg.className = 'progress-segment-bg';
      segBg.id = `progress-seg-${idx}`;

      const segFill = document.createElement('div');
      segFill.className = 'progress-segment-fill';

      segBg.appendChild(segFill);
      container.appendChild(segBg);
    });
  }

  // Pick the next transition style, guaranteeing no immediate repeat
  pickTransitionStyle() {
    if (this.reducedMotion) return null; // handled globally via prefers-reduced-motion CSS
    const options = this.transitionStyles.filter(t => t !== this.lastTransitionStyle);
    const chosen = options[Math.floor(Math.random() * options.length)];
    this.lastTransitionStyle = chosen;
    return chosen;
  }

  // Activate Slide Transition
  goToSlide(index) {
    if (index < 0 || index >= this.slides.length) return;

    const prevSlide = this.slides[this.currentSlideIndex];
    const nextSlide = this.slides[index];
    const transitionClass = this.pickTransitionStyle();

    // Clear opening timeouts
    if (this.openingTimeouts) {
      this.openingTimeouts.forEach(t => clearTimeout(t));
      this.openingTimeouts = [];
    }

    // Remove active/transition state from all slides
    this.slides.forEach(slide => {
      slide.classList.remove('active', 'slide-entering', 'slide-leaving',
        'transition-blur', 'transition-rise', 'transition-drift', 'transition-bloom');
    });

    if (prevSlide && prevSlide !== nextSlide) {
      prevSlide.classList.add('slide-leaving');
      if (transitionClass) prevSlide.classList.add(transitionClass);
    }

    nextSlide.classList.add('active', 'slide-entering');
    if (transitionClass) nextSlide.classList.add(transitionClass);

    this.currentSlideIndex = index;

    // Reset and sync progress bar segments
    this.updateProgressBarUI();

    // Reveal text lines inside new active slide sequentially
    if (index === 0) {
      const txt1 = document.getElementById('intro-text-1');
      const txt2 = document.getElementById('intro-text-2');
      const txt3 = document.getElementById('intro-text-3');
      const btn = document.getElementById('btn-begin-journey');
      const line = nextSlide.querySelector('.intro-line');

      if (txt1) txt1.classList.remove('active');
      if (txt2) txt2.classList.remove('active');
      if (txt3) txt3.classList.remove('active');
      if (btn) btn.classList.remove('visible');
      if (line) {
        line.classList.remove('active');
        void line.offsetWidth; // force reflow
        line.classList.add('active');
      }

      this.openingTimeouts.push(setTimeout(() => { if (txt1) txt1.classList.add('active'); }, 1500));
      this.openingTimeouts.push(setTimeout(() => { if (txt2) txt2.classList.add('active'); }, 4000));
      this.openingTimeouts.push(setTimeout(() => { if (txt3) txt3.classList.add('active'); }, 6500));
      this.openingTimeouts.push(setTimeout(() => { if (btn) btn.classList.add('visible'); }, 9000));

    } else {
      const revealItems = nextSlide.querySelectorAll('.reveal-text');
      revealItems.forEach(item => item.classList.remove('active'));

      revealItems.forEach((item, idx) => {
        setTimeout(() => {
          item.classList.add('active');
        }, 250 + idx * 220); // staggered fade, slightly tighter for snappier pacing
      });
    }

    // If we transition to opening slide, hide bottom controller
    const ctrlBar = document.getElementById('journey-controls-bar');
    if (index === 0) {
      if (ctrlBar) ctrlBar.classList.remove('visible');
      this.pauseAutoplay();
    } else {
      if (ctrlBar) ctrlBar.classList.add('visible');
      this.resumeAutoplay();
    }

    // Reset tilt variables
    const cards = nextSlide.querySelectorAll('.glass-card');
    cards.forEach(card => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
  }

  // Update segments style (filled, empty, active)
  updateProgressBarUI() {
    this.slides.forEach((_, idx) => {
      const seg = document.getElementById(`progress-seg-${idx}`);
      if (!seg) return;

      const fill = seg.querySelector('.progress-segment-fill');

      if (idx < this.currentSlideIndex) {
        seg.classList.add('filled');
        fill.style.width = '100%';
      } else {
        seg.classList.remove('filled');
        fill.style.width = '0%';
      }
    });

    // Pick a fresh randomized duration between 15s and 18s for this slide
    this.autoPlayDuration = 15000 + Math.random() * 3000;

    // Reset anim state
    this.progressStartTime = performance.now();
    this.progressElapsed = 0;
  }

  // Animation Loop for Progress Fill
  animateProgress(timestamp) {
    if (!this.isPlaying) return;

    if (!this.progressStartTime) this.progressStartTime = timestamp;
    this.progressElapsed = timestamp - this.progressStartTime;

    const percentage = Math.min((this.progressElapsed / this.autoPlayDuration) * 100, 100);

    const activeFill = document.querySelector(`#progress-seg-${this.currentSlideIndex} .progress-segment-fill`);
    if (activeFill) {
      activeFill.style.width = `${percentage}%`;
    }

    if (this.progressElapsed >= this.autoPlayDuration) {
      // Auto advance to next slide
      if (this.currentSlideIndex < this.slides.length - 1) {
        this.goToSlide(this.currentSlideIndex + 1);
      } else {
        // Stop at final slide
        this.pauseAutoplay();
      }
    }

    this.animationFrameId = requestAnimationFrame(t => this.animateProgress(t));
  }

  // Slideshow play states
  startAutoplay() {
    if (this.isPlaying || this.currentSlideIndex === 0) return;
    this.isPlaying = true;
    this.progressStartTime = performance.now() - this.progressElapsed;
    this.animationFrameId = requestAnimationFrame(t => this.animateProgress(t));

    const playPauseBtn = document.getElementById('ctrl-play-pause');
    if (playPauseBtn) {
      playPauseBtn.innerHTML = '&#9611;&#9611;'; // pause icon
      playPauseBtn.setAttribute('aria-label', 'Pause slideshow');
      playPauseBtn.setAttribute('aria-pressed', 'true');
    }
  }

  pauseAutoplay() {
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const playPauseBtn = document.getElementById('ctrl-play-pause');
    if (playPauseBtn) {
      playPauseBtn.innerHTML = '&#9654;'; // play icon
      playPauseBtn.setAttribute('aria-label', 'Play slideshow');
      playPauseBtn.setAttribute('aria-pressed', 'false');
    }
  }

  // Pause slideshow on manual interaction, resume after idle
  registerUserInteraction() {
    if (this.currentSlideIndex === 0) return; // ignore opening slide

    this.pauseAutoplay();

    clearTimeout(this.idleTimeout);
    this.idleTimeout = setTimeout(() => {
      this.startAutoplay();
    }, this.idleDuration);
  }

  resumeAutoplay() {
    clearTimeout(this.idleTimeout);
    this.startAutoplay();
  }

  // Set up mouse trail and custom cursor
  setupCursor() {
    if (this.isTouchDevice) return; // no synthetic cursor on touch

    const cursor = document.getElementById('custom-cursor');

    const renderCursor = () => {
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.12;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.12;

      if (cursor) {
        cursor.style.left = `${this.mouse.x}px`;
        cursor.style.top = `${this.mouse.y}px`;
      }

      requestAnimationFrame(renderCursor);
    };
    requestAnimationFrame(renderCursor);
  }

  // Click ripples and cursor trail particle generation
  createCursorTrail(x, y) {
    if (this.reducedMotion) return;
    if (Math.random() > 0.4) return; // limit count

    const particle = document.createElement('div');
    particle.className = 'cursor-particle';

    const size = Math.random() * 6 + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = Math.random() > 0.5 ? 'var(--color-primary)' : 'var(--color-secondary)';
    particle.style.position = 'fixed';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.borderRadius = '50%';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '99998';

    particle.style.animation = 'particleFade 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards';

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 1.5;
    const destX = Math.cos(angle) * speed * 25;
    const destY = Math.sin(angle) * speed * 25;

    particle.style.setProperty('--x', `${destX}px`);
    particle.style.setProperty('--y', `${destY}px`);

    document.body.appendChild(particle);

    setTimeout(() => {
      particle.remove();
    }, 1200);
  }

  createClickRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    document.body.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 800);
  }

  // Keyboard, Mouse, and UI Event Handlers
  setupEvents() {
    // Mouse coords tracking (desktop only — meaningless on touch)
    if (!this.isTouchDevice) {
      window.addEventListener('mousemove', e => {
        this.mouse.targetX = e.clientX;
        this.mouse.targetY = e.clientY;
        this.createCursorTrail(e.clientX, e.clientY);

        document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);

        // 3D Card Tilt Effect
        const activeSlide = this.slides[this.currentSlideIndex];
        if (activeSlide) {
          const card = activeSlide.querySelector('.glass-card');
          if (card) {
            const rect = card.getBoundingClientRect();
            const cardX = e.clientX - rect.left - rect.width / 2;
            const cardY = e.clientY - rect.top - rect.height / 2;

            const rotX = -(cardY / (rect.height / 2)) * 3;
            const rotY = (cardX / (rect.width / 2)) * 3;

            if (!this.reducedMotion) {
              card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
            }

            card.style.setProperty('--mouse-card-x', `${cardX}px`);
            card.style.setProperty('--mouse-card-y', `${cardY}px`);
          }
        }
      });
    }

    // Cursor hover effects on links/buttons
    document.addEventListener('mouseover', e => {
      if (e.target.closest('button') || e.target.closest('.control-btn') || e.target.closest('.polaroid-frame') || e.target.closest('.sticky-note') || e.target.closest('input')) {
        document.body.classList.add('cursor-hover');
      } else {
        document.body.classList.remove('cursor-hover');
      }
    });

    // Ripple click
    window.addEventListener('mousedown', e => {
      document.body.classList.add('cursor-active');
      this.createClickRipple(e.clientX, e.clientY);
      this.registerUserInteraction();
    });

    window.addEventListener('mouseup', () => {
      document.body.classList.remove('cursor-active');
    });

    // Touch Events compatibility
    window.addEventListener('touchstart', e => {
      if (e.touches && e.touches[0]) {
        this.createClickRipple(e.touches[0].clientX, e.touches[0].clientY);
        this.registerUserInteraction();
      }
    }, { passive: true });

    // Keyboard navigation
    window.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') {
        this.nextSlide();
        this.registerUserInteraction();
      } else if (e.key === 'ArrowLeft') {
        this.prevSlide();
        this.registerUserInteraction();
      } else if (e.key === ' ') {
        // Don't hijack space bar while typing in the wish input
        if (e.target && e.target.tagName === 'INPUT') return;
        e.preventDefault();
        this.toggleAutoplay();
        this.registerUserInteraction();
      }
    });

    // UI Buttons
    const prevBtn = document.getElementById('ctrl-prev');
    const nextBtn = document.getElementById('ctrl-next');
    const playPauseBtn = document.getElementById('ctrl-play-pause');
    if (prevBtn) prevBtn.addEventListener('click', () => { this.prevSlide(); this.registerUserInteraction(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { this.nextSlide(); this.registerUserInteraction(); });
    if (playPauseBtn) playPauseBtn.addEventListener('click', () => { this.toggleAutoplay(); this.registerUserInteraction(); });

    // Special Begin Journey Button
    const beginBtn = document.getElementById('btn-begin-journey');
    if (beginBtn) {
      beginBtn.addEventListener('click', () => {
        // Only start the music if it isn't already playing — this button can be
        // reached again via "Restart Journey", and it must never cut the music off.
        if (window.audioEngine && !window.audioEngine.isPlaying) {
          window.audioEngine.toggle();
        }
        this.goToSlide(1);
      });

      if (!this.isTouchDevice) {
        beginBtn.addEventListener('mousemove', e => {
          if (this.reducedMotion) return;
          const rect = beginBtn.getBoundingClientRect();
          const btnX = e.clientX - rect.left - rect.width / 2;
          const btnY = e.clientY - rect.top - rect.height / 2;
          beginBtn.style.transform = `translate(${btnX * 0.35}px, ${btnY * 0.35}px)`;
        });

        beginBtn.addEventListener('mouseleave', () => {
          beginBtn.style.transform = 'translate(0, 0)';
        });
      }
    }
  }

  // Floating Music Player UI binding
  setupMusicPlayer() {
    const playBtn = document.getElementById('music-play-btn');
    const playerContainer = document.getElementById('music-player-container');
    const volSlider = document.getElementById('music-vol-slider');

    if (playBtn && window.audioEngine) {
      playBtn.addEventListener('click', () => {
        const playing = window.audioEngine.toggle();

        if (playing) {
          playBtn.innerHTML = '&#9611;&#9611;';
          playBtn.setAttribute('aria-label', 'Pause ambient music');
          playBtn.setAttribute('aria-pressed', 'true');
          playerContainer.classList.add('music-playing');
        } else {
          playBtn.innerHTML = '&#9654;';
          playBtn.setAttribute('aria-label', 'Play ambient music');
          playBtn.setAttribute('aria-pressed', 'false');
          playerContainer.classList.remove('music-playing');
        }
        this.registerUserInteraction();
      });
    }

    if (volSlider && window.audioEngine) {
      volSlider.addEventListener('input', e => {
        window.audioEngine.setVolume(parseFloat(e.target.value));
      });
    }
  }

  prevSlide() {
    if (this.currentSlideIndex > 0) {
      this.goToSlide(this.currentSlideIndex - 1);
    }
  }

  nextSlide() {
    if (this.currentSlideIndex < this.slides.length - 1) {
      this.goToSlide(this.currentSlideIndex + 1);
    }
  }

  toggleAutoplay() {
    if (this.isPlaying) {
      this.pauseAutoplay();
    } else {
      this.startAutoplay();
    }
  }
}

// Instantiate and start app
document.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  window.app = app;
  app.init();
});
