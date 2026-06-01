/**
 * SGFC — Cliente HTTP para la API REST PHP.
 *
 * - Usa fetch() con credentials:'include' para enviar la sesión PHP.
 * - Centraliza manejo de 401 → redirige a /login.html
 * - Provee helpers: get, post, put, del, upload.
 */

import { showToast } from './components.js';

/**
 * Ruta base del backend.
 * Detecta el segmento "sgfc" (insensible a mayúsculas) o el segmento "frontend"
 * para deducir dónde vive la API.
 */
export const API_BASE = (() => {
  const loc = window.location;
  const parts = loc.pathname.split('/').filter(Boolean);
  const lower = parts.map(p => p.toLowerCase());

  // 1) URL del tipo  /<carpeta-sgfc>/frontend/views/xxx.html
  const ixSgfc = lower.indexOf('sgfc');
  if (ixSgfc >= 0) {
    return `${loc.origin}/${parts.slice(0, ixSgfc + 1).join('/')}/backend/public/api`;
  }
  // 2) URL del tipo  /<algo>/frontend/views/xxx.html (sin segmento 'sgfc')
  const ixFront = lower.indexOf('frontend');
  if (ixFront >= 0) {
    const base = parts.slice(0, ixFront).join('/');
    return `${loc.origin}/${base ? base + '/' : ''}backend/public/api`;
  }
  // 3) Fallback genérico
  return `${loc.origin}/sgfc/backend/public/api`;
})();

async function request(method, path, body, opts = {}) {
  const url = `${API_BASE}${path}`;
  const init = {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json; charset=UTF-8';
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    showToast('error', 'Error de red', 'No fue posible contactar el servidor.');
    throw err;
  }
  // Si pedimos PDF / CSV (no JSON), devolver el blob
  const ct = res.headers.get('content-type') || '';
  if (opts.raw || ct.includes('application/pdf') || ct.includes('text/csv')) {
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || res.statusText);
    }
    return res.blob();
  }

  let json;
  try { json = await res.json(); }
  catch { json = { success: false, message: 'Respuesta no JSON del servidor.' }; }

  if (res.status === 401) {
    // Sesión expirada o no autenticado
    if (!path.includes('/auth/')) {
      // Evitar redirigir el login mismo en bucle
      const isLogin = location.pathname.endsWith('login.html') || location.pathname.endsWith('index.html');
      if (!isLogin) {
        sessionStorage.setItem('sgfc:flash', json.message || 'Su sesión expiró.');
        location.href = resolveFrontendPath('/views/login.html');
        throw new Error('UNAUTHENTICATED');
      }
    }
  }

  if (!res.ok || json.success === false) {
    const msg = json.message || 'Ocurrió un error inesperado.';
    if (!opts.silent) {
      showToast('error', 'Error', msg);
    }
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}

export function resolveFrontendPath(rel) {
  const loc   = window.location;
  const parts = loc.pathname.split('/').filter(Boolean);
  const lower = parts.map(p => p.toLowerCase());
  const ix    = lower.indexOf('sgfc');
  if (ix >= 0) {
    return `${loc.origin}/${parts.slice(0, ix + 1).join('/')}/frontend${rel}`;
  }
  const ixF = lower.indexOf('frontend');
  if (ixF >= 0) {
    const base = parts.slice(0, ixF).join('/');
    return `${loc.origin}/${base ? base + '/' : ''}frontend${rel}`;
  }
  return `/sgfc/frontend${rel}`;
}

export const api = {
  base: API_BASE,
  get:    (path, opts) => request('GET',    path, undefined, opts),
  post:   (path, body, opts) => request('POST',   path, body, opts),
  put:    (path, body, opts) => request('PUT',    path, body, opts),
  del:    (path, opts) => request('DELETE', path, undefined, opts),
  upload: (path, formData, opts) => request('POST', path, formData, opts),
  downloadAs: async (path, filename) => {
    const blob = await request('GET', path, undefined, { raw: true });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
