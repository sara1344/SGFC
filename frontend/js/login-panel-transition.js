/**
 * Transición del panel con imagen al navegar entre login y recuperar contraseña.
 */
const STORAGE_KEY = 'sgfc:login-panel-transition';

export const LoginPanelTransition = {
  TO_FORGOT: 'to-forgot',
  TO_LOGIN: 'to-login',
};

export function markLoginPanelTransition(direction) {
  try {
    sessionStorage.setItem(STORAGE_KEY, direction);
  } catch {
    /* ignore */
  }
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function halfShift(layout) {
  return Math.round(layout.offsetWidth / 2);
}

function runPanelSwap({ imagePanel, formPanel, layout, fromXImage, fromXForm, toXImage, toXForm }) {
  const duration = 560;
  const easing = 'cubic-bezier(0.4, 0, 0.2, 1)';

  layout.classList.add('login-layout--swap-animating');
  imagePanel.style.transition = `transform ${duration}ms ${easing}`;
  formPanel.style.transition = `transform ${duration}ms ${easing}`;
  imagePanel.style.transform = fromXImage;
  formPanel.style.transform = fromXForm;

  const finish = () => {
    imagePanel.style.transition = '';
    imagePanel.style.transform = '';
    formPanel.style.transition = '';
    formPanel.style.transform = '';
    layout.classList.remove(
      'login-layout--swap-animating',
      'login-layout--swap-from-login',
      'login-layout--swap-from-forgot',
    );
    document.documentElement.classList.remove(
      'login-awaiting-transition',
      'login-awaiting-to-login',
    );
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      imagePanel.style.transform = toXImage;
      formPanel.style.transform = toXForm;
    });
  });

  imagePanel.addEventListener('transitionend', finish, { once: true });
  setTimeout(finish, duration + 80);
}

/**
 * @param {'login'|'forgot'} page
 */
export function initLoginPanelTransition(page) {
  let dir;
  try {
    dir = sessionStorage.getItem(STORAGE_KEY);
    if (dir) sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }

  if (!dir || prefersReducedMotion() || window.innerWidth <= 900) {
    document.documentElement.classList.remove(
      'login-awaiting-transition',
      'login-awaiting-to-login',
    );
    return;
  }

  const layout = document.querySelector('.login-layout');
  const imagePanel = document.querySelector('.login-panel-left');
  const formPanel = document.querySelector('.login-panel-right');
  if (!layout || !imagePanel || !formPanel) return;

  const shift = halfShift(layout);

  if (page === 'forgot' && dir === LoginPanelTransition.TO_FORGOT) {
    layout.classList.add('login-layout--swap-from-login');
    runPanelSwap({
      layout,
      imagePanel,
      formPanel,
      fromXImage: 'translateX(0)',
      fromXForm: 'translateX(0)',
      toXImage: `translateX(${shift}px)`,
      toXForm: `translateX(-${shift}px)`,
    });
    return;
  }

  if (page === 'login' && dir === LoginPanelTransition.TO_LOGIN) {
    layout.classList.add('login-layout--swap-from-forgot');
    runPanelSwap({
      layout,
      imagePanel,
      formPanel,
      fromXImage: 'translateX(0)',
      fromXForm: 'translateX(0)',
      toXImage: `translateX(-${shift}px)`,
      toXForm: `translateX(${shift}px)`,
    });
  }
}

/** @param {Document|HTMLElement} [root] */
export function bindLoginPanelTransitionLinks(root = document) {
  root.querySelectorAll('[data-login-transition]').forEach((el) => {
    el.addEventListener('click', () => {
      const dir = el.getAttribute('data-login-transition');
      if (dir) markLoginPanelTransition(dir);
    });
  });
}
