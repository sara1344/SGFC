/**
 * Vista: Administrativo → Notificaciones (agrupadas por contratista).
 */
import { api } from '../api.js';
import { $, $$, escapeHtml, fmtDateTime } from '../utils.js';
import { renderLayout, renderSectionTitle, icon, showToast } from '../components.js';
import { resolveFrontendPath } from '../api.js';

let items = [];
let selectedId = null;
let selectedDetail = null;

const TIPOS = [
  'Todas',
  'No leídas',
  'Actualización contratista',
  'Evidencia cargada',
  'Evidencia corregida',
  'PDF para firma',
  'Periodo por vencer',
];

const TIPO_STYLE = {
  'Evidencia cargada':    { bg: 'rgba(57,169,0,0.12)',  color: '#2d7a00' },
  'Evidencia corregida':  { bg: 'rgba(0,102,204,0.12)', color: '#0066cc' },
  'PDF para firma':       { bg: 'rgba(255,152,0,0.15)', color: '#e65100' },
  'Periodo por vencer':   { bg: 'rgba(211,47,47,0.12)', color: '#c62828' },
};

export async function init() {
  const root = await renderLayout({ rootSelector: '#app', activeId: 'admin-notificaciones', breadcrumb: ['Notificaciones'] });
  root.innerHTML = `<div id="page"></div>`;
  const params = new URLSearchParams(location.search);
  selectedId = params.get('id') ? Number(params.get('id')) : null;
  await load();
}

async function load() {
  const r = await api.get('/notifications');
  items = r.data.items || [];
  if (selectedId) {
    await openDetail(selectedId, false);
  } else {
    renderList('Todas');
  }
}

function isGrouped(n) {
  return n.tipo === 'Actualización contratista' || Number(n.cantidad_detalles) > 0 || n.id_contratista;
}

function tipoBadge(tipo) {
  const s = TIPO_STYLE[tipo] || { bg: 'rgba(0,48,77,0.08)', color: 'var(--c-azul)' };
  return `<span style="font-size:11px;background:${s.bg};color:${s.color};padding:1px 8px;border-radius:20px;font-weight:600;">${escapeHtml(tipo)}</span>`;
}

function renderList(filter) {
  selectedDetail = null;
  let list = items;
  if (filter === 'No leídas') list = items.filter(n => n.leida == 0);
  else if (filter !== 'Todas') list = items.filter(n => n.tipo === filter || (filter === 'Actualización contratista' && isGrouped(n)));

  $('#page').innerHTML = `
    ${renderSectionTitle({
      title: 'Centro de Notificaciones',
      subtitle: `${items.filter(n => n.leida == 0).length} sin leer · agrupadas por contratista`,
      rightHtml: `<button class="btn btn-ghost" id="btn-all-read">${icon('check', { size: 12 })}Marcar todas leídas</button>`,
    })}
    <div class="chips mb-3">
      ${TIPOS.map(t => `<button class="chip ${t === filter ? 'active' : ''}" data-tipo="${t}">${t}</button>`).join('')}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${list.length === 0
        ? `<div style="text-align:center;padding:40px;color:var(--c-gris4);">${icon('inbox', { size: 32 })}<p style="margin-top:10px;font-size:14px;">Sin notificaciones en este filtro</p></div>`
        : list.map(n => renderCard(n)).join('')}
    </div>
  `;

  $$('#page .chip').forEach(c => c.addEventListener('click', () => renderList(c.dataset.tipo)));
  $('#btn-all-read')?.addEventListener('click', async () => {
    await api.put('/notifications/read-all', {});
    showToast('success', 'Listo', 'Todas marcadas como leídas.');
    selectedId = null;
    history.replaceState(null, '', resolveFrontendPath('/views/administrativo-notificaciones.html'));
    load();
  });

  $$('[data-open]').forEach(btn => btn.addEventListener('click', () => openDetail(Number(btn.dataset.open), true)));
}

function renderCard(n) {
  const grouped = isGrouped(n);
  const unread = n.leida == 0;
  const title = grouped
    ? escapeHtml(n.contratista_nombre || n.titulo.replace(' realizó actualizaciones', '')) + ' realizó actualizaciones'
    : escapeHtml(n.titulo);
  const subtitle = grouped
    ? escapeHtml(n.mensaje || `${n.cantidad_detalles || 0} actualizaciones`)
    : escapeHtml(n.mensaje || '');

  return `
    <div class="card" style="padding:14px 18px;display:flex;gap:12px;align-items:center;background:${unread ? 'var(--c-verde-light)' : '#fff'};border-left:3px solid ${unread ? 'var(--c-verde)' : 'var(--c-gris2)'};">
      <div style="width:36px;height:36px;border-radius:9px;background:rgba(57,169,0,0.12);display:flex;align-items:center;justify-content:center;">
        ${icon(grouped ? 'users' : 'bell', { size: 17, color: '#39A900' })}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <span style="font-size:13px;font-weight:700;">${title}</span>
          ${grouped ? tipoBadge('Actualización contratista') : tipoBadge(n.tipo)}
          ${grouped && Number(n.cantidad_detalles) > 0 ? `<span style="font-size:11px;background:var(--c-azul);color:#fff;padding:1px 8px;border-radius:20px;font-weight:700;">${n.cantidad_detalles}</span>` : ''}
          ${unread ? `<span style="font-size:10px;background:var(--c-rojo);color:#fff;padding:1px 6px;border-radius:20px;font-weight:700;">NUEVA</span>` : ''}
        </div>
        <div style="font-size:12px;color:var(--c-gris5);margin-top:3px;">${subtitle}</div>
        <div style="font-size:11px;color:var(--c-gris4);margin-top:3px;">${fmtDateTime(n.fecha_creacion)}</div>
      </div>
      ${grouped
        ? `<button class="btn btn-sec btn-sm" data-open="${n.id_notificacion}">${icon('chevronRight', { size: 12 })}Ver actualizaciones</button>`
        : (n.link ? `<a class="btn btn-sec btn-sm" href="${escapeHtml(resolveFrontendPath(n.link))}">${icon('chevronRight', { size: 12 })}Ir</a>` : '')}
    </div>`;
}

async function openDetail(id, pushState) {
  selectedId = id;
  if (pushState) {
    history.pushState(null, '', resolveFrontendPath(`/views/administrativo-notificaciones.html?id=${id}`));
  }
  try {
    const r = await api.get(`/notifications/${id}`);
    selectedDetail = r.data;
    renderDetail();
    const idx = items.findIndex(n => Number(n.id_notificacion) === id);
    if (idx >= 0) items[idx].leida = 1;
  } catch (err) {
    showToast('error', 'Error', err.message || 'No se pudo cargar la notificación.');
    selectedId = null;
    renderList('Todas');
  }
}

function renderDetail() {
  const n = selectedDetail.notification;
  const detalles = selectedDetail.detalles || [];
  const nombre = escapeHtml(n.contratista_nombre || 'Contratista');

  $('#page').innerHTML = `
    ${renderSectionTitle({
      title: 'Actualizaciones del contratista',
      subtitle: nombre,
      rightHtml: `<button class="btn btn-ghost" id="btn-back">${icon('chevronLeft', { size: 12 })}Volver</button>`,
    })}
    <div class="card card-pad mb-3" style="background:var(--c-verde-light);border-left:4px solid var(--c-verde);">
      <div style="font-size:14px;font-weight:700;color:var(--c-azul);">${nombre} realizó actualizaciones</div>
      <div style="font-size:13px;color:var(--c-gris6);margin-top:4px;">${escapeHtml(n.mensaje || '')}</div>
      <div style="font-size:11px;color:var(--c-gris4);margin-top:6px;">Última actividad: ${fmtDateTime(n.fecha_creacion)}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${detalles.length === 0
        ? `<div class="card card-pad text-center" style="color:var(--c-gris4);">Sin detalle de actualizaciones</div>`
        : detalles.map(d => `
          <div class="card" style="padding:14px 18px;display:flex;gap:12px;align-items:flex-start;">
            <div style="width:36px;height:36px;border-radius:9px;background:rgba(0,48,77,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${icon(d.tipo === 'PDF para firma' ? 'fileText' : d.tipo === 'Periodo por vencer' ? 'calendar' : 'upload', { size: 17, color: 'var(--c-azul)' })}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                ${tipoBadge(d.tipo)}
                <span style="font-size:13px;font-weight:700;">${escapeHtml(d.titulo)}</span>
              </div>
              <div style="font-size:12px;color:var(--c-gris5);margin-top:4px;line-height:1.45;">${escapeHtml(d.mensaje || '')}</div>
              <div style="font-size:11px;color:var(--c-gris4);margin-top:4px;">${fmtDateTime(d.fecha_creacion)}</div>
            </div>
            ${d.link ? `<a class="btn btn-sec btn-sm" href="${escapeHtml(resolveFrontendPath(d.link))}" style="flex-shrink:0;">${icon('chevronRight', { size: 12 })}Ir</a>` : ''}
          </div>`).join('')}
    </div>
  `;

  $('#btn-back')?.addEventListener('click', () => {
    selectedId = null;
    history.replaceState(null, '', resolveFrontendPath('/views/administrativo-notificaciones.html'));
    renderList('Todas');
  });
}
