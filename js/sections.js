/* js/sections.js */

document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----------------------------------------------------
  // SECTION 5: INTERACTIVE STAR SKY
  // ----------------------------------------------------
  const starSkyContainer = document.getElementById('star-sky-interactive-container');
  const wishBox = document.getElementById('star-wish-box');
  const wishText = document.getElementById('star-wish-text');

  const kindWishes = [
    "May your heart be light and your mind always find peace.",
    "May you always be surrounded by people who respect your boundaries and value your presence.",
    "May your paths be clear and your dreams remain within your reach.",
    "May you find laughter easily, in the quietest and simplest moments.",
    "May your courage guide you through doubts, and your strength hold you steady.",
    "May your life always be filled with moments that make you smile genuinely.",
    "May you feel free to take all the time you need to find your own way.",
    "May you always know how appreciated you are, simply for being who you are."
  ];

  if (starSkyContainer && wishBox && wishText) {
    const starCount = 8;
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.className = reducedMotion ? 'interactive-star' : 'interactive-star float-slow';
      star.setAttribute('role', 'button');
      star.setAttribute('tabindex', '0');
      star.setAttribute('aria-label', 'Reveal a wish');

      const topPct = 20 + Math.random() * 55;
      const leftPct = 10 + Math.random() * 80;

      star.style.position = 'absolute';
      star.style.top = `${topPct}%`;
      star.style.left = `${leftPct}%`;
      star.style.width = '28px';
      star.style.height = '28px';
      star.style.cursor = 'pointer';
      star.style.zIndex = '15';
      if (!reducedMotion) star.style.animationDelay = `${i * 0.7}s`;

      star.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" style="width: 100%; height: 100%; filter: drop-shadow(0 0 4px var(--color-primary));">
          <path d="M12 2L15 9L22 10L17 15L19 22L12 18L5 22L7 15L2 10L9 9L12 2Z" fill="rgba(216, 180, 254, 0.7)"/>
        </svg>
      `;

      const activate = () => {
        if (window.audioEngine) window.audioEngine.playStarChime();

        wishText.textContent = kindWishes[i];
        wishBox.classList.add('active');

        star.style.filter = 'drop-shadow(0 0 15px var(--color-secondary))';
        setTimeout(() => { star.style.filter = ''; }, 1000);
      };

      star.addEventListener('mouseenter', () => {
        star.style.transform = 'scale(1.4)';
        const path = star.querySelector('path');
        path.setAttribute('fill', 'var(--color-secondary)');
      });

      star.addEventListener('mouseleave', () => {
        star.style.transform = 'scale(1)';
        const path = star.querySelector('path');
        path.setAttribute('fill', 'rgba(216, 180, 254, 0.7)');
      });

      star.addEventListener('click', (e) => {
        e.stopPropagation();
        activate();
      });

      star.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          activate();
        }
      });

      starSkyContainer.appendChild(star);
    }

    const starSkySlide = document.getElementById('slide-star-sky');
    if (starSkySlide) {
      starSkySlide.addEventListener('click', () => {
        wishBox.classList.remove('active');
      });
    }
  }

  // ----------------------------------------------------
  // SECTION 6: GENTLE GARDEN BUTTERFLIES
  // ----------------------------------------------------
  const gardenSlide = document.getElementById('slide-garden');
  const butterflies = [];
  const butterflyCount = window.innerWidth < 640 ? 2 : 3;

  if (gardenSlide) {
    const butterflyContainer = document.getElementById('garden-butterflies-overlay');

    const getBounds = () => gardenSlide.getBoundingClientRect();

    for (let i = 0; i < butterflyCount; i++) {
      const bf = document.createElement('div');
      bf.className = 'garden-butterfly';
      bf.style.position = 'absolute';
      bf.style.width = '24px';
      bf.style.height = '18px';
      bf.style.zIndex = '12';
      bf.style.willChange = 'transform, left, top';

      bf.innerHTML = `
        <svg viewBox="0 0 24 20" style="width: 100%; height: 100%; transform-origin: center;">
          <path d="M12 10 C10 6, 4 4, 2 8 C1 10, 4 12, 12 10" fill="var(--color-primary)" style="animation: wingFlap 0.2s ease-in-out infinite; transform-origin: right center;"/>
          <path d="M12 10 C14 6, 20 4, 22 8 C23 10, 20 12, 12 10" fill="var(--color-primary)" style="animation: wingFlap 0.2s ease-in-out infinite alternate; transform-origin: left center;"/>
          <line x1="12" y1="6" x2="12" y2="14" stroke="var(--color-text-bright)" stroke-width="1.5"/>
        </svg>
      `;

      const bounds = getBounds();
      const bfState = {
        element: bf,
        x: Math.random() * bounds.width,
        y: Math.random() * bounds.height,
        targetX: Math.random() * bounds.width,
        targetY: Math.random() * bounds.height,
        vx: 0,
        vy: 0
      };

      butterflies.push(bfState);
      butterflyContainer.appendChild(bf);
    }

    // Follow cursor gently, using coordinates relative to the garden slide
    if (!reducedMotion) {
      window.addEventListener('mousemove', (e) => {
        if (!gardenSlide.classList.contains('active')) return;
        const bounds = getBounds();
        const relX = e.clientX - bounds.left;
        const relY = e.clientY - bounds.top;

        butterflies.forEach((bf, idx) => {
          bf.targetX = relX + (idx - 1) * 60 + Math.sin(Date.now() * 0.003 + idx) * 30;
          bf.targetY = relY + (idx - 1) * 40 + Math.cos(Date.now() * 0.003 + idx) * 30;
        });
      });
    }

    const animateButterflies = () => {
      if (gardenSlide.classList.contains('active')) {
        const bounds = getBounds();

        butterflies.forEach(bf => {
          if (Math.random() < 0.01) {
            bf.targetX = Math.random() * bounds.width;
            bf.targetY = Math.random() * bounds.height * 0.8;
          }

          const dx = bf.targetX - bf.x;
          const dy = bf.targetY - bf.y;

          bf.vx += dx * 0.005;
          bf.vy += dy * 0.005;

          bf.vx *= 0.94;
          bf.vy *= 0.94;

          bf.x += bf.vx;
          bf.y += bf.vy;

          const angle = Math.atan2(bf.vy, bf.vx);

          bf.element.style.left = `${bf.x}px`;
          bf.element.style.top = `${bf.y}px`;
          bf.element.style.transform = `rotate(${angle * 180 / Math.PI}deg)`;
        });
      }

      requestAnimationFrame(animateButterflies);
    };

    requestAnimationFrame(animateButterflies);
  }

  // ----------------------------------------------------
  // SECTION 12: DRAGGABLE WISH WALL (with persistence)
  // ----------------------------------------------------
  const wishBoard = document.getElementById('wish-wall-board');
  const addWishInput = document.getElementById('add-wish-input');
  const addWishBtn = document.getElementById('add-wish-btn');

  const STORAGE_KEY = 'birthdayWishWallNotes';

  const defaultNotes = [
    { text: "Wishing you a bright year ahead!", color: "lavender" },
    { text: "May your days be kind and peaceful.", color: "pink" },
    { text: "Be proud of how far you have come.", color: "blue" }
  ];

  const noteColors = ["lavender", "pink", "blue", "gold"];

  function loadSavedNotes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function persistNotes(notes) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (err) {
      // Storage unavailable (private browsing, quota) — fail silently
    }
  }

  function getCurrentNotesState() {
    const notes = [];
    if (!wishBoard) return notes;
    wishBoard.querySelectorAll('.sticky-note').forEach(note => {
      const colorMatch = [...note.classList].find(c => noteColors.includes(c));
      notes.push({
        text: note.textContent,
        color: colorMatch || 'lavender',
        left: note.style.left,
        top: note.style.top,
        rotation: note.style.getPropertyValue('--rotation')
      });
    });
    return notes;
  }

  function createStickyNote(text, colorName, savedPos) {
    const note = document.createElement('div');
    note.className = `sticky-note ${colorName}`;
    note.textContent = text;
    note.setAttribute('tabindex', '0');

    const rotation = savedPos && savedPos.rotation ? savedPos.rotation : `${-8 + Math.random() * 16}deg`;
    note.style.setProperty('--rotation', rotation);
    note.style.transform = `rotate(${rotation})`;

    const boardWidth = wishBoard.clientWidth;
    const boardHeight = wishBoard.clientHeight;

    let posX, posY;
    if (savedPos && savedPos.left && savedPos.top) {
      posX = Math.min(parseFloat(savedPos.left), Math.max(10, boardWidth - 140));
      posY = Math.min(parseFloat(savedPos.top), Math.max(10, boardHeight - 130));
    } else {
      posX = Math.max(10, Math.random() * (boardWidth - 140));
      posY = Math.max(10, Math.random() * (boardHeight - 130));
    }

    note.style.left = `${posX}px`;
    note.style.top = `${posY}px`;

    makeElementDraggable(note, wishBoard);

    wishBoard.appendChild(note);
  }

  function makeElementDraggable(elmnt, container) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    elmnt.addEventListener('mousedown', dragMouseDown);
    elmnt.addEventListener('touchstart', dragTouchStart, { passive: false });

    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;

      document.addEventListener('mouseup', closeDragElement);
      document.addEventListener('mousemove', elementDrag);

      if (window.app) window.app.registerUserInteraction();
    }

    function dragTouchStart(e) {
      if (e.touches && e.touches[0]) {
        pos3 = e.touches[0].clientX;
        pos4 = e.touches[0].clientY;

        document.addEventListener('touchend', closeDragElement);
        document.addEventListener('touchmove', elementTouchDrag, { passive: false });

        if (window.app) window.app.registerUserInteraction();
      }
    }

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;

      moveNote(elmnt, pos1, pos2, container);
    }

    function elementTouchDrag(e) {
      if (e.touches && e.touches[0]) {
        pos1 = pos3 - e.touches[0].clientX;
        pos2 = pos4 - e.touches[0].clientY;
        pos3 = e.touches[0].clientX;
        pos4 = e.touches[0].clientY;

        moveNote(elmnt, pos1, pos2, container);
      }
    }

    function closeDragElement() {
      document.removeEventListener('mouseup', closeDragElement);
      document.removeEventListener('mousemove', elementDrag);
      document.removeEventListener('touchend', closeDragElement);
      document.removeEventListener('touchmove', elementTouchDrag);
      persistNotes(getCurrentNotesState());
    }
  }

  function moveNote(note, dx, dy, board) {
    let newTop = note.offsetTop - dy;
    let newLeft = note.offsetLeft - dx;

    const maxLeft = board.clientWidth - note.clientWidth - 10;
    const maxTop = board.clientHeight - note.clientHeight - 10;

    newLeft = Math.max(10, Math.min(newLeft, maxLeft));
    newTop = Math.max(10, Math.min(newTop, maxTop));

    note.style.left = `${newLeft}px`;
    note.style.top = `${newTop}px`;
  }

  if (wishBoard) {
    const saved = loadSavedNotes();

    if (saved && saved.length) {
      saved.forEach(n => createStickyNote(n.text, n.color, n));
    } else {
      defaultNotes.forEach(note => createStickyNote(note.text, note.color));
    }

    const pinWish = () => {
      const text = addWishInput.value.trim();
      if (text) {
        const randColor = noteColors[Math.floor(Math.random() * noteColors.length)];
        createStickyNote(text, randColor);
        addWishInput.value = '';
        persistNotes(getCurrentNotesState());
      }
    };

    addWishBtn.addEventListener('click', pinWish);

    addWishInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        pinWish();
      }
    });
  }

  // ----------------------------------------------------
  // RESTART JOURNEY LINK IN FINAL SCENE
  // ----------------------------------------------------
  const restartBtn = document.getElementById('restart-journey-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      if (window.app) {
        window.app.goToSlide(0);
      }
    });
  }
});
