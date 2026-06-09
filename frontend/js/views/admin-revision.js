/**
 * Vista: Administrativo → Revisión de evidencias.
 *   1. Tarjetas agrupadas (contratista · contrato · periodo · avance)
 *   2. Tabla de evidencias del grupo
 *   3. Visor PDF inline bajo la fila + aprobar / rechazar
 */
import { api, API_BASE, resolveFrontendPath } from '../api.js';
import { $, $$, escapeHtml, renderAvatar, fmtDate } from '../utils.js';
import { renderLayout, renderSectionTitle, icon, showToast, showConfirm } from '../components.js';
import { detectEvidenceFileKind, buildEvidencePreviewMarkup, mountEvidencePreview, previewLabel } from '../evidence-preview.js';

let currentTab = 'Pendiente revisión';
let allRows = [];
let selectedGroupKey = null;
let expandedUploadId = null;
let rejectModeId = null;

function ensureRevisionStyles() {
  const styleId = 'rev-module-styles-v3';
  document.getElementById('rev-module-styles')?.remove();
  document.getElementById('rev-module-styles-v2')?.remove();
  let el = document.getElementById(styleId);
  if (!el) {
    el = document.createElement('style');
    el.id = styleId;
    document.head.appendChild(el);
  }
  el.textContent = `
    #list { width: 100%; max-width: 100%; }
    .rev-group-list {
      display: flex; flex-direction: column; gap: 14px;
      width: 100%; max-width: 100%;
    }
    .rev-empty { padding: 48px 24px; text-align: center; color: var(--c-gris4); width: 100%; }
    .rev-empty p { margin-top: 12px; font-size: 14px; }

    .rev-group-card {
      position: relative; display: block;
      width: 100%; max-width: 100%;
      padding: 0; text-align: left; overflow: hidden;
      border: 1px solid var(--c-gris2); border-radius: 12px; cursor: pointer;
      background: #fff; transition: border-color .2s, box-shadow .2s, transform .15s;
      box-shadow: 0 2px 8px rgba(0, 48, 77, .05);
    }
    .rev-group-card:hover {
      border-color: rgba(57, 169, 0, .45);
      box-shadow: 0 10px 28px rgba(57, 169, 0, .12);
      transform: translateY(-1px);
    }
    .rev-group-card:focus-visible { outline: 2px solid var(--c-verde); outline-offset: 2px; }
    .rev-card-accent {
      position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
      background: linear-gradient(180deg, var(--c-verde) 0%, #2d7a00 100%);
    }
    .rev-card-body {
      padding: 14px 18px 14px 22px;
      display: flex; align-items: center; gap: 14px;
      width: 100%; box-sizing: border-box;
    }
    .rev-card-header {
      display: flex; align-items: center; gap: 14px;
      flex: 1; min-width: 0;
    }
    .rev-card-avatar {
      flex-shrink: 0;
      box-shadow: 0 0 0 3px #fff, 0 0 0 4px var(--c-gris1);
      border-radius: 50%;
    }
    .rev-card-info {
      display: flex; flex-direction: column; gap: 4px; min-width: 0;
    }
    .rev-card-name {
      font-size: 14px; font-weight: 800; color: var(--c-azul);
      letter-spacing: -0.2px; line-height: 1.2; margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .rev-card-chips {
      display: flex; flex-wrap: wrap; gap: 5px;
    }
    .rev-chip {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; color: var(--c-gris6); background: var(--c-gris0);
      border: 1px solid var(--c-gris1); border-radius: 20px; padding: 2px 9px;
    }
    .rev-chip strong { color: var(--c-azul); font-weight: 700; }
    .rev-card-area {
      font-size: 11px; color: var(--c-gris5); line-height: 1.3; margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;
    }
    .rev-card-progress {
      flex: 1; min-width: 100px; max-width: 220px;
      display: flex; flex-direction: column; gap: 3px; align-items: stretch;
    }
    .rev-progress-top {
      display: flex; justify-content: space-between; align-items: center; gap: 8px;
    }
    .rev-progress-title {
      font-size: 9px; font-weight: 600; color: var(--c-gris5);
      text-transform: uppercase; letter-spacing: .3px; white-space: nowrap;
    }
    .rev-progress-pct { font-size: 12px; font-weight: 800; flex-shrink: 0; }
    .rev-progress-pct.low { color: var(--c-naranja); }
    .rev-progress-pct.mid { color: var(--c-amarillo); }
    .rev-progress-pct.high { color: var(--c-verde); }
    .rev-progress-track {
      height: 6px; background: var(--c-gris1); border-radius: 99px; overflow: hidden;
      width: 100%;
    }
    .rev-progress-fill {
      height: 100%; border-radius: 99px; transition: width .5s ease;
    }
    .rev-progress-fill.low { background: linear-gradient(90deg, #f59e0b, var(--c-naranja)); }
    .rev-progress-fill.mid { background: linear-gradient(90deg, #eab308, var(--c-amarillo)); }
    .rev-progress-fill.high { background: linear-gradient(90deg, #4caf50, var(--c-verde)); }
    .rev-card-action {
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    .rev-count-badge {
      font-size: 11px; font-weight: 800; letter-spacing: .2px;
      background: linear-gradient(135deg, var(--c-verde-light), #e8f5e0);
      color: #2d7a00; border: 1px solid rgba(57, 169, 0, .2);
      padding: 5px 12px; border-radius: 20px; white-space: nowrap;
    }
    .rev-chevron {
      width: 30px; height: 30px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: var(--c-gris0); border: 1px solid var(--c-gris2);
      transition: background .15s, border-color .15s;
    }
    .rev-group-card:hover .rev-chevron {
      background: var(--c-verde-light); border-color: rgba(57, 169, 0, .35);
    }

    @media (max-width: 900px) {
      .rev-card-progress { max-width: 160px; min-width: 80px; }
      .rev-card-area { display: none; }
    }
    @media (max-width: 640px) {
      .rev-card-body { flex-wrap: wrap; padding: 12px 14px 12px 18px; gap: 10px; }
      .rev-card-header { flex: 1 1 100%; }
      .rev-card-progress { flex: 1 1 100%; max-width: none; order: 3; }
      .rev-card-action { order: 2; }
      .rev-card-name { white-space: normal; font-size: 13px; }
    }
    @media (max-width: 480px) {
      .rev-card-action { gap: 8px; }
      .rev-count-badge { font-size: 10px; padding: 4px 8px; }
      .rev-chevron { width: 26px; height: 26px; }
    }

    .rev-table-head {
      padding: 12px 18px; border-bottom: 1px solid var(--c-gris2);
      display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;
    }
    .rev-table-head-info { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; color: var(--c-gris5); }
    .rev-table-head-info strong { color: var(--c-azul); font-size: 13px; }
    .rev-inline-panel { background: var(--c-gris0); padding: 16px; border-top: 2px solid var(--c-verde); }
    .ev-preview-frame { width: 100%; height: 480px; border: 1px solid var(--c-gris2); border-radius: 8px; background: #fff; display: block; }
    .ev-preview-image-wrap { text-align: center; padding: 12px; background: #fff; border: 1px solid var(--c-gris2); border-radius: 8px; min-height: 120px; display: flex; align-items: center; justify-content: center; }
    .ev-preview-image { max-width: 100%; max-height: 480px; border-radius: 6px; object-fit: contain; }
    .ev-preview-loading { font-size: 12px; color: var(--c-gris5); }
    .ev-preview-fallback { padding: 24px; text-align: center; background: var(--c-gris0); border: 1px solid var(--c-gris2); border-radius: 8px; }
    .ev-preview-fallback-title { font-size: 13px; font-weight: 600; margin-top: 10px; color: var(--c-gris7); }
    .ev-preview-fallback-msg { font-size: 12px; color: var(--c-gris5); margin-top: 4px; }
    .ev-preview-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; background: var(--c-azul-light); color: var(--c-azul); margin-bottom: 8px; }
    .rev-inline-panel iframe { width: 100%; height: 480px; border: 1px solid var(--c-gris2); border-radius: 8px; background: #fff; }
    .rev-inline-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
    .rev-reject-box { margin-top: 14px; padding: 14px; background: #fff; border: 1px solid #FECACA; border-radius: 8px; }
    .rev-reject-box .label { margin-bottom: 6px; }
    tr.rev-row-open { background: var(--c-verde-light) !important; }
    .mod-pill { padding: 1px 7px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .mod-pill.gf { background: var(--c-verde-light); color: var(--c-verde); }
    .mod-pill.gc { background: var(--c-azul-light); color: var(--c-azul); }

    @media (max-width: 768px) {
      .ev-preview-frame { height: 360px; }
      .rev-inline-panel iframe { height: 360px; }
    }
    @media (max-width: 480px) {
      .rev-inline-panel { padding: 12px; }
      .ev-preview-frame { height: 280px; }
      .rev-inline-panel iframe { height: 280px; }
    }
  `;
}

function progressLevel(avance) {
  if (avance >= 80) return 'high';
  if (avance >= 50) return 'mid';
  return 'low';
}

function renderCardProgress(avance) {
  const lvl = progressLevel(avance);
  return `
    <div class="rev-card-progress">
      <div class="rev-progress-top">
        <span class="rev-progress-title">Avance de entrega</span>
        <span class="rev-progress-pct ${lvl}">${avance}%</span>
      </div>
      <div class="rev-progress-track">
        <div class="rev-progress-fill ${lvl}" style="width:${avance}%"></div>
      </div>
    </div>`;
}

function groupKey(r) {
  return `${r.id_persona}-${r.id_contrato}-${r.id_periodo}`;
}

function groupRows(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = groupKey(r);
    if (!map.has(key)) {
      map.set(key, {
        key,
        id_persona: r.id_persona,
        contratista: r.contratista,
        id_contrato: r.id_contrato,
        id_periodo: r.id_periodo,
        periodo: r.periodo,
        periodo_avance: Number(r.periodo_avance ?? 0),
        area_aplicacion: r.area_aplicacion,
        items: [],
      });
    }
    map.get(key).items.push(r);
  }
  return [...map.values()].sort((a, b) => {
    const na = a.contratista.localeCompare(b.contratista, 'es');
    if (na !== 0) return na;
    if (a.id_contrato !== b.id_contrato) return a.id_contrato - b.id_contrato;
    return String(a.periodo).localeCompare(String(b.periodo), 'es');
  });
}

export async function init() {
  const root = await renderLayout({ rootSelector: '#app', activeId: 'admin-revision', breadcrumb: ['Revisión'] });
  root.innerHTML = `
    ${renderSectionTitle({
      title: 'Revisión de Evidencias',
      subtitle: 'Seleccione un contratista para revisar las evidencias cargadas por contrato y periodo',
    })}
    <div class="tabs" id="tabs">
      <button class="tab active" data-tab="Pendiente revisión">Pendiente revisión <span class="count" id="c-pen">0</span></button>
      <button class="tab" data-tab="Rechazada">Rechazadas <span class="count" id="c-rec">0</span></button>
      <button class="tab" data-tab="Aprobada">Aprobadas <span class="count" id="c-apr" title="Aprobadas hoy">0</span></button>
    </div>
    <div id="list"></div>
  `;

  ensureRevisionStyles();

  $$('#tabs .tab').forEach(t => t.addEventListener('click', () => {
    currentTab = t.dataset.tab;
    selectedGroupKey = null;
    expandedUploadId = null;
    rejectModeId = null;
    $$('#tabs .tab').forEach(x => x.classList.toggle('active', x === t));
    load();
  }));

  await load();

  const uploadId = new URLSearchParams(location.search).get('upload');
  if (uploadId) await openFromUploadParam(parseInt(uploadId, 10));
}

async function openFromUploadParam(id) {
  let row = allRows.find(x => Number(x.id_upload) === id);
  if (!row) {
    for (const est of ['Pendiente revisión', 'Rechazada', 'Aprobada']) {
      const c = await api.get('/reviews?estado=' + encodeURIComponent(est), { silent: true });
      row = (c.data || []).find(x => Number(x.id_upload) === id);
      if (row) {
        currentTab = est;
        $$('#tabs .tab').forEach(x => x.classList.toggle('active', x.dataset.tab === est));
        allRows = c.data || [];
        break;
      }
    }
  }
  if (!row) {
    try {
      const det = await api.get('/uploads/evidence/' + id, { silent: true });
      const u = det.data;
      row = {
        id_upload: id,
        id_persona: u.contratista_id,
        contratista: `${u.nombres} ${u.Apellidos || ''}`.trim(),
        id_contrato: u.id_contrato,
        id_periodo: u.id_periodo,
        periodo: u.nombre_periodo,
        estado: u.estado,
      };
    } catch { return; }
  }
  selectedGroupKey = groupKey(row);
  openGroup(selectedGroupKey, id);
}

async function load() {
  const r = await api.get('/reviews?estado=' + encodeURIComponent(currentTab));
  allRows = r.data || [];
  if (selectedGroupKey && groupRows(allRows).some(g => g.key === selectedGroupKey)) {
    openGroup(selectedGroupKey, expandedUploadId);
  } else {
    selectedGroupKey = null;
    expandedUploadId = null;
    rejectModeId = null;
    renderGroups();
  }
  await refreshTabCounts();
}

async function refreshTabCounts() {
  try {
    const r = await api.get('/reviews?counts=1', { silent: true });
    const c = r.data || {};
    const map = { 'c-pen': 'Pendiente revisión', 'c-rec': 'Rechazada', 'c-apr': 'Aprobada' };
    for (const [id, key] of Object.entries(map)) {
      const el = $('#' + id);
      if (el) el.textContent = c[key] ?? 0;
    }
  } catch {
    const states = ['Pendiente revisión', 'Rechazada', 'Aprobada'];
    const ids = ['c-pen', 'c-rec', 'c-apr'];
    await Promise.all(states.map(async (est, i) => {
      const res = await api.get('/reviews?estado=' + encodeURIComponent(est), { silent: true });
      const el = $('#' + ids[i]);
      if (el) el.textContent = (res.data || []).length;
    }));
  }
}

function renderGroups() {
  ensureRevisionStyles();
  const groups = groupRows(allRows);
  $('#list').innerHTML = `
    <div class="rev-group-list">
      ${groups.length === 0
        ? `<div class="card rev-empty">${icon('inbox', { size: 28 })}<p>Sin evidencias en este estado</p></div>`
        : groups.map(g => {
            const avance = Math.max(0, Math.min(100, Math.round(g.periodo_avance)));
            return `
            <button type="button" class="rev-group-card" data-group="${escapeHtml(g.key)}">
              <span class="rev-card-accent" aria-hidden="true"></span>
              <div class="rev-card-body">
                <div class="rev-card-header">
                  <div class="rev-card-avatar">${renderAvatar(g.contratista, 38)}</div>
                  <div class="rev-card-info">
                    <h3 class="rev-card-name">${escapeHtml(g.contratista)}</h3>
                    <div class="rev-card-chips">
                      <span class="rev-chip">${icon('briefcase', { size: 13, color: 'var(--c-azul)' })}Contrato <strong>#${g.id_contrato}</strong></span>
                      <span class="rev-chip">${icon('calendar', { size: 13, color: 'var(--c-verde)' })}${escapeHtml(g.periodo)}</span>
                    </div>
                    ${g.area_aplicacion ? `<p class="rev-card-area">${escapeHtml(g.area_aplicacion)}</p>` : ''}
                  </div>
                </div>
                ${renderCardProgress(avance)}
                <div class="rev-card-action">
                  <span class="rev-count-badge">${g.items.length} evidencia${g.items.length === 1 ? '' : 's'}</span>
                  <span class="rev-chevron">${icon('chevronRight', { size: 16, color: 'var(--c-azul)' })}</span>
                </div>
              </div>
            </button>`;
          }).join('')}
    </div>`;

  $$('.rev-group-card').forEach(btn => btn.addEventListener('click', () => {
    selectedGroupKey = btn.dataset.group;
    expandedUploadId = null;
    rejectModeId = null;
    openGroup(selectedGroupKey);
  }));
}

function openGroup(key, openUploadId = null) {
  ensureRevisionStyles();
  selectedGroupKey = key;
  const group = groupRows(allRows).find(g => g.key === key);
  if (!group) { renderGroups(); return; }

  if (openUploadId) expandedUploadId = openUploadId;

  $('#list').innerHTML = `
    <div class="card rev-table-card">
      <div class="rev-table-head">
        <button class="btn btn-ghost btn-sm" id="back-groups">${icon('chevronLeft', { size: 12 })}Volver a contratistas</button>
        <div class="rev-table-head-info">
          <strong>${escapeHtml(group.contratista)}</strong>
          <span>Contrato #${group.id_contrato}</span>
          <span>${escapeHtml(group.periodo)}</span>
        </div>
      </div>
      <div class="table-wrap">
        <table class="table rev-ev-table">
          <thead><tr>${['Módulo', 'Evidencia', 'Fecha', 'Estado', 'Acciones'].map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody id="ev-tbody">
            ${group.items.map(e => renderEvidenceRow(e)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  $('#back-groups').addEventListener('click', () => {
    selectedGroupKey = null;
    expandedUploadId = null;
    rejectModeId = null;
    renderGroups();
  });

  bindEvidenceButtons();
  bindPanelDelegation();
  mountOpenPreviews();

  if (expandedUploadId) {
    toggleInlineViewer(expandedUploadId, true);
  }
}

function renderEvidenceRow(e) {
  const open = expandedUploadId === Number(e.id_upload);
  return `
    <tr class="ev-main-row ${open ? 'rev-row-open' : ''}" data-upload="${e.id_upload}">
      <td><span class="mod-pill ${e.modulo_codigo === 'GF' ? 'gf' : 'gc'}">${escapeHtml(e.modulo_codigo)}</span></td>
      <td style="font-size:12px;font-weight:500;">${escapeHtml(e.evidencia_nombre)}</td>
      <td style="font-size:11px;color:var(--c-gris5);">${fmtDate(e.fecha)}</td>
      <td><span class="badge ${e.estado === 'Aprobada' ? 'aprobada' : e.estado === 'Rechazada' ? 'rechazada' : 'pendiente-rev'} small">${escapeHtml(e.estado)}</span></td>
      <td><button type="button" class="btn btn-ghost btn-sm btn-ver" data-id="${e.id_upload}">${icon('eye', { size: 12 })}${open ? 'Ocultar' : 'Ver'}</button></td>
    </tr>
    <tr class="ev-expand-row" id="expand-${e.id_upload}" style="display:${open ? 'table-row' : 'none'};">
      <td colspan="5" style="padding:0;">${open ? renderInlinePanel(e) : ''}</td>
    </tr>`;
}

function renderInlinePanel(ev) {
  const id = ev.id_upload;
  const downloadUrl = `${API_BASE}/uploads/evidence/${id}/download`;
  const kind = detectEvidenceFileKind(ev);
  const preview = buildEvidencePreviewMarkup(id, kind, API_BASE);
  const canReview = currentTab === 'Pendiente revisión';
  const inReject = rejectModeId === Number(id);

  return `
    <div class="rev-inline-panel" id="panel-${id}">
      <div class="ev-preview-badge">${icon('eye', { size: 10, color: 'currentColor' })} Vista previa · ${previewLabel(kind)}</div>
      ${preview}
      ${canReview && !inReject ? `
        <div class="rev-inline-actions">
          <a class="btn btn-ghost btn-sm" href="${downloadUrl}" target="_blank">${icon('download', { size: 12 })}Descargar</a>
          <button type="button" class="btn btn-approve" data-approve="${id}">${icon('checkCircle', { size: 14, color: '#fff' })}Aprobar</button>
          <button type="button" class="btn btn-danger btn-reject-open" data-reject-open="${id}">${icon('xCircle', { size: 14 })}Rechazar</button>
        </div>` : ''}
      ${canReview && inReject ? renderRejectForm(id) : ''}
    </div>`;
}

function renderRejectForm(id) {
  return `
    <div class="rev-reject-box" id="reject-form-${id}">
      <div style="display:flex;gap:8px;font-size:12px;color:var(--c-rojo);margin-bottom:10px;">
        ${icon('alertCircle', { size: 14, color: 'currentColor' })}
        Indique el motivo del rechazo para el contratista.
      </div>
      <label class="label" for="reject-comm-${id}">Motivo del rechazo *</label>
      <textarea class="input reject-comm" id="reject-comm-${id}" rows="4" placeholder="Ej: El documento está incompleto o falta la firma del responsable..."></textarea>
      <div class="rev-inline-actions" style="margin-top:12px;">
        <button type="button" class="btn btn-sec btn-reject-cancel" data-reject-cancel="${id}">Cancelar</button>
        <button type="button" class="btn btn-danger btn-reject-submit" data-reject-submit="${id}" disabled>Confirmar rechazo</button>
      </div>
    </div>`;
}

function bindEvidenceButtons() {
  $$('.btn-ver').forEach(b => b.addEventListener('click', () => {
    const id = parseInt(b.dataset.id, 10);
    toggleInlineViewer(id, expandedUploadId !== id);
  }));
}

function bindPanelDelegation() {
  const tbody = document.getElementById('ev-tbody');
  if (!tbody) return;
  tbody.addEventListener('click', handlePanelClick);
  tbody.addEventListener('input', handleRejectInput);
}

function handleRejectInput(e) {
  const ta = e.target.closest('.reject-comm');
  if (!ta) return;
  const id = parseInt(ta.id.replace('reject-comm-', ''), 10);
  const btn = $(`[data-reject-submit="${id}"]`);
  if (btn) btn.disabled = ta.value.trim().length < 5;
}

async function handlePanelClick(e) {
  const approve = e.target.closest('[data-approve]');
  if (approve) {
    const id = parseInt(approve.dataset.approve, 10);
    if (!await showConfirm({
      title: 'Aprobar evidencia',
      message: '¿Confirma que desea aprobar esta evidencia? Una vez aprobada, el contratista no podrá modificarla.',
      confirmLabel: 'Aprobar',
      cancelLabel: 'Cancelar',
      variant: 'success',
    })) return;
    await api.post('/reviews/' + id + '/approve', {});
    showToast('success', 'Aprobada', 'La evidencia fue aprobada.');
    closeInlineViewer(id);
    await load();
    return;
  }

  const rejectOpen = e.target.closest('[data-reject-open]');
  if (rejectOpen) {
    const id = parseInt(rejectOpen.dataset.rejectOpen, 10);
    rejectModeId = id;
    refreshInlinePanel(id);
    return;
  }

  const rejectCancel = e.target.closest('[data-reject-cancel]');
  if (rejectCancel) {
    const id = parseInt(rejectCancel.dataset.rejectCancel, 10);
    rejectModeId = null;
    refreshInlinePanel(id);
    return;
  }

  const rejectSubmit = e.target.closest('[data-reject-submit]');
  if (rejectSubmit && !rejectSubmit.disabled) {
    const id = parseInt(rejectSubmit.dataset.rejectSubmit, 10);
    const comm = ($('#reject-comm-' + id)?.value || '').trim();
    if (comm.length < 5) return;
    await api.post('/reviews/' + id + '/reject', { comentario: comm });
    showToast('success', 'Rechazada', 'La evidencia fue rechazada.');
    rejectModeId = null;
    closeInlineViewer(id);
    await load();
  }
}

function mountOpenPreviews() {
  if (!expandedUploadId) return;
  const panel = document.getElementById(`panel-${expandedUploadId}`);
  if (panel) mountEvidencePreview(panel);
}

function toggleInlineViewer(id, open) {
  if (open) {
    expandedUploadId = id;
    rejectModeId = null;
  } else {
    expandedUploadId = null;
    rejectModeId = null;
  }
  rerenderTableBody();
  if (open) mountOpenPreviews();
}

function closeInlineViewer(id) {
  if (expandedUploadId === id) {
    expandedUploadId = null;
    rejectModeId = null;
  }
  const expandRow = $('#expand-' + id);
  if (expandRow) {
    expandRow.style.display = 'none';
    expandRow.querySelector('td').innerHTML = '';
  }
  const mainRow = document.querySelector(`tr.ev-main-row[data-upload="${id}"]`);
  mainRow?.classList.remove('rev-row-open');
  const verBtn = mainRow?.querySelector('.btn-ver');
  if (verBtn) verBtn.innerHTML = `${icon('eye', { size: 12 })}Ver`;
}

function refreshInlinePanel(id) {
  const ev = allRows.find(r => Number(r.id_upload) === Number(id));
  const cell = $(`#expand-${id} td`);
  if (cell && ev) {
    cell.innerHTML = renderInlinePanel(ev);
    mountEvidencePreview(cell.querySelector(`#panel-${id}`));
  }
  const ta = $('#reject-comm-' + id);
  const btn = $(`[data-reject-submit="${id}"]`);
  if (ta && btn) {
    ta.addEventListener('input', () => { btn.disabled = ta.value.trim().length < 5; });
  }
}

function rerenderTableBody() {
  if (!selectedGroupKey) return;
  const group = groupRows(allRows).find(g => g.key === selectedGroupKey);
  if (!group) return;
  const tbody = $('#ev-tbody');
  if (!tbody) return;
  tbody.innerHTML = group.items.map(e => renderEvidenceRow(e)).join('');
  bindEvidenceButtons();
  if (expandedUploadId) {
    mountOpenPreviews();
    if (rejectModeId) refreshInlinePanel(expandedUploadId);
  }
}
