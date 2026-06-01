/**
 * SGFC — Widget flotante de accesibilidad.
 *  - Tamaño de texto: base, XL, XXL
 *  - Modo descanso (tonos cálidos, menos luz azul)
 * Persiste preferencias en localStorage.
 */

const STORAGE_KEY = 'sgfc:accessibility';
const FONT_SIZES = ['base', 'xl', 'xxl'];

const ICON_ACCESSIBILITY = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M12 6v2"/><path d="M6 8l2 1"/><path d="M18 8l-2 1"/><path d="M5 13l3-1"/><path d="M19 13l-3-1"/><path d="M8 20l1-5"/><path d="M16 20l-1-5"/><path d="M12 20v-4"/></svg>`;

const ICON_MOON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

/** @returns {{ fontSize: string, restMode: boolean }} */
function readSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { fontSize: 'base', restMode: false };
    const data = JSON.parse(raw);
    const fontSize = FONT_SIZES.includes(data.fontSize) ? data.fontSize : 'base';
    return { fontSize, restMode: !!data.restMode };
  } catch {
    return { fontSize: 'base', restMode: false };
  }
}

/** @param {{ fontSize: string, restMode: boolean }} settings */
function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** @param {{ fontSize: string, restMode: boolean }} settings */
export function applyAccessibilitySettings(settings) {
  const html = document.documentElement;
  html.dataset.fontSize = settings.fontSize;
  html.dataset.restMode = settings.restMode ? 'on' : 'off';
}

let current = readSettings();
applyAccessibilitySettings(current);

let mounted = false;

/** Monta el botón flotante y engancha controles. Idempotente. */
export function initAccessibility() {
  if (mounted || document.getElementById('a11y-fab')) {
    mounted = true;
    return;
  }
  mounted = true;

  const wrap = document.createElement('div');
  wrap.className = 'a11y-fab';
  wrap.id = 'a11y-fab';
  wrap.innerHTML = `
    <div class="a11y-panel hidden" id="a11y-panel" role="dialog" aria-modal="true" aria-labelledby="a11y-panel-title">
      <div class="a11y-panel-header">
        <h3 id="a11y-panel-title">Accesibilidad</h3>
        <button type="button" class="a11y-close" id="a11y-close" aria-label="Cerrar panel de accesibilidad">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="a11y-section">
        <span class="a11y-label">Tamaño de texto</span>
        <div class="a11y-segmented" role="group" aria-label="Tamaño de texto">
          <button type="button" class="a11y-seg-btn" data-size="base" aria-pressed="true">Base</button>
          <button type="button" class="a11y-seg-btn" data-size="xl" aria-pressed="false">XL</button>
          <button type="button" class="a11y-seg-btn" data-size="xxl" aria-pressed="false">XXL</button>
        </div>
      </div>

      <div class="a11y-section">
        <div class="a11y-section-row">
          <div>
            <span class="a11y-label">Modo descanso</span>
            <p class="a11y-desc">Tonos cálidos que reducen la emisión de luz azul para proteger la vista.</p>
          </div>
          ${ICON_MOON}
        </div>
        <button type="button" class="a11y-switch" id="a11y-rest-toggle" role="switch" aria-checked="false">
          <span class="a11y-switch-track"><span class="a11y-switch-thumb"></span></span>
          <span class="a11y-switch-label">Desactivado</span>
        </button>
      </div>
    </div>

    <button type="button" class="a11y-fab-btn" id="a11y-fab-btn" aria-expanded="false" aria-controls="a11y-panel" title="Accesibilidad">
      ${ICON_ACCESSIBILITY}
      <span class="a11y-fab-label">Accesibilidad</span>
    </button>
  `;

  document.body.appendChild(wrap);

  const panel = document.getElementById('a11y-panel');
  const fabBtn = document.getElementById('a11y-fab-btn');
  const closeBtn = document.getElementById('a11y-close');
  const restToggle = document.getElementById('a11y-rest-toggle');
  const segBtns = wrap.querySelectorAll('.a11y-seg-btn');

  function syncUi() {
    segBtns.forEach(btn => {
      const active = btn.dataset.size === current.fontSize;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    restToggle.classList.toggle('on', current.restMode);
    restToggle.setAttribute('aria-checked', current.restMode ? 'true' : 'false');
    restToggle.querySelector('.a11y-switch-label').textContent = current.restMode ? 'Activado' : 'Desactivado';
  }

  function persist() {
    saveSettings(current);
    applyAccessibilitySettings(current);
    syncUi();
  }

  function openPanel() {
    panel.classList.remove('hidden');
    fabBtn.setAttribute('aria-expanded', 'true');
  }

  function closePanel() {
    panel.classList.add('hidden');
    fabBtn.setAttribute('aria-expanded', 'false');
  }

  function togglePanel() {
    if (panel.classList.contains('hidden')) openPanel();
    else closePanel();
  }

  fabBtn.addEventListener('click', e => {
    e.stopPropagation();
    togglePanel();
  });

  closeBtn.addEventListener('click', closePanel);

  segBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      current = { ...current, fontSize: btn.dataset.size };
      persist();
    });
  });

  restToggle.addEventListener('click', () => {
    current = { ...current, restMode: !current.restMode };
    persist();
  });

  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) closePanel();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePanel();
  });

  syncUi();
}
