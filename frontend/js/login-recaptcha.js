/**
 * reCAPTCHA v2 para vistas públicas de acceso (login, recuperar contraseña).
 */
import { api } from './api.js';

/**
 * @param {object} opts
 * @param {HTMLElement|null} opts.wrapEl — contenedor #recaptcha-wrap
 * @param {string} [opts.containerId]
 * @param {(msg: string) => void} opts.onError
 */
export function createLoginRecaptcha({ wrapEl, containerId = 'recaptcha-container', onError }) {
  let recaptchaWidgetId = null;
  let recaptchaRequired = false;
  let securityReady = false;

  function loadRecaptchaScript() {
    return new Promise((resolve, reject) => {
      if (window.grecaptcha?.render) {
        resolve();
        return;
      }
      const cbName = '__sgfcRecaptchaOnload';
      window[cbName] = () => {
        resolve();
        delete window[cbName];
      };
      const s = document.createElement('script');
      s.src = `https://www.google.com/recaptcha/api.js?onload=${cbName}&render=explicit`;
      s.async = true;
      s.defer = true;
      s.onerror = () => reject(new Error('No se pudo cargar reCAPTCHA'));
      document.head.appendChild(s);
    });
  }

  async function initSecurity() {
    try {
      const r = await api.get('/auth/recaptcha-config', { silent: true });
      const cfg = r?.data || {};
      if (cfg.misconfigured) {
        onError(
          'Configuración reCAPTCHA incompleta: defina RECAPTCHA_SITE_KEY y RECAPTCHA_SECRET_KEY juntas en backend/.env.',
        );
        return;
      }
      recaptchaRequired = !!cfg.required;
      if (!recaptchaRequired) {
        if (wrapEl) wrapEl.style.display = 'none';
        securityReady = true;
        return;
      }
      if (wrapEl) wrapEl.style.display = '';
      if (!cfg.site_key) {
        onError('El servidor exige reCAPTCHA pero falta RECAPTCHA_SITE_KEY en la configuración.');
        return;
      }
      await loadRecaptchaScript();
      recaptchaWidgetId = grecaptcha.render(containerId, {
        sitekey: cfg.site_key,
        theme: 'light',
      });
      securityReady = true;
    } catch {
      onError('No se pudo cargar la verificación de seguridad. Revise su conexión.');
    }
  }

  function tokenForSubmit() {
    if (!securityReady) {
      throw new Error('Espere a que cargue la verificación de seguridad.');
    }
    if (!recaptchaRequired) return '';
    if (recaptchaWidgetId === null || !window.grecaptcha) {
      throw new Error('La verificación de seguridad no está disponible.');
    }
    const token = grecaptcha.getResponse(recaptchaWidgetId);
    if (!token) throw new Error('Complete la verificación reCAPTCHA.');
    return token;
  }

  function resetWidget() {
    if (recaptchaWidgetId !== null && window.grecaptcha) {
      grecaptcha.reset(recaptchaWidgetId);
    }
  }

  return { initSecurity, tokenForSubmit, resetWidget, isReady: () => securityReady };
}
