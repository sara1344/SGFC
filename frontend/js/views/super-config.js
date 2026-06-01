/**
 * Vista: Super Admin → Configuración del Sistema.
 */
import { api } from '../api.js';
import { $, escapeHtml, fmtDateTime } from '../utils.js';
import { renderLayout, renderSectionTitle, icon, showToast } from '../components.js';

const MODULES = [
  { id: 'institucional', title: 'Información institucional', desc: 'Nombre del centro, regional, código SENA y datos de contacto.', icon: 'building', color: '#00304D' },
  { id: 'notificaciones', title: 'Notificaciones automáticas', desc: 'Correo, plantillas y alertas a administrativos y contratistas.', icon: 'bell', color: '#39A900' },
  { id: 'seguridad', title: 'Seguridad y accesos', desc: 'reCAPTCHA, sesiones, políticas de contraseña y acceso.', icon: 'lock', color: '#DC2626' },
  { id: 'modulos', title: 'Módulos del sistema', desc: 'Activar o desactivar módulos GF, GC y funciones del SGFC.', icon: 'folder', color: '#CA8A04' },
  { id: 'calendario', title: 'Calendario institucional', desc: 'Fechas especiales, días hábiles y cierres de periodo.', icon: 'calendar', color: '#71277A' },
  { id: 'auditoria', title: 'Auditoría y reportes', desc: 'Logs de acceso, exportaciones e historial del sistema.', icon: 'activity', color: '#0891B2' },
];

let activeModule = null;
let snapshot = null;
let securityData = null;
let regionalesTree = [];

export async function init() {
  const root = await renderLayout({ rootSelector: '#app', activeId: 'super-config', breadcrumb: ['Configuración'] });
  snapshot = await loadSnapshot().catch(() => null);
  render(root);
}

async function loadSnapshot() {
  const [recaptcha, regionales, seguridad, institucional, calendario, notificaciones, modulos, auditoria] = await Promise.all([
    api.get('/auth/recaptcha-config', { silent: true }),
    api.get('/catalog/regionales-centros', { silent: true }),
    api.get('/system-config/seguridad', { silent: true }).catch(() => null),
    api.get('/system-config/institucional', { silent: true }).catch(() => null),
    api.get('/system-config/calendario', { silent: true }).catch(() => null),
    api.get('/system-config/notificaciones', { silent: true }).catch(() => null),
    api.get('/system-config/modulos', { silent: true }).catch(() => null),
    api.get('/audit-logs/meta', { silent: true }).catch(() => null),
  ]);
  const regs = regionales.data || [];
  regionalesTree = regs;
  return {
    recaptcha: recaptcha.data || {},
    seguridad: seguridad?.data || null,
    institucional: institucional?.data || null,
    calendario: calendario?.data || null,
    notificaciones: notificaciones?.data || null,
    modulos: modulos?.data || null,
    auditoria: auditoria?.data || null,
    regionales: regs.length,
    centros: regs.reduce((n, r) => n + (r.centros?.length || 0), 0),
  };
}

function render(root) {
  if (!activeModule) {
    root.innerHTML = renderHub();
    bindHub(root);
    return;
  }
  const mod = MODULES.find(m => m.id === activeModule);
  root.innerHTML = renderModulePanel(mod);
  bindModulePanel(root, mod);
}

function renderHub() {
  const sec = snapshot?.seguridad;
  const inst = snapshot?.institucional?.branding;
  const cal = snapshot?.calendario?.resumen;
  const notif = snapshot?.notificaciones?.servidor;
  const mod = snapshot?.modulos?.resumen;
  const aud = snapshot?.auditoria?.resumen;
  return `
    ${renderSectionTitle({ title: 'Configuración del Sistema', subtitle: 'Parámetros globales del SGFC · Solo Super Admin' })}
    <div class="config-modules-grid">
      ${MODULES.map(m => `
        <button type="button" class="config-module-card" data-module="${m.id}">
          <div class="config-module-icon" style="background:${m.color}14;color:${m.color};">
            ${icon(m.icon, { size: 19, color: m.color })}
          </div>
          <div class="config-module-body">
            <div class="config-module-title">${escapeHtml(m.title)}</div>
            <div class="config-module-desc">${escapeHtml(m.desc)}</div>
          </div>
          ${icon('chevronRight', { size: 15, color: 'var(--c-gris4)' })}
        </button>
      `).join('')}
    </div>
    <div class="card card-pad config-overview">
      <h4 class="config-panel-title">Resumen del sistema</h4>
      <div class="config-kv-grid">
        <div class="config-kv"><span>Institución</span><strong>${escapeHtml(inst?.pie_pagina || '—')}</strong></div>
        <div class="config-kv"><span>Días hábiles</span><strong>${escapeHtml(cal?.dias_habiles_label || '—')}</strong></div>
        <div class="config-kv"><span>Fechas especiales</span><strong>${cal?.fechas_especiales ?? '—'}</strong></div>
        <div class="config-kv"><span>Registros auditoría</span><strong>${aud ? `${aud.total} · ${aud.hoy} hoy` : '—'}</strong></div>
        <div class="config-kv"><span>Módulos activos</span><strong>${mod ? `${mod.modulos_activos}/${mod.modulos_total} · ${mod.subgrupos_activos} subgrupos` : '—'}</strong></div>
        <div class="config-kv"><span>Correo SMTP</span><strong>${notifLabel(notif)}</strong></div>
        <div class="config-kv"><span>reCAPTCHA en login</span><strong>${recaptchaLabel(snapshot?.recaptcha, sec)}</strong></div>
        <div class="config-kv"><span>Sesión activa</span><strong>${sec?.config?.session_lifetime_minutes ?? '—'} min</strong></div>
      </div>
      <p class="config-note">La información institucional se refleja en el login y documentos. La seguridad y reCAPTCHA se gestionan en sus módulos.</p>
    </div>
  `;
}

function notifLabel(srv) {
  if (!srv) return '—';
  if (srv.email_effective) return 'Activo';
  if (srv.smtp_ready) return 'SMTP listo · correo off';
  if (srv.smtp_password_configured) return 'Falta host/remitente';
  return 'Solo in-app';
}

function recaptchaLabel(rc, sec) {
  if (sec?.servidor?.recaptcha_misconfigured || rc?.misconfigured) return 'Mal configurado';
  if (sec?.servidor?.recaptcha_effective || rc?.required) return 'Activo';
  if (sec?.servidor?.recaptcha_keys_configured) return 'Claves OK · desactivado';
  return 'Sin claves (.env)';
}

function bindHub(root) {
  root.querySelectorAll('[data-module]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeModule = btn.dataset.module;
      render(root);
    });
  });
}

function renderModulePanel(mod) {
  return `
    <button type="button" class="btn btn-ghost" id="config-back" style="margin-bottom:14px;">
      ${icon('chevronLeft', { size: 14 })}Volver a configuración
    </button>
    ${renderSectionTitle({ title: mod.title, subtitle: mod.desc })}
    <div id="config-panel-content">${['seguridad', 'institucional', 'calendario', 'notificaciones', 'modulos', 'auditoria'].includes(mod.id) ? '<p style="color:var(--c-gris5);font-size:13px;">Cargando…</p>' : ''}</div>
  `;
}

function bindModulePanel(root, mod) {
  $('#config-back').addEventListener('click', async () => {
    activeModule = null;
    snapshot = await loadSnapshot().catch(() => snapshot);
    render(root);
  });
  if (mod.id === 'seguridad') {
    loadSecurityPanel(root);
  } else if (mod.id === 'institucional') {
    loadInstitutionalPanel(root);
  } else if (mod.id === 'calendario') {
    loadCalendarPanel(root);
  } else if (mod.id === 'notificaciones') {
    loadNotificationsPanel(root);
  } else if (mod.id === 'modulos') {
    loadModulesPanel(root);
  } else if (mod.id === 'auditoria') {
    loadAuditoriaPanel(root);
  }
}

async function loadSecurityPanel(root) {
  const panel = $('#config-panel-content');
  try {
    const r = await api.get('/system-config/seguridad', { silent: true });
    securityData = r.data;
    panel.innerHTML = renderSeguridadForm(securityData);
    bindSeguridadForm(root);
  } catch {
    panel.innerHTML = `<div class="card card-pad"><p style="color:var(--c-rojo);">No se pudo cargar la configuración. Ejecute la migración 005_system_config.sql.</p></div>`;
  }
}

const DIAS_SEMANA = [
  { v: 1, l: 'Lunes' }, { v: 2, l: 'Martes' }, { v: 3, l: 'Miércoles' }, { v: 4, l: 'Jueves' },
  { v: 5, l: 'Viernes' }, { v: 6, l: 'Sábado' }, { v: 7, l: 'Domingo' },
];

const TIPO_FECHA_LABELS = { festivo: 'Festivo', cierre: 'Cierre institucional', evento: 'Evento' };

let calendarSpecialDates = [];

async function loadCalendarPanel(root) {
  const panel = $('#config-panel-content');
  try {
    const r = await api.get('/system-config/calendario', { silent: true });
    calendarSpecialDates = [...(r.data?.config?.fechas_especiales || [])];
    panel.innerHTML = renderCalendarioForm(r.data);
    bindCalendarioForm(root);
  } catch {
    panel.innerHTML = `<div class="card card-pad"><p style="color:var(--c-rojo);">No se pudo cargar. Ejecute la migración 007_calendario_config.sql.</p></div>`;
  }
}

function renderCalendarioForm(data) {
  const cfg = data?.config || {};
  const tzOpts = (data?.timezones || ['America/Bogota']).map(tz =>
    `<option value="${escapeHtml(tz)}" ${cfg.zona_horaria === tz ? 'selected' : ''}>${escapeHtml(tz)}</option>`
  ).join('');
  const diasSet = new Set((cfg.dias_habiles || [1, 2, 3, 4, 5]).map(Number));

  return `
    <form id="cal-form" class="card card-pad config-panel">
      <h4 class="config-panel-title">Calendario y días hábiles</h4>
      <p class="config-panel-lead">Define la jornada institucional y fechas no laborables. Las fechas límite de periodos pueden validarse contra este calendario.</p>

      <div class="config-form-grid">
        <div>
          <label class="label" for="cal-tz">Zona horaria</label>
          <select class="input" id="cal-tz" name="zona_horaria" required>${tzOpts}</select>
        </div>
        <div>
          <label class="label" for="cal-hora">Hora de cierre de jornada</label>
          <input class="input" type="time" id="cal-hora" name="hora_cierre" value="${escapeHtml(cfg.hora_cierre || '17:00')}">
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <span class="label" style="display:block;margin-bottom:8px;">Días hábiles de la semana</span>
        <div class="config-weekdays">
          ${DIAS_SEMANA.map(d => `
            <label class="config-weekday-chip">
              <input type="checkbox" name="dia_habil" value="${d.v}" ${diasSet.has(d.v) ? 'checked' : ''}>
              ${d.l}
            </label>
          `).join('')}
        </div>
      </div>

      <label class="config-toggle-row" style="margin-bottom:16px;">
        <input type="checkbox" name="validar_fecha_limite_habil" ${cfg.validar_fecha_limite_habil ? 'checked' : ''}>
        Validar que las fechas límite de periodos caigan en día hábil
      </label>

      <h5 class="config-panel-title" style="font-size:13px;margin-bottom:10px;">Fechas especiales (no hábiles)</h5>
      <div class="config-add-special">
        <input class="input" type="date" id="cal-new-fecha">
        <input class="input" type="text" id="cal-new-nombre" placeholder="Nombre (ej. Festivo nacional)" maxlength="120">
        <select class="input" id="cal-new-tipo">
          <option value="festivo">Festivo</option>
          <option value="cierre">Cierre institucional</option>
          <option value="evento">Evento</option>
        </select>
        <button type="button" class="btn btn-sec btn-sm" id="cal-add-fecha">${icon('plus', { size: 12 })}Agregar</button>
      </div>

      <div class="config-special-list" id="cal-special-list">
        ${renderSpecialDatesList()}
      </div>

      <div class="config-status-banner config-status-banner--info" style="margin:14px 0;">
        ${icon('calendar', { size: 14, color: 'currentColor' })}
        Las fechas límite por periodo se asignan en <strong>Contratos → Ver periodos</strong> (vista administrativo). Este calendario valida esas fechas si está activa la opción superior.
      </div>

      <div id="cal-form-error" class="hidden config-status-banner config-status-banner--warn" role="alert"></div>
      <button type="submit" class="btn" id="cal-save">${icon('check', { size: 12, color: '#fff' })}Guardar calendario</button>
    </form>
  `;
}

function renderSpecialDatesList() {
  if (!calendarSpecialDates.length) {
    return '<p style="font-size:12px;color:var(--c-gris4);padding:8px 0;">Sin fechas especiales registradas.</p>';
  }
  return calendarSpecialDates.map((f, i) => `
    <div class="config-special-row" data-idx="${i}">
      <span class="config-special-date">${escapeHtml(f.fecha)}</span>
      <span class="config-special-name">${escapeHtml(f.nombre)}</span>
      <span class="config-special-type">${escapeHtml(TIPO_FECHA_LABELS[f.tipo] || f.tipo)}</span>
      <button type="button" class="btn btn-ghost btn-sm cal-del-fecha" data-idx="${i}" title="Quitar">${icon('trash', { size: 12 })}</button>
    </div>
  `).join('');
}

function refreshSpecialDatesList() {
  const list = $('#cal-special-list');
  if (list) list.innerHTML = renderSpecialDatesList();
  list?.querySelectorAll('.cal-del-fecha').forEach(btn => {
    btn.addEventListener('click', () => {
      calendarSpecialDates.splice(parseInt(btn.dataset.idx, 10), 1);
      refreshSpecialDatesList();
    });
  });
}

function bindCalendarioForm(root) {
  const form = $('#cal-form');
  if (!form) return;

  refreshSpecialDatesList();

  $('#cal-add-fecha')?.addEventListener('click', () => {
    const fecha = $('#cal-new-fecha').value;
    const nombre = $('#cal-new-nombre').value.trim();
    const tipo = $('#cal-new-tipo').value;
    if (!fecha) {
      showToast('error', 'Fecha requerida', 'Seleccione una fecha especial.');
      return;
    }
    if (calendarSpecialDates.some(f => f.fecha === fecha)) {
      showToast('error', 'Duplicada', 'Esa fecha ya está en la lista.');
      return;
    }
    calendarSpecialDates.push({ fecha, nombre: nombre || 'Fecha especial', tipo });
    calendarSpecialDates.sort((a, b) => a.fecha.localeCompare(b.fecha));
    $('#cal-new-fecha').value = '';
    $('#cal-new-nombre').value = '';
    refreshSpecialDatesList();
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errBox = $('#cal-form-error');
    errBox.classList.add('hidden');
    errBox.textContent = '';

    const dias = [...form.querySelectorAll('input[name="dia_habil"]:checked')].map(c => parseInt(c.value, 10));
    if (!dias.length) {
      errBox.textContent = 'Seleccione al menos un día hábil.';
      errBox.classList.remove('hidden');
      return;
    }

    const body = {
      zona_horaria: form.zona_horaria.value,
      hora_cierre: form.hora_cierre.value,
      dias_habiles: dias,
      validar_fecha_limite_habil: form.validar_fecha_limite_habil.checked,
      fechas_especiales: calendarSpecialDates,
    };

    const btn = $('#cal-save');
    btn.disabled = true;
    try {
      const r = await api.put('/system-config/calendario', body, { silent: true });
      calendarSpecialDates = [...(r.data?.config?.fechas_especiales || [])];
      snapshot = await loadSnapshot().catch(() => snapshot);
      $('#config-panel-content').innerHTML = renderCalendarioForm(r.data);
      bindCalendarioForm(root);
      showToast('success', 'Guardado', 'Calendario institucional actualizado.');
    } catch (err) {
      let msg = err?.message || 'No se pudo guardar.';
      const extra = err?.payload?.errors;
      if (extra && typeof extra === 'object') {
        const parts = Object.values(extra).filter(Boolean);
        if (parts.length) msg = parts.join(' ');
      }
      errBox.textContent = msg;
      errBox.classList.remove('hidden');
    } finally {
      if (btn.isConnected) btn.disabled = false;
    }
  });
}

function renderRegionalOptions(selectedId) {
  return `<option value="">Seleccione regional del catálogo…</option>` + regionalesTree.map(r =>
    `<option value="${r.id_regional}" ${String(selectedId) === String(r.id_regional) ? 'selected' : ''}>${escapeHtml(r.nombre)}</option>`
  ).join('');
}

function renderCentroOptions(regionalId, selectedCentroId) {
  const reg = regionalesTree.find(r => String(r.id_regional) === String(regionalId));
  const centros = reg?.centros || [];
  return `<option value="">Seleccione centro del catálogo…</option>` + centros.map(c =>
    `<option value="${c.id_centro}" ${String(selectedCentroId) === String(c.id_centro) ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`
  ).join('');
}

async function loadInstitutionalPanel(root) {
  const panel = $('#config-panel-content');
  try {
    if (!regionalesTree.length) {
      const r = await api.get('/catalog/regionales-centros', { silent: true });
      regionalesTree = r.data || [];
    }
    const res = await api.get('/system-config/institucional', { silent: true });
    panel.innerHTML = renderInstitucionalForm(res.data);
    bindInstitucionalForm(root);
  } catch {
    panel.innerHTML = `<div class="card card-pad"><p style="color:var(--c-rojo);">No se pudo cargar. Ejecute la migración 006_institucional_config.sql.</p></div>`;
  }
}

function renderInstitucionalForm(data) {
  const cfg = data?.config || {};
  const brand = data?.branding || {};
  const cat = data?.catalogo || {};
  return `
    <form id="inst-form" class="card card-pad config-panel">
      <h4 class="config-panel-title">Datos institucionales</h4>
      <p class="config-panel-lead">Identidad que aparece en el login, pie de página y futuros documentos del SGFC.</p>

      <div class="config-form-grid">
        <div>
          <label class="label" for="inst-regional-sel">Regional (catálogo SENA)</label>
          <select class="input" id="inst-regional-sel" name="id_regional">${renderRegionalOptions(cfg.id_regional)}</select>
        </div>
        <div>
          <label class="label" for="inst-centro-sel">Centro de formación (catálogo)</label>
          <select class="input" id="inst-centro-sel" name="id_centro">${renderCentroOptions(cfg.id_regional, cfg.id_centro)}</select>
        </div>
        <div>
          <label class="label" for="inst-nom-reg">Nombre regional (visible)</label>
          <input class="input" id="inst-nom-reg" name="nombre_regional" required maxlength="120" value="${escapeHtml(cfg.nombre_regional || '')}">
        </div>
        <div>
          <label class="label" for="inst-nom-cen">Nombre centro (visible)</label>
          <input class="input" id="inst-nom-cen" name="nombre_centro" required maxlength="180" value="${escapeHtml(cfg.nombre_centro || '')}">
        </div>
        <div>
          <label class="label" for="inst-codigo">Código SENA</label>
          <input class="input" id="inst-codigo" name="codigo_sena" maxlength="12" placeholder="Ej. 9121" value="${escapeHtml(cfg.codigo_sena || '')}">
        </div>
        <div>
          <label class="label" for="inst-correo">Correo de contacto</label>
          <input class="input" id="inst-correo" type="email" name="correo_contacto" placeholder="contacto@sena.edu.co" value="${escapeHtml(cfg.correo_contacto || '')}">
        </div>
        <div>
          <label class="label" for="inst-tel">Teléfono</label>
          <input class="input" id="inst-tel" name="telefono" maxlength="30" placeholder="Ej. (6) 123 4567" value="${escapeHtml(cfg.telefono || '')}">
        </div>
        <div>
          <label class="label" for="inst-dir">Dirección</label>
          <input class="input" id="inst-dir" name="direccion" maxlength="255" placeholder="Dirección del centro" value="${escapeHtml(cfg.direccion || '')}">
        </div>
      </div>

      <div class="config-preview-box">
        <div class="config-preview-title">Vista previa — Login</div>
        <p id="inst-preview-desc" style="font-size:12px;color:var(--c-gris6);line-height:1.55;margin:0;">${escapeHtml(brand.descripcion_login || '')}</p>
        <p id="inst-preview-pie" style="font-size:11px;color:var(--c-gris5);margin:10px 0 0;">${escapeHtml(brand.pie_pagina || '')}</p>
      </div>

      <div class="config-status-banner config-status-banner--info" style="margin-bottom:14px;">
        ${icon('info', { size: 14, color: 'currentColor' })}
        Catálogo nacional: <strong>${cat.regionales ?? snapshot?.regionales ?? 0} regionales</strong> · <strong>${cat.centros ?? snapshot?.centros ?? 0} centros</strong>.
        Al elegir del catálogo se autocompletan los nombres visibles (puede editarlos).
      </div>

      <div id="inst-form-error" class="hidden config-status-banner config-status-banner--warn" role="alert"></div>

      <button type="submit" class="btn" id="inst-save">${icon('check', { size: 12, color: '#fff' })}Guardar información institucional</button>
    </form>
  `;
}

function updateInstPreview() {
  const reg = $('#inst-nom-reg')?.value?.trim() || '';
  const cen = $('#inst-nom-cen')?.value?.trim() || '';
  const desc = document.getElementById('inst-preview-desc');
  const pie = document.getElementById('inst-preview-pie');
  if (desc) desc.textContent = `Plataforma institucional para la gestión, validación y seguimiento documental de contratistas del SENA ${reg || '…'}.`;
  if (pie) pie.textContent = cen ? `SENA ${reg} — ${cen}` : `SENA ${reg}`;
}

function bindInstitucionalForm(root) {
  const form = $('#inst-form');
  if (!form) return;

  const selReg = $('#inst-regional-sel');
  const selCen = $('#inst-centro-sel');
  const nomReg = $('#inst-nom-reg');
  const nomCen = $('#inst-nom-cen');

  selReg?.addEventListener('change', () => {
    const reg = regionalesTree.find(r => String(r.id_regional) === String(selReg.value));
    if (reg) nomReg.value = reg.nombre;
    selCen.innerHTML = renderCentroOptions(selReg.value, '');
    nomCen.value = '';
    updateInstPreview();
  });

  selCen?.addEventListener('change', () => {
    const reg = regionalesTree.find(r => String(r.id_regional) === String(selReg.value));
    const cen = reg?.centros?.find(c => String(c.id_centro) === String(selCen.value));
    if (cen) nomCen.value = cen.nombre;
    updateInstPreview();
  });

  nomReg?.addEventListener('input', updateInstPreview);
  nomCen?.addEventListener('input', updateInstPreview);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errBox = $('#inst-form-error');
    errBox.classList.add('hidden');
    errBox.textContent = '';

    const body = {
      id_regional: selReg.value ? parseInt(selReg.value, 10) : null,
      id_centro: selCen.value ? parseInt(selCen.value, 10) : null,
      nombre_regional: nomReg.value.trim(),
      nombre_centro: nomCen.value.trim(),
      codigo_sena: form.codigo_sena.value.trim(),
      correo_contacto: form.correo_contacto.value.trim(),
      telefono: form.telefono.value.trim(),
      direccion: form.direccion.value.trim(),
    };

    const btn = $('#inst-save');
    btn.disabled = true;
    try {
      const r = await api.put('/system-config/institucional', body, { silent: true });
      panelRefresh(root, r.data);
      snapshot = await loadSnapshot().catch(() => snapshot);
      showToast('success', 'Guardado', 'Información institucional actualizada.');
    } catch (err) {
      let msg = err?.message || 'No se pudo guardar.';
      const extra = err?.payload?.errors;
      if (extra && typeof extra === 'object') {
        const parts = Object.values(extra).filter(Boolean);
        if (parts.length) msg = parts.join(' ');
      }
      errBox.textContent = msg;
      errBox.classList.remove('hidden');
    } finally {
      if (btn.isConnected) btn.disabled = false;
    }
  });
}

function panelRefresh(root, data) {
  $('#config-panel-content').innerHTML = renderInstitucionalForm(data);
  bindInstitucionalForm(root);
}

function renderSeguridadForm(data) {
  const cfg = data.config || {};
  const srv = data.servidor || {};
  const rcStatus = srv.recaptcha_misconfigured
    ? 'Mal configurado en .env'
    : srv.recaptcha_effective
      ? 'Activo en el login'
      : srv.recaptcha_keys_configured
        ? 'Claves OK · desactivado en configuración'
        : 'Sin claves en .env';
  const canToggleRecaptcha = srv.recaptcha_keys_configured && !srv.recaptcha_misconfigured;

  return `
    <form id="sec-form" class="card card-pad config-panel">
      <h4 class="config-panel-title">Políticas editables</h4>
      <p class="config-panel-lead">Estos valores se aplican de inmediato en login, contraseñas y subida de PDFs.</p>

      <div class="config-form-grid">
        <div>
          <label class="label" for="sec-min-len">Longitud mínima de contraseña</label>
          <input class="input" type="number" id="sec-min-len" name="password_min_length" min="4" max="32" required value="${cfg.password_min_length ?? 6}">
        </div>
        <div>
          <label class="label" for="sec-max-mb">Tamaño máximo de PDF (MB)</label>
          <input class="input" type="number" id="sec-max-mb" name="max_upload_mb" min="1" max="50" required value="${cfg.max_upload_mb ?? 10}">
        </div>
        <div>
          <label class="label" for="sec-session">Duración de sesión (minutos)</label>
          <input class="input" type="number" id="sec-session" name="session_lifetime_minutes" min="15" max="480" required value="${cfg.session_lifetime_minutes ?? 120}">
        </div>
        <div>
          <label class="label" for="sec-attempts">Intentos fallidos antes de bloqueo</label>
          <input class="input" type="number" id="sec-attempts" name="max_login_attempts" min="0" max="20" required value="${cfg.max_login_attempts ?? 5}">
          <div style="font-size:11px;color:var(--c-gris4);margin-top:4px;">0 = sin bloqueo por intentos</div>
        </div>
        <div>
          <label class="label" for="sec-lockout">Minutos de bloqueo</label>
          <input class="input" type="number" id="sec-lockout" name="lockout_minutes" min="1" max="1440" required value="${cfg.lockout_minutes ?? 15}">
        </div>
      </div>

      <div class="config-toggle-list">
        <label class="config-toggle-row">
          <input type="checkbox" name="password_require_upper" ${cfg.password_require_upper ? 'checked' : ''}>
          Exigir al menos una letra mayúscula en contraseñas nuevas
        </label>
        <label class="config-toggle-row">
          <input type="checkbox" name="password_require_number" ${cfg.password_require_number ? 'checked' : ''}>
          Exigir al menos un número en contraseñas nuevas
        </label>
        <label class="config-toggle-row">
          <input type="checkbox" name="recaptcha_habilitado" ${cfg.recaptcha_habilitado ? 'checked' : ''} ${canToggleRecaptcha ? '' : 'disabled'}>
          Exigir reCAPTCHA en el login
          ${canToggleRecaptcha ? '' : '<span style="font-size:11px;color:var(--c-gris4);"> (requiere claves en .env)</span>'}
        </label>
      </div>

      <div class="config-kv-grid config-kv-grid--panel" style="margin-bottom:16px;">
        <div class="config-kv"><span>reCAPTCHA v2</span><strong>${escapeHtml(rcStatus)}</strong></div>
        <div class="config-kv"><span>Tipos de archivo</span><strong>${escapeHtml(srv.allowed_file_types || 'application/pdf')}</strong></div>
        <div class="config-kv"><span>Referencia .env sesión</span><strong>${srv.env_session_lifetime ?? '—'} min</strong></div>
        <div class="config-kv"><span>Referencia .env upload</span><strong>${srv.env_max_upload_mb ?? '—'} MB</strong></div>
      </div>

      <div id="sec-form-error" class="hidden config-status-banner config-status-banner--warn" role="alert"></div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button type="submit" class="btn" id="sec-save">${icon('check', { size: 12, color: '#fff' })}Guardar configuración</button>
      </div>

      <div class="config-status-banner config-status-banner--info" style="margin-top:14px;">
        ${icon('lock', { size: 14, color: 'currentColor' })}
        Las claves secretas de reCAPTCHA no se editan desde aquí; configúrelas en <code>backend/.env</code>.
      </div>
    </form>
  `;
}

function bindSeguridadForm(root) {
  const form = $('#sec-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errBox = $('#sec-form-error');
    errBox.classList.add('hidden');
    errBox.textContent = '';

    const body = {
      password_min_length: parseInt(form.password_min_length.value, 10),
      max_upload_mb: parseInt(form.max_upload_mb.value, 10),
      session_lifetime_minutes: parseInt(form.session_lifetime_minutes.value, 10),
      max_login_attempts: parseInt(form.max_login_attempts.value, 10),
      lockout_minutes: parseInt(form.lockout_minutes.value, 10),
      password_require_upper: form.password_require_upper.checked,
      password_require_number: form.password_require_number.checked,
      recaptcha_habilitado: form.recaptcha_habilitado.checked,
    };

    const btn = $('#sec-save');
    btn.disabled = true;
    try {
      const r = await api.put('/system-config/seguridad', body, { silent: true });
      securityData = r.data;
      snapshot = await loadSnapshot().catch(() => snapshot);
      $('#config-panel-content').innerHTML = renderSeguridadForm(securityData);
      bindSeguridadForm(root);
      showToast('success', 'Guardado', 'Configuración de seguridad actualizada.');
    } catch (err) {
      errBox.textContent = err?.message || 'No se pudo guardar.';
      errBox.classList.remove('hidden');
    } finally {
      if (btn.isConnected) btn.disabled = false;
    }
  });
}

function renderNotificacionesForm(data) {
  const cfg = data?.config || {};
  const srv = data?.servidor || {};
  const smtpReady = srv.smtp_ready;
  const emailDisabled = !smtpReady ? 'disabled' : '';

  return `
    <form id="notif-form" class="card card-pad config-panel">
      <h4 class="config-panel-title">Alertas dentro del sistema</h4>
      <p class="config-panel-lead">Controla qué eventos generan notificaciones en la campana del SGFC.</p>
      <div class="config-toggle-list">
        <label class="config-toggle-row"><input type="checkbox" name="inapp_admin_evidencia_subida" ${cfg.inapp_admin_evidencia_subida ? 'checked' : ''}> Administrativo: nueva evidencia o corrección de contratista</label>
        <label class="config-toggle-row"><input type="checkbox" name="inapp_admin_pdf_firma" ${cfg.inapp_admin_pdf_firma ? 'checked' : ''}> Administrativo: PDF unificado listo para firma</label>
        <label class="config-toggle-row"><input type="checkbox" name="inapp_contractor_aprobada" ${cfg.inapp_contractor_aprobada ? 'checked' : ''}> Contratista: evidencia aprobada</label>
        <label class="config-toggle-row"><input type="checkbox" name="inapp_contractor_rechazada" ${cfg.inapp_contractor_rechazada ? 'checked' : ''}> Contratista: evidencia rechazada</label>
        <label class="config-toggle-row"><input type="checkbox" name="inapp_contractor_pdf_firmado" ${cfg.inapp_contractor_pdf_firmado ? 'checked' : ''}> Contratista: PDF firmado por administrativo</label>
        <label class="config-toggle-row"><input type="checkbox" name="inapp_contractor_evidencias_asignadas" ${cfg.inapp_contractor_evidencias_asignadas !== false ? 'checked' : ''}> Contratista: evidencias asignadas a un periodo</label>
      </div>

      <h4 class="config-panel-title" style="margin-top:8px;">Servidor de correo (SMTP)</h4>
      <div class="config-form-grid">
        <div><label class="label">Servidor SMTP</label><input class="input" name="smtp_host" placeholder="smtp.sena.edu.co" value="${escapeHtml(cfg.smtp_host || '')}"></div>
        <div><label class="label">Puerto</label><input class="input" type="number" name="smtp_port" min="1" max="65535" value="${cfg.smtp_port ?? 587}"></div>
        <div><label class="label">Cifrado</label>
          <select class="input" name="smtp_encryption">
            <option value="tls" ${cfg.smtp_encryption === 'tls' ? 'selected' : ''}>TLS</option>
            <option value="ssl" ${cfg.smtp_encryption === 'ssl' ? 'selected' : ''}>SSL</option>
            <option value="none" ${cfg.smtp_encryption === 'none' ? 'selected' : ''}>Ninguno</option>
          </select>
        </div>
        <div><label class="label">Usuario SMTP</label><input class="input" name="smtp_user" autocomplete="off" value="${escapeHtml(cfg.smtp_user || '')}"></div>
        <div><label class="label">Correo remitente</label><input class="input" type="email" name="smtp_from_email" placeholder="sgfc@sena.edu.co" value="${escapeHtml(cfg.smtp_from_email || '')}"></div>
        <div><label class="label">Nombre remitente</label><input class="input" name="smtp_from_name" value="${escapeHtml(cfg.smtp_from_name || 'SGFC — SENA')}"></div>
      </div>

      <div class="config-kv-grid config-kv-grid--panel" style="margin-bottom:14px;">
        <div class="config-kv"><span>Contraseña SMTP</span><strong>${srv.smtp_password_configured ? 'Configurada en .env' : 'Falta SMTP_PASSWORD'}</strong></div>
        <div class="config-kv"><span>Estado correo</span><strong>${srv.email_effective ? 'Activo' : (smtpReady ? 'Listo · desactivado' : 'Incompleto')}</strong></div>
      </div>

      <h4 class="config-panel-title" style="font-size:13px;">Alertas por correo electrónico</h4>
      <div class="config-toggle-list">
        <label class="config-toggle-row"><input type="checkbox" name="email_habilitado" ${cfg.email_habilitado ? 'checked' : ''} ${emailDisabled}> Habilitar envío de correos</label>
        <label class="config-toggle-row"><input type="checkbox" name="email_admin_evidencia" ${cfg.email_admin_evidencia ? 'checked' : ''} ${emailDisabled}> Correo al administrativo por evidencia cargada</label>
        <label class="config-toggle-row"><input type="checkbox" name="email_contractor_rechazo" ${cfg.email_contractor_rechazo ? 'checked' : ''} ${emailDisabled}> Correo al contratista cuando se rechaza evidencia</label>
        <label class="config-toggle-row"><input type="checkbox" name="email_contractor_aprobacion" ${cfg.email_contractor_aprobacion ? 'checked' : ''} ${emailDisabled}> Correo al contratista cuando se aprueba evidencia</label>
        <label class="config-toggle-row"><input type="checkbox" name="email_contractor_evidencias_asignadas" ${cfg.email_contractor_evidencias_asignadas ? 'checked' : ''} ${emailDisabled}> Correo al contratista cuando se asignan evidencias a un periodo</label>
        <label class="config-toggle-row"><input type="checkbox" name="email_resumen_diario" ${cfg.email_resumen_diario ? 'checked' : ''} disabled title="Próximamente"> Resumen diario por correo (próximamente)</label>
      </div>

      <div class="config-test-email">
        <input class="input" type="email" id="notif-test-email" placeholder="Correo para prueba">
        <button type="button" class="btn btn-sec btn-sm" id="notif-test-btn">${icon('mail', { size: 12 })}Enviar prueba</button>
      </div>
      <div id="notif-test-result" class="hidden config-status-banner" role="alert" aria-live="polite"></div>

      <div class="config-status-banner config-status-banner--info" style="margin:14px 0;">
        ${icon('bell', { size: 14, color: 'currentColor' })}
        <span>
          La contraseña va en <code>backend/.env</code> como <code>SMTP_PASSWORD</code> (no en este formulario).
          Para <strong>@soy.sena.edu.co</strong>: <code>smtp.office365.com</code>, puerto <code>587</code>, TLS, usuario = correo completo.
          Si falla la autenticación, confirme que entra en <a href="https://www.office.com" target="_blank" rel="noopener">office.com</a>
          y, con verificación en dos pasos, use una <strong>contraseña de aplicación</strong> de Microsoft.
        </span>
      </div>

      <div id="notif-form-error" class="hidden config-status-banner config-status-banner--warn" role="alert"></div>
      <button type="submit" class="btn" id="notif-save">${icon('check', { size: 12, color: '#fff' })}Guardar notificaciones</button>
    </form>
  `;
}

async function loadNotificationsPanel(root) {
  const panel = $('#config-panel-content');
  try {
    const r = await api.get('/system-config/notificaciones', { silent: true });
    panel.innerHTML = renderNotificacionesForm(r.data);
    bindNotificacionesForm(root, r.data);
  } catch {
    panel.innerHTML = `<div class="card card-pad"><p style="color:var(--c-rojo);">No se pudo cargar. Ejecute la migración 008_notificaciones_config.sql.</p></div>`;
  }
}

function bindNotificacionesForm(root, data) {
  const form = $('#notif-form');
  if (!form) return;

  $('#notif-test-btn')?.addEventListener('click', async () => {
    const email = $('#notif-test-email').value.trim();
    const btn = $('#notif-test-btn');

    if (!email) {
      showNotifTestResult('error', 'Indique un correo para la prueba.');
      showToast('error', 'Correo requerido', 'Indique un correo para la prueba.');
      return;
    }

    clearNotifTestResult();
    const prevLabel = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `${icon('refresh', { size: 12 })}Enviando…`;

    try {
      const r = await api.post('/system-config/notificaciones/test-email', { email }, { silent: true });
      const msg = r.message || `Correo de prueba enviado a ${email}.`;
      showNotifTestResult('success', msg);
      showToast('success', 'Correo enviado', msg);
    } catch (err) {
      const msg = err?.message || 'No se pudo enviar la prueba.';
      showNotifTestResult('error', msg);
      showToast('error', 'Error al enviar', msg);
    } finally {
      if (btn.isConnected) {
        btn.disabled = false;
        btn.innerHTML = prevLabel;
      }
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errBox = $('#notif-form-error');
    errBox.classList.add('hidden');
    errBox.textContent = '';

    const body = {
      inapp_admin_evidencia_subida: form.inapp_admin_evidencia_subida.checked,
      inapp_admin_pdf_firma: form.inapp_admin_pdf_firma.checked,
      inapp_contractor_aprobada: form.inapp_contractor_aprobada.checked,
      inapp_contractor_rechazada: form.inapp_contractor_rechazada.checked,
      inapp_contractor_pdf_firmado: form.inapp_contractor_pdf_firmado.checked,
      inapp_contractor_evidencias_asignadas: form.inapp_contractor_evidencias_asignadas.checked,
      email_habilitado: form.email_habilitado.checked,
      email_admin_evidencia: form.email_admin_evidencia.checked,
      email_contractor_rechazo: form.email_contractor_rechazo.checked,
      email_contractor_aprobacion: form.email_contractor_aprobacion.checked,
      email_contractor_evidencias_asignadas: form.email_contractor_evidencias_asignadas.checked,
      email_resumen_diario: form.email_resumen_diario.checked,
      smtp_host: form.smtp_host.value.trim(),
      smtp_port: parseInt(form.smtp_port.value, 10),
      smtp_encryption: form.smtp_encryption.value,
      smtp_user: form.smtp_user.value.trim(),
      smtp_from_email: form.smtp_from_email.value.trim(),
      smtp_from_name: form.smtp_from_name.value.trim(),
    };

    const btn = $('#notif-save');
    btn.disabled = true;
    try {
      const r = await api.put('/system-config/notificaciones', body, { silent: true });
      snapshot = await loadSnapshot().catch(() => snapshot);
      $('#config-panel-content').innerHTML = renderNotificacionesForm(r.data);
      bindNotificacionesForm(root, r.data);
      showToast('success', 'Guardado', 'Configuración de notificaciones actualizada.');
    } catch (err) {
      let msg = err?.message || 'No se pudo guardar.';
      const extra = err?.payload?.errors;
      if (extra && typeof extra === 'object') {
        const parts = Object.values(extra).filter(Boolean);
        if (parts.length) msg = parts.join(' ');
      }
      errBox.textContent = msg;
      errBox.classList.remove('hidden');
    } finally {
      if (btn.isConnected) btn.disabled = false;
    }
  });
}

function showNotifTestResult(type, message) {
  const box = $('#notif-test-result');
  if (!box) return;
  const isOk = type === 'success';
  box.className = `config-status-banner config-status-banner--${isOk ? 'success' : 'error'}`;
  box.innerHTML = `${icon(isOk ? 'checkCircle' : 'alertCircle', { size: 14, color: 'currentColor' })}<span>${escapeHtml(message)}</span>`;
}

function clearNotifTestResult() {
  const box = $('#notif-test-result');
  if (!box) return;
  box.className = 'hidden config-status-banner';
  box.textContent = '';
}

function renderModulosForm(data) {
  const cfg = data?.config || {};
  const modulos = data?.modulos || [];
  const resumen = data?.resumen || {};

  const modBlocks = modulos.map(m => {
    const subs = (m.subgrupos || []).map(s => `
      <label class="config-subgroup-row ${m.activo ? '' : 'is-muted'}">
        <input type="checkbox" name="sg_${s.id_subgrupo}" ${s.activo ? 'checked' : ''} ${m.activo ? '' : 'disabled'}>
        <span class="config-subgroup-code">${escapeHtml(s.codigo)}</span>
        <span class="config-subgroup-name">${escapeHtml(s.nombre)}</span>
      </label>
    `).join('');

    return `
      <div class="config-module-block" data-mod="${m.id_modulo}">
        <label class="config-module-head" style="--mod-color:${escapeHtml(m.color_hex || '#39A900')}">
          <input type="checkbox" class="mod-toggle" name="mod_${m.id_modulo}" ${m.activo ? 'checked' : ''}>
          <span class="config-module-badge">${escapeHtml(m.codigo)}</span>
          <span class="config-module-name">${escapeHtml(m.nombre)}</span>
          <span class="config-module-count">${(m.subgrupos || []).filter(s => s.activo).length}/${(m.subgrupos || []).length} activos</span>
        </label>
        <div class="config-subgroup-list">${subs}</div>
      </div>
    `;
  }).join('');

  return `
    <form id="mod-form" class="card card-pad config-panel">
      <h4 class="config-panel-title">Funciones del SGFC</h4>
      <p class="config-panel-lead">Activa o desactiva procesos globales. Si una función está off, la API rechazará la acción correspondiente.</p>
      <div class="config-toggle-list">
        <label class="config-toggle-row"><input type="checkbox" name="carga_contratista" ${cfg.carga_contratista ? 'checked' : ''}> Carga de evidencias por contratistas</label>
        <label class="config-toggle-row"><input type="checkbox" name="revision_admin" ${cfg.revision_admin ? 'checked' : ''}> Revisión y aprobación administrativa</label>
        <label class="config-toggle-row"><input type="checkbox" name="unificar_pdf" ${cfg.unificar_pdf ? 'checked' : ''}> Unificación de PDF por periodo</label>
        <label class="config-toggle-row"><input type="checkbox" name="firma_pdf" ${cfg.firma_pdf ? 'checked' : ''}> Firma electrónica de PDF (admin y contratista)</label>
      </div>

      <div class="config-kv-grid config-kv-grid--panel" style="margin-bottom:16px;">
        <div class="config-kv"><span>Módulos activos</span><strong>${resumen.modulos_activos ?? 0} / ${resumen.modulos_total ?? 0}</strong></div>
        <div class="config-kv"><span>Subgrupos activos</span><strong>${resumen.subgrupos_activos ?? 0}</strong></div>
      </div>

      <h4 class="config-panel-title" style="margin-top:4px;">Bloques GF y GC</h4>
      <p class="config-panel-lead">Los subgrupos inactivos dejan de aparecer en carga, revisión y reportes. Desactivar un módulo oculta todos sus subgrupos.</p>
      <div class="config-module-list">${modBlocks}</div>

      <div class="config-status-banner config-status-banner--info" style="margin:14px 0;">
        ${icon('folder', { size: 14, color: 'currentColor' })}
        <span>Los cambios aplican de inmediato tras guardar. Las evidencias ya cargadas no se eliminan.</span>
      </div>

      <div id="mod-form-error" class="hidden config-status-banner config-status-banner--warn" role="alert"></div>
      <button type="submit" class="btn" id="mod-save">${icon('check', { size: 12, color: '#fff' })}Guardar módulos</button>
    </form>
  `;
}

async function loadModulesPanel(root) {
  const panel = $('#config-panel-content');
  try {
    const r = await api.get('/system-config/modulos', { silent: true });
    panel.innerHTML = renderModulosForm(r.data);
    bindModulosForm(root, r.data);
  } catch {
    panel.innerHTML = `<div class="card card-pad"><p style="color:var(--c-rojo);">No se pudo cargar. Ejecute la migración 009_modulos_config.sql.</p></div>`;
  }
}

function bindModulosForm(root, data) {
  const form = $('#mod-form');
  if (!form) return;

  form.querySelectorAll('.mod-toggle').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const block = toggle.closest('.config-module-block');
      const on = toggle.checked;
      block?.querySelectorAll('.config-subgroup-row input[type=checkbox]').forEach(cb => {
        cb.disabled = !on;
        cb.closest('.config-subgroup-row')?.classList.toggle('is-muted', !on);
      });
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errBox = $('#mod-form-error');
    errBox.classList.add('hidden');
    errBox.textContent = '';

    const modulosPayload = (data?.modulos || []).map(m => ({
      id_modulo: m.id_modulo,
      activo: !!form[`mod_${m.id_modulo}`]?.checked,
      subgrupos: (m.subgrupos || []).map(s => ({
        id_subgrupo: s.id_subgrupo,
        activo: !!form[`sg_${s.id_subgrupo}`]?.checked,
      })),
    }));

    const body = {
      carga_contratista: form.carga_contratista.checked,
      revision_admin: form.revision_admin.checked,
      unificar_pdf: form.unificar_pdf.checked,
      firma_pdf: form.firma_pdf.checked,
      modulos: modulosPayload,
    };

    const btn = $('#mod-save');
    btn.disabled = true;
    try {
      const r = await api.put('/system-config/modulos', body, { silent: true });
      snapshot = await loadSnapshot().catch(() => snapshot);
      $('#config-panel-content').innerHTML = renderModulosForm(r.data);
      bindModulosForm(root, r.data);
      showToast('success', 'Guardado', 'Configuración de módulos actualizada.');
    } catch (err) {
      let msg = err?.message || 'No se pudo guardar.';
      const extra = err?.payload?.errors;
      if (extra && typeof extra === 'object') {
        const parts = Object.values(extra).filter(Boolean);
        if (parts.length) msg = parts.join(' ');
      }
      errBox.textContent = msg;
      errBox.classList.remove('hidden');
    } finally {
      if (btn.isConnected) btn.disabled = false;
    }
  });
}

const AUDIT_ACCION_LABELS = {
  login_ok: 'Inicio de sesión',
  login_failed: 'Intento fallido',
  logout: 'Cierre de sesión',
  user_create: 'Usuario creado',
  user_update: 'Usuario actualizado',
  user_disable: 'Usuario desactivado',
  evidence_upload: 'Evidencia cargada',
  review_approve: 'Evidencia aprobada',
  review_reject: 'Evidencia rechazada',
  pdf_merge: 'PDF unificado',
  pdf_admin_sign: 'Firma administrativo',
  pdf_contractor_sign: 'Firma contratista',
  config_security_update: 'Config. seguridad',
  config_institucional_update: 'Config. institucional',
  config_calendario_update: 'Config. calendario',
  config_notificaciones_update: 'Config. notificaciones',
  config_modulos_update: 'Config. módulos',
};

function auditAccionLabel(accion) {
  return AUDIT_ACCION_LABELS[accion] || accion;
}

function buildAuditQuery(filters, limit = 200) {
  const q = new URLSearchParams();
  q.set('limit', String(limit));
  if (filters.fecha) q.set('fecha', filters.fecha);
  if (filters.accion) q.set('accion', filters.accion);
  if (filters.nombre) q.set('nombre', filters.nombre);
  return q.toString();
}

function buildAuditExportQuery(filters) {
  const q = new URLSearchParams();
  if (filters.fecha) q.set('fecha', filters.fecha);
  if (filters.accion) q.set('accion', filters.accion);
  if (filters.nombre) q.set('nombre', filters.nombre);
  return q.toString();
}

function renderAuditoriaPanel(meta, logs) {
  const resumen = meta?.resumen || {};
  const acciones = meta?.acciones || [];
  const accionOpts = acciones.map(a =>
    `<option value="${escapeHtml(a)}">${escapeHtml(auditAccionLabel(a))} (${escapeHtml(a)})</option>`
  ).join('');

  const rows = logs.length
    ? logs.map(l => `
      <tr>
        <td>${escapeHtml(fmtDateTime(l.creado_en))}</td>
        <td>${escapeHtml(l.persona || l.usuario || '—')}</td>
        <td><span class="badge badge-gris">${escapeHtml(l.rol || '—')}</span></td>
        <td><code class="audit-code">${escapeHtml(l.accion)}</code></td>
        <td>${escapeHtml(l.entidad || '—')}${l.entidad_id ? ` #${escapeHtml(String(l.entidad_id))}` : ''}</td>
        <td class="audit-ip"><code>${escapeHtml(l.ip || '—')}</code></td>
      </tr>
    `).join('')
    : `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--c-gris4);">Sin registros con los filtros aplicados.</td></tr>`;

  return `
    <div class="card card-pad config-panel">
      <h4 class="config-panel-title">Auditoría del sistema</h4>
      <p class="config-panel-lead">Historial de accesos y acciones críticas. Exporte a CSV para reportes institucionales.</p>

      <div class="config-kv-grid config-kv-grid--panel" style="margin-bottom:16px;">
        <div class="config-kv"><span>Total registros</span><strong>${resumen.total ?? 0}</strong></div>
        <div class="config-kv"><span>Eventos hoy</span><strong>${resumen.hoy ?? 0}</strong></div>
        <div class="config-kv"><span>Logins hoy</span><strong>${resumen.logins_hoy ?? 0}</strong></div>
        <div class="config-kv"><span>Fallos login hoy</span><strong>${resumen.fallos_hoy ?? 0}</strong></div>
      </div>

      <div class="list-toolbar config-audit-toolbar">
        <div class="list-toolbar-fields activity-filters config-audit-filters">
          <input type="date" class="input" id="audit-f-fecha" title="Filtrar por fecha">
          <select class="input" id="audit-f-accion">
            <option value="">Todas las acciones</option>
            ${accionOpts}
          </select>
          <input type="search" class="input" id="audit-f-nombre" placeholder="Buscar por nombre o usuario…">
          <button type="button" class="btn btn-ghost btn-sm" id="audit-f-clear" title="Limpiar filtros">${icon('x', { size: 12 })}</button>
        </div>
        <div class="list-toolbar-meta">
          <span id="audit-count" class="list-count">${logs.length} registro(s)</span>
          <button type="button" class="btn btn-sec btn-sm" id="audit-export">${icon('download', { size: 12 })}Exportar CSV</button>
        </div>
      </div>

      <div class="table-wrap config-audit-table-wrap">
        <table class="table config-audit-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th class="audit-ip-col">IP</th>
            </tr>
          </thead>
          <tbody id="audit-tbody">${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAuditoriaRows(logs) {
  if (!logs.length) {
    return `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--c-gris4);">Sin registros con los filtros aplicados.</td></tr>`;
  }
  return logs.map(l => `
    <tr>
      <td>${escapeHtml(fmtDateTime(l.creado_en))}</td>
      <td>${escapeHtml(l.persona || l.usuario || '—')}</td>
      <td><span class="badge badge-gris">${escapeHtml(l.rol || '—')}</span></td>
      <td><code class="audit-code">${escapeHtml(l.accion)}</code></td>
      <td>${escapeHtml(l.entidad || '—')}${l.entidad_id ? ` #${escapeHtml(String(l.entidad_id))}` : ''}</td>
      <td class="audit-ip"><code>${escapeHtml(l.ip || '—')}</code></td>
    </tr>
  `).join('');
}

async function loadAuditoriaPanel(root) {
  const panel = $('#config-panel-content');
  try {
    const [metaR, logsR] = await Promise.all([
      api.get('/audit-logs/meta', { silent: true }),
      api.get('/audit-logs?' + buildAuditQuery({}, 200), { silent: true }),
    ]);
    const meta = metaR.data;
    const logs = logsR.data || [];
    panel.innerHTML = renderAuditoriaPanel(meta, logs);
    bindAuditoriaPanel(root);
  } catch {
    panel.innerHTML = `<div class="card card-pad"><p style="color:var(--c-rojo);">No se pudo cargar la auditoría.</p></div>`;
  }
}

function bindAuditoriaPanel(root) {
  let debounceTimer = null;

  async function currentFilters() {
    return {
      fecha: $('#audit-f-fecha')?.value || '',
      accion: $('#audit-f-accion')?.value || '',
      nombre: $('#audit-f-nombre')?.value.trim() || '',
    };
  }

  async function applyFilters() {
    const tbody = $('#audit-tbody');
    const count = $('#audit-count');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--c-gris4);">Cargando…</td></tr>`;
    try {
      const filters = await currentFilters();
      const r = await api.get('/audit-logs?' + buildAuditQuery(filters, 200), { silent: true });
      const logs = r.data || [];
      tbody.innerHTML = renderAuditoriaRows(logs);
      if (count) count.textContent = `${logs.length} registro(s)`;
    } catch {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--c-rojo);">Error al cargar registros.</td></tr>`;
    }
  }

  function scheduleFilter() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 300);
  }

  $('#audit-f-fecha')?.addEventListener('change', applyFilters);
  $('#audit-f-accion')?.addEventListener('change', applyFilters);
  $('#audit-f-nombre')?.addEventListener('input', scheduleFilter);
  $('#audit-f-clear')?.addEventListener('click', () => {
    $('#audit-f-fecha').value = '';
    $('#audit-f-accion').value = '';
    $('#audit-f-nombre').value = '';
    applyFilters();
  });

  $('#audit-export')?.addEventListener('click', async () => {
    const btn = $('#audit-export');
    btn.disabled = true;
    try {
      const filters = await currentFilters();
      const qs = buildAuditExportQuery(filters);
      const stamp = new Date().toISOString().slice(0, 10);
      await api.downloadAs('/audit-logs/export' + (qs ? '?' + qs : ''), `SGFC_auditoria_${stamp}.csv`);
      showToast('success', 'Exportado', 'Archivo CSV descargado.');
    } catch (err) {
      showToast('error', 'Error', err?.message || 'No se pudo exportar.');
    } finally {
      if (btn?.isConnected) btn.disabled = false;
    }
  });
}
