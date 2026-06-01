/**
 * SGFC — Presentación Web
 * Navegación entre slides, teclado, progreso y partículas de fondo.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Configuración
  ------------------------------------------------------------------ */
  const TOTAL_SLIDES = 4;
  let currentSlide = 0;

  /* Elementos DOM */
  const track       = document.getElementById('slides-track');
  const slides      = document.querySelectorAll('.slide');
  const btnPrev     = document.getElementById('btn-prev');
  const btnNext     = document.getElementById('btn-next');
  const dots        = document.querySelectorAll('.progress-dot');
  const progressBar = document.getElementById('progress-bar');
  const counterCurrent = document.getElementById('counter-current');
  const canvas      = document.getElementById('particles-canvas');
  const ctx         = canvas.getContext('2d');

  /* ------------------------------------------------------------------
     Navegación de slides
  ------------------------------------------------------------------ */

  /** Reinicia animaciones CSS quitando y volviendo a poner .is-active */
  function restartAnimations(index) {
    slides.forEach((slide, i) => {
      slide.classList.remove('is-active');
      if (i === index) {
        /* Forzar reflow para reiniciar transiciones CSS */
        void slide.offsetWidth;
        slide.classList.add('is-active');
      }
    });
  }

  /** Actualiza UI: track, botones, puntos, barra y contador */
  function updateUI() {
    track.style.transform = `translateX(-${currentSlide * (100 / TOTAL_SLIDES)}%)`;

    btnPrev.disabled = currentSlide === 0;
    btnNext.disabled = currentSlide === TOTAL_SLIDES - 1;

    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === currentSlide);
      dot.setAttribute('aria-selected', i === currentSlide ? 'true' : 'false');
    });

    const progress = ((currentSlide + 1) / TOTAL_SLIDES) * 100;
    progressBar.style.width = `${progress}%`;
    counterCurrent.textContent = String(currentSlide + 1).padStart(2, '0');

    restartAnimations(currentSlide);
  }

  function goToSlide(index) {
    if (index < 0 || index >= TOTAL_SLIDES || index === currentSlide) return;
    currentSlide = index;
    updateUI();
  }

  function nextSlide() { goToSlide(currentSlide + 1); }
  function prevSlide() { goToSlide(currentSlide - 1); }

  /* Eventos de botones */
  btnPrev.addEventListener('click', prevSlide);
  btnNext.addEventListener('click', nextSlide);

  /* Navegación con teclado */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      prevSlide();
    }
  });

  /* Clic en indicadores de progreso */
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      goToSlide(Number(dot.dataset.index));
    });
  });

  /* Swipe táctil (móvil) */
  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) < 50) return;
    diff > 0 ? nextSlide() : prevSlide();
  }, { passive: true });

  /* ------------------------------------------------------------------
     Partículas de fondo (canvas ligero)
  ------------------------------------------------------------------ */
  let particles = [];
  let animFrameId = null;

  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticles(count) {
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r:  Math.random() * 1.8 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }
  }

  function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* Líneas entre partículas cercanas */
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(57, 169, 0, ${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    /* Dibujar partículas */
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(57, 169, 0, ${p.opacity})`;
      ctx.fill();
    });

    animFrameId = requestAnimationFrame(drawParticles);
  }

  function initParticles() {
    resizeCanvas();
    const count = window.innerWidth < 768 ? 40 : 70;
    createParticles(count);
    if (animFrameId) cancelAnimationFrame(animFrameId);
    drawParticles();
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    createParticles(window.innerWidth < 768 ? 40 : 70);
  });

  /* ------------------------------------------------------------------
     Microinteracciones en cards
  ------------------------------------------------------------------ */
  document.querySelectorAll('.glass-card, .flow-step, .tech-layer, .tech-badge').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      el.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
    });
  });

  /* ------------------------------------------------------------------
     Inicialización
  ------------------------------------------------------------------ */
  initParticles();
  updateUI();

})();
