/**
 * Vista: Administrativo → Dashboard
 *   - KPIs (semáforo)
 *   - Tabla tipo Excel/checklist por contratista x evidencias x estado
 *   - Filtros + exportar a Excel
 */

import { api, API_BASE } from '../api.js';
import { $, escapeHtml, renderAvatar } from '../utils.js';
import { renderLayout, renderKpi, renderSectionTitle, icon, showToast } from '../components.js';
import { getUser } from '../auth.js';
import { fetchAvanceRegionales, renderAvanceRegionalesWidget, bindAvanceRegionalesWidget } from '../dashboard-avance-regionales.js';

export async function init() {
  const root = await renderLayout({ rootSelector: '#app', activeId: 'admin-dashboard', breadcrumb: ['Inicio'] });

  let data;
  let avanceRegionales = [];
  try {
    const [rAdmin, rAvance] = await Promise.all([
      api.get('/dashboard/admin'),
      fetchAvanceRegionales().catch(() => []),
    ]);
    data = rAdmin.data;
    avanceRegionales = rAvance;
  } catch (e) {
    root.innerHTML = `<div class="card card-pad"><p class="text-rojo">No se pudo cargar el inicio.</p></div>`;
    return;
  }

  const k = data.kpis || {};
  const rows = data.checklist || [];

  // Agrupar filas por contratista para tabla tipo Excel
  const byContratista = new Map();
  for (const r of rows) {
    if (!byContratista.has(r.contratista)) byContratista.set(r.contratista, { contratista: r.contratista, items: [] });
    byContratista.get(r.contratista).items.push(r);
  }

  // Filtros disponibles
  const periodos    = [...new Set(rows.map(r => r.periodo))].filter(Boolean).sort();
  const contratistas= [...byContratista.keys()];
  const modulos     = [...new Set(rows.map(r => r.modulo))];

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const ahora = new Date();
  const me = getUser();
  const centroKpi = me?.rol_label === 'Administrativo de Centro'
    ? renderKpi({
        label: 'Centro',
        value: me?.centro_nombre || '—',
        iconName: 'building',
        color: '#0891B2',
        sub: me?.regional_nombre || '',
        wide: true,
        textValue: true,
      })
    : '';

  root.innerHTML = `
    ${renderSectionTitle({
      title: 'Inicio',
      subtitle: `Seguimiento general — ${meses[ahora.getMonth()]} ${ahora.getFullYear()}`,
    })}

    <div class="grid grid-kpis mb-4">
      ${centroKpi}
      ${renderKpi({ label: 'Contratistas activos',  value: k.contratistas_activos || 0, iconName: 'users',         color: '#00304D' })}
      ${renderKpi({ label: 'Evidencias aprobadas',  value: k.aprobadas || 0,            iconName: 'checkCircle',   color: '#39A900' })}
      ${renderKpi({ label: 'Pendiente revisión',    value: k.pendiente_revision || 0,   iconName: 'helpCircle',    color: '#CA8A04' })}
      ${renderKpi({ label: 'Pendiente entrega',     value: k.pendiente_entrega || 0,    iconName: 'alertTriangle', color: '#EA580C' })}
      ${renderKpi({ label: 'Rechazadas',            value: k.rechazadas || 0,           iconName: 'xCircle',       color: '#DC2626' })}
      ${renderKpi({ label: 'Periodos firmados',     value: k.periodos_firmados || 0,    iconName: 'fileSignature', color: '#1D4ED8' })}
      ${renderKpi({ label: 'Pendiente firma',       value: k.pendiente_firma || 0,      iconName: 'fileStack',     color: '#0891B2' })}
    </div>

    ${renderAvanceRegionalesWidget(avanceRegionales)}

    <div class="checklist-toolbar mb-3">
      <select class="input" id="f-periodo" style="width:170px;">
        <option value="">Todos los periodos</option>
        ${periodos.map(p => `<option>${escapeHtml(p)}</option>`).join('')}
      </select>
      <button class="btn btn-ghost" id="btn-export">${icon('download', { size: 14 })}Exportar Excel</button>
    </div>

    <div class="card mb-4" style="overflow:hidden;">
      <div style="padding:14px 18px;border-bottom:1px solid var(--c-gris2);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h4 style="font-size:14px;font-weight:700;color:var(--c-azul);">Lista de Chequeo — Evidencias por Contratista</h4>
          <p style="font-size:11px;color:var(--c-gris5);margin-top:2px;">Centro Industrial y del Desarrollo Tecnológico · SENA Caldas</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--c-verde);font-weight:600;">${icon('checkCircle',{size:12,color:'#39A900'})}Aprobada</span>
          <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--c-amarillo);font-weight:600;">${icon('helpCircle',{size:12,color:'#CA8A04'})}Revisión</span>
          <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--c-gris4);font-weight:600;"><span style="font-size:10px;font-weight:700;padding:0 4px;">N/A</span>No asignado</span>
          <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--c-naranja);font-weight:600;">${icon('alertTriangle',{size:12,color:'#EA580C'})}Pendiente</span>
          <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--c-rojo);font-weight:600;">${icon('x',{size:12,color:'#DC2626'})}Rechazada</span>
        </div>
      </div>
      <div class="table-wrap" id="checklist-table"></div>
    </div>
  `;

  bindAvanceRegionalesWidget(root, avanceRegionales);
  renderChecklist(rows);

  $('#f-periodo').addEventListener('change', e => {
    const v = e.target.value;
    const filtered = v ? rows.filter(r => r.periodo === v) : rows;
    renderChecklist(filtered);
  });

  $('#btn-export').addEventListener('click', async () => {
    showToast('info', 'Generando archivo', 'Descargando Excel…');
    try {
      const blob = await fetch(API_BASE + '/dashboard/export', { credentials: 'include' }).then(r => r.blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SGFC_listado_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      showToast('success', 'Listo', 'Excel descargado correctamente.');
    } catch {
      showToast('error', 'Error', 'No se pudo exportar el archivo.');
    }
  });
}

function renderChecklist(rows) {
  // Agrupar por contratista + (modulo, evidencia) → estado
  const contratistas = [...new Set(rows.map(r => r.contratista))];
  const modGF = [...new Set(rows.filter(r => r.modulo === 'GF').map(r => r.evidencia))];
  const modGC = [...new Set(rows.filter(r => r.modulo === 'GC').map(r => r.evidencia))];

  const indexEstado = new Map();
  for (const r of rows) {
    indexEstado.set(`${r.contratista}||${r.evidencia}`, r.estado);
  }

  const progressFor = (cont) => {
    const items = rows.filter(r => r.contratista === cont);
    const total = items.length;
    if (total === 0) return 0;
    const apr = items.filter(r => r.estado === 'Aprobada').length;
    return Math.round((apr / total) * 100);
  };

  const progressBadge = (pct) => {
    const color = pct === 100 ? '#39A900' : pct >= 50 ? '#CA8A04' : '#EA580C';
    const bg = pct === 100 ? 'var(--c-verde-light)' : pct >= 50 ? 'var(--c-amarillo-light)' : 'var(--c-naranja-light,#FFF7ED)';
    return `<span style="font-size:11px;font-weight:800;color:${color};background:${bg};padding:2px 8px;border-radius:20px;white-space:nowrap;">${pct}%</span>`;
  };

  const cellFor = (cont, evid) => {
    const key = `${cont}||${evid}`;
    if (!indexEstado.has(key)) {
      return `<div style="display:flex;justify-content:center;" title="No asignado a este contratista"><span style="font-size:10px;color:var(--c-gris4);font-weight:600;">N/A</span></div>`;
    }
    const est = indexEstado.get(key);
    if (est === 'Aprobada')           return `<div style="display:flex;justify-content:center;">${icon('check',{size:14,color:'#39A900',strokeWidth:3})}</div>`;
    if (est === 'Rechazada')          return `<div style="display:flex;justify-content:center;">${icon('x',{size:14,color:'#DC2626',strokeWidth:3})}</div>`;
    if (est === 'Pendiente revisión') return `<div style="display:flex;justify-content:center;">${icon('helpCircle',{size:14,color:'#CA8A04'})}</div>`;
    if (est === 'Pendiente entrega')  return `<div style="display:flex;justify-content:center;">${icon('alertTriangle',{size:12,color:'#EA580C'})}</div>`;
    return '<span style="color:var(--c-gris3);">—</span>';
  };

  $('#checklist-table').innerHTML = `
    <table class="table" style="min-width:900px;font-size:12px;">
      <thead>
        <tr>
          <th rowspan="2" style="min-width:220px;">Contratista</th>
          <th colspan="${modGF.length}" style="background:#F0FDF4;color:#39A900;text-align:center;border-bottom:none;">GF — Gestión Financiera</th>
          <th colspan="${modGC.length}" style="background:#EFF6FF;color:#00304D;text-align:center;border-bottom:none;">GC — Gestión Contractual</th>
        </tr>
        <tr>
          ${modGF.map(e => `<th style="background:#F0FDF4;font-size:10px;text-align:center;">${escapeHtml(e.slice(0,18))}${e.length > 18 ? '…' : ''}</th>`).join('')}
          ${modGC.map(e => `<th style="background:#EFF6FF;font-size:10px;text-align:center;">${escapeHtml(e.slice(0,18))}${e.length > 18 ? '…' : ''}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${contratistas.length === 0
          ? `<tr><td colspan="${modGF.length + modGC.length + 1}" style="text-align:center;padding:30px;color:var(--c-gris4);">Sin datos en este filtro</td></tr>`
          : contratistas.map((c, i) => `
              <tr style="background:${i % 2 === 0 ? '#fff' : 'var(--c-gris0)'};">
                <td style="font-weight:600;">
                  <div style="display:flex;align-items:flex-start;gap:8px;">
                    ${renderAvatar(c, 24)}
                    <div>
                      <div>${escapeHtml(c)}</div>
                      <div style="margin-top:4px;">${progressBadge(progressFor(c))}</div>
                    </div>
                  </div>
                </td>
                ${modGF.map(e => `<td style="text-align:center;">${cellFor(c, e)}</td>`).join('')}
                ${modGC.map(e => `<td style="text-align:center;">${cellFor(c, e)}</td>`).join('')}
              </tr>
          `).join('')}
      </tbody>
    </table>
  `;
}
