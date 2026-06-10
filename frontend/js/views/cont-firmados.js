/**

 * Vista: Contratista → PDFs Firmados (GF) y paquetes ZIP (GC).

 */

import { api, API_BASE } from '../api.js';

import { $, $$, escapeHtml, fmtDate } from '../utils.js';

import { renderLayout, renderSectionTitle, icon } from '../components.js';

import { openUnifiedPdfSignModal } from '../unified-pdf-signature.js';



let tab = 'gf';



export async function init() {

  const root = await renderLayout({ rootSelector: '#app', activeId: 'cont-firmados', breadcrumb: ['Documentos del periodo'] });

  root.innerHTML = `<div id="page"></div>`;

  const params = new URLSearchParams(window.location.search);

  if (params.get('tab') === 'gc-zip') tab = 'gc';

  await load();

}



async function load() {

  const [pdfs, zips] = await Promise.all([

    api.get('/pdf/mine'),

    api.get('/zip/mine'),

  ]);



  $('#page').innerHTML = `

    ${renderSectionTitle({ title: 'Documentos del periodo', subtitle: 'GF: PDF unificado con firma · GC: paquete ZIP sin firma' })}

    <div class="tabs mb-3" id="doc-tabs">

      <button class="tab ${tab === 'gf' ? 'active' : ''}" data-tab="gf">PDFs GF (firma) <span class="count">${pdfs.data.length}</span></button>

      <button class="tab ${tab === 'gc' ? 'active' : ''}" data-tab="gc">Paquetes GC (ZIP) <span class="count">${zips.data.length}</span></button>

    </div>

    <div id="doc-list"></div>`;



  $$('#doc-tabs .tab').forEach(t => t.addEventListener('click', () => {

    tab = t.dataset.tab;

    $$('#doc-tabs .tab').forEach(x => x.classList.toggle('active', x === t));

    renderList(pdfs.data, zips.data);

  }));



  renderList(pdfs.data, zips.data);

}



function renderList(pdfs, zips) {

  if (tab === 'gc') {

    $('#doc-list').innerHTML = zips.length === 0

      ? `<div class="card card-pad text-center"><div style="color:var(--c-gris4);font-size:14px;">Aún no hay paquetes ZIP GC. Genérelo desde "Cargar Evidencias" cuando todas las evidencias GC estén aprobadas.</div></div>`

      : `<div style="display:flex;flex-direction:column;gap:10px;">${zips.map(p => `

          <div class="card" style="padding:16px 20px;display:flex;gap:14px;align-items:center;border-left:3px solid var(--c-azul);">

            <div style="width:40px;height:40px;border-radius:10px;background:var(--c-azul-light);display:flex;align-items:center;justify-content:center;">

              ${icon('download',{size:18,color:'#00304D'})}

            </div>

            <div style="flex:1;">

              <div style="font-size:14px;font-weight:700;">Paquete GC — ${escapeHtml(p.periodo)}</div>

              <div style="font-size:12px;color:var(--c-gris5);margin-top:2px;">Generado: ${fmtDate(p.fecha_generado)} · Sin firma digital</div>

              <span class="badge firmado small">ZIP disponible</span>

            </div>

            <a class="btn btn-sm" href="${API_BASE}/zip/${p.id_pdf}/download">${icon('download',{size:12,color:'#fff'})}Descargar ZIP</a>

          </div>`).join('')}</div>`;

    return;

  }



  $('#doc-list').innerHTML = pdfs.length === 0

    ? `<div class="card card-pad text-center"><div style="color:var(--c-gris4);font-size:14px;">Aún no hay PDFs GF. Unifíquelos desde "Cargar Evidencias" cuando todas las evidencias GF estén aprobadas.</div></div>`

    : `<div style="display:flex;flex-direction:column;gap:10px;">${pdfs.map(p => {

        const states = {

          'Enviado a administrativo':'pendiente-firma',

          'Firmado por administrativo':'firmado',

          'Enviado a contratista':'pendiente-firma',

          'Firmado por contratista':'firmado',

          'Finalizado':'firmado',

        };

        const needsSign = ['Firmado por administrativo','Enviado a contratista'].includes(p.estado);

        const final = ['Firmado por contratista','Finalizado'].includes(p.estado);

        return `

          <div class="card" style="padding:16px 20px;display:flex;gap:14px;align-items:center;border-left:3px solid ${final ? 'var(--c-azul-firma)' : 'var(--c-verde)'};">

            <div style="width:40px;height:40px;border-radius:10px;background:${final ? 'var(--c-azul-firma-light)' : 'var(--c-verde-light)'};display:flex;align-items:center;justify-content:center;">

              ${icon('fileSignature',{size:18,color: final ? '#1D4ED8' : '#39A900'})}

            </div>

            <div style="flex:1;">

              <div style="font-size:14px;font-weight:700;">PDF GF — ${escapeHtml(p.periodo)}</div>

              <div style="font-size:12px;color:var(--c-gris5);margin-top:2px;">Generado: ${fmtDate(p.fecha_generado)} · Firma admin: ${fmtDate(p.fecha_firma_admin)} · Firma final: ${fmtDate(p.fecha_firma_contratista)}</div>

              <span class="badge ${states[p.estado] || ''} small">${escapeHtml(p.estado)}</span>

            </div>

            <div style="display:flex;gap:6px;">

              ${p.ruta_unificado ? `<a class="btn btn-ghost btn-sm" href="${API_BASE}/pdf/unified/${p.id_pdf}" target="_blank">${icon('eye',{size:12})}Ver</a>` : ''}

              ${final ? `<a class="btn btn-sm" href="${API_BASE}/pdf/final/${p.id_pdf}/download" target="_blank">${icon('download',{size:12,color:'#fff'})}Descargar</a>` : ''}

              ${needsSign ? `<button class="btn btn-sm" data-sign="${p.id_pdf}">${icon('penLine',{size:12,color:'#fff'})}Firmar</button>` : ''}

            </div>

          </div>`;

      }).join('')}</div>`;



  $$('#doc-list button[data-sign]').forEach(b => b.addEventListener('click', () => {
    openUnifiedPdfSignModal(parseInt(b.dataset.sign, 10), { role: 'Contratista', onDone: () => load() });
  }));

}

