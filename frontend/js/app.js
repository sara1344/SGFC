/**
 * SGFC — Bootstrap por vista.
 *
 * Cada HTML especifica en la etiqueta <body data-view="..."> qué vista cargar.
 * Este archivo delega al módulo correspondiente.
 */

import { ensureSession } from './auth.js';
import { showToast } from './components.js';
import { initAccessibility } from './accessibility.js';

/** Incrementar al publicar cambios en módulos JS (evita caché agresiva del navegador). */
const ASSET_V = '20260520v';

const VIEW_LOADERS = {
  // Administrativo
  'admin-dashboard':      () => import(`./views/admin-dashboard.js?v=${ASSET_V}`),
  'admin-usuarios':       () => import(`./views/admin-usuarios.js?v=${ASSET_V}`),
  'admin-evidencias':     () => import(`./views/admin-evidencias.js?v=${ASSET_V}`),
  'admin-contratos':      () => import(`./views/admin-contratos.js?v=${ASSET_V}`),
  'admin-revision':       () => import(`./views/admin-revision.js?v=${ASSET_V}`),
  'admin-firmas':         () => import(`./views/admin-firmas.js?v=${ASSET_V}`),
  'admin-notificaciones': () => import(`./views/admin-notificaciones.js?v=${ASSET_V}`),

  // Contratista
  'cont-cargar':          () => import(`./views/cont-cargar.js?v=${ASSET_V}`),
  'cont-firmados':        () => import(`./views/cont-firmados.js?v=${ASSET_V}`),
  'cont-historial':       () => import(`./views/cont-historial.js?v=${ASSET_V}`),
  'cont-notificaciones':  () => import(`./views/cont-notificaciones.js?v=${ASSET_V}`),

  // Super Admin
  'super-dashboard':      () => import(`./views/super-dashboard.js?v=${ASSET_V}`),
  'super-usuarios':       () => import(`./views/super-usuarios.js?v=${ASSET_V}`),
  'super-contratos':      () => import(`./views/super-contratos.js?v=${ASSET_V}`),
  'super-evidencias':     () => import(`./views/super-evidencias.js?v=${ASSET_V}`),
  'super-config':         () => import(`./views/super-config.js?v=${ASSET_V}`),
};

const STAFF_ROLES = ['Administrativo de Centro', 'Super Admin'];

const ROLE_MAP = {
  'admin-dashboard':      STAFF_ROLES,
  'admin-usuarios':       STAFF_ROLES,
  'admin-evidencias':     STAFF_ROLES,
  'admin-contratos':      STAFF_ROLES,
  'admin-revision':       STAFF_ROLES,
  'admin-firmas':         STAFF_ROLES,
  'admin-notificaciones': STAFF_ROLES,

  'cont-cargar':          ['Contratista'],
  'cont-firmados':        ['Contratista'],
  'cont-historial':       ['Contratista'],
  'cont-notificaciones':  ['Contratista'],

  'super-dashboard':      ['Super Admin'],
  'super-usuarios':       ['Super Admin'],
  'super-contratos':      ['Super Admin'],
  'super-evidencias':     ['Super Admin','Administrativo de Centro'],
  'super-config':         ['Super Admin'],
};

window.addEventListener('DOMContentLoaded', async () => {
  initAccessibility();

  const view = document.body.dataset.view;
  if (!view) return;

  // mensaje flash desde sessionStorage (ej. expiración de sesión)
  const flash = sessionStorage.getItem('sgfc:flash');
  if (flash) {
    showToast('warning', 'Sesión', flash);
    sessionStorage.removeItem('sgfc:flash');
  }

  try {
    await ensureSession(ROLE_MAP[view] || null);
  } catch {
    return; // ya redirigió
  }

  const loader = VIEW_LOADERS[view];
  if (!loader) {
    console.warn('SGFC: vista no registrada', view);
    return;
  }
  try {
    const mod = await loader();
    if (typeof mod.init === 'function') await mod.init();
  } catch (e) {
    console.error(e);
    showToast('error', 'Error', 'No se pudo cargar la vista.');
  }
});
