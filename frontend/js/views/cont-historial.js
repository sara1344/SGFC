/**
 * Vista: Contratista → Historial.
 */
import { api, API_BASE } from '../api.js';
import { $, $$, escapeHtml, fmtDate } from '../utils.js';
import { renderLayout, renderSectionTitle, icon, renderProgress } from '../components.js';

export async function init() {
  const root = await renderLayout({ rootSelector: '#app', activeId: 'cont-historial', breadcrumb: ['Historial'] });
  root.innerHTML = `<div id="page"></div>`;
  const cs = await api.get('/contracts');
  const contratos = cs.data;
  $('#page').innerHTML = `
    ${renderSectionTitle({ title: 'Historial de Contratos', subtitle: 'Contratos anteriores y actual con periodos firmados' })}
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${contratos.length === 0 ? `<div class="card card-pad text-center" style="color:var(--c-gris4);">Sin contratos registrados</div>` :
        contratos.map(c => `
          <div class="card" style="overflow:hidden;">
            <button class="ct-toggle" data-id="${c.id_contrato}" style="width:100%;display:flex;gap:12px;align-items:center;padding:14px 18px;border:none;background:#fff;cursor:pointer;text-align:left;">
              <div style="width:36px;height:36px;border-radius:9px;background:var(--c-gris2);display:flex;align-items:center;justify-content:center;">${icon('briefcase',{size:16})}</div>
              <div style="flex:1;">
                <div style="font-size:14px;font-weight:700;color:var(--c-azul);">Contrato #${c.id_contrato}</div>
                <div style="font-size:12px;color:var(--c-gris5);margin-top:1px;">${fmtDate(c.fecha_inicio)} — ${fmtDate(c.fecha_fin)} · ${escapeHtml((c.area_aplicacion || '').slice(0,60))}…</div>
              </div>
              <span class="badge ${c.estado === 'Activo' ? 'activo' : 'finalizado'} small">${escapeHtml(c.estado || '')}</span>
              ${icon('chevronDown',{size:16,color:'var(--c-gris4)'})}
            </button>
            <div class="ct-periods" id="ct-periods-${c.id_contrato}" style="display:none;"></div>
          </div>
        `).join('')}
    </div>`;
  $$('.ct-toggle').forEach(b => b.addEventListener('click', async () => {
    const c = b.dataset.id;
    const box = $('#ct-periods-' + c);
    if (box.style.display === 'block') { box.style.display = 'none'; return; }
    const r = await api.get('/periods?contrato=' + c);
    const mine = await api.get('/pdf/mine');
    const pdfMap = new Map(mine.data.map(p => [p.id_periodo, p]));
    box.style.display = 'block';
    box.innerHTML = `
      <div style="border-top:1px solid var(--c-gris2);overflow-x:auto;">
        <table class="table">
          <thead><tr>${['Período','Estado','Avance','PDF unificado','Acción'].map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>
            ${r.data.map(p => {
              const pdf = pdfMap.get(p.id_periodo);
              const final = pdf && ['Finalizado', 'Firmado por contratista'].includes(pdf.estado);
              return `
                <tr>
                  <td style="font-weight:600;">${escapeHtml(p.nombre_periodo)}</td>
                  <td><span class="badge ${p.estado === 'Firmado' ? 'firmado' : p.estado === 'Pendiente firma' ? 'pendiente-firma' : p.estado === 'Activo' ? 'activo' : 'bloqueado'} small">${escapeHtml(p.estado)}</span></td>
                  <td style="min-width:140px;">${renderProgress(parseInt(p.avance, 10) || 0)}</td>
                  <td>${pdf ? `<span class="badge ${final ? 'firmado' : 'pendiente-firma'} small">${escapeHtml(pdf.estado)}</span>` : '<span style="color:var(--c-gris3);">—</span>'}</td>
                  <td>${final ? `<a class="btn btn-sm" href="${API_BASE}/pdf/final/${pdf.id_pdf}/download" target="_blank">${icon('download',{size:12,color:'#fff'})}PDF</a>` : ''}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }));
}
