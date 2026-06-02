/**
 * Vista: Administrativo / Super Admin → Usuarios.
 *   - Lista contratistas + administrativos (+ administradores si soy Super Admin).
 *   - El campo `usuario` se genera automáticamente por el sistema con la regla:
 *       LOWER( LEFT(nombres,1) + LEFT(apellidos,1) + RIGHT(cedula,5) )
 *   - La contraseña inicial es la cédula del usuario.
 */
import { api } from '../api.js';
import { $, $$, escapeHtml, renderAvatar } from '../utils.js';
import { renderLayout, renderSectionTitle, renderKpi, icon, showToast, openModal, showConfirm } from '../components.js';
import { getUser } from '../auth.js';

let users = [];
let regionalesTree = [];

export async function init() {
  const navId = document.body.dataset.view === 'super-usuarios' ? 'super-usuarios' : 'admin-usuarios';
  const root = await renderLayout({ rootSelector: '#app', activeId: navId, breadcrumb: ['Usuarios'] });

  root.innerHTML = `
    ${renderSectionTitle({
      title: 'Gestión de Usuarios',
      subtitle: 'Contratistas y administrativos de centro · usuario generado por el sistema',
    })}
    <div class="grid grid-4 mb-3" id="kpis"></div>
    <div class="card list-toolbar mb-3">
      <div class="list-toolbar-fields">
        <div class="filter-field filter-field--grow">
          <label class="filter-label" for="search">Buscar usuario</label>
          <div class="input-wrap input-wrap--search">
            <span class="input-icon">${icon('search', { size: 15, color: 'currentColor' })}</span>
            <input class="input" id="search" type="search" autocomplete="off" placeholder="Nombre, usuario, cédula, correo, regional o centro…">
          </div>
        </div>
        <div class="filter-field filter-field--rol">
          <label class="filter-label" for="rolF">Filtrar por rol</label>
          <select class="input" id="rolF">
            <option value="">Todos los roles</option>
            <option value="administrador">Super Admin</option>
            <option value="administrativo_centro">Administrativo de Centro</option>
            <option value="contratista">Contratista</option>
          </select>
        </div>
      </div>
      <div class="list-toolbar-meta">
        <span class="filter-results" id="filter-count"></span>
        <button type="button" class="btn js-new-user">${icon('userPlus', { size: 14, color: '#fff' })}Nuevo usuario</button>
      </div>
    </div>
    <div class="card" style="overflow:hidden;"><div class="table-wrap" id="t-wrap"></div></div>
  `;

  await Promise.all([load(), loadRegionales()]);
  $('#search').addEventListener('input', apply);
  $('#rolF').addEventListener('change', apply);
  root.querySelectorAll('.js-new-user').forEach(btn =>
    btn.addEventListener('click', () => openUserModal())
  );
}

async function loadRegionales() {
  try {
    const r = await api.get('/catalog/regionales-centros', { silent: true });
    regionalesTree = r.data || [];
  } catch {
    regionalesTree = [];
  }
}

async function load() {
  const r = await api.get('/users');
  users = r.data;
  renderKpis();
  apply();
}

function renderKpis() {
  const me = getUser();
  const isCenter = me?.rol_label === 'Administrativo de Centro';
  const total = users.length;
  const cont  = users.filter(u => u.nombre_perfil === 'contratista').length;
  const cent  = users.filter(u => u.nombre_perfil === 'administrativo_centro').length;
  const supa  = users.filter(u => u.nombre_perfil === 'administrador').length;
  if (isCenter) {
    $('#kpis').innerHTML = [
      renderKpi({ label: 'Contratistas del centro', value: total, iconName: 'users',     color: '#00304D' }),
      renderKpi({ label: 'Activos',                 value: users.filter(u => parseInt(u.activo, 10) === 1).length, iconName: 'briefcase', color: '#39A900' }),
      renderKpi({ label: 'Con contrato activo',     value: users.filter(u => u.contrato_activo).length, iconName: 'fileText',  color: '#71277A' }),
    ].join('');
    return;
  }
  $('#kpis').innerHTML = [
    renderKpi({ label: 'Total usuarios',  value: total, iconName: 'users',       color: '#00304D' }),
    renderKpi({ label: 'Contratistas',    value: cont,  iconName: 'briefcase',   color: '#39A900' }),
    renderKpi({ label: 'Admin. de centro', value: cent, iconName: 'shield',      color: '#71277A' }),
    renderKpi({ label: 'Super admins',    value: supa,  iconName: 'shield',      color: '#0891B2' }),
  ].join('');
}

function apply() {
  const q = $('#search').value.toLowerCase().trim();
  const rol = $('#rolF').value;
  const filtered = users.filter(u =>
    (!q ||
      (u.nombres + ' ' + u.Apellidos).toLowerCase().includes(q) ||
      (u.correo  || '').toLowerCase().includes(q) ||
      (u.usuario || '').toLowerCase().includes(q) ||
      (u.cedula  || '').toLowerCase().includes(q) ||
      (u.regional_nombre || '').toLowerCase().includes(q) ||
      (u.centro_nombre || '').toLowerCase().includes(q)) &&
    (!rol || u.nombre_perfil === rol)
  );
  updateFilterCount(filtered.length);
  renderTable(filtered);
}

function updateFilterCount(shown) {
  const el = $('#filter-count');
  if (!el) return;
  const total = users.length;
  const hasFilter = $('#search').value.trim() || $('#rolF').value;
  if (!hasFilter) {
    el.textContent = `${total} usuario${total === 1 ? '' : 's'}`;
    el.classList.remove('filter-results--active');
    return;
  }
  el.textContent = `${shown} de ${total} usuario${total === 1 ? '' : 's'}`;
  el.classList.add('filter-results--active');
}

function renderTable(rows) {
  const me = getUser();
  const isSuper = me?.rol_label === 'Super Admin';
  const isCenter = me?.rol_label === 'Administrativo de Centro';
  $('#t-wrap').innerHTML = `
    <table class="table">
      <thead><tr>
        ${['Usuario','Documento','Correo','Regional','Centro','Rol','Estado','Contrato','Acciones'].map(h => `<th>${h}</th>`).join('')}
      </tr></thead>
      <tbody>
        ${rows.length === 0 ? `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--c-gris4);">Sin resultados</td></tr>` :
          rows.map(u => {
            const nombre = `${u.nombres} ${u.Apellidos}`;
            const isSupa  = u.nombre_perfil === 'administrador';
            const isCentAd = u.nombre_perfil === 'administrativo_centro';
            const color   = isSupa ? 'var(--c-morado)' : isCentAd ? 'var(--c-naranja)' : 'var(--c-verde)';
            const bg      = isSupa ? 'var(--c-morado-light)' : isCentAd ? 'rgba(234,88,12,0.12)' : 'var(--c-verde-light)';
            const rolLabel = isSupa ? 'Super Admin' : isCentAd ? 'Admin. de Centro' : u.nombre_perfil;
            const activo  = parseInt(u.activo, 10) === 1;
            return `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:9px;">
                    ${renderAvatar(nombre, 30)}
                    <div>
                      <div style="font-weight:600;">${escapeHtml(nombre)}</div>
                      <div style="font-size:11px;color:var(--c-gris5);font-family:monospace;">${escapeHtml(u.usuario || '')}</div>
                    </div>
                  </div>
                </td>
                <td style="color:var(--c-gris5);">${escapeHtml(u.cedula || '')}</td>
                <td style="color:var(--c-azul);font-weight:500;font-size:12px;">${escapeHtml(u.correo || '')}</td>
                <td style="font-size:12px;color:var(--c-gris6);">${escapeHtml(u.regional_nombre || '—')}</td>
                <td style="font-size:12px;color:var(--c-gris6);max-width:180px;">${escapeHtml(u.centro_nombre || '—')}</td>
                <td><span style="padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700;background:${bg};color:${color};">${escapeHtml(rolLabel)}</span></td>
                <td><span class="badge ${activo ? 'aprobada' : 'rechazada'} small">${activo ? 'Activo' : 'Inactivo'}</span></td>
                <td style="font-size:12px;font-weight:500;color:var(--c-azul);">${u.contrato_activo ? '#' + u.contrato_activo : '—'}</td>
                <td><div style="display:flex;gap:5px;">
                  <button class="btn btn-ghost btn-sm" data-act="edit"  data-id="${u.id_persona}">${icon('edit',{size:12})}Editar</button>
                  ${isSuper ? `<button class="btn btn-danger btn-sm" data-act="del" data-id="${u.id_persona}">${icon('trash',{size:12})}</button>` : ''}
                </div></td>
              </tr>`;
          }).join('')}
      </tbody>
    </table>`;
  $$('#t-wrap [data-act="edit"]').forEach(b => b.addEventListener('click', () => openUserModal(rows.find(r => r.id_persona == b.dataset.id))));
  $$('#t-wrap [data-act="del"]').forEach(b => b.addEventListener('click', async () => {
    if (!await showConfirm({
      title: 'Desactivar usuario',
      message: '¿Confirma que desea desactivar este usuario? No podrá iniciar sesión hasta que sea reactivado.',
      confirmLabel: 'Desactivar',
      cancelLabel: 'Cancelar',
      variant: 'warning',
    })) return;
    await api.del('/users/' + b.dataset.id);
    showToast('success', 'Listo', 'Usuario desactivado.');
    load();
  }));
}

function previewUsername(nombres, apellidos, cedula) {
  const n = (nombres || '').trim().charAt(0).toLowerCase();
  const a = (apellidos || '').trim().charAt(0).toLowerCase();
  const c = (cedula || '').replace(/\D/g, '').slice(-5);
  return n + a + c;
}

function renderRegionalOptions(selectedId) {
  return `<option value="">Seleccione regional…</option>` + regionalesTree.map(r =>
    `<option value="${r.id_regional}" ${String(selectedId) === String(r.id_regional) ? 'selected' : ''}>${escapeHtml(r.nombre)}</option>`
  ).join('');
}

function renderCentroOptions(regionalId, selectedCentroId) {
  const reg = regionalesTree.find(r => String(r.id_regional) === String(regionalId));
  const centros = reg?.centros || [];
  return `<option value="">Seleccione centro…</option>` + centros.map(c =>
    `<option value="${c.id_centro}" ${String(selectedCentroId) === String(c.id_centro) ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`
  ).join('');
}

function openUserModal(u) {
  const isEdit = !!u;
  const me = getUser();
  const isSuper = me?.rol_label === 'Super Admin';
  const isCenter = me?.rol_label === 'Administrativo de Centro';
  const selRegional = isCenter ? (me?.id_regional || '') : (u?.id_regional || '');
  const selCentro = isCenter ? (me?.id_centro || '') : (u?.id_centro || '');
  const locationLocked = isCenter;

  openModal({
    title: isEdit ? 'Editar usuario' : 'Crear nuevo usuario',
    width: 560,
    html: `
      <form id="user-form" style="display:flex;flex-direction:column;gap:13px;">
        <div id="user-form-error" class="hidden" role="alert" style="margin:0;background:var(--c-rojo-light);border:1px solid #FECACA;border-radius:8px;padding:10px 14px;font-size:13px;color:var(--c-rojo);font-weight:500;"></div>
        <div style="background:var(--c-azul-light);border:1px solid #BFDBFE;border-radius:8px;padding:10px 12px;font-size:12px;color:var(--c-azul);">
          ${icon('info',{size:13,color:'currentColor'})}
          El sistema generará automáticamente el <strong>usuario</strong> y usará la <strong>cédula como contraseña inicial</strong>.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div><label class="label">Nombres</label><input class="input" name="nombres" required value="${escapeHtml(u?.nombres || '')}"></div>
          <div><label class="label">Apellidos</label><input class="input" name="apellidos" required value="${escapeHtml(u?.Apellidos || '')}"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div><label class="label">Cédula</label><input class="input" name="cedula" required value="${escapeHtml(u?.cedula || '')}"></div>
          <div><label class="label">Usuario (auto)</label><input class="input" id="user-preview" disabled value="${escapeHtml(u?.usuario || '')}" style="background:var(--c-gris0);font-family:monospace;"></div>
        </div>
        <div><label class="label">Correo institucional</label><input class="input" type="email" name="correo" required value="${escapeHtml(u?.correo || '')}"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div><label class="label">Regional SENA</label>
            <select class="input" id="sel-regional" name="id_regional" required ${locationLocked ? 'disabled' : ''}>${renderRegionalOptions(selRegional)}</select>
            ${locationLocked ? `<input type="hidden" name="id_regional" value="${selRegional}">` : ''}
          </div>
          <div><label class="label">Centro de formación</label>
            <select class="input" id="sel-centro" name="id_centro" required ${locationLocked ? 'disabled' : ''}>${renderCentroOptions(selRegional, selCentro)}</select>
            ${locationLocked ? `<input type="hidden" name="id_centro" value="${selCentro}">` : ''}
          </div>
        </div>
        ${isEdit ? `<div><label class="label">Nueva contraseña (opcional)</label><input class="input" type="password" name="password" minlength="6" placeholder="Dejar vacío para no cambiar"></div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div><label class="label">Rol</label>
            <select class="input" name="id_perfil" required>
              ${isSuper ? `
                <option value="1" ${u?.id_perfil == 1 || !u ? 'selected' : ''}>Contratista</option>
                <option value="4" ${u?.id_perfil == 4 ? 'selected' : ''}>Administrativo de Centro</option>
                <option value="2" ${u?.id_perfil == 2 ? 'selected' : ''}>Super Admin (administrador)</option>
              ` : isCenter ? `
                <option value="1" ${!u || u?.id_perfil == 1 ? 'selected' : ''}>Contratista</option>
              ` : isEdit ? `
                <option value="1" ${u?.id_perfil == 1 ? 'selected' : ''}>Contratista</option>
              ` : `
                <option value="1" selected>Contratista</option>
              `}
            </select>
          </div>
          <div><label class="label">Género</label>
            <select class="input" name="id_genero" required>
              <option value="2" ${(!isEdit && !u) || u?.id_genero == 2 ? 'selected' : ''}>Masculino</option>
              <option value="1" ${u?.id_genero == 1 ? 'selected' : ''}>Femenino</option>
              <option value="3" ${u?.id_genero == 3 ? 'selected' : ''}>Otro</option>
            </select>
          </div>
        </div>
        ${isEdit ? `<div><label class="label">Estado</label>
          <select class="input" name="activo">
            <option value="1" ${u?.activo == 1 ? 'selected' : ''}>Activo</option>
            <option value="0" ${u?.activo == 0 ? 'selected' : ''}>Inactivo</option>
          </select></div>` : ''}
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" class="btn btn-sec" data-cancel>Cancelar</button>
          <button class="btn" type="submit">${icon('check',{size:12,color:'#fff'})}${isEdit ? 'Guardar cambios' : 'Crear usuario'}</button>
        </div>
      </form>`,
    onOpen: (modal, close) => {
      const f = modal.querySelector('#user-form');
      const preview = modal.querySelector('#user-preview');
      const selReg = f.querySelector('#sel-regional');
      const selCen = f.querySelector('#sel-centro');

      selReg.addEventListener('change', () => {
        selCen.innerHTML = renderCentroOptions(selReg.value, '');
      });

      const updatePreview = () => {
        const fd = new FormData(f);
        preview.value = previewUsername(fd.get('nombres'), fd.get('apellidos'), fd.get('cedula'));
      };
      ['nombres','apellidos','cedula'].forEach(n => f.querySelector(`[name="${n}"]`).addEventListener('input', updatePreview));
      if (!isEdit) updatePreview();

      modal.querySelector('[data-cancel]').addEventListener('click', close);
      const submitBtn = f.querySelector('[type="submit"]');
      const errBox = f.querySelector('#user-form-error');

      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        errBox.classList.add('hidden');
        errBox.textContent = '';

        if (!f.reportValidity()) return;

        const fd = new FormData(f);
        const data = Object.fromEntries(fd.entries());
        data.id_perfil = parseInt(data.id_perfil, 10);
        data.id_genero = parseInt(data.id_genero, 10);
        data.id_regional = parseInt(data.id_regional, 10);
        data.id_centro = parseInt(data.id_centro, 10);
        if (Number.isNaN(data.id_perfil) || Number.isNaN(data.id_genero)) {
          errBox.textContent = 'Seleccione rol y género válidos.';
          errBox.classList.remove('hidden');
          return;
        }
        if (Number.isNaN(data.id_regional) || Number.isNaN(data.id_centro)) {
          errBox.textContent = 'Seleccione la regional y el centro de formación.';
          errBox.classList.remove('hidden');
          return;
        }
        if (isEdit && data.activo !== undefined) data.activo = parseInt(data.activo, 10);

        submitBtn.disabled = true;
        try {
          if (isEdit) {
            await api.put('/users/' + u.id_persona, data, { silent: true });
            showToast('success', 'Listo', 'Usuario actualizado.');
          } else {
            const r = await api.post('/users', data, { silent: true });
            const d = r?.data ?? {};
            showToast(
              'success',
              'Usuario creado',
              `Usuario: ${d.usuario ?? '—'} · Contraseña inicial: ${d.password_inicial ?? '(cédula)'}`
            );
          }
          close();
          await load();
        } catch (err) {
          let msg = err?.message || 'No se pudo guardar. Verifique los datos o intente de nuevo.';
          const extra = err?.payload?.errors;
          if (extra && typeof extra === 'object') {
            const parts = Object.values(extra).filter(Boolean);
            if (parts.length) msg = parts.join(' ');
          }
          errBox.textContent = msg;
          errBox.classList.remove('hidden');
          console.error('[admin-usuarios]', err);
        } finally {
          if (submitBtn.isConnected) submitBtn.disabled = false;
        }
      });
    }
  });
}
