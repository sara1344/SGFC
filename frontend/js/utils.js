/**
 * SGFC — Utilidades varias para el frontend.
 *  - DOM helpers
 *  - Escape / sanitización XSS básica
 *  - Formatos de fecha
 *  - Generación de avatares (mismas reglas que SGFC.jsx)
 */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class' || k === 'className') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') node.innerHTML = v;
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
};

/** Escape HTML para prevenir XSS (cuando insertamos texto de la BD). */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Iniciales de un nombre completo */
export function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => (w[0] || '').toUpperCase()).join('');
}

const PALETTE = ['#39A900', '#00304D', '#71277A', '#0891B2', '#EA580C'];
/** Color de fondo determinístico para avatares (idéntico a SGFC.jsx) */
export function avatarColor(name = '') {
  return PALETTE[name.length % PALETTE.length];
}

/** Renderiza un avatar (HTML) — div con iniciales */
export function renderAvatar(name, size = 32) {
  const ini = initials(name);
  const bg = avatarColor(name);
  const fs = Math.round(size * 0.36);
  return `<div class="avatar" style="width:${size}px;height:${size}px;background:${bg};font-size:${fs}px;">${ini}</div>`;
}

/** Estado → clase de badge */
export function badgeClass(estado) {
  const map = {
    'Aprobada':            'aprobada',
    'Pendiente revisión':  'pendiente-rev',
    'Pendiente entrega':   'pendiente-ent',
    'Rechazada':           'rechazada',
    'Firmado':             'firmado',
    'Pendiente firma':     'pendiente-firma',
    'Activo':              'activo',
    'Inactivo':            'inactivo',
    'Finalizado':          'finalizado',
    'Bloqueado':           'bloqueado',
    'En revisión':         'en-revision',
  };
  return map[estado] || '';
}

export function renderBadge(estado, small = false) {
  const cls = badgeClass(estado);
  return `<span class="badge ${cls} ${small ? 'small' : ''}">${escapeHtml(estado)}</span>`;
}

/** Formato fecha legible (DD/MM/YYYY) */
export function fmtDate(s) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (isNaN(d)) return s;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return s; }
}

export function fmtDateTime(s) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (isNaN(d)) return s;
    return d.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return s; }
}

/** Debounce básico */
export function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Lee un archivo de imagen como data URL (base64) para enviar al backend. */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}
