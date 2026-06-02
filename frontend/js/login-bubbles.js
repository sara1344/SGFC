/**
 * Animación de círculos en el panel de inicio de sesión (esquinas).
 * Se alejan suavemente del cursor al pasar cerca.
 */

const BUBBLE_COLORS = ['#00304D', '#007832', '#71277A', '#50E5F9'];

const BUBBLE_COUNT = 42;
const FLEE_RADIUS = 80;
const FLEE_FORCE = 0.42;
const MAX_SPEED = 0.75;
const FRICTION = 0.97;
const DRIFT = 0.12;

/**
 * @param {HTMLElement} panel — .login-panel-right
 */
export function initLoginBubbles(panel) {
  const canvases = panel.querySelectorAll('.login-bubbles-canvas');
  if (!canvases.length) return () => {};

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvases.forEach(drawStatic);
    return () => {};
  }

  const cleanups = [...canvases].map((canvas) => initCanvasBubbles(canvas, panel));
  return () => cleanups.forEach((fn) => fn());
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} panel
 */
function initCanvasBubbles(canvas, panel) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let size = { w: 0, h: 0 };
  let bubbles = [];
  let rafId = 0;
  const mouse = { x: -9999, y: -9999, active: false };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return size;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    size = { w: rect.width, h: rect.height };
    return size;
  }

  function createBubbles() {
    bubbles = [];
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const r = 4 + Math.random() * 10;
      bubbles.push({
        x: size.w * (0.12 + Math.random() * 0.88),
        y: size.h * (0.12 + Math.random() * 0.88),
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r,
        color: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
        alpha: 0.5 + Math.random() * 0.4,
      });
    }
  }

  function updateMouse(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = clientX - rect.left;
    mouse.y = clientY - rect.top;
    mouse.active = true;
  }

  function tick() {
    const { w, h } = size;
    if (!w || !h) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    for (const b of bubbles) {
      if (mouse.active) {
        const dx = b.x - mouse.x;
        const dy = b.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < FLEE_RADIUS) {
          const push = ((FLEE_RADIUS - dist) / FLEE_RADIUS) * FLEE_FORCE;
          b.vx += (dx / dist) * push;
          b.vy += (dy / dist) * push;
        }
      }

      b.vx += (Math.random() - 0.5) * DRIFT * 0.04;
      b.vy += (Math.random() - 0.5) * DRIFT * 0.04;

      let speed = Math.hypot(b.vx, b.vy);
      if (speed > MAX_SPEED) {
        b.vx = (b.vx / speed) * MAX_SPEED;
        b.vy = (b.vy / speed) * MAX_SPEED;
      }

      b.vx *= FRICTION;
      b.vy *= FRICTION;
      b.x += b.vx;
      b.y += b.vy;

      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.65; }
      if (b.x + b.r > w) { b.x = w - b.r; b.vx = -Math.abs(b.vx) * 0.65; }
      if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.65; }
      if (b.y + b.r > h) { b.y = h - b.r; b.vy = -Math.abs(b.vy) * 0.65; }
    }

    ctx.clearRect(0, 0, w, h);
    for (const b of bubbles) {
      ctx.globalAlpha = b.alpha;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    rafId = requestAnimationFrame(tick);
  }

  function onResize() {
    resize();
    if (bubbles.length === 0) createBubbles();
  }

  const ro = new ResizeObserver(onResize);
  ro.observe(canvas);
  onResize();
  if (bubbles.length === 0) createBubbles();

  const onMove = (e) => updateMouse(e.clientX, e.clientY);
  const onLeave = () => { mouse.active = false; };

  panel.addEventListener('mousemove', onMove);
  panel.addEventListener('mouseleave', onLeave);

  rafId = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(rafId);
    ro.disconnect();
    panel.removeEventListener('mousemove', onMove);
    panel.removeEventListener('mouseleave', onLeave);
  };
}

function drawStatic(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width;
  const h = rect.height;
  for (let i = 0; i < BUBBLE_COUNT; i++) {
    const nx = 0.15 + (i * 17 % 85) / 100;
    const ny = 0.15 + (i * 23 % 85) / 100;
    const r = 4 + (i % 11);
    ctx.globalAlpha = 0.55 + (i % 4) * 0.1;
    ctx.beginPath();
    ctx.arc(w * nx, h * ny, r, 0, Math.PI * 2);
    ctx.fillStyle = BUBBLE_COLORS[i % BUBBLE_COLORS.length];
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
