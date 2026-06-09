/**
 * SGFC — Componentes reutilizables (sin frameworks).
 *
 *  - Sidebar, Navbar, Layout, Modal, Toast, KPI, Badge…
 *  - Inyectan HTML en root y enganchan listeners.
 */

import { $, $$, el, escapeHtml, renderAvatar } from './utils.js';
import { getUser, logout, defaultViewForRole } from './auth.js';
import { resolveFrontendPath, api } from './api.js';

/* ==========================================================================
   LOGO
   ========================================================================== */
export function renderLogo({ dark = false, compact = false } = {}) {
  const logoSrc = resolveFrontendPath('/images/logo-sena.png');
  return `
    <div class="sgfc-logo ${dark ? 'dark' : ''}">
      <img class="logo-sena" src="${logoSrc}" alt="Logo SENA">
      ${compact ? '' : `
        <div class="sep"></div>
        <div class="text-block">
          <div><span class="brand">SGFC</span><span class="tag">SENA</span></div>
          <div class="subtitle">Sist. Gestión Financiera y Contractual</div>
        </div>
      `}
    </div>`;
}

/* ==========================================================================
   MENÚ POR ROL  (espejo de MENU_MAP en SGFC.jsx)
   ========================================================================== */
const MENUS = {
  'Administrativo de Centro': [
    { id: 'admin-dashboard',      label: 'Inicio',              icon: 'home',      href: 'administrativo-dashboard.html' },
    { id: 'admin-usuarios',       label: 'Usuarios',            icon: 'users',     href: 'administrativo-usuarios.html' },
    { id: 'admin-evidencias',     label: 'Tipos de Evidencias', icon: 'folder',    href: 'administrativo-evidencias.html' },
    { id: 'admin-contratos',      label: 'Contratos y Periodos',icon: 'fileText',  href: 'administrativo-contratos-periodos.html' },
    { id: 'admin-revision',       label: 'Revisión',            icon: 'search',    href: 'administrativo-revision.html' },
    { id: 'admin-firmas',         label: 'Firmas',              icon: 'penLine',   href: 'administrativo-firmas.html' },
    { id: 'admin-notificaciones', label: 'Notificaciones',      icon: 'bell',      href: 'administrativo-notificaciones.html' },
  ],
  'Contratista': [
    { id: 'cont-cargar',          label: 'Cargar Evidencias',   icon: 'upload',         href: 'contratista-cargar-evidencias.html' },
    { id: 'cont-firmados',        label: 'PDFs Firmados',       icon: 'fileSignature',  href: 'contratista-firmados.html' },
    { id: 'cont-historial',       label: 'Historial',           icon: 'archive',        href: 'contratista-historial.html' },
    { id: 'cont-notificaciones',  label: 'Notificaciones',      icon: 'bell',           href: 'contratista-notificaciones.html' },
  ],
  'Super Admin': [
    { id: 'super-dashboard',      label: 'Inicio',              icon: 'home',       href: 'superadmin-dashboard.html' },
    { id: 'super-usuarios',       label: 'Usuarios',            icon: 'users',      href: 'superadmin-usuarios.html' },
    { id: 'super-contratos',      label: 'Contratos',           icon: 'fileText',   href: 'superadmin-contratos.html' },
    { id: 'super-evidencias',     label: 'Evidencias',          icon: 'clipboard',  href: 'superadmin-evidencias.html' },
    { id: 'super-config',         label: 'Configuración',       icon: 'settings',   href: 'superadmin-configuracion.html' },
  ],
};

/* SVG icons inline (subset de lucide-react usado en SGFC.jsx) */
const ICONS = {
  layout: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  penLine: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  fileSignature: '<path d="M20 19.5V19a2 2 0 0 0-2-2h-2"/><path d="M14 17l-1 4"/><path d="M14 2v6h6"/><path d="M5 17v-3a2 2 0 0 1 2-2h2"/><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2"/>',
  archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>',
  clipboard: '<rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  chevronLeft:  '<polyline points="15 18 9 12 15 6"/>',
  chevronRight: '<polyline points="9 18 15 12 9 6"/>',
  chevronDown:  '<polyline points="6 9 12 15 18 9"/>',
  chevronUp:    '<polyline points="18 15 12 9 6 15"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  logOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  alertCircle: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  alertTriangle:'<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  helpCircle: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  checkCircle:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  xCircle:    '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  fileStack:'<path d="M2 18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-4-4H4a2 2 0 0 0-2 2z"/><polyline points="14 4 14 8 18 8"/>',
  filePlus:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  building: '<path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h.01M9 12h.01M9 15h.01M9 18h.01M13 13h.01M13 16h.01M13 19h.01"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mapPin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  messageCircle: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
};

export function icon(name, { size = 18, color = 'currentColor', strokeWidth = 2 } = {}) {
  const path = ICONS[name];
  if (!path) return '';
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

/** Resuelve el ítem activo del sidebar según URL e ids admin/super. */
function resolveActiveMenuId(menu, activeId) {
  const page = (location.pathname.split('/').pop() || '').toLowerCase();
  const pageAliases = {
    'administrativo-evidencias.html': 'superadmin-evidencias.html',
    'administrativo-usuarios.html': 'superadmin-usuarios.html',
    'administrativo-contratos-periodos.html': 'superadmin-contratos.html',
  };
  const lookupPage = pageAliases[page] || page;
  const byPage = menu.find(m => m.href.toLowerCase() === lookupPage);
  if (byPage) return byPage.id;

  if (menu.some(m => m.id === activeId)) return activeId;

  const superAlias = activeId.replace(/^admin-/, 'super-');
  if (menu.some(m => m.id === superAlias)) return superAlias;

  const adminAlias = activeId.replace(/^super-/, 'admin-');
  if (menu.some(m => m.id === adminAlias)) return adminAlias;

  return activeId;
}

/* ==========================================================================
   FOOTER INSTITUCIONAL
   ========================================================================== */
export function renderFooter() {
  const photoSrc = resolveFrontendPath('/images/footer.png');
  const photoWarmSrc = resolveFrontendPath('/images/footer-calido.png');

  return `
    <footer class="sgfc-footer" id="sgfc-footer">
      <div class="sgfc-footer-mesh sgfc-footer-mesh--tl" aria-hidden="true"></div>
      <div class="sgfc-footer-mesh sgfc-footer-mesh--br" aria-hidden="true"></div>
      <div class="sgfc-footer-inner">
        <div class="sgfc-footer-photo">
          <img class="sgfc-footer-photo-img sgfc-footer-photo-img--default" src="${photoSrc}" alt="Equipo institucional SENA" loading="lazy" width="185" height="auto">
          <img class="sgfc-footer-photo-img sgfc-footer-photo-img--warm" src="${photoWarmSrc}" alt="Equipo institucional SENA — modo descanso" loading="lazy" width="185" height="auto">
        </div>
        <div class="sgfc-footer-brand">
          <p class="sgfc-footer-tagline">FORMANDO EL FUTURO DE COLOMBIA</p>
          <p class="sgfc-footer-sub">ACOMPAÑAMIENTO Y PROFESIONALISMO</p>
          <p class="sgfc-footer-pie" id="footer-pie">SENA Regional Caldas — CPIC — Carlos/Sara/Nicol</p>
          <div class="sgfc-footer-actions">
            <a href="${resolveFrontendPath('/docs/manual-usuario.pdf')}" class="sgfc-footer-link" id="footer-manual" target="_blank" rel="noopener noreferrer">
              <span class="sgfc-footer-link-icon">${icon('fileText', { size: 18, color: '#fff' })}</span>
              <span>MANUAL DE USUARIO</span>
            </a>
          </div>
        </div>
      </div>
    </footer>`;
}

/** Reservado para futura personalización del footer. */
export async function initFooter() {}

/* ==========================================================================
   LAYOUT (Sidebar + Navbar + main)
   ========================================================================== */
export async function renderLayout({ rootSelector, activeId, breadcrumb = [] }) {
  const user = getUser();
  if (!user) {
    location.href = resolveFrontendPath('/views/login.html');
    return;
  }
  const root = $(rootSelector);
  if (!root) return;
  const menu = MENUS[user.rol_label] || [];
  const resolvedActiveId = resolveActiveMenuId(menu, activeId);

  // notificaciones no leídas
  let unread = 0;
  try {
    const r = await api.get('/notifications?unread=1', { silent: true });
    unread = r.data.unread || 0;
  } catch {}

  root.innerHTML = `
    <div class="layout">
      <div class="sidebar-overlay" id="sb-overlay"></div>
      <aside class="sidebar" id="sb-aside">
        <div class="sidebar-header">${renderLogo({ dark: true })}</div>
        <nav class="sidebar-nav">
          ${menu.map(m => `
            <button class="sidebar-item ${m.id === resolvedActiveId ? 'active' : ''}" data-href="${m.href}" data-nav-id="${m.id}">
              ${icon(m.icon, { size: 16, color: 'currentColor' })}
              <span class="label">${escapeHtml(m.label)}</span>
              ${m.id === 'admin-notificaciones' || m.id === 'cont-notificaciones'
                ? (unread ? `<span class="badge">${unread}</span>` : '')
                : ''}
            </button>
          `).join('')}
        </nav>
        <div class="sidebar-footer">
          <div class="sidebar-user">
            ${renderAvatar(user.nombre, 30)}
            <div style="overflow:hidden;">
              <div class="name">${escapeHtml(user.nombre.split(' ').slice(0,2).join(' '))}</div>
              <div class="role">${escapeHtml(user.rol_label)}</div>
            </div>
          </div>
          <button class="sidebar-toggle" id="sb-toggle" title="Colapsar menú">
            ${icon('chevronLeft', { size: 14 })}<span class="label">Colapsar</span>
          </button>
        </div>
      </aside>
      <div class="layout-main">
        <header class="navbar">
          <button class="navbar-menu-btn" id="sb-mobile">${icon('menu')}</button>
          <div class="breadcrumb">
            <span class="brand">SGFC</span>
            ${icon('chevronRight', { size: 13, color: 'var(--c-gris3)' })}
            <span class="crumb">${escapeHtml(user.rol_label)}</span>
            ${breadcrumb.map((c, i) => `
              ${icon('chevronRight', { size: 13, color: 'var(--c-gris3)' })}
              <span class="crumb ${i === breadcrumb.length - 1 ? 'active' : ''}">${escapeHtml(c)}</span>
            `).join('')}
          </div>
          <button class="navbar-logout-btn" id="nb-logout" type="button" title="Cerrar sesión">
            ${icon('logOut', { size: 16, color: 'var(--c-rojo)' })}
            <span>Cerrar sesión</span>
          </button>
        </header>
        <main class="layout-scroll">
          <div id="view-content"><div class="loader-screen"><div class="loader"></div></div></div>
          ${renderFooter()}
        </main>
      </div>
    </div>
  `;

  initFooter();

  // Listeners
  $$('.sidebar-item').forEach(b =>
    b.addEventListener('click', () => location.href = resolveFrontendPath(`/views/${b.dataset.href}`))
  );
  const aside = $('#sb-aside');
  const overlay = $('#sb-overlay');
  $('#sb-toggle')?.addEventListener('click', () => {
    aside.classList.toggle('collapsed');
    const collapsed = aside.classList.contains('collapsed');
    $('#sb-toggle')?.setAttribute('title', collapsed ? 'Expandir menú' : 'Colapsar menú');
  });
  $('#sb-mobile')?.addEventListener('click', () => {
    aside.classList.add('open');
    overlay.classList.add('open');
  });
  overlay?.addEventListener('click', () => {
    aside.classList.remove('open');
    overlay.classList.remove('open');
  });
  $('#nb-logout')?.addEventListener('click', () => logout());

  return $('#view-content');
}

/* ==========================================================================
   TOAST
   ========================================================================== */
function ensureToastStack() {
  let stack = $('.toast-stack');
  if (!stack) {
    stack = el('div', { class: 'toast-stack' });
    document.body.appendChild(stack);
  }
  return stack;
}
export function showToast(type, title, msg = '', ms = 4000) {
  const stack = ensureToastStack();
  const node = el('div', { class: `toast ${type}` });
  node.innerHTML = `<div style="flex:1;"><div class="toast-title">${escapeHtml(title)}</div>${msg ? `<div class="toast-msg">${escapeHtml(msg)}</div>` : ''}</div>`;
  stack.appendChild(node);
  setTimeout(() => { node.style.opacity = '0'; setTimeout(() => node.remove(), 250); }, ms);
}

const CONFIRM_VARIANTS = {
  success: { icon: 'checkCircle', btnClass: 'btn' },
  danger:  { icon: 'alertTriangle', btnClass: 'btn btn-danger' },
  warning: { icon: 'alertCircle', btnClass: 'btn btn-warn' },
  primary: { icon: 'helpCircle', btnClass: 'btn' },
};

/**
 * Diálogo de confirmación institucional (reemplaza window.confirm).
 * @returns {Promise<boolean>}
 */
export function showConfirm({
  title = 'Confirmar acción',
  message = '¿Desea continuar?',
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
} = {}) {
  const cfg = CONFIRM_VARIANTS[variant] || CONFIRM_VARIANTS.primary;

  return new Promise(resolve => {
    const overlay = el('div', { class: 'confirm-overlay', role: 'presentation' });
    const dialog = el('div', {
      class: 'confirm-dialog',
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-labelledby': 'confirm-title',
      'aria-describedby': 'confirm-message',
    });

    dialog.innerHTML = `
      <div class="confirm-icon ${variant}">${icon(cfg.icon, { size: 28, color: 'currentColor', strokeWidth: 2 })}</div>
      <h3 class="confirm-title" id="confirm-title">${escapeHtml(title)}</h3>
      <p class="confirm-message" id="confirm-message">${escapeHtml(message)}</p>
      <div class="confirm-actions">
        <button type="button" class="btn btn-sec" data-cancel>${escapeHtml(cancelLabel)}</button>
        <button type="button" class="${cfg.btnClass}" data-confirm>${escapeHtml(confirmLabel)}</button>
      </div>`;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const confirmBtn = dialog.querySelector('[data-confirm]');
    const cancelBtn = dialog.querySelector('[data-cancel]');

    const finish = (result) => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }, 180);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') finish(false);
      if (e.key === 'Enter') finish(true);
    };

    confirmBtn.addEventListener('click', () => finish(true));
    cancelBtn.addEventListener('click', () => finish(false));
    overlay.addEventListener('click', e => { if (e.target === overlay) finish(false); });
    document.addEventListener('keydown', onKey);

    setTimeout(() => confirmBtn.focus(), 50);
  });
}

/* ==========================================================================
   MODAL HELPER
   ========================================================================== */
export function openModal({ title, html, width = 520, onOpen, onClose }) {
  const overlay = el('div', { class: 'modal-overlay' });
  const modal = el('div', { class: 'modal' , style: { maxWidth: width + 'px' } });
  modal.innerHTML = `
    <div class="modal-header">
      <h3>${escapeHtml(title)}</h3>
      <button class="modal-close" data-close>${icon('x', { size: 20 })}</button>
    </div>
    <div class="modal-body">${html}</div>`;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  const close = () => { overlay.remove(); onClose && onClose(); };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  modal.querySelector('[data-close]').addEventListener('click', close);
  onOpen && onOpen(modal, close);
  return { modal, close };
}

/* ==========================================================================
   KPI
   ========================================================================== */
export function renderKpi({ label, value, iconName, color, sub, wide = false, textValue = false }) {
  const valueHtml = textValue ? escapeHtml(String(value)) : value;
  return `
    <div class="kpi${wide ? ' kpi--wide' : ''}${textValue ? ' kpi--text' : ''}">
      <div class="kpi-icon" style="background:${color}15;">
        ${icon(iconName, { size: 20, color, strokeWidth: 2 })}
      </div>
      <div class="kpi-body">
        <div class="kpi-value">${valueHtml}</div>
        <div class="kpi-label">${escapeHtml(label)}</div>
        ${sub ? `<div class="kpi-sub" style="color:${color};">${escapeHtml(sub)}</div>` : ''}
      </div>
    </div>`;
}

/* ==========================================================================
   SECTION TITLE
   ========================================================================== */
export function renderSectionTitle({ title, subtitle = '', rightHtml = '' }) {
  return `
    <div class="section-title">
      <div>
        <h2>${escapeHtml(title)}</h2>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
      </div>
      ${rightHtml ? `<div class="section-actions">${rightHtml}</div>` : ''}
    </div>`;
}

/* ==========================================================================
   PROGRESS BAR
   ========================================================================== */
export function renderProgress(val = 0, color = 'var(--c-verde)') {
  const c = val >= 80 ? 'var(--c-verde)' : val >= 50 ? 'var(--c-amarillo)' : 'var(--c-naranja)';
  return `
    <div class="progress">
      <div class="progress-bar"><div class="progress-fill" style="width:${val}%;background:${c};"></div></div>
      <span class="progress-value">${val}%</span>
    </div>`;
}
