/**
 * Vista: Administrativo → Firmas.
 *   - Tabs: Pendientes por firmar / Firmados
 *   - Permite ver PDF unificado, adjuntar firma y reenviar al contratista.
 */
import { api, API_BASE } from '../api.js';
import { $, $$, escapeHtml, fmtDate } from '../utils.js';
import { renderLayout, renderSectionTitle, icon } from '../components.js';
import { openUnifiedPdfSignModal } from '../unified-pdf-signature.js';

let tab = 'Pendientes';

export async function init() {
  const root = await renderLayout({ rootSelector: '#app', activeId: 'admin-firmas', breadcrumb: ['Firmas y entregables'] });
  const params = new URLSearchParams(window.location.search);
  if (params.get('tab') === 'gc-zip') tab = 'GC-ZIP';
  root.innerHTML = `
    ${renderSectionTitle({ title: 'Firma de Documentos', subtitle: 'GF: PDF con firma · GC: paquetes ZIP sin firma' })}
    <div class="tabs" id="tabs">
      <button class="tab ${tab === 'Pendientes' ? 'active' : ''}" data-tab="Pendientes">Pendientes GF <span class="count" id="c-pen">0</span></button>
      <button class="tab ${tab === 'Firmados' ? 'active' : ''}" data-tab="Firmados">Firmados GF <span class="count" id="c-firm">0</span></button>
      <button class="tab ${tab === 'GC-ZIP' ? 'active' : ''}" data-tab="GC-ZIP">Paquetes GC <span class="count" id="c-zip">0</span></button>
    </div>
    <div id="list"></div>
  `;
  $$('#tabs .tab').forEach(t => t.addEventListener('click', () => {
    tab = t.dataset.tab;
    $$('#tabs .tab').forEach(x => x.classList.toggle('active', x === t));
    load();
  }));
  await load();
}

async function load() {
  const [pending, signed, zips] = await Promise.all([
    api.get('/pdf/pending-admin'),
    api.get('/pdf/signed'),
    api.get('/zip/admin'),
  ]);
  $('#c-pen').textContent = pending.data.length;
  $('#c-firm').textContent = signed.data.length;
  $('#c-zip').textContent = zips.data.length;
  if (tab === 'Pendientes') renderPending(pending.data);
  else if (tab === 'Firmados') renderSigned(signed.data);
  else renderGcZip(zips.data);
}

function renderPending(rows) {
  $('#list').innerHTML = rows.length === 0
    ? `<div style="text-align:center;padding:40px;color:var(--c-gris4);">
         ${icon('checkCircle',{size:32,color:'currentColor',strokeWidth:1.5})}
         <p style="font-size:14px;font-weight:500;margin-top:12px;">Sin documentos pendientes por firmar</p>
       </div>`
    : `<div style="display:flex;flex-direction:column;gap:10px;">${rows.map(p => `
      <div class="card" style="padding:16px 20px;display:flex;gap:14px;align-items:center;border-left:3px solid var(--c-agua);">
        <div style="width:42px;height:42px;border-radius:10px;background:var(--c-agua-light);display:flex;align-items:center;justify-content:center;">${icon('fileStack',{size:20,color:'#0891B2'})}</div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:700;">PDF GF — ${escapeHtml(p.contratista)}</div>
          <div style="font-size:12px;color:var(--c-gris5);margin-top:1px;">Contrato #${p.id_contrato} · Período: ${escapeHtml(p.periodo)} · Generado: ${fmtDate(p.fecha_generado)}</div>
          <span class="badge pendiente-firma small">Pendiente firma</span>
        </div>
        <div style="display:flex;gap:8px;">
          <a class="btn btn-ghost" href="${API_BASE}/pdf/unified/${p.id_pdf}" target="_blank">${icon('eye',{size:14})}Ver PDF</a>
          <button class="btn" data-sign="${p.id_pdf}">${icon('penLine',{size:14,color:'#fff'})}Firmar</button>
        </div>
      </div>`).join('')}</div>`;
  $$('#list button[data-sign]').forEach(b => b.addEventListener('click', () => {
    openUnifiedPdfSignModal(parseInt(b.dataset.sign, 10), { role: 'Administrativo', onDone: () => load() });
  }));
}

function renderSigned(rows) {
  $('#list').innerHTML = `
    <div class="card" style="overflow:hidden;">
      <div class="table-wrap">
        <table class="table">
          <thead><tr>${['Contratista','Contrato','Período','Fecha firma','Estado','Acciones'].map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--c-gris4);">Sin documentos firmados</td></tr>` :
              rows.map(p => `
                <tr>
                  <td style="font-weight:600;">${escapeHtml(p.contratista)}</td>
                  <td style="font-weight:700;color:var(--c-azul);">#${p.id_contrato}</td>
                  <td>${escapeHtml(p.periodo)}</td>
                  <td style="font-size:12px;color:var(--c-gris5);">${fmtDate(p.fecha_firma_admin)}</td>
                  <td><span class="badge ${p.estado === 'Finalizado' ? 'firmado' : 'pendiente-firma'} small">${escapeHtml(p.estado)}</span></td>
                  <td>
                    <a class="btn btn-ghost btn-sm" href="${API_BASE}/pdf/unified/${p.id_pdf}" target="_blank">${icon('eye',{size:12})}Ver</a>
                    <a class="btn btn-sm" href="${API_BASE}/pdf/final/${p.id_pdf}/download" target="_blank">${icon('download',{size:12,color:'#fff'})}Descargar</a>
                  </td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderGcZip(rows) {
  $('#list').innerHTML = rows.length === 0
    ? `<div style="text-align:center;padding:40px;color:var(--c-gris4);">
         ${icon('download',{size:32,color:'currentColor',strokeWidth:1.5})}
         <p style="font-size:14px;font-weight:500;margin-top:12px;">Sin paquetes ZIP GC</p>
       </div>`
    : `<div class="card" style="overflow:hidden;">
      <div class="table-wrap">
        <table class="table">
          <thead><tr>${['Contratista','Contrato','Período','Generado','Acciones'].map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(p => `
              <tr>
                <td style="font-weight:600;">${escapeHtml(p.contratista)}</td>
                <td style="font-weight:700;color:var(--c-azul);">#${p.id_contrato}</td>
                <td>${escapeHtml(p.periodo)}</td>
                <td style="font-size:12px;color:var(--c-gris5);">${fmtDate(p.fecha_generado)}</td>
                <td>
                  <a class="btn btn-sm" href="${API_BASE}/zip/${p.id_pdf}/download">${icon('download',{size:12,color:'#fff'})}Descargar ZIP</a>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}
