/**
 * SGFC — Manejo de sesión cliente.
 *
 *  - Guarda en sessionStorage una copia ligera del payload del usuario.
 *  - Verifica al cargar cada vista que la sesión PHP siga activa (/auth/me).
 *  - Expone helpers: getUser(), requireRole(), logout().
 */

import { api, resolveFrontendPath } from './api.js';

const STORAGE_KEY = 'sgfc:user';

export function setUser(u) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u));
}

export function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
  } catch { return null; }
}

export function clearUser() {
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Verifica que la sesión esté activa.  Si no lo está, redirige al login.
 * Si está activa pero no coincide con allowedRoles, redirige al dashboard
 * por defecto del rol del usuario.
 */
export async function ensureSession(allowedRoles = null) {
  let user = getUser();
  try {
    const r = await api.get('/auth/me', { silent: true });
    user = r.data.user;
    setUser(user);
  } catch (e) {
    clearUser();
    location.href = resolveFrontendPath('/views/login.html');
    throw e;
  }
  if (allowedRoles && !allowedRoles.includes(user.rol_label)) {
    location.href = defaultViewForRole(user.rol_label);
    return null;
  }
  return user;
}

export function defaultViewForRole(rol) {
  const map = {
    'Administrativo de Centro': '/views/administrativo-dashboard.html',
    'Contratista':            '/views/contratista-cargar-evidencias.html',
    'Super Admin':            '/views/superadmin-dashboard.html',
  };
  return resolveFrontendPath(map[rol] || '/views/login.html');
}

export async function logout() {
  try { await api.post('/auth/logout', {}, { silent: true }); } catch {}
  clearUser();
  location.href = resolveFrontendPath('/views/login.html');
}
