/**
 * SGFC — Router básico (multi-página).
 *
 * El sistema usa una página HTML por vista, así que el router se limita a:
 *   - Determinar la URL del backend (delegado a api.js)
 *   - Resolver paths internos del frontend de manera consistente.
 *
 * Si en el futuro migramos a SPA, este módulo es el punto de entrada para
 * registrar rutas y reemplazar location.href por history.pushState.
 */

import { resolveFrontendPath } from './api.js';

export const router = {
  go(rel) { location.href = resolveFrontendPath(rel); },
  url(rel) { return resolveFrontendPath(rel); },
};
