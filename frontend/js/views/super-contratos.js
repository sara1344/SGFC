/**
 * Vista: Super Admin → Contratos.
 *   - CRUD completo de contratos (crear, editar, eliminar).
 */
import { api } from '../api.js';
import { $, $$, escapeHtml, renderAvatar, fmtDate } from '../utils.js';
import { renderLayout, renderSectionTitle, icon, openModal, showToast, showConfirm } from '../components.js';

let contratos = [];
let users = [];

export async function init() {
  const root = await renderLayout({ rootSelector: '#app', activeId: 'super-contratos', breadcrumb: ['Contratos'] });
  root.innerHTML = `
    ${renderSectionTitle({
      title: 'Gestión de Contratos',
      subtitle: 'Exclusivo Super Admin: crear, editar y eliminar',
    })}
    <div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:var(--c-morado-light);border:1px solid rgba(113,39,122,0.2);border-radius:8px;margin-bottom:16px;font-size:12px;color:var(--c-morado);font-weight:600;">
      ${icon('shield',{size:13,color:'currentColor'})}Solo el Super Admin puede crear, editar y eliminar contratos.
    </div>
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
        <button type="button" class="btn" id="btn-new">${icon('filePlus', { size: 14, color: '#fff' })}Nuevo contrato</button>
      </div>
    </div>
    <div class="card" style="overflow:hidden;"><div class="table-wrap" id="t"></div></div>
  `;

  bindToolbar();
  await load();
  $('#btn-new').addEventListener('click', () => openModalNew());
}

function bindToolbar() {
  $('#search').addEventListener('input', apply);
  $('#estadoF').addEventListener('change', apply);
}

async function load() {
  contratos = (await api.get('/contracts')).data;
  users = (await api.get('/users')).data;
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
  $('#t').innerHTML = `
    <table class="table">
      <thead><tr>${['Contrato','Contratista','Vigencia','Objeto','Estado','Acciones'].map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--c-gris4);">Sin resultados</td></tr>` :
          rows.map(c => `
            <tr>
              <td style="font-weight:800;color:var(--c-azul);">#${c.id_contrato}</td>
              <td><div style="display:flex;align-items:center;gap:7px;">${renderAvatar((c.nombres||'') + ' ' + (c.Apellidos||''), 26)}
                <span style="font-weight:600;font-size:12px;">${escapeHtml((c.nombres||'') + ' ' + (c.Apellidos||''))}</span></div></td>
              <td style="font-size:11px;color:var(--c-gris5);">${fmtDate(c.fecha_inicio)}<br>${fmtDate(c.fecha_fin)}</td>
              <td style="font-size:12px;max-width:280px;">${escapeHtml(c.area_aplicacion || '—')}</td>
              <td><span class="badge ${c.estado === 'Activo' ? 'activo' : 'finalizado'} small">${escapeHtml(c.estado || '')}</span></td>
              <td><div style="display:flex;gap:4px;">
                <button class="btn btn-ghost btn-sm" data-act="edit" data-id="${c.id_contrato}">${icon('edit',{size:12})}Editar</button>
                <button class="btn btn-danger btn-sm" data-act="del"  data-id="${c.id_contrato}">${icon('trash',{size:12})}</button>
              </div></td>
            </tr>`).join('')}
      </tbody>
    </table>`;
  $$('#t [data-act="edit"]').forEach(b => b.addEventListener('click', () => openModalEdit(contratos.find(c => c.id_contrato == b.dataset.id))));
  $$('#t [data-act="del"]').forEach(b => b.addEventListener('click', async () => {
    if (!await showConfirm({
      title: 'Eliminar contrato',
      message: 'Esta acción eliminará el contrato y todos los periodos asociados. No se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    })) return;
    await api.del('/contracts/' + b.dataset.id);
    showToast('success', 'Listo', 'Contrato eliminado.');
    load();
  }));
}

function openModalNew() { openContractModal(null); }
function openModalEdit(c){ openContractModal(c); }

function openContractModal(c) {
  const isEdit = !!c;
  const contratistas = users.filter(u => u.nombre_perfil === 'contratista');
  openModal({
    title: isEdit ? 'Editar contrato' : 'Nuevo Contrato',
    width: 560,
    html: `
      <form id="ct-form" style="display:flex;flex-direction:column;gap:12px;">
        <div id="ct-form-error" class="hidden" role="alert" style="margin:0;background:var(--c-rojo-light);border:1px solid #FECACA;border-radius:8px;padding:10px 14px;font-size:13px;color:var(--c-rojo);font-weight:500;"></div>
        <div><label class="label">Contratista</label>
          <select class="input" name="id_persona" required>
            ${!isEdit ? '<option value="">Seleccione contratista…</option>' : ''}
            ${contratistas.map(u => `<option value="${u.id_persona}" ${c?.id_persona == u.id_persona ? 'selected' : ''}>${escapeHtml(u.nombres + ' ' + u.Apellidos)}</option>`).join('')}
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label class="label">Fecha inicio</label><input type="date" class="input" name="fecha_inicio" required value="${c?.fecha_inicio || ''}"></div>
          <div><label class="label">Fecha fin</label><input type="date" class="input" name="fecha_fin" required value="${c?.fecha_fin || ''}"></div>
        </div>
        <div><label class="label">Tipo de contrato</label>
          <select class="input" name="tipo_contrato" required>
            ${!isEdit ? '<option value="">Seleccione tipo de contrato…</option>' : ''}
            <option value="1" ${c?.tipo_contrato == 1 ? 'selected' : ''}>Prestación de Servicios</option>
            <option value="2" ${c?.tipo_contrato == 2 ? 'selected' : ''}>Servicios Personales</option>
            <option value="3" ${c?.tipo_contrato == 3 ? 'selected' : ''}>Convenio Interadministrativo</option>
          </select>
        </div>
        <div><label class="label">Objeto / Área de aplicación</label>
          <textarea class="input" name="area_aplicacion" rows="3" required minlength="5" placeholder="Describa el objeto o área de aplicación del contrato">${escapeHtml(c?.area_aplicacion || '')}</textarea>
        </div>
        <div><label class="label">Estado</label>
          <select class="input" name="estado" required>
            ${!isEdit ? '<option value="">Seleccione estado…</option>' : ''}
            <option value="Activo" ${c?.estado === 'Activo' ? 'selected' : ''}>Activo</option>
            <option value="Finalizado" ${c?.estado === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
            <option value="Suspendido" ${c?.estado === 'Suspendido' ? 'selected' : ''}>Suspendido</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" class="btn btn-sec" data-cancel>Cancelar</button>
          <button class="btn" type="submit">${icon('check',{size:12,color:'#fff'})}${isEdit ? 'Guardar' : 'Crear contrato'}</button>
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
          if (isEdit) await api.put('/contracts/' + c.id_contrato, data, { silent: true });
          else        await api.post('/contracts', data, { silent: true });
          showToast('success', 'Listo', isEdit ? 'Contrato actualizado.' : 'Contrato creado (incluye periodos automáticos).');
          close(); load();
        } catch (err) {
          errBox.textContent = err?.message || 'No se pudo guardar el contrato.';
          errBox.classList.remove('hidden');
        }
      });
    },
  });
}
