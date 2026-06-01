/**
 * Vista: Administrativo / Administrativo de Centro → Contratos y Periodos.
 */
import { api } from '../api.js';
import { $, $$, escapeHtml, renderAvatar, fmtDate } from '../utils.js';
import { renderLayout, renderSectionTitle, renderProgress, icon, showToast, openModal } from '../components.js';
import { getUser } from '../auth.js';

let contratos = [];
let users = [];
let activeContract = null;
let activePeriodos = [];
let periodEditorEditMode = false;
let periodEditorPeriodId = null;

export async function init() {
  const root = await renderLayout({ rootSelector: '#app', activeId: 'admin-contratos', breadcrumb: ['Contratos y Periodos'] });
  root.innerHTML = `<div id="ct-view"></div>`;
  await loadList();
}

async function loadList() {
  const me = getUser();
  const isCenter = me?.rol_label === 'Administrativo de Centro';
  const [cr, ur] = await Promise.all([
    api.get('/contracts'),
    isCenter ? api.get('/users') : Promise.resolve({ data: [] }),
  ]);
  contratos = cr.data;
  users = ur.data || [];
  renderList();
}

function renderList() {
  const me = getUser();
  const isCenter = me?.rol_label === 'Administrativo de Centro';
  const banner = isCenter
    ? `<div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:var(--c-naranja-light, rgba(234,88,12,0.1));border:1px solid rgba(234,88,12,0.25);border-radius:8px;margin-bottom:14px;font-size:13px;color:var(--c-naranja,#ea580c);">
      ${icon('building',{size:14,color:'currentColor'})}
      <span>Puede <strong>crear contratos</strong> para contratistas activos de <strong>${escapeHtml(me?.centro_nombre || 'su centro')}</strong>. La edición y eliminación quedan reservadas al Super Admin.</span>
    </div>`
    : `<div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:var(--c-amarillo-light);border:1px solid #FDE047;border-radius:8px;margin-bottom:14px;font-size:13px;color:var(--c-amarillo);">
      ${icon('alertCircle',{size:14,color:'currentColor'})}
      <span>Los contratos son <strong>creados y editados exclusivamente por el Super Admin</strong> o el <strong>administrativo de centro</strong> (solo creación). Todos pueden consultar y configurar periodos.</span>
    </div>`;

  $('#ct-view').innerHTML = `
    ${renderSectionTitle({
      title: 'Contratos y Periodos',
      subtitle: isCenter
        ? 'Contratos de su centro. Configuración de periodos disponible.'
        : 'Visualización de contratos. Configuración de periodos disponible.',
    })}
    ${banner}
    <div class="card list-toolbar mb-3">
      <div class="list-toolbar-fields">
        <div class="filter-field filter-field--grow">
          <label class="filter-label" for="search">Buscar contrato</label>
          <div class="input-wrap input-wrap--search">
            <span class="input-icon">${icon('search', { size: 15, color: 'currentColor' })}</span>
            <input class="input" id="search" type="search" autocomplete="off" placeholder="Nº contrato, contratista, correo, objeto o tipo…">
          </div>
        </div>
        <div class="filter-field filter-field--rol">
          <label class="filter-label" for="estadoF">Filtrar por estado</label>
          <select class="input" id="estadoF">
            <option value="">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Finalizado">Finalizado</option>
            <option value="Suspendido">Suspendido</option>
          </select>
        </div>
      </div>
      <div class="list-toolbar-meta">
        <span class="filter-results" id="filter-count"></span>
        ${isCenter ? `<button type="button" class="btn" id="btn-new-contract">${icon('filePlus', { size: 14, color: '#fff' })}Nuevo contrato</button>` : ''}
      </div>
    </div>
    <div class="card" style="overflow:hidden;">
      <div class="table-wrap" id="t-wrap"></div>
    </div>`;

  $('#search').addEventListener('input', apply);
  $('#estadoF').addEventListener('change', apply);
  if (isCenter) {
    $('#btn-new-contract')?.addEventListener('click', openContractModal);
  }
  apply();
}

function filterContratos() {
  const q = ($('#search')?.value || '').toLowerCase().trim();
  const estado = $('#estadoF')?.value || '';
  return contratos.filter(c => {
    const nombre = `${c.nombres || ''} ${c.Apellidos || ''}`.trim();
    const matchQ = !q ||
      String(c.id_contrato).includes(q) ||
      nombre.toLowerCase().includes(q) ||
      (c.correo || '').toLowerCase().includes(q) ||
      (c.area_aplicacion || '').toLowerCase().includes(q) ||
      (c.tipo_nombre || '').toLowerCase().includes(q);
    const matchEstado = !estado || c.estado === estado;
    return matchQ && matchEstado;
  });
}

function updateFilterCount(shown) {
  const el = $('#filter-count');
  if (!el) return;
  const total = contratos.length;
  const hasFilter = ($('#search')?.value || '').trim() || ($('#estadoF')?.value || '');
  if (!hasFilter) {
    el.textContent = `${total} contrato${total === 1 ? '' : 's'}`;
    el.classList.remove('filter-results--active');
    return;
  }
  el.textContent = `${shown} de ${total} contrato${total === 1 ? '' : 's'}`;
  el.classList.add('filter-results--active');
}

function apply() {
  const filtered = filterContratos();
  updateFilterCount(filtered.length);
  renderTable(filtered);
}

function renderTable(rows) {
  $('#t-wrap').innerHTML = `
        <table class="table">
          <thead><tr>${['Contrato','Contratista','Vigencia','Estado','Acciones'].map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.length === 0 ? `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--c-gris4);">Sin resultados</td></tr>` :
              rows.map(c => `
                <tr>
                  <td><span style="font-weight:800;color:var(--c-azul);">#${c.id_contrato}</span></td>
                  <td><div style="display:flex;align-items:center;gap:8px;">${renderAvatar((c.nombres||'') + ' ' + (c.Apellidos||''), 28)}
                    <div><div style="font-weight:600;">${escapeHtml((c.nombres||'') + ' ' + (c.Apellidos||''))}</div>
                    <div style="font-size:11px;color:var(--c-gris5);">${escapeHtml(c.correo || '')}</div></div></div></td>
                  <td style="font-size:12px;color:var(--c-gris5);">${fmtDate(c.fecha_inicio)} — ${fmtDate(c.fecha_fin)}</td>
                  <td><span class="badge ${c.estado === 'Activo' ? 'activo' : 'finalizado'} small">${escapeHtml(c.estado || '')}</span></td>
                  <td><button class="btn btn-sec btn-sm" data-id="${c.id_contrato}">${icon('chevronRight',{size:12})}Ver periodos</button></td>
                </tr>`).join('')}
          </tbody>
        </table>`;
  $$('#t-wrap button[data-id]').forEach(b => b.addEventListener('click', () => openContract(parseInt(b.dataset.id, 10))));
}

async function openContract(id) {
  activeContract = contratos.find(c => c.id_contrato === id);
  if (!activeContract) return;
  const r = await api.get('/periods?contrato=' + id);
  activePeriodos = r.data || [];
  renderContract(activePeriodos);
}

function renderContract(periodos) {
  const c = activeContract;
  $('#ct-view').innerHTML = `
    <button class="btn btn-ghost" id="back" style="margin-bottom:14px;">${icon('chevronLeft',{size:14})}Volver a contratos</button>
    <div class="card card-pad mb-3" style="display:flex;gap:24px;flex-wrap:wrap;">
      <div><div style="font-size:10px;font-weight:700;color:var(--c-gris4);text-transform:uppercase;letter-spacing:0.6px;">Contrato</div><div style="font-size:18px;font-weight:800;color:var(--c-azul);margin-top:2px;">#${c.id_contrato}</div></div>
      <div><div style="font-size:10px;font-weight:700;color:var(--c-gris4);text-transform:uppercase;letter-spacing:0.6px;">Contratista</div><div style="font-size:14px;font-weight:700;margin-top:2px;">${escapeHtml((c.nombres||'') + ' ' + (c.Apellidos||''))}</div></div>
      <div><div style="font-size:10px;font-weight:700;color:var(--c-gris4);text-transform:uppercase;letter-spacing:0.6px;">Vigencia</div><div style="font-size:14px;font-weight:700;margin-top:2px;">${fmtDate(c.fecha_inicio)} — ${fmtDate(c.fecha_fin)}</div></div>
      <div><div style="font-size:10px;font-weight:700;color:var(--c-gris4);text-transform:uppercase;letter-spacing:0.6px;">Estado</div><div style="margin-top:2px;"><span class="badge ${c.estado === 'Activo' ? 'activo' : 'finalizado'}">${escapeHtml(c.estado || '')}</span></div></div>
    </div>
    <h4 style="font-size:14px;font-weight:700;color:var(--c-azul);margin-bottom:12px;">Periodos del contrato</h4>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:10px;margin-bottom:16px;">
      ${periodos.map(p => {
        const bloq = p.estado === 'Bloqueado';
        const stateClass = {
          'Firmado':'firmado','Pendiente firma':'pendiente-firma','En revisión':'en-revision',
          'Activo':'activo','Bloqueado':'bloqueado','Vencido':'rechazada',
        }[p.estado] || '';
        return `
          <div class="period-card" data-id="${p.id_periodo}" style="cursor:${bloq ? 'not-allowed' : 'pointer'};opacity:${bloq ? 0.5 : 1};background:#fff;border:1px solid var(--c-gris2);border-radius:10px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
              <span style="font-size:13px;font-weight:700;">${escapeHtml(p.nombre_periodo)}</span>
              ${bloq ? icon('lock',{size:13,color:'var(--c-gris4)'}) : ''}
            </div>
            <span class="badge ${stateClass} small">${escapeHtml(p.estado)}</span>
            ${!bloq ? `<div style="margin-top:10px;">${renderProgress(parseInt(p.avance,10) || 0)}</div>` : ''}
            ${p.fecha_limite ? `<div style="font-size:10px;color:var(--c-gris5);margin-top:5px;">Límite: ${fmtDate(p.fecha_limite)}</div>` : ''}
          </div>`;
      }).join('')}
    </div>`;

  $('#back').addEventListener('click', () => {
    activeContract = null;
    activePeriodos = [];
    renderList();
  });
  $$('.period-card').forEach(card => card.addEventListener('click', async () => {
    const p = periodos.find(x => x.id_periodo == card.dataset.id);
    if (p.estado === 'Bloqueado') return;
    await openPeriodEditor(p);
  }));
}

async function openPeriodEditor(p, forceEditMode = null) {
  const r = await api.get('/periods/' + p.id_periodo);
  const evidencias = r.data.evidencias || [];
  const periodo = r.data.periodo || p;
  const locked = !!r.data.evidencias_bloqueadas;
  const hasAssignment = !!r.data.tiene_asignacion || evidencias.length > 0;
  const canEditWindow = !!r.data.puede_editar_evidencias;
  const ventana = r.data.ventana_edicion || {};
  const c = activeContract;

  if (periodEditorPeriodId !== periodo.id_periodo) {
    periodEditorEditMode = false;
    periodEditorPeriodId = periodo.id_periodo;
  }
  if (forceEditMode !== null) {
    periodEditorEditMode = forceEditMode;
  }

  const isEditing = !locked && hasAssignment && periodEditorEditMode && canEditWindow;
  const checkboxesEnabled = !locked && (!hasAssignment || isEditing);
  const baselineIds = [...evidencias.map(e => Number(e.id_evidencia_master))].sort((a, b) => a - b);

  let all = [];
  let modules;
  if (locked) {
    modules = groupEvidencesByModule(evidencias);
  } else {
    const todo = await api.get('/evidences');
    all = todo.data;
    modules = groupEvidencesByModule(all);
  }
  const assigned = new Set(baselineIds);

  $('#ct-view').innerHTML = `
    <button class="btn btn-ghost" id="back-periods" style="margin-bottom:14px;">${icon('chevronLeft',{size:14})}Volver a periodos</button>
    <div class="card card-pad mb-3" style="display:flex;gap:24px;flex-wrap:wrap;">
      <div><div style="font-size:10px;font-weight:700;color:var(--c-gris4);text-transform:uppercase;letter-spacing:0.6px;">Contrato</div><div style="font-size:18px;font-weight:800;color:var(--c-azul);margin-top:2px;">#${c.id_contrato}</div></div>
      <div><div style="font-size:10px;font-weight:700;color:var(--c-gris4);text-transform:uppercase;letter-spacing:0.6px;">Contratista</div><div style="font-size:14px;font-weight:700;margin-top:2px;">${escapeHtml((c.nombres||'') + ' ' + (c.Apellidos||''))}</div></div>
      <div><div style="font-size:10px;font-weight:700;color:var(--c-gris4);text-transform:uppercase;letter-spacing:0.6px;">Periodo</div><div style="font-size:14px;font-weight:700;margin-top:2px;color:var(--c-azul);">${escapeHtml(periodo.nombre_periodo)}</div></div>
      <div><div style="font-size:10px;font-weight:700;color:var(--c-gris4);text-transform:uppercase;letter-spacing:0.6px;">Estado</div><div style="margin-top:2px;"><span class="badge ${periodo.estado === 'Firmado' ? 'firmado' : 'small'}">${escapeHtml(periodo.estado || '')}</span></div></div>
    </div>
    <div class="card card-pad fade-up" id="period-edit">
      <h4 style="font-size:14px;font-weight:700;color:var(--c-azul);margin-bottom:14px;">${locked ? 'Evidencias del período' : 'Configurar período'} — ${escapeHtml(periodo.nombre_periodo)}</h4>
      ${locked ? `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--c-azul-light);border:1px solid rgba(0,48,77,0.15);border-radius:8px;margin-bottom:14px;font-size:13px;color:var(--c-azul);">
          ${icon('lock',{size:16,color:'currentColor'})}
          <span>Este periodo ya fue firmado por el administrativo y el contratista. Las evidencias asignadas son de <strong>solo lectura</strong>.</span>
        </div>` : ''}
      ${!locked && hasAssignment && !isEditing ? `
        <div style="padding:12px 14px;background:var(--c-gris0);border:1px solid var(--c-gris2);border-radius:8px;margin-bottom:14px;font-size:13px;color:var(--c-gris7);">
          ${canEditWindow
            ? `${icon('alertCircle',{size:14,color:'var(--c-naranja,#ea580c)'})} Puede modificar las evidencias del <strong>${fmtDate(ventana.desde)}</strong> al <strong>${fmtDate(ventana.hasta)}</strong>. Use el botón <strong>Editar</strong>.`
            : ventana.motivo === 'ultimos_cinco_dias'
              ? `${icon('alertCircle',{size:14,color:'var(--c-gris5)'})} La edición cerró el <strong>${fmtDate(ventana.hasta)}</strong>. No se puede editar en los 5 días previos al límite (del <strong>${fmtDate(ventana.bloqueado_desde)}</strong> al <strong>${fmtDate(ventana.fecha_limite)}</strong>).`
              : ventana.motivo === 'antes_apertura'
                ? `${icon('alertCircle',{size:14,color:'var(--c-gris5)'})} La edición estará disponible del <strong>${fmtDate(ventana.desde)}</strong> al <strong>${fmtDate(ventana.hasta)}</strong>.`
                : ventana.desde
                  ? `${icon('alertCircle',{size:14,color:'var(--c-gris5)'})} Puede editar evidencias del <strong>${fmtDate(ventana.desde)}</strong> al <strong>${fmtDate(ventana.hasta)}</strong> (hasta 5 días antes del límite).`
                  : `${icon('alertCircle',{size:14,color:'var(--c-naranja,#ea580c)'})} Defina una <strong>fecha límite</strong> para habilitar la edición posterior de evidencias.`}
        </div>` : ''}
      ${isEditing ? `
        <div style="padding:12px 14px;background:var(--c-amarillo-light);border:1px solid #FDE047;border-radius:8px;margin-bottom:14px;font-size:13px;color:var(--c-amarillo);">
          ${icon('edit',{size:14,color:'currentColor'})} Modo edición activo. Guarde los cambios cuando termine.
        </div>` : ''}
      <div style="margin-bottom:14px;">
        <label class="label">Fecha límite de entrega</label>
        ${locked || hasAssignment
          ? `<div style="font-size:14px;font-weight:600;color:var(--c-gris7);padding:8px 0;">${periodo.fecha_limite ? fmtDate(periodo.fecha_limite) : '—'}</div>`
          : `<input type="date" class="input" id="f-lim" style="width:220px;" value="${periodo.fecha_limite || ''}">`}
      </div>
      ${!locked && hasAssignment && !isEditing ? `
        <div style="margin-bottom:14px;padding:10px 14px;background:var(--c-gris0);border:1px solid var(--c-gris2);border-radius:8px;font-size:12px;">
          <strong style="color:var(--c-azul);">Asignadas actualmente:</strong>
          ${renderAssignedSummary(evidencias)}
        </div>` : ''}
      <h5 style="font-size:13px;font-weight:700;color:var(--c-gris7);margin-bottom:10px;">${locked ? 'Evidencias asignadas:' : 'Evidencias requeridas en este periodo:'}</h5>
      ${evidencias.length === 0 && locked
        ? `<div style="text-align:center;padding:24px;color:var(--c-gris4);font-size:13px;">No hay evidencias registradas para este periodo.</div>`
        : `<div style="display:flex;flex-direction:column;gap:14px;" id="evidence-modules">
        ${modules.map(m => `
          <div class="card" style="overflow:hidden;border:1px solid var(--c-gris2);">
            <div style="padding:12px 16px;background:${m.codigo === 'GF' ? 'var(--c-verde-light)' : 'var(--c-azul-light)'};display:flex;align-items:center;gap:10px;">
              <div style="width:5px;height:28px;border-radius:3px;background:${m.color};"></div>
              <div style="font-size:14px;font-weight:800;color:${m.color};">${escapeHtml(m.codigo)} — ${escapeHtml(m.nombre)}</div>
            </div>
            ${m.subgrupos.map(sg => `
              <div style="border-top:1px solid var(--c-gris2);">
                <div style="padding:8px 16px 8px 24px;background:var(--c-gris0);font-size:12px;font-weight:700;color:var(--c-gris7);">${escapeHtml(sg.nombre)}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 16px 12px 24px;">
                  ${sg.items.map(e => {
                    const checked = assigned.has(Number(e.id_evidencia_master));
                    if (locked) {
                      return `<div style="display:flex;align-items:flex-start;gap:9px;padding:9px 12px;border:1px solid var(--c-gris2);border-radius:8px;font-size:12px;background:var(--c-gris0);">
                        ${icon('checkCircle',{size:14,color:m.color,strokeWidth:2.5})}
                        <span><strong style="color:${m.color};">${escapeHtml(e.codigo)}</strong> · ${escapeHtml(e.nombre)}</span>
                      </div>`;
                    }
                    return `<label style="display:flex;align-items:flex-start;gap:9px;padding:9px 12px;border:1px solid var(--c-gris2);border-radius:8px;font-size:12px;background:${checkboxesEnabled ? '#fff' : 'var(--c-gris0)'};cursor:${checkboxesEnabled ? 'pointer' : 'default'};opacity:${checkboxesEnabled || checked ? '1' : '0.55'};">
                      <input type="checkbox" class="ev-check" value="${e.id_evidencia_master}" ${checked ? 'checked' : ''} ${checkboxesEnabled ? '' : 'disabled'} style="margin-top:1px;accent-color:${m.color};">
                      <span><strong style="color:${m.color};">${escapeHtml(e.codigo)}</strong> · ${escapeHtml(e.nombre)}</span>
                    </label>`;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>`}
      ${!locked ? `
      <div style="display:flex;gap:8px;margin-top:14px;align-items:center;">
        ${hasAssignment ? `
          <button type="button" class="btn btn-sec" id="edit-period" ${canEditWindow && !isEditing ? '' : 'disabled'}>${icon('edit',{size:14})}Editar evidencias</button>
        ` : ''}
        <button type="button" class="btn" id="save-period" ${(!hasAssignment || isEditing) ? (isEditing ? 'disabled' : '') : 'disabled'}>${icon('check',{size:12,color:'#fff'})}Guardar configuración</button>
      </div>` : ''}
    </div>`;

  window.scrollTo({ top: 0, behavior: 'smooth' });
  $('#back-periods').addEventListener('click', () => {
    periodEditorEditMode = false;
    periodEditorPeriodId = null;
    renderContract(activePeriodos);
  });

  if (!locked) {
    bindPeriodEditorActions({ periodo, all, baselineIds, hasAssignment, isEditing, canEditWindow });
  }
}

function getSelectedEvidenceIds() {
  return $$('#period-edit input.ev-check:checked').map(i => parseInt(i.value, 10)).sort((a, b) => a - b);
}

function evidenceSelectionChanged(baselineIds) {
  const current = getSelectedEvidenceIds();
  if (current.length !== baselineIds.length) return true;
  return current.some((id, i) => id !== baselineIds[i]);
}

function bindPeriodEditorActions({ periodo, all, baselineIds, hasAssignment, isEditing, canEditWindow }) {
  const saveBtn = $('#save-period');
  const editBtn = $('#edit-period');

  const refreshSaveState = () => {
    if (!saveBtn || !isEditing) return;
    saveBtn.disabled = !evidenceSelectionChanged(baselineIds);
  };

  $$('#period-edit input.ev-check').forEach(cb => cb.addEventListener('change', refreshSaveState));

  editBtn?.addEventListener('click', () => {
    if (!canEditWindow || isEditing) {
      showToast('info', 'Edición no disponible', 'Solo puede editar evidencias hasta 5 días antes de la fecha límite.');
      return;
    }
    periodEditorEditMode = true;
    openPeriodEditor(periodo, true);
  });

  saveBtn?.addEventListener('click', async () => {
    const ids = getSelectedEvidenceIds();
    if (isEditing && !evidenceSelectionChanged(baselineIds)) return;

    try {
      if (!hasAssignment) {
        const lim = $('#f-lim')?.value;
        if (!lim) {
          showToast('warning', 'Fecha requerida', 'Defina la fecha límite de entrega antes de guardar.');
          return;
        }
        await api.put('/periods/' + periodo.id_periodo, { fecha_limite: lim });
      }
      await api.post('/periods/' + periodo.id_periodo + '/assign', { evidencias: ids });
      const summary = summarizeAssignmentByModule(ids, all);
      showToast('success', 'Listo', summary ? `Periodo configurado: ${summary}` : 'Periodo configurado.');
      periodEditorEditMode = false;
      await openPeriodEditor(periodo, false);
    } catch {}
  });
}

function renderAssignedSummary(evidencias) {
  const byMod = {};
  for (const e of evidencias) {
    const mk = e.modulo_codigo || moduleFromEvidenceCode(e.codigo) || 'OTRO';
    byMod[mk] ??= [];
    byMod[mk].push(e.codigo);
  }
  return Object.entries(byMod)
    .sort(([a], [b]) => ({ GF: 0, GC: 1 }[a] ?? 99) - ({ GF: 0, GC: 1 }[b] ?? 99))
    .map(([mod, codes]) => `<span style="margin-right:12px;"><strong style="color:${mod === 'GF' ? '#39A900' : '#00304D'};">${mod}</strong>: ${codes.map(c => escapeHtml(c)).join(', ')}</span>`)
    .join('');
}

function summarizeAssignmentByModule(ids, all) {
  const map = new Map(all.map(e => [Number(e.id_evidencia_master), e]));
  const byMod = {};
  for (const id of ids) {
    const e = map.get(Number(id));
    if (!e) continue;
    const mk = e.modulo_codigo || moduleFromEvidenceCode(e.codigo) || 'OTRO';
    byMod[mk] = (byMod[mk] || 0) + 1;
  }
  return Object.entries(byMod)
    .sort(([a], [b]) => ({ GF: 0, GC: 1 }[a] ?? 99) - ({ GF: 0, GC: 1 }[b] ?? 99))
    .map(([mod, count]) => `${count} de ${mod}`)
    .join(' · ');
}

function moduleFromEvidenceCode(codigo) {
  const c = String(codigo || '');
  if (c.includes('-GF-')) return 'GF';
  if (c.includes('-GC-')) return 'GC';
  return null;
}

function groupEvidencesByModule(evidences) {
  const grouped = {};
  for (const e of evidences) {
    const mk = e.modulo_codigo || 'OTRO';
    grouped[mk] ??= {
      codigo: e.modulo_codigo,
      nombre: e.modulo_nombre,
      color: e.modulo_color || '#00304D',
      subMap: {},
    };
    const sk = e.subgrupo_codigo || 'general';
    grouped[mk].subMap[sk] ??= { nombre: e.subgrupo_nombre || sk, items: [] };
    grouped[mk].subMap[sk].items.push(e);
  }
  const order = { GF: 0, GC: 1 };
  return Object.values(grouped)
    .sort((a, b) => (order[a.codigo] ?? 99) - (order[b.codigo] ?? 99))
    .map(m => ({ ...m, subgrupos: Object.values(m.subMap) }));
}

function openContractModal() {
  const contratistas = users.filter(u =>
    u.nombre_perfil === 'contratista' && parseInt(u.activo, 10) === 1
  );
  openModal({
    title: 'Nuevo contrato',
    width: 560,
    html: `
      <form id="ct-form" style="display:flex;flex-direction:column;gap:12px;">
        <div id="ct-form-error" class="hidden" role="alert" style="margin:0;background:var(--c-rojo-light);border:1px solid #FECACA;border-radius:8px;padding:10px 14px;font-size:13px;color:var(--c-rojo);font-weight:500;"></div>
        <div><label class="label">Contratista activo</label>
          <select class="input" name="id_persona" required>
            <option value="">Seleccione contratista…</option>
            ${contratistas.map(u => `<option value="${u.id_persona}">${escapeHtml(u.nombres + ' ' + u.Apellidos)} · ${escapeHtml(u.centro_nombre || '')}</option>`).join('')}
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label class="label">Fecha inicio</label><input type="date" class="input" name="fecha_inicio" required></div>
          <div><label class="label">Fecha fin</label><input type="date" class="input" name="fecha_fin" required></div>
        </div>
        <div><label class="label">Tipo de contrato</label>
          <select class="input" name="tipo_contrato" required>
            <option value="">Seleccione tipo…</option>
            <option value="1">Prestación de Servicios</option>
            <option value="2">Servicios Personales</option>
            <option value="3">Convenio Interadministrativo</option>
          </select>
        </div>
        <div><label class="label">Objeto / Área de aplicación</label>
          <textarea class="input" name="area_aplicacion" rows="3" required minlength="5" placeholder="Describa el objeto del contrato"></textarea>
        </div>
        <div><label class="label">Estado</label>
          <select class="input" name="estado" required>
            <option value="">Seleccione estado…</option>
            <option value="Activo" selected>Activo</option>
            <option value="Finalizado">Finalizado</option>
            <option value="Suspendido">Suspendido</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" class="btn btn-sec" data-cancel>Cancelar</button>
          <button class="btn" type="submit">${icon('check',{size:12,color:'#fff'})}Crear contrato</button>
        </div>
      </form>`,
    onOpen: (modal, close) => {
      modal.querySelector('[data-cancel]').addEventListener('click', close);
      const form = modal.querySelector('#ct-form');
      const errBox = form.querySelector('#ct-form-error');
      form.addEventListener('submit', async e => {
        e.preventDefault();
        errBox.classList.add('hidden');
        errBox.textContent = '';
        if (!form.reportValidity()) return;
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        if (data.fecha_fin && data.fecha_inicio && data.fecha_fin < data.fecha_inicio) {
          errBox.textContent = 'La fecha fin debe ser igual o posterior a la fecha inicio.';
          errBox.classList.remove('hidden');
          return;
        }
        try {
          await api.post('/contracts', data, { silent: true });
          showToast('success', 'Listo', 'Contrato creado con periodos automáticos.');
          close();
          await loadList();
        } catch (err) {
          errBox.textContent = err?.message || 'No se pudo crear el contrato.';
          errBox.classList.remove('hidden');
        }
      });
    },
  });
}
