/**
 * Vista: Administrativo → Firmas.
 *   - Tabs: Pendientes por firmar / Firmados
 *   - Permite ver PDF unificado, adjuntar firma y reenviar al contratista.
 */
import { api, API_BASE } from '../api.js';
import { $, $$, escapeHtml, fmtDate, readFileAsDataUrl } from '../utils.js';
import { renderLayout, renderSectionTitle, icon, openModal, showToast } from '../components.js';
import { getUser, setUser } from '../auth.js';

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
  $$('#list button[data-sign]').forEach(b => b.addEventListener('click', () => openSignModal(parseInt(b.dataset.sign, 10))));
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

function openSignModal(idPdf) {
  const user = getUser();
  const hasSignature = !!user?.tiene_firma;

  openModal({
    title: 'Firmar documento',
    html: `
      <div style="background:var(--c-gris0);border-radius:10px;border:1px solid var(--c-gris2);padding:20px;text-align:center;margin-bottom:14px;">
        ${icon('fileStack',{size:36,color:'#1D4ED8'})}
        <div style="font-size:14px;font-weight:700;margin-top:6px;">PDF GF unificado del periodo</div>
      </div>
      ${hasSignature ? `
        <div style="background:var(--c-verde-light);border:1px solid #BBF7D0;border-radius:8px;padding:14px;margin-bottom:18px;">
          <div style="font-size:13px;font-weight:700;color:var(--c-verde);display:flex;gap:6px;align-items:center;">${icon('checkCircle',{size:14,color:'#39A900'})}Firma registrada</div>
          <div style="font-size:12px;color:var(--c-gris6);margin-top:4px;">Su firma ya está guardada en el sistema. Se usará automáticamente en este documento.</div>
        </div>` : `
        <div style="margin-bottom:14px;">
          <label class="label">Adjunte su firma (PNG o JPG)</label>
          <input type="file" class="input" id="sig-file" accept="image/png,image/jpeg,image/jpg">
          <div style="font-size:11px;color:var(--c-gris5);margin-top:4px;">Solo se solicita la primera vez. Luego se reutilizará en futuras firmas.</div>
        </div>
        <div id="sig-preview-wrap" style="display:none;margin-bottom:14px;text-align:center;">
          <div style="font-size:11px;color:var(--c-gris5);margin-bottom:6px;">Vista previa</div>
          <img id="sig-preview" alt="Vista previa firma" style="max-height:80px;max-width:100%;border:1px solid var(--c-gris2);border-radius:8px;background:#fff;padding:8px;">
        </div>`}
      <div style="background:var(--c-azul-firma-light);border:1px solid #BFDBFE;border-radius:8px;padding:14px;margin-bottom:18px;">
        <div style="font-size:12px;color:var(--c-gris6);">En el PDF aparecerá: su imagen de firma, cargo y nombre, fecha y hora, y <strong>SGFC SENA</strong>.</div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn btn-sec" data-close-modal>Cancelar</button>
        <button class="btn" id="do-sign" ${hasSignature ? '' : 'disabled'}>${icon('penLine',{size:12,color:'#fff'})}Confirmar firma</button>
      </div>`,
    onOpen: (modal, close) => {
      modal.querySelector('[data-close-modal]').addEventListener('click', close);
      const signBtn = modal.querySelector('#do-sign');
      let imagenB64 = '';

      if (!hasSignature) {
        const fileInput = modal.querySelector('#sig-file');
        const previewWrap = modal.querySelector('#sig-preview-wrap');
        const preview = modal.querySelector('#sig-preview');

        fileInput.addEventListener('change', async () => {
          const file = fileInput.files?.[0];
          imagenB64 = '';
          signBtn.disabled = true;
          if (!file) {
            previewWrap.style.display = 'none';
            return;
          }
          if (!/^image\/(png|jpeg|jpg)$/i.test(file.type) && !/\.(png|jpe?g)$/i.test(file.name)) {
            showToast('error', 'Archivo inválido', 'Use una imagen PNG o JPG.');
            fileInput.value = '';
            previewWrap.style.display = 'none';
            return;
          }
          if (file.size > 2 * 1024 * 1024) {
            showToast('error', 'Archivo grande', 'La firma no puede superar 2 MB.');
            fileInput.value = '';
            previewWrap.style.display = 'none';
            return;
          }
          try {
            imagenB64 = await readFileAsDataUrl(file);
            preview.src = imagenB64;
            previewWrap.style.display = 'block';
            signBtn.disabled = false;
          } catch {
            showToast('error', 'Error', 'No se pudo leer la imagen.');
          }
        });
      }

      signBtn.addEventListener('click', async () => {
        if (!hasSignature && !imagenB64) return;
        signBtn.disabled = true;
        try {
          const body = { id_pdf: idPdf };
          if (imagenB64) body.imagen_b64 = imagenB64;
          await api.post('/pdf/admin-sign', body);
          if (!hasSignature && user) {
            setUser({ ...user, tiene_firma: true });
          }
          showToast('success', 'Firmado', 'PDF firmado y enviado al contratista.');
          close(); load();
        } catch {
          signBtn.disabled = !hasSignature && !imagenB64;
        }
      });
    },
  });
}
