/**
 * SGFC — Motor interactivo de manuales de usuario
 * Navegación, búsqueda, acordeones, imágenes, progreso y toasts.
 */
const ManualCore = (() => {
  'use strict';

  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;
  const ANNOTATE_COLOR = '#39A900';
  const MARKER_RADIUS = 14;
  const MARKER_HIT_RADIUS = 18;
  const annotators = new WeakMap();

  let config = {};
  let state = {
    sections: [],
    currentIndex: 0,
    compactMode: false,
    sidebarOpen: false
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function init(userConfig) {
    config = {
      uploadUrl: 'upload.php',
      deleteUrl: 'delete.php',
      imagesPath: 'imagenes/',
      backUrl: '../index.html',
      roleIcon: '📘',
      accent: '#39A900',
      accentLight: '#F0FDF4',
      ...userConfig
    };

    document.documentElement.style.setProperty('--accent', config.accent);
    document.documentElement.style.setProperty('--accent-light', config.accentLight);

    state.sections = config.sections || [];
    renderApp();
    bindGlobalEvents();
    initImageBlocks();
    updateProgress();
    openSection(0, false);
  }

  function renderApp() {
    const app = $('#manual-app');
    if (!app) return;

    app.className = 'manual-app';
    app.innerHTML = `
      <div class="reading-progress" id="reading-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>
      <div class="sidebar-overlay" id="sidebar-overlay" aria-hidden="true"></div>

      <aside class="manual-sidebar" id="manual-sidebar" aria-label="Índice del manual">
        <div class="manual-sidebar__brand">
          <h1>SGFC <span class="tag">SENA</span></h1>
          <p>${escapeHtml(config.subtitle || config.role)}</p>
        </div>
        <div class="manual-search-wrap" style="position:relative">
          <svg class="manual-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="search" class="manual-search" id="manual-search" placeholder="Buscar dentro del manual…" aria-label="Buscar dentro del manual">
        </div>
        <ul class="manual-nav" id="manual-nav" role="navigation"></ul>
      </aside>

      <div class="manual-content-wrap">
        <div class="manual-toolbar" role="toolbar" aria-label="Controles del manual">
          <button type="button" class="btn-menu-mobile" id="btn-menu-mobile" aria-label="Abrir índice" aria-expanded="false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
          <div class="toolbar-group">
            <a href="${config.backUrl}" class="btn btn-sec btn-sm" aria-label="Volver a manuales">← Manuales</a>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-prev" aria-label="Sección anterior">← Anterior</button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-next" aria-label="Sección siguiente">Siguiente →</button>
          </div>
          <div class="toolbar-spacer"></div>
          <div class="toolbar-group">
            <button type="button" class="btn btn-ghost btn-sm" id="btn-expand" aria-label="Expandir todas las secciones">Expandir todo</button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-collapse" aria-label="Contraer todas las secciones">Contraer todo</button>
          </div>
        </div>

        <main class="manual-main" id="manual-main">
          <header class="manual-cover" id="manual-cover">
            <div class="role-badge">${config.roleIcon} Rol: ${escapeHtml(config.role)}</div>
            <h1>${escapeHtml(config.title)}</h1>
            <p>${escapeHtml(config.description)}</p>
          </header>
          <div id="sections-container"></div>
          <p class="search-empty" id="search-empty" role="status">No se encontraron resultados en este manual.</p>
          <footer class="manual-footer">
            SENA Regional Caldas — SGFC · Manual de Usuario · ${escapeHtml(config.role)}
          </footer>
        </main>
      </div>

      <button type="button" class="btn-back-top" id="btn-back-top" aria-label="Volver arriba">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg>
      </button>
      <div class="toast-container" id="toast-container" aria-live="polite"></div>
    `;

    renderNav();
    renderSections();
  }

  function renderNav() {
    const nav = $('#manual-nav');
    if (!nav) return;

    nav.innerHTML = `
      <li class="nav-group">Navegación</li>
      <li><a href="${config.backUrl}">← Volver a manuales</a></li>
      <li class="nav-group">Secciones</li>
      ${state.sections.map((s, i) => `
        <li>
          <button type="button" class="nav-link" data-index="${i}" aria-label="Ir a ${escapeAttr(s.title)}">
            <span class="nav-num">${i + 1}</span>
            <span>${escapeHtml(s.title)}</span>
          </button>
        </li>
      `).join('')}
    `;

    $$('.nav-link', nav).forEach(btn => {
      btn.addEventListener('click', () => {
        openSection(Number(btn.dataset.index), true);
        closeSidebar();
      });
    });
  }

  function buildSearchText(section) {
    const parts = [section.title, section.description, ...(section.steps || [])];
    (section.subsections || []).forEach(sub => {
      parts.push(sub.title, sub.description, ...(sub.steps || []));
    });
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  function renderSectionBody(section) {
    if (section.subsections?.length) {
      return `
        ${section.description ? `<p class="manual-section__desc">${escapeHtml(section.description)}</p>` : ''}
        ${section.subsections.map(sub => `
          <div class="manual-subsection">
            <h3 class="manual-subsection__title">${escapeHtml(sub.title)}</h3>
            ${sub.description ? `<p class="manual-subsection__desc">${escapeHtml(sub.description)}</p>` : ''}
            <ol class="manual-section__steps">
              ${(sub.steps || []).map(step => `<li>${escapeHtml(step)}</li>`).join('')}
            </ol>
          </div>
        `).join('')}
      `;
    }

    return `
      <p class="manual-section__desc">${escapeHtml(section.description)}</p>
      <ol class="manual-section__steps">
        ${(section.steps || []).map(step => `<li>${escapeHtml(step)}</li>`).join('')}
      </ol>
    `;
  }

  function renderSections() {
    const container = $('#sections-container');
    if (!container) return;

    container.innerHTML = state.sections.map((s, i) => {
      const imageName = s.image || `${config.prefix || 'sec'}-${String(i + 1).padStart(2, '0')}.png`;
      const searchText = buildSearchText(s);

      return `
        <article class="manual-section" id="section-${i}" data-index="${i}" data-search="${escapeAttr(searchText)}">
          <button type="button" class="manual-section__header" aria-expanded="false" aria-controls="section-body-${i}">
            <span class="manual-section__num">${i + 1}</span>
            <span class="manual-section__title-wrap">
              <span class="manual-section__title">${escapeHtml(s.title)}</span>
            </span>
            <svg class="manual-section__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <div class="manual-section__body" id="section-body-${i}">
            <div class="manual-section__inner">
              ${renderSectionBody(s)}
              <div class="image-block" data-image="${escapeAttr(imageName)}" data-section="${i}">
                <div class="image-block__label">Agregar imagen de referencia</div>
                <p class="image-block__help">Sube una captura. Primero dibuja recuadros verdes; después coloca y mueve los números donde quieras.</p>
                <div class="image-dropzone" tabindex="0" role="button" aria-label="Subir imagen para ${escapeAttr(s.title)}">
                  <svg class="image-dropzone__icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                  <p class="image-dropzone__text">Arrastra una imagen aquí o haz clic para seleccionar</p>
                  <p class="image-dropzone__text">Formatos: JPG, PNG, WEBP</p>
                  <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" aria-label="Seleccionar imagen">
                </div>
                <p class="image-error" role="alert"></p>
                <div class="image-preview-wrap">
                  <div class="image-preview">
                    <div class="image-annotate-stage">
                      <img src="" alt="Captura de ${escapeAttr(s.title)}" loading="lazy">
                      <canvas class="image-annotate-canvas" aria-label="Lienzo para marcar pasos en la imagen"></canvas>
                    </div>
                  </div>
                  <div class="annotate-toolbar">
                    <div class="annotate-modes" role="tablist" aria-label="Modo de anotación">
                      <button type="button" class="btn btn-sm annotate-mode is-active" data-mode="box" role="tab" aria-selected="true" aria-label="Modo recuadro">▭ Recuadro</button>
                      <button type="button" class="btn btn-sm annotate-mode" data-mode="marker" role="tab" aria-selected="false" aria-label="Modo numerar">① Numerar</button>
                    </div>
                    <p class="annotate-help annotate-help--box">Arrastra sobre la imagen para dibujar un recuadro verde.</p>
                    <p class="annotate-help annotate-help--marker hidden">Clic para colocar · Clic en un número para seleccionarlo · Arrastra para moverlo.</p>
                    <div class="annotate-marker-edit hidden">
                      <label class="annotate-marker-edit__label">Número seleccionado</label>
                      <div class="annotate-marker-edit__row">
                        <input type="number" class="input annotate-marker-num" min="1" max="99" value="1" aria-label="Valor del número">
                        <button type="button" class="btn btn-sm btn-annotate-apply-num">Cambiar</button>
                        <button type="button" class="btn btn-ghost btn-sm btn-annotate-delete-marker" aria-label="Eliminar número seleccionado">Eliminar</button>
                      </div>
                    </div>
                    <div class="annotate-actions">
                      <button type="button" class="btn btn-ghost btn-sm btn-annotate-undo" aria-label="Deshacer última anotación">↩ Deshacer</button>
                      <button type="button" class="btn btn-ghost btn-sm btn-annotate-clear" aria-label="Limpiar anotaciones">Limpiar todo</button>
                      <button type="button" class="btn btn-sm btn-annotate-save" aria-label="Guardar imagen con anotaciones">Guardar imagen</button>
                    </div>
                  </div>
                  <div class="image-meta">
                    <span class="image-filename"></span>
                    <div class="image-actions">
                      <button type="button" class="btn btn-ghost btn-sm btn-change-image" aria-label="Cambiar imagen">Cambiar imagen</button>
                      <button type="button" class="btn btn-danger btn-sm btn-remove-image" aria-label="Eliminar imagen">Eliminar imagen</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    $$('.manual-section__header', container).forEach(header => {
      header.addEventListener('click', () => toggleSection(header.closest('.manual-section')));
    });
  }

  function bindGlobalEvents() {
    $('#manual-search')?.addEventListener('input', e => handleSearch(e.target.value));
    $('#btn-prev')?.addEventListener('click', () => navigateSection(-1));
    $('#btn-next')?.addEventListener('click', () => navigateSection(1));
    $('#btn-expand')?.addEventListener('click', () => expandAll(true));
    $('#btn-collapse')?.addEventListener('click', () => expandAll(false));
    $('#btn-back-top')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    $('#btn-menu-mobile')?.addEventListener('click', toggleSidebar);
    $('#sidebar-overlay')?.addEventListener('click', closeSidebar);

    window.addEventListener('scroll', onScroll, { passive: true });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeSidebar();
        $$('.image-dropzone.is-dragover').forEach(z => z.classList.remove('is-dragover'));
      }
    });
  }

  function onScroll() {
    const progress = $('#reading-progress');
    const backTop = $('#btn-back-top');
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

    if (progress) {
      progress.style.width = `${pct}%`;
      progress.setAttribute('aria-valuenow', Math.round(pct));
    }

    backTop?.classList.toggle('visible', scrollTop > 400);
    highlightActiveSection();
  }

  function highlightActiveSection() {
    const sections = $$('.manual-section:not(.hidden)');
    let active = 0;

    sections.forEach((sec, idx) => {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= 120) active = Number(sec.dataset.index);
    });

    $$('.nav-link').forEach(link => {
      link.classList.toggle('active', Number(link.dataset.index) === active);
    });

    state.currentIndex = active;
    updateNavButtons();
  }

  function setSectionOpen(sectionEl, open) {
    if (!sectionEl) return;
    const body = $('.manual-section__body', sectionEl);
    const header = $('.manual-section__header', sectionEl);

    sectionEl.classList.toggle('is-open', open);
    if (open) {
      body.style.maxHeight = `${body.scrollHeight + 64}px`;
      header?.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => refreshSectionHeight(sectionEl));
    } else {
      body.style.maxHeight = '0';
      header?.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleSection(sectionEl) {
    if (!sectionEl) return;
    setSectionOpen(sectionEl, !sectionEl.classList.contains('is-open'));
  }

  function openSection(index, scroll) {
    const section = $(`#section-${index}`);
    if (!section || section.classList.contains('hidden')) return;

    state.currentIndex = index;

    if (!section.classList.contains('is-open')) {
      setSectionOpen(section, true);
    }

    $$('.nav-link').forEach(link => {
      link.classList.toggle('active', Number(link.dataset.index) === index);
    });

    if (scroll) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    updateNavButtons();
  }

  function navigateSection(delta) {
    let next = state.currentIndex + delta;
    while (next >= 0 && next < state.sections.length) {
      const sec = $(`#section-${next}`);
      if (sec && !sec.classList.contains('hidden')) {
        openSection(next, true);
        return;
      }
      next += delta;
    }
  }

  function updateNavButtons() {
    const prev = $('#btn-prev');
    const next = $('#btn-next');
    if (prev) prev.disabled = state.currentIndex <= 0;
    if (next) next.disabled = state.currentIndex >= state.sections.length - 1;
  }

  function expandAll(open) {
    $$('.manual-section:not(.hidden)').forEach(sec => setSectionOpen(sec, open));
  }

  function handleSearch(query) {
    const q = query.trim().toLowerCase();
    let visible = 0;

    $$('.manual-section').forEach(sec => {
      const text = sec.dataset.search || '';
      const match = !q || text.includes(q);
      sec.classList.toggle('hidden', !match);
      if (match) visible++;
    });

    $$('.nav-link').forEach(link => {
      const idx = Number(link.dataset.index);
      const sec = $(`#section-${idx}`);
      link.classList.toggle('hidden', sec?.classList.contains('hidden'));
    });

    $('#search-empty')?.classList.toggle('visible', q.length > 0 && visible === 0);
  }

  function toggleSidebar() {
    state.sidebarOpen = !state.sidebarOpen;
    $('#manual-sidebar')?.classList.toggle('open', state.sidebarOpen);
    $('#sidebar-overlay')?.classList.toggle('open', state.sidebarOpen);
    $('#btn-menu-mobile')?.setAttribute('aria-expanded', String(state.sidebarOpen));
  }

  function closeSidebar() {
    state.sidebarOpen = false;
    $('#manual-sidebar')?.classList.remove('open');
    $('#sidebar-overlay')?.classList.remove('open');
    $('#btn-menu-mobile')?.setAttribute('aria-expanded', 'false');
  }

  function updateProgress() {
    onScroll();
  }

  function annotationsStorageKey(filename) {
    return `sgfc-manual-annotations:${location.pathname}:${filename}`;
  }

  function loadAnnotations(filename) {
    try {
      const raw = localStorage.getItem(annotationsStorageKey(filename));
      if (!raw) return { boxes: [], markers: [], history: [] };
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return {
          boxes: data.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h })),
          markers: [],
          history: data.map((_, i) => ({ type: 'box', index: i }))
        };
      }
      return {
        boxes: data.boxes || [],
        markers: data.markers || [],
        history: data.history || []
      };
    } catch {
      return { boxes: [], markers: [], history: [] };
    }
  }

  function saveAnnotations(filename, data) {
    try {
      localStorage.setItem(annotationsStorageKey(filename), JSON.stringify({
        boxes: data.boxes,
        markers: data.markers,
        history: data.history
      }));
    } catch { /* sin almacenamiento local */ }
  }

  function persistAnnotations(filename, state) {
    saveAnnotations(filename, state);
  }

  function setAnnotateMode(block, state, mode) {
    state.mode = mode;
    const canvas = $('.image-annotate-canvas', block);
    const toolbar = $('.annotate-toolbar', block);

    $$('.annotate-mode', toolbar).forEach(btn => {
      const active = btn.dataset.mode === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    $('.annotate-help--box', toolbar)?.classList.toggle('hidden', mode !== 'box');
    $('.annotate-help--marker', toolbar)?.classList.toggle('hidden', mode !== 'marker');
    updateMarkerEditUI(block, state);

    canvas?.classList.toggle('mode-box', mode === 'box');
    canvas?.classList.toggle('mode-marker', mode === 'marker');
  }

  function nextMarkerNumber(markers) {
    if (!markers.length) return 1;
    return Math.max(...markers.map(m => Number(m.num) || 0)) + 1;
  }

  function updateMarkerEditUI(block, state) {
    const panel = $('.annotate-marker-edit', block);
    const input = $('.annotate-marker-num', block);
    if (!panel || !input) return;

    const selected = state.selectedMarkerIdx >= 0 ? state.markers[state.selectedMarkerIdx] : null;
    panel.classList.toggle('hidden', !selected || state.mode !== 'marker');
    if (selected) input.value = String(selected.num);
  }

  function applySelectedMarkerNumber(block, state, ctx, canvas, filename) {
    if (state.selectedMarkerIdx < 0) return;
    const input = $('.annotate-marker-num', block);
    const raw = parseInt(input?.value, 10);
    if (!raw || raw < 1 || raw > 99) {
      toast('Ingresa un número entre 1 y 99.', 'error');
      return;
    }
    state.markers[state.selectedMarkerIdx].num = raw;
    persistAnnotations(filename, state);
    redrawAnnotator(state, ctx, canvas);
    toast(`Número cambiado a ${raw}.`, 'success');
  }

  function setupAnnotator(block) {
    destroyAnnotator(block);

    const stage = $('.image-annotate-stage', block);
    const img = $('img', stage);
    const canvas = $('.image-annotate-canvas', stage);
    const toolbar = $('.annotate-toolbar', block);
    if (!stage || !img || !canvas) return;

    const filename = block.dataset.image;
    const ctx = canvas.getContext('2d');
    const stored = loadAnnotations(filename);
    const state = {
      mode: 'box',
      boxes: stored.boxes,
      markers: stored.markers,
      history: stored.history,
      drawing: false,
      startX: 0,
      startY: 0,
      currentRect: null,
      dragMarkerIdx: -1,
      selectedMarkerIdx: -1,
      pointerOnMarker: -1,
      pointerStart: null,
      pointerDragging: false,
      pressPoint: null,
      pressPending: false
    };

    setAnnotateMode(block, state, 'box');

    const syncSize = () => {
      const rect = img.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      redrawAnnotator(state, ctx, canvas);
    };

    const toCanvasPoint = e => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;
      return {
        x: Math.max(0, Math.min(canvas.width, clientX - rect.left)),
        y: Math.max(0, Math.min(canvas.height, clientY - rect.top))
      };
    };

    const hitTestMarker = p => {
      for (let i = state.markers.length - 1; i >= 0; i--) {
        const m = state.markers[i];
        const mx = m.x * canvas.width;
        const my = m.y * canvas.height;
        if (Math.hypot(p.x - mx, p.y - my) <= MARKER_HIT_RADIUS) return i;
      }
      return -1;
    };

    const pushHistory = type => {
      if (type === 'box') state.history.push({ type: 'box', index: state.boxes.length - 1 });
      else state.history.push({ type: 'marker', index: state.markers.length - 1 });
    };

    const onPointerDown = e => {
      e.preventDefault();
      e.stopPropagation();
      if (!img.src) return;

      const p = toCanvasPoint(e);
      canvas.setPointerCapture(e.pointerId);

      if (state.mode === 'box') {
        state.drawing = true;
        state.startX = p.x;
        state.startY = p.y;
        state.currentRect = { x: p.x, y: p.y, w: 0, h: 0 };
        return;
      }

      const hit = hitTestMarker(p);
      if (hit >= 0) {
        state.pointerOnMarker = hit;
        state.pointerStart = p;
        state.pointerDragging = false;
        state.selectedMarkerIdx = hit;
        updateMarkerEditUI(block, state);
      } else {
        state.selectedMarkerIdx = -1;
        updateMarkerEditUI(block, state);
        state.pressPoint = p;
        state.pressPending = true;
      }
      redrawAnnotator(state, ctx, canvas);
    };

    const onPointerMove = e => {
      const p = toCanvasPoint(e);

      if (state.mode === 'box' && state.drawing && state.currentRect) {
        e.preventDefault();
        state.currentRect = normalizeRect(state.startX, state.startY, p.x, p.y);
        redrawAnnotator(state, ctx, canvas);
        return;
      }

      if (state.mode === 'marker' && state.pointerOnMarker >= 0 && state.pointerStart) {
        if (!state.pointerDragging && Math.hypot(p.x - state.pointerStart.x, p.y - state.pointerStart.y) > 8) {
          state.pointerDragging = true;
          state.dragMarkerIdx = state.pointerOnMarker;
          canvas.classList.add('mode-drag');
        }
      }

      if (state.mode === 'marker' && state.pointerDragging && state.dragMarkerIdx >= 0) {
        e.preventDefault();
        const m = state.markers[state.dragMarkerIdx];
        m.x = p.x / canvas.width;
        m.y = p.y / canvas.height;
        persistAnnotations(filename, state);
        redrawAnnotator(state, ctx, canvas);
        return;
      }

      if (state.mode === 'marker' && state.pressPending && state.pressPoint) {
        if (Math.hypot(p.x - state.pressPoint.x, p.y - state.pressPoint.y) > 8) {
          state.pressPending = false;
        }
      }
    };

    const onPointerUp = e => {
      e?.preventDefault();
      e?.stopPropagation();
      canvas.releasePointerCapture?.(e.pointerId);
      canvas.classList.remove('mode-drag');

      if (state.mode === 'box' && state.drawing) {
        state.drawing = false;
        const r = state.currentRect;
        state.currentRect = null;

        if (r && r.w >= 12 && r.h >= 12) {
          state.boxes.push({
            x: r.x / canvas.width,
            y: r.y / canvas.height,
            w: r.w / canvas.width,
            h: r.h / canvas.height
          });
          pushHistory('box');
          persistAnnotations(filename, state);
          refreshSectionHeight(block.closest('.manual-section'));
          toast('Recuadro agregado.', 'success');
        }
        redrawAnnotator(state, ctx, canvas);
        return;
      }

      if (state.mode === 'marker') {
        if (state.pointerDragging) {
          toast('Número movido.', 'success');
        } else if (state.pointerOnMarker >= 0) {
          state.selectedMarkerIdx = state.pointerOnMarker;
          updateMarkerEditUI(block, state);
          $('.annotate-marker-num', block)?.focus();
          $('.annotate-marker-num', block)?.select();
        } else if (state.pressPending && state.pressPoint) {
          const num = nextMarkerNumber(state.markers);
          state.markers.push({
            x: state.pressPoint.x / canvas.width,
            y: state.pressPoint.y / canvas.height,
            num
          });
          pushHistory('marker');
          state.selectedMarkerIdx = state.markers.length - 1;
          persistAnnotations(filename, state);
          updateMarkerEditUI(block, state);
          toast(`Número ${num} colocado.`, 'success');
        }

        state.pointerOnMarker = -1;
        state.pointerStart = null;
        state.pointerDragging = false;
        state.dragMarkerIdx = -1;
        state.pressPending = false;
        state.pressPoint = null;
        redrawAnnotator(state, ctx, canvas);
      }
    };

    canvas.addEventListener('dblclick', e => {
      if (state.mode !== 'marker') return;
      e.preventDefault();
      e.stopPropagation();
      const p = toCanvasPoint(e);
      const hit = hitTestMarker(p);
      if (hit < 0) return;
      state.selectedMarkerIdx = hit;
      updateMarkerEditUI(block, state);
      const input = $('.annotate-marker-num', block);
      input?.focus();
      input?.select();
    });

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncSize) : null;
    ro?.observe(img);
    img.addEventListener('load', syncSize);
    if (img.complete) syncSize();

    $$('.annotate-mode', toolbar).forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        setAnnotateMode(block, state, btn.dataset.mode);
      });
    });

    $('.btn-annotate-undo', block)?.addEventListener('click', e => {
      e.stopPropagation();
      const last = state.history.pop();
      if (!last) return;
      if (last.type === 'box') state.boxes.pop();
      else {
        state.markers.pop();
        if (state.selectedMarkerIdx >= state.markers.length) {
          state.selectedMarkerIdx = state.markers.length - 1;
        }
      }
      persistAnnotations(filename, state);
      updateMarkerEditUI(block, state);
      redrawAnnotator(state, ctx, canvas);
      toast('Última anotación eliminada.', 'success');
    });

    $('.btn-annotate-clear', block)?.addEventListener('click', e => {
      e.stopPropagation();
      if (!state.boxes.length && !state.markers.length) return;
      if (!confirm('¿Eliminar todos los recuadros y números?')) return;
      state.boxes = [];
      state.markers = [];
      state.history = [];
      state.selectedMarkerIdx = -1;
      persistAnnotations(filename, state);
      updateMarkerEditUI(block, state);
      redrawAnnotator(state, ctx, canvas);
      toast('Anotaciones eliminadas.', 'success');
    });

    $('.btn-annotate-save', block)?.addEventListener('click', async e => {
      e.stopPropagation();
      await exportAnnotatedImage(block, img, state);
    });

    $('.btn-annotate-apply-num', block)?.addEventListener('click', e => {
      e.stopPropagation();
      applySelectedMarkerNumber(block, state, ctx, canvas, filename);
    });

    $('.annotate-marker-num', block)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applySelectedMarkerNumber(block, state, ctx, canvas, filename);
      }
    });

    $('.btn-annotate-delete-marker', block)?.addEventListener('click', e => {
      e.stopPropagation();
      if (state.selectedMarkerIdx < 0) return;
      state.markers.splice(state.selectedMarkerIdx, 1);
      state.selectedMarkerIdx = -1;
      persistAnnotations(filename, state);
      updateMarkerEditUI(block, state);
      redrawAnnotator(state, ctx, canvas);
      toast('Número eliminado.', 'success');
    });

    annotators.set(block, { state, canvas, ctx, ro, syncSize, img, block });
  }

  function destroyAnnotator(block) {
    const ann = annotators.get(block);
    if (!ann) return;
    ann.ro?.disconnect();
    annotators.delete(block);
  }

  function normalizeRect(x1, y1, x2, y2) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    return { x, y, w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
  }

  function redrawAnnotator(state, ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    state.boxes.forEach(box => {
      drawAnnotationBox(ctx, {
        x: box.x * canvas.width,
        y: box.y * canvas.height,
        w: box.w * canvas.width,
        h: box.h * canvas.height,
        draft: false
      });
    });

    if (state.currentRect) {
      drawAnnotationBox(ctx, { ...state.currentRect, draft: true });
    }

    state.markers.forEach((marker, idx) => {
      drawAnnotationMarker(ctx, {
        x: marker.x * canvas.width,
        y: marker.y * canvas.height,
        num: marker.num,
        selected: idx === state.selectedMarkerIdx || idx === state.dragMarkerIdx
      });
    });
  }

  function drawAnnotationBox(ctx, { x, y, w, h, draft = false }) {
    ctx.save();
    ctx.strokeStyle = ANNOTATE_COLOR;
    ctx.lineWidth = draft ? 2 : 3;
    ctx.setLineDash(draft ? [6, 4] : []);
    ctx.fillStyle = 'rgba(57, 169, 0, 0.10)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  function drawAnnotationMarker(ctx, { x, y, num, selected = false, scale = 1 }) {
    const r = MARKER_RADIUS * scale;
    ctx.save();

    if (selected) {
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(57, 169, 0, 0.45)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = ANNOTATE_COLOR;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(r * 1.05)}px Work Sans, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num), x, y + 1);
    ctx.restore();
  }

  async function exportAnnotatedImage(block, img, state) {
    const filename = block.dataset.image;
    if (!img.src || !img.naturalWidth) {
      toast('Espera a que cargue la imagen.', 'error');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const markerScale = canvas.width / (img.getBoundingClientRect().width || canvas.width);

    state.boxes.forEach(box => {
      drawAnnotationBox(ctx, {
        x: box.x * canvas.width,
        y: box.y * canvas.height,
        w: box.w * canvas.width,
        h: box.h * canvas.height
      });
    });

    state.markers.forEach(marker => {
      drawAnnotationMarker(ctx, {
        x: marker.x * canvas.width,
        y: marker.y * canvas.height,
        num: marker.num,
        scale: markerScale
      });
    });

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      toast('No se pudo generar la imagen.', 'error');
      return;
    }

    const uploaded = await tryUpload(blob, filename);
    if (uploaded) {
      clearAnnotationsStorage(filename);
      const ann = annotators.get(block);
      if (ann) {
        ann.state.boxes = [];
        ann.state.markers = [];
        ann.state.history = [];
        redrawAnnotator(ann.state, ann.ctx, ann.canvas);
      }
      img.src = `${config.imagesPath}${filename}?t=${Date.now()}`;
      toast('Imagen guardada con anotaciones.', 'success');
    } else {
      toast('Anotaciones listas. Activa PHP para guardar en servidor.', 'success');
    }
  }

  function clearAnnotationsStorage(filename) {
    try {
      localStorage.removeItem(annotationsStorageKey(filename));
    } catch { /* sin almacenamiento local */ }
  }

  function onPreviewReady(block, img, previewWrap, sectionEl) {
    setupAnnotator(block);
    refreshSectionHeight(sectionEl || block?.closest('.manual-section'));
    const ann = annotators.get(block);
    ann?.syncSize?.();
  }

  function refreshSectionHeight(sectionEl) {
    if (!sectionEl?.classList.contains('is-open')) return;
    const body = $('.manual-section__body', sectionEl);
    if (body) body.style.maxHeight = `${body.scrollHeight + 64}px`;
  }

  function refreshAllOpenSections() {
    $$('.manual-section.is-open').forEach(refreshSectionHeight);
  }

  function removedStorageKey(filename) {
    return `sgfc-manual-removed:${location.pathname}:${filename}`;
  }

  function isImageMarkedRemoved(filename) {
    try {
      return localStorage.getItem(removedStorageKey(filename)) === '1';
    } catch {
      return false;
    }
  }

  function markImageRemoved(filename, removed) {
    try {
      const key = removedStorageKey(filename);
      if (removed) localStorage.setItem(key, '1');
      else localStorage.removeItem(key);
    } catch { /* sin almacenamiento local */ }
  }

  /* ---------- Imágenes ---------- */

  function initImageBlocks() {
    $$('.image-block').forEach(block => {
      const filename = block.dataset.image;
      const dropzone = $('.image-dropzone', block);
      const input = $('input[type="file"]', block);
      const previewWrap = $('.image-preview-wrap', block);
      const img = $('.image-annotate-stage img', block);
      const filenameEl = $('.image-filename', block);
      const errorEl = $('.image-error', block);
      const btnChange = $('.btn-change-image', block);
      const btnRemove = $('.btn-remove-image', block);
      const sectionEl = block.closest('.manual-section');

      block.addEventListener('click', e => e.stopPropagation());

      if (!isImageMarkedRemoved(filename)) {
        checkStoredImage(img, previewWrap, dropzone, filenameEl, filename, sectionEl, block);
      }

      dropzone?.addEventListener('click', e => {
        e.stopPropagation();
        input?.click();
      });

      dropzone?.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          input?.click();
        }
      });

      input?.addEventListener('change', () => {
        const file = input.files?.[0];
        if (file) processFile(file, block, { replacing: previewWrap.classList.contains('visible') });
        input.value = '';
      });

      ['dragenter', 'dragover'].forEach(ev => {
        dropzone?.addEventListener(ev, e => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('is-dragover');
        });
      });

      dropzone?.addEventListener('dragleave', e => {
        e.stopPropagation();
        dropzone.classList.remove('is-dragover');
      });

      dropzone?.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('is-dragover');
        const file = e.dataTransfer?.files?.[0];
        if (file) processFile(file, block, { replacing: previewWrap.classList.contains('visible') });
      });

      btnChange?.addEventListener('click', e => {
        e.stopPropagation();
        input?.click();
      });

      btnRemove?.addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm('¿Desea eliminar la imagen de referencia?')) return;

        const deleted = await tryDelete(filename);
        markImageRemoved(filename, true);
        clearAnnotationsStorage(filename);
        destroyAnnotator(block);
        clearPreview(block, previewWrap, dropzone, filenameEl, img);
        showError(errorEl, '');
        refreshSectionHeight(sectionEl);
        toast(deleted ? 'Imagen eliminada.' : 'Imagen eliminada de la vista.', 'success');
      });
    });
  }

  async function processFile(file, block, opts = {}) {
    const { replacing = false } = opts;
    const errorEl = $('.image-error', block);
    const previewWrap = $('.image-preview-wrap', block);
    const dropzone = $('.image-dropzone', block);
    const img = $('img', previewWrap);
    const filenameEl = $('.image-filename', block);
    const filename = block.dataset.image;
    const sectionEl = block.closest('.manual-section');

    if (!isValidImage(file)) {
      showError(errorEl, 'Formato no permitido. Use JPG, PNG o WEBP.');
      toast('Formato no permitido.', 'error');
      return;
    }

    clearAnnotationsStorage(filename);
    destroyAnnotator(block);

    showError(errorEl, '');
    filenameEl.textContent = file.name;
    markImageRemoved(filename, false);

    const localUrl = URL.createObjectURL(file);
    showPreview(block, img, previewWrap, dropzone, localUrl, sectionEl);

    const uploaded = await tryUpload(file, filename);
    if (uploaded) {
      URL.revokeObjectURL(localUrl);
      showPreview(block, img, previewWrap, dropzone, `${config.imagesPath}${filename}?t=${Date.now()}`, sectionEl);
      toast(replacing ? 'Imagen reemplazada correctamente.' : 'Imagen cargada correctamente.', 'success');
    } else {
      toast(replacing ? 'Vista previa actualizada (sin guardar en servidor).' : 'Vista previa local activa.', 'success');
    }
  }

  function isValidImage(file) {
    return ALLOWED_TYPES.includes(file.type) || ALLOWED_EXT.test(file.name);
  }

  async function tryUpload(file, filename) {
    if (!config.uploadUrl) return false;

    try {
      const form = new FormData();
      form.append('image', file);
      form.append('filename', filename);

      const res = await fetch(config.uploadUrl, { method: 'POST', body: form });
      const data = await res.json();
      return res.ok && data.ok;
    } catch {
      // Sin backend PHP: la vista previa local sigue funcionando
      return false;
    }
  }

  async function tryDelete(filename) {
    if (!config.deleteUrl) return false;

    try {
      const form = new FormData();
      form.append('filename', filename);
      const res = await fetch(config.deleteUrl, { method: 'POST', body: form });
      const data = await res.json();
      return res.ok && data.ok;
    } catch {
      return false;
    }
  }

  function checkStoredImage(img, previewWrap, dropzone, filenameEl, filename, sectionEl, block) {
    if (!img || !filename || isImageMarkedRemoved(filename)) return;
    const src = `${config.imagesPath}${filename}`;
    const probe = new Image();
    probe.onload = () => {
      showPreview(block, img, previewWrap, dropzone, src, sectionEl);
      filenameEl.textContent = filename;
    };
    probe.onerror = () => {};
    probe.src = `${src}?t=${Date.now()}`;
  }

  function showPreview(block, img, previewWrap, dropzone, src, sectionEl) {
    const onReady = () => onPreviewReady(block, img, previewWrap, sectionEl);
    img.onload = onReady;
    img.onerror = onReady;
    img.src = src;
    previewWrap.classList.add('visible');
    dropzone.style.display = 'none';
    if (img.complete) onReady();
  }

  function clearPreview(block, previewWrap, dropzone, filenameEl, img) {
    destroyAnnotator(block);
    img.removeAttribute('src');
    previewWrap.classList.remove('visible');
    dropzone.style.display = '';
    filenameEl.textContent = '';
  }

  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('visible', !!msg);
  }

  function toast(message, type = 'success') {
    const container = $('#toast-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.25s';
      setTimeout(() => el.remove(), 250);
    }, 3200);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  return { init };
})();

if (typeof window !== 'undefined') {
  window.ManualCore = ManualCore;
}
