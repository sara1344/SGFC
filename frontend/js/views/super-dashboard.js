/**
 * Vista: Super Admin → Dashboard.
 */
import { api } from '../api.js';
import { $, escapeHtml, fmtDateTime } from '../utils.js';
import { renderLayout, renderKpi, icon } from '../components.js';
import { fetchAvanceRegionales, renderAvanceRegionalesWidget, bindAvanceRegionalesWidget } from '../dashboard-avance-regionales.js';

const ACCION_LABELS = {
  login_ok: 'Inicio de sesión',
  logout: 'Cierre de sesión',
};

function accionLabel(accion) {
  return ACCION_LABELS[accion] || accion;
}

function renderActivityList(logs) {
  if (!logs.length) {
    return '<p style="color:var(--c-gris4);font-size:13px;">Sin registros con los filtros aplicados.</p>';
  }
  return logs.map(l => `
    <div class="activity-item">
      <div class="activity-icon">${icon('activity', { size: 14, color: '#39A900' })}</div>
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:500;">${escapeHtml(l.persona || l.usuario || 'Sistema')} · ${escapeHtml(accionLabel(l.accion))}</div>
        <div style="font-size:11px;color:var(--c-gris4);">${fmtDateTime(l.creado_en)}${l.entidad ? ' · ' + escapeHtml(l.entidad) + ' #' + escapeHtml(String(l.entidad_id || '')) : ''}</div>
      </div>
    </div>`).join('');
}

function buildAuditQuery(filters) {
  const q = new URLSearchParams();
  q.set('limit', '100');
  if (filters.fecha) q.set('fecha', filters.fecha);
  if (filters.accion) q.set('accion', filters.accion);
  if (filters.nombre) q.set('nombre', filters.nombre);
  return q.toString();
}

async function fetchActivityLogs(filters) {
  const qs = buildAuditQuery(filters);
  const r = await api.get('/audit-logs?' + qs, { silent: true });
  return r.data || [];
}

export async function init() {
  const root = await renderLayout({ rootSelector: '#app', activeId: 'super-dashboard', breadcrumb: ['Inicio'] });
  const [r, avanceRegionales, initialLogs] = await Promise.all([
    api.get('/dashboard/superadmin'),
    fetchAvanceRegionales().catch(() => []),
    fetchActivityLogs({}).catch(() => []),
  ]);
  const k = r.data.kpis;

  root.innerHTML = `
    <div class="section-title">
      <div>
        <h2>Panel Super Administrador</h2>
        <p>Vista global del sistema SGFC</p>
      </div>
      <span style="background:var(--c-morado-light);color:var(--c-morado);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:800;display:inline-flex;align-items:center;gap:5px;">${icon('shield',{size:11,color:'currentColor'})}ACCESO TOTAL</span>
    </div>
    
    <div class="grid grid-kpis mb-4">
      ${renderKpi({ label: 'Total usuarios',   value: k.usuarios,      iconName: 'users',         color: '#00304D' })}
      ${renderKpi({ label: 'Contratos activos',value: k.contratos,     iconName: 'fileText',      color: '#39A900' })}
      ${renderKpi({ label: 'Total periodos',   value: k.periodos,      iconName: 'fileText',      color: '#71277A' })}
      ${renderKpi({ label: 'Subgrupos',        value: k.subgrupos,     iconName: 'folder',        color: '#CA8A04' })}
      ${renderKpi({ label: 'Evidencias master',value: k.evidencias,    iconName: 'clipboard',     color: '#EA580C' })}
      ${renderKpi({ label: 'PDFs firmados',    value: k.pdfs_firmados, iconName: 'fileSignature', color: '#1D4ED8' })}
    </div>
    <div class="grid grid-2 dashboard-split mb-4">
      <div class="card card-pad dashboard-panel-fill dashboard-scroll-panel activity-panel">
        <h4 style="font-size:14px;font-weight:700;color:var(--c-azul);margin-bottom:12px;">Actividad reciente del sistema</h4>
        <div class="activity-filters">
          <input type="date" class="input" id="act-f-fecha" title="Filtrar por fecha">
          <select class="input" id="act-f-accion">
            <option value="">Todas las acciones</option>
            <option value="login_ok">Inicio de sesión (login_ok)</option>
            <option value="logout">Cierre de sesión (logout)</option>
          </select>
          <input type="search" class="input" id="act-f-nombre" placeholder="Buscar por nombre…">
          <button type="button" class="btn btn-ghost btn-sm" id="act-f-clear" title="Limpiar filtros">${icon('x',{size:12})}</button>
        </div>
        <div id="activity-list">${renderActivityList(initialLogs)}</div>
      </div>
      ${renderAvanceRegionalesWidget(avanceRegionales, { inline: true })}
    </div>
  `;

  bindAvanceRegionalesWidget(root, avanceRegionales);

  const $list = $('#activity-list');
  let debounceTimer = null;

  async function applyActivityFilters() {
    const filters = {
      fecha: $('#act-f-fecha').value,
      accion: $('#act-f-accion').value,
      nombre: $('#act-f-nombre').value.trim(),
    };
    $list.innerHTML = '<p style="color:var(--c-gris4);font-size:13px;">Cargando…</p>';
    try {
      const logs = await fetchActivityLogs(filters);
      $list.innerHTML = renderActivityList(logs);
    } catch {
      $list.innerHTML = '<p style="color:var(--c-rojo);font-size:13px;">No se pudo cargar la actividad.</p>';
    }
  }

  function scheduleFilter() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyActivityFilters, 300);
  }

  $('#act-f-fecha').addEventListener('change', applyActivityFilters);
  $('#act-f-accion').addEventListener('change', applyActivityFilters);
  $('#act-f-nombre').addEventListener('input', scheduleFilter);
  $('#act-f-clear').addEventListener('click', () => {
    $('#act-f-fecha').value = '';
    $('#act-f-accion').value = '';
    $('#act-f-nombre').value = '';
    applyActivityFilters();
  });
}
