/**
 * Vista: Administrativo → Tipos de Evidencias.
 *   - Árbol Módulo → Subgrupo → Evidencias.
 *   - Tabla de evidencias master + crear / editar / borrar.
 */
import { api } from '../api.js';
import { $, $$, escapeHtml } from '../utils.js';
import { renderLayout, renderSectionTitle, icon, showToast, openModal, showConfirm } from '../components.js';
import { getUser } from '../auth.js';
import {
  allowedFormatsForModule,
  formatLabel,
  formatHint,
  normalizeFormat,
  normalizeModuleCode,
  isFinancialModule,
  EVIDENCE_FORMATS,
} from '../evidence-formats.js';

let tree = [];

function formatoFilterOptionsHtml() {
  return Object.entries(EVIDENCE_FORMATS).map(([key, meta]) =>
    `<option value="${key}">${escapeHtml(meta.label)}</option>`
  ).join('');
}

export async function init() {
  const user = getUser();
  const view = document.body.dataset.view || '';
  const navId = user?.rol_label === 'Super Admin' || view === 'super-evidencias'
    ? 'super-evidencias'
    : 'admin-evidencias';
  const root = await renderLayout({
    rootSelector: '#app',
    activeId: navId,
    breadcrumb: [navId === 'super-evidencias' ? 'Evidencias' : 'Tipos de Evidencias'],
  });
  root.innerHTML = `
    ${renderSectionTitle({
      title: 'Tipos de Evidencias',
      subtitle: 'Configuración jerárquica: Módulo → Subgrupo → Evidencias',
    })}
    <div class="card list-toolbar mb-3">
      <div class="list-toolbar-fields list-toolbar-fields--evidencias">
        <div class="filter-field filter-field--grow">
          <label class="filter-label" for="search">Buscar evidencia</label>
          <div class="input-wrap input-wrap--search">
            <span class="input-icon">${icon('search', { size: 15, color: 'currentColor' })}</span>
            <input class="input" id="search" type="search" autocomplete="off" placeholder="Nombre, código, descripción o subgrupo…">
          </div>
        </div>
        <div class="filter-field">
          <label class="filter-label" for="moduloF">Módulo</label>
          <select class="input" id="moduloF">
            <option value="">Todos</option>
            <option value="GF">Gestión Financiera (GF)</option>
            <option value="GC">Gestión Contractual (GC)</option>
          </select>
        </div>
        <div class="filter-field">
          <label class="filter-label" for="formatoF">Formato</label>
          <select class="input" id="formatoF">
            <option value="">Todos</option>
            ${formatoFilterOptionsHtml()}
          </select>
        </div>
        <div class="filter-field">
          <label class="filter-label" for="obligatoriaF">Obligatoria</label>
          <select class="input" id="obligatoriaF">
            <option value="">Todas</option>
            <option value="1">Obligatoria</option>
            <option value="0">Opcional</option>
          </select>
        </div>
        <div class="filter-field">
          <label class="filter-label" for="firmaF">Firma</label>
          <select class="input" id="firmaF">
            <option value="">Todas</option>
            <option value="1">Requiere firma</option>
            <option value="0">Sin firma</option>
          </select>
        </div>
      </div>
      <div class="list-toolbar-meta">
        <button type="button" class="btn btn-ghost btn-sm" id="evid-f-clear" disabled title="Limpiar todos los filtros">
          ${icon('x', { size: 12 })} Limpiar filtros
        </button>
        <span class="filter-results" id="filter-count"></span>
        <button type="button" class="btn" id="btn-new-evidence">${icon('plus', { size: 14, color: '#fff' })}Nueva Evidencia</button>
      </div>
    </div>
    <div class="grid" style="grid-template-columns:280px 1fr;gap:14px;" id="evid-grid">
      <div class="card card-pad" style="height:fit-content;" id="evid-tree"></div>
      <div class="card" style="overflow:hidden;"><div class="table-wrap" id="evid-table"></div></div>
    </div>
  `;
  $('#search')?.addEventListener('input', apply);
  ['moduloF', 'formatoF', 'obligatoriaF', 'firmaF'].forEach(id => {
    $(`#${id}`)?.addEventListener('change', apply);
  });
  $('#evid-f-clear')?.addEventListener('click', clearFilters);
  $('#btn-new-evidence')?.addEventListener('click', () => openEvidenceModal());
  await load();
}

async function load() {
  const r = await api.get('/evidences/tree');
  tree = r.data;
  renderTree();
  apply();
}

let activeSubgroup = null;

function renderTree() {
  $('#evid-tree').innerHTML = `
    <p style="font-size:11px;font-weight:700;color:var(--c-gris5);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px;">Estructura jerárquica</p>
    ${tree.map(m => `
      <div style="margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:${m.codigo === 'GF' ? 'var(--c-verde-light)' : 'var(--c-azul-light)'};">
          <div style="width:8px;height:8px;border-radius:2px;background:${m.color_hex};"></div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;color:${m.color_hex};">${escapeHtml(m.codigo)}</div>
            <div style="font-size:11px;color:var(--c-gris5);">${escapeHtml(m.nombre)}</div>
          </div>
        </div>
        ${(m.subgrupos || []).map(s => `
          <div style="padding-left:16px;margin-bottom:1px;">
            <button class="sg-btn" data-sg="${s.id_subgrupo}" style="width:100%;display:flex;align-items:center;gap:7px;padding:6px 10px;border-radius:7px;border:none;background:${activeSubgroup == s.id_subgrupo ? (m.codigo === 'GF' ? 'var(--c-verde-light)' : 'var(--c-azul-light)') : 'transparent'};cursor:pointer;text-align:left;">
              ${icon('chevronRight',{size:11,color:'var(--c-gris4)'})}
              <span style="font-size:12px;color:var(--c-gris7);flex:1;">${escapeHtml(s.nombre)}</span>
              <span style="font-size:10px;color:var(--c-gris4);background:var(--c-gris1);padding:0 5px;border-radius:10px;">${(s.evidencias || []).length}</span>
            </button>
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;
  $$('.sg-btn').forEach(b => b.addEventListener('click', () => {
    activeSubgroup = activeSubgroup == b.dataset.sg ? null : parseInt(b.dataset.sg, 10);
    renderTree();
    apply();
  }));
}

function collectEvidencias() {
  const evidencias = [];
  for (const m of tree) {
    for (const s of m.subgrupos || []) {
      if (activeSubgroup && s.id_subgrupo != activeSubgroup) continue;
      for (const e of s.evidencias || []) {
        evidencias.push({
          ...e,
          subgrupo_nombre: s.nombre,
          modulo_codigo: m.codigo,
          modulo_color: m.color_hex,
        });
      }
    }
  }
  return evidencias;
}

function hasActiveFilters() {
  return !!(
    ($('#search')?.value || '').trim() ||
    ($('#moduloF')?.value || '') ||
    ($('#formatoF')?.value || '') ||
    ($('#obligatoriaF')?.value || '') ||
    ($('#firmaF')?.value || '')
  );
}

function hasAnyFilter() {
  return hasActiveFilters() || activeSubgroup !== null;
}

function updateClearButton() {
  const btn = $('#evid-f-clear');
  if (!btn) return;
  btn.disabled = !hasAnyFilter();
}

function clearFilters() {
  const search = $('#search');
  if (search) search.value = '';
  ['moduloF', 'formatoF', 'obligatoriaF', 'firmaF'].forEach(id => {
    const el = $(`#${id}`);
    if (el) el.value = '';
  });
  if (activeSubgroup !== null) {
    activeSubgroup = null;
    renderTree();
  }
  apply();
}

function filterEvidencias(all) {
  const q = ($('#search')?.value || '').toLowerCase().trim();
  const modulo = $('#moduloF')?.value || '';
  const formato = $('#formatoF')?.value || '';
  const obligatoria = $('#obligatoriaF')?.value || '';
  const firma = $('#firmaF')?.value || '';
  return all.filter(e => {
    const matchQ = !q ||
      (e.nombre || '').toLowerCase().includes(q) ||
      (e.codigo || '').toLowerCase().includes(q) ||
      (e.descripcion || '').toLowerCase().includes(q) ||
      (e.subgrupo_nombre || '').toLowerCase().includes(q);
    const matchMod = !modulo || normalizeModuleCode(e.modulo_codigo) === modulo;
    const matchFmt = !formato || normalizeFormat(e.tipo_archivo) === formato;
    const matchObl = obligatoria === '' || String(e.obligatoria) === obligatoria;
    const matchFirma = firma === '' || String(e.requiere_firma) === firma;
    return matchQ && matchMod && matchFmt && matchObl && matchFirma;
  });
}

function updateFilterCount(shown) {
  const el = $('#filter-count');
  if (!el) return;
  const total = collectEvidencias().length;
  const hasFilter = hasActiveFilters();
  if (!hasFilter) {
    el.textContent = `${total} evidencia${total === 1 ? '' : 's'}`;
    el.classList.remove('filter-results--active');
    return;
  }
  el.textContent = `${shown} de ${total} evidencia${total === 1 ? '' : 's'}`;
  el.classList.add('filter-results--active');
}

function apply() {
  const all = collectEvidencias();
  const filtered = filterEvidencias(all);
  updateFilterCount(filtered.length);
  updateClearButton();
  renderTable(filtered);
}

function findModuleBySubgroup(sgId) {
  for (const m of tree) {
    for (const s of m.subgrupos || []) {
      if (String(s.id_subgrupo) === String(sgId)) {
        return m;
      }
    }
  }
  return tree[0] || null;
}

function moduleForSubgroup(sgId) {
  const mod = findModuleBySubgroup(sgId);
  return normalizeModuleCode(mod?.codigo || mod?.nombre || 'GF');
}

function subgroupOptionsHtml(moduloId, selectedSgId) {
  const mod = tree.find(m => String(m.id_modulo) === String(moduloId)) || tree[0];
  if (!mod) return '';
  return (mod.subgrupos || []).map(s =>
    `<option value="${s.id_subgrupo}" ${String(selectedSgId) === String(s.id_subgrupo) ? 'selected' : ''}>${escapeHtml(s.nombre)}</option>`
  ).join('');
}

function formatOptionsHtml(moduloCodigo, selected) {
  const current = normalizeFormat(selected);
  return allowedFormatsForModule(moduloCodigo).map(key => {
    const meta = EVIDENCE_FORMATS[key];
    return `<option value="${key}" ${current === key ? 'selected' : ''}>${meta.label} — ${meta.hint}</option>`;
  }).join('');
}

function renderTable(evidencias) {
  const canDelete = getUser()?.rol_label === 'Super Admin';
  $('#evid-table').innerHTML = `
    <table class="table">
      <thead><tr>${['Evidencia','Formato','Subgrupo','Obligatoria','Firma','Acciones'].map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>
        ${evidencias.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--c-gris4);">Sin evidencias</td></tr>` :
          evidencias.map(e => `
            <tr>
              <td>
                <div style="font-weight:600;">${escapeHtml(e.nombre)}</div>
                <div style="font-size:11px;color:var(--c-gris5);">${escapeHtml(e.codigo)} · ${escapeHtml(e.descripcion || '')}</div>
              </td>
              <td><span class="badge inactivo small">${escapeHtml(formatLabel(e.tipo_archivo))}</span></td>
              <td><span style="padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:${e.modulo_color}15;color:${e.modulo_color};">${escapeHtml(e.modulo_codigo)} · ${escapeHtml(e.subgrupo_nombre)}</span></td>
              <td>${e.obligatoria == 1 ? `<span class="badge aprobada small">Obligatoria</span>` : `<span class="badge inactivo small">Opcional</span>`}</td>
              <td>${e.requiere_firma == 1 ? `<span class="badge pendiente-firma small">Sí</span>` : `<span class="badge inactivo small">No</span>`}</td>
              <td><div style="display:flex;gap:5px;">
                <button class="btn btn-ghost btn-sm" data-act="edit" data-id="${e.id_evidencia_master}">${icon('edit',{size:12})}Editar</button>
                ${canDelete ? `<button class="btn btn-danger btn-sm" data-act="del" data-id="${e.id_evidencia_master}">${icon('trash',{size:12})}</button>` : ''}
              </div></td>
            </tr>`).join('')}
      </tbody>
    </table>
  `;
  $$('#evid-table [data-act="edit"]').forEach(b => b.addEventListener('click', () => openEvidenceModal(evidencias.find(e => e.id_evidencia_master == b.dataset.id))));
  if (canDelete) {
    $$('#evid-table [data-act="del"]').forEach(b => b.addEventListener('click', async () => {
      if (!await showConfirm({
        title: 'Eliminar evidencia',
        message: 'Esta acción borrará la evidencia y todas las asignaciones relacionadas. No se puede deshacer.',
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        variant: 'danger',
      })) return;
      await api.del('/evidences/' + b.dataset.id);
      showToast('success', 'Listo', 'Evidencia eliminada.');
      load();
    }));
  }
}

function openEvidenceModal(ev) {
  const isEdit = !!ev;
  const initialMod = findModuleBySubgroup(ev?.id_subgrupo || activeSubgroup)?.id_modulo
    || tree.find(m => normalizeModuleCode(m.codigo) === 'GC')?.id_modulo
    || tree[0]?.id_modulo
    || 1;
  const initialSg = ev?.id_subgrupo || activeSubgroup || findModuleBySubgroup(initialMod)?.subgrupos?.[0]?.id_subgrupo || '';
  const initialModObj = tree.find(m => String(m.id_modulo) === String(initialMod)) || tree[0];
  const initialModCode = normalizeModuleCode(initialModObj?.codigo || initialModObj?.nombre);

  const moduleOpts = tree.map(m =>
    `<option value="${m.id_modulo}" data-codigo="${escapeHtml(m.codigo)}" ${String(m.id_modulo) === String(initialMod) ? 'selected' : ''}>${escapeHtml(m.codigo)} — ${escapeHtml(m.nombre)}</option>`
  ).join('');

  openModal({
    title: isEdit ? 'Editar evidencia' : 'Nueva evidencia',
    width: 560,
    html: `
      <form id="ev-form" style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <label class="label">Módulo</label>
          <select class="input" id="ev-modulo" required>${moduleOpts}</select>
        </div>
        <div><label class="label">Subgrupo</label><select class="input" name="id_subgrupo" id="ev-subgrupo" required>${subgroupOptionsHtml(initialMod, initialSg)}</select></div>
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:10px;">
          <div><label class="label">Código</label><input class="input" name="codigo" required value="${escapeHtml(ev?.codigo || '')}"></div>
          <div><label class="label">Nombre</label><input class="input" name="nombre" required value="${escapeHtml(ev?.nombre || '')}"></div>
        </div>
        <div><label class="label">Descripción</label><textarea class="input" name="descripcion" rows="2">${escapeHtml(ev?.descripcion || '')}</textarea></div>
        <div>
          <label class="label">Formato requerido</label>
          <select class="input" name="tipo_archivo" id="ev-formato" required>${formatOptionsHtml(initialModCode, ev?.tipo_archivo)}</select>
          <p id="ev-formato-hint" style="font-size:11px;color:var(--c-gris5);margin-top:4px;">${escapeHtml(formatHint(ev?.tipo_archivo || 'pdf'))}</p>
          <p id="ev-formato-modulo" style="font-size:11px;color:var(--c-gris4);margin-top:2px;"></p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label class="label">Obligatoriedad</label>
            <select class="input" name="obligatoria">
              <option value="1" ${ev?.obligatoria == 1 ? 'selected' : ''}>Obligatoria</option>
              <option value="0" ${ev?.obligatoria == 0 ? 'selected' : ''}>Opcional</option>
            </select>
          </div>
          <div><label class="label">Orden</label><input class="input" type="number" name="orden" value="${ev?.orden || 0}"></div>
        </div>
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--c-gris2);border-radius:8px;background:var(--c-gris0);">
          <input type="checkbox" id="ev-requiere-firma" name="requiere_firma" value="1" style="margin-top:2px;accent-color:var(--c-azul);" ${ev?.requiere_firma == 1 ? 'checked' : ''}>
          <span>
            <span style="display:block;font-size:13px;font-weight:600;color:var(--c-azul);">Esta evidencia se firma</span>
            <span style="display:block;font-size:11px;color:var(--c-gris5);margin-top:2px;">Marque si el documento debe incluir firma del contratista o responsable.</span>
          </span>
        </label>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" class="btn btn-sec" data-cancel>Cancelar</button>
          <button class="btn" type="submit">${icon('check',{size:12,color:'#fff'})}${isEdit ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>`,
    onOpen: (modal, close) => {
      const modSelect = modal.querySelector('#ev-modulo');
      const sgSelect = modal.querySelector('#ev-subgrupo');
      const fmtSelect = modal.querySelector('#ev-formato');
      const fmtHint = modal.querySelector('#ev-formato-hint');
      const fmtModulo = modal.querySelector('#ev-formato-modulo');

      function currentModuleCode() {
        const opt = modSelect.selectedOptions[0];
        return normalizeModuleCode(opt?.dataset?.codigo || opt?.textContent || 'GF');
      }

      function refreshFormatOptions() {
        const modCode = currentModuleCode();
        const prev = normalizeFormat(fmtSelect.value || ev?.tipo_archivo);
        const allowed = allowedFormatsForModule(modCode);

        fmtSelect.innerHTML = formatOptionsHtml(modCode, prev);
        fmtSelect.value = allowed.includes(prev) ? prev : 'pdf';

        fmtHint.textContent = formatHint(fmtSelect.value);
        fmtModulo.textContent = isFinancialModule(modCode)
          ? 'Gestión Financiera (GF): solo se permite PDF.'
          : 'Gestión Contractual (GC): puede elegir PDF, Excel, Word o Imagen.';
      }

      function refreshSubgroupOptions() {
        const modId = modSelect.value;
        const prevSg = sgSelect.value;
        const opts = subgroupOptionsHtml(modId, prevSg);
        sgSelect.innerHTML = opts || '<option value="">Sin subgrupos</option>';
        if (!sgSelect.value && sgSelect.options.length) {
          sgSelect.selectedIndex = 0;
        }
      }

      function onModuleChange() {
        refreshSubgroupOptions();
        refreshFormatOptions();
      }

      modSelect.addEventListener('change', onModuleChange);
      fmtSelect.addEventListener('change', () => {
        fmtHint.textContent = formatHint(fmtSelect.value);
      });
      onModuleChange();

      modal.querySelector('[data-cancel]').addEventListener('click', close);
      modal.querySelector('#ev-form').addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        data.requiere_firma = modal.querySelector('#ev-requiere-firma')?.checked ? '1' : '0';
        try {
          if (isEdit) await api.put('/evidences/' + ev.id_evidencia_master, data);
          else        await api.post('/evidences', data);
          showToast('success', 'Listo', isEdit ? 'Evidencia actualizada.' : 'Evidencia creada.');
          close(); load();
        } catch {}
      });
    },
  });
}
