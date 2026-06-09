/**

 * Vista: Administrativo → Notificaciones (agrupadas por contratista).

 */

import { api } from '../api.js';

import { $, $$, escapeHtml, fmtDate, fmtDateTime } from '../utils.js';

import { renderLayout, renderSectionTitle, icon, showToast } from '../components.js';

import { resolveFrontendPath } from '../api.js';



let items = [];

let selectedId = null;

let selectedDetail = null;



const PRORROGA_DAYS = [5, 15, 20];



const TIPOS = [

  'Todas',

  'No leídas',

  'Actualización contratista',

  'Evidencia cargada',

  'Evidencia corregida',

  'PDF para firma',

  'Periodo por vencer',

  'Solicitud de prórroga',

];



const TIPO_STYLE = {

  'Evidencia cargada':    { bg: 'rgba(57,169,0,0.12)',  color: '#2d7a00' },

  'Evidencia corregida':  { bg: 'rgba(0,102,204,0.12)', color: '#0066cc' },

  'PDF para firma':       { bg: 'rgba(255,152,0,0.15)', color: '#e65100' },

  'Periodo por vencer':   { bg: 'rgba(211,47,47,0.12)', color: '#c62828' },

  'Solicitud de prórroga': { bg: 'rgba(234,88,12,0.12)', color: '#EA580C' },

};



export async function init() {

  const root = await renderLayout({ rootSelector: '#app', activeId: 'admin-notificaciones', breadcrumb: ['Notificaciones'] });

  root.innerHTML = `<div id="page"></div>`;

  const params = new URLSearchParams(location.search);

  selectedId = params.get('id') ? Number(params.get('id')) : null;

  const prorrogaId = params.get('prorroga') ? Number(params.get('prorroga')) : null;

  const fromId = params.get('from') ? Number(params.get('from')) : null;

  await load();

  if (prorrogaId) {

    await openProrrogaReview(prorrogaId, fromId);

  }

}



function extractProrrogaId(link) {

  if (!link) return null;

  const m = String(link).match(/prorroga=(\d+)/i);

  return m ? Number(m[1]) : null;

}



function isProrrogaDetail(d) {

  const tipo = String(d?.tipo || '').toLowerCase();

  return tipo.includes('prórroga') || tipo.includes('prorroga');

}



async function load() {

  const r = await api.get('/notifications');

  items = r.data.items || [];

  if (selectedId && !new URLSearchParams(location.search).get('prorroga')) {

    await openDetail(selectedId, false);

  } else if (!new URLSearchParams(location.search).get('prorroga')) {

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

        : detalles.map(d => {

          const prorrogaId = extractProrrogaId(d.link);

          const isProrroga = isProrrogaDetail(d) && prorrogaId;

          return `

          <div class="card" style="padding:14px 18px;display:flex;gap:12px;align-items:flex-start;">

            <div style="width:36px;height:36px;border-radius:9px;background:rgba(234,88,12,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">

              ${icon(isProrroga ? 'calendar' : (d.tipo === 'PDF para firma' ? 'fileText' : 'upload'), { size: 17, color: isProrroga ? '#EA580C' : 'var(--c-azul)' })}

            </div>

            <div style="flex:1;min-width:0;">

              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">

                ${tipoBadge(d.tipo)}

                <span style="font-size:13px;font-weight:700;">${escapeHtml(d.titulo)}</span>

              </div>

              <div style="font-size:12px;color:var(--c-gris5);margin-top:4px;line-height:1.45;white-space:pre-line;">${escapeHtml(d.mensaje || '')}</div>

              <div style="font-size:11px;color:var(--c-gris4);margin-top:4px;">${fmtDateTime(d.fecha_creacion)}</div>

            </div>

            ${isProrroga

              ? `<button type="button" class="btn btn-sm btn-review-prorroga" data-prorroga="${prorrogaId}" data-from="${n.id_notificacion}" style="flex-shrink:0;background:#EA580C;">${icon('check',{size:12,color:'#fff'})}Revisar solicitud</button>`

              : (d.link ? `<a class="btn btn-sec btn-sm" href="${escapeHtml(resolveFrontendPath(d.link))}" style="flex-shrink:0;">${icon('chevronRight', { size: 12 })}Ir</a>` : '')}

          </div>`;

        }).join('')}

    </div>

  `;



  $('#btn-back')?.addEventListener('click', () => {

    selectedId = null;

    history.replaceState(null, '', resolveFrontendPath('/views/administrativo-notificaciones.html'));

    renderList('Todas');

  });



  $$('.btn-review-prorroga').forEach(btn => {

    btn.addEventListener('click', () => {

      const pid = Number(btn.dataset.prorroga);

      const from = Number(btn.dataset.from) || null;

      if (pid) navigateToProrrogaReview(pid, from);

    });

  });

}



function navigateToProrrogaReview(prorrogaId, fromId = null) {

  const qs = fromId ? `?prorroga=${prorrogaId}&from=${fromId}` : `?prorroga=${prorrogaId}`;

  history.pushState(null, '', resolveFrontendPath(`/views/administrativo-notificaciones.html${qs}`));

  openProrrogaReview(prorrogaId, fromId);

}



async function openProrrogaReview(prorrogaId, fromId = null) {

  let data;

  try {

    const r = await api.get(`/prorrogas/${prorrogaId}`);

    data = r.data;

  } catch (err) {

    showToast('error', 'Error', err.message || 'No se pudo cargar la solicitud de prórroga.');

    if (fromId) await openDetail(fromId, false);

    else renderList('Todas');

    return;

  }



  const isPending = data.estado === 'Pendiente';

  const requestedDays = Number(data.dias_solicitados) || 5;

  let selectedDays = requestedDays;



  $('#page').innerHTML = `

    ${renderSectionTitle({

      title: 'Revisar solicitud de prórroga',

      subtitle: escapeHtml(data.contratista_nombre || 'Contratista'),

      rightHtml: `<button class="btn btn-ghost" id="btn-prorroga-back">${icon('chevronLeft', { size: 12 })}Volver</button>`,

    })}



    <div class="grid" style="grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">

      <div class="card card-pad">

        <div style="font-size:11px;font-weight:700;color:var(--c-gris4);text-transform:uppercase;letter-spacing:.5px;">Contratista</div>

        <div style="font-size:16px;font-weight:800;color:var(--c-azul);margin-top:4px;">${escapeHtml(data.contratista_nombre || '—')}</div>

      </div>

      <div class="card card-pad">

        <div style="font-size:11px;font-weight:700;color:var(--c-gris4);text-transform:uppercase;letter-spacing:.5px;">Periodo</div>

        <div style="font-size:16px;font-weight:800;color:var(--c-azul);margin-top:4px;">${escapeHtml(data.nombre_periodo || '—')}</div>

        <div style="font-size:12px;color:var(--c-gris5);margin-top:4px;">Fecha límite original: <strong>${fmtDate(data.periodo_fecha_limite || '')}</strong></div>

      </div>

    </div>



    <div class="card card-pad mb-3" style="border-left:4px solid #EA580C;">

      <div style="font-size:13px;font-weight:700;color:#9A3412;margin-bottom:8px;">Solicitud del contratista</div>

      <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:12px;">

        <div>

          <div style="font-size:11px;color:var(--c-gris5);">Días solicitados</div>

          <div style="font-size:22px;font-weight:800;color:#EA580C;">${requestedDays} <span style="font-size:13px;font-weight:600;">días hábiles</span></div>

        </div>

        <div>

          <div style="font-size:11px;color:var(--c-gris5);">Estado</div>

          <div style="font-size:14px;font-weight:700;margin-top:4px;">${escapeHtml(data.estado || '')}</div>

        </div>

        <div>

          <div style="font-size:11px;color:var(--c-gris5);">Fecha de solicitud</div>

          <div style="font-size:13px;font-weight:600;margin-top:4px;">${fmtDateTime(data.fecha_solicitud || '')}</div>

        </div>

      </div>

      <label class="label">Justificación del contratista</label>

      <div style="font-size:13px;color:var(--c-gris7);background:var(--c-gris0);border:1px solid var(--c-gris2);border-radius:8px;padding:12px;line-height:1.55;">${escapeHtml(data.justificacion || '')}</div>

    </div>



    ${isPending ? `

    <div class="card card-pad mb-3">

      <div style="font-size:14px;font-weight:700;color:var(--c-azul);margin-bottom:12px;">Decisión del administrativo</div>



      <label class="label">Días hábiles a otorgar</label>

      <p style="font-size:12px;color:var(--c-gris5);margin:-4px 0 10px;">Puede mantener los días solicitados o seleccionar otro plazo (5, 15 o 20 días hábiles).</p>

      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;" id="prorroga-days-opts">

        ${PRORROGA_DAYS.map(d => `

          <label class="prorroga-day-opt" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:2px solid ${d === requestedDays ? '#EA580C' : 'var(--c-gris2)'};border-radius:8px;cursor:pointer;background:${d === requestedDays ? '#FFF7ED' : '#fff'};">

            <input type="radio" name="dias-aprobados" value="${d}" ${d === requestedDays ? 'checked' : ''}>

            <span style="font-size:14px;font-weight:700;">${d} días hábiles</span>

            ${d === requestedDays ? '<span style="font-size:11px;color:#EA580C;margin-left:auto;">Solicitado por el contratista</span>' : ''}

          </label>`).join('')}

      </div>



      <div id="prorroga-change-reason-wrap" style="display:none;margin-bottom:14px;">

        <label class="label">Motivo del cambio de días <span style="color:var(--c-rojo);">*</span></label>

        <textarea class="input" id="prorroga-change-reason" rows="3" maxlength="1000" placeholder="Explique por qué otorga un plazo diferente al solicitado"></textarea>

      </div>



      <label class="label">Observación adicional (opcional al aprobar)</label>

      <textarea class="input" id="prorroga-admin-obs" rows="2" maxlength="1000" placeholder="Comentario para el contratista"></textarea>



      <div style="border-top:1px solid var(--c-gris2);margin:18px 0 14px;padding-top:14px;">

        <label class="label">Motivo del rechazo <span style="color:var(--c-gris4);font-weight:400;">(solo si rechaza)</span></label>

        <textarea class="input" id="prorroga-reject-reason" rows="2" maxlength="1000" placeholder="Obligatorio si rechaza la solicitud"></textarea>

      </div>



      <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">

        <button type="button" class="btn btn-sec" id="prorroga-reject">${icon('x',{size:12})}Rechazar</button>

        <button type="button" class="btn" id="prorroga-approve" style="background:var(--c-verde);">${icon('check',{size:12,color:'#fff'})}Aprobar prórroga</button>

      </div>

    </div>` : `

    <div class="card card-pad mb-3" style="background:var(--c-gris0);">

      <div style="font-size:14px;font-weight:700;margin-bottom:10px;">Solicitud ya resuelta</div>

      ${data.dias_aprobados ? `<p style="font-size:13px;"><strong>Días otorgados:</strong> ${data.dias_aprobados} días hábiles</p>` : ''}

      ${data.motivo_cambio_dias ? `<p style="font-size:13px;margin-top:6px;"><strong>Motivo del cambio:</strong> ${escapeHtml(data.motivo_cambio_dias)}</p>` : ''}

      ${data.observacion_admin ? `<p style="font-size:13px;margin-top:6px;"><strong>Respuesta:</strong> ${escapeHtml(data.observacion_admin)}</p>` : ''}

      ${data.fecha_limite_extendida ? `<p style="font-size:13px;margin-top:6px;"><strong>Nueva fecha límite:</strong> ${fmtDate(data.fecha_limite_extendida)}</p>` : ''}

    </div>`}

  `;



  $('#btn-prorroga-back')?.addEventListener('click', () => {

    if (fromId) {

      history.replaceState(null, '', resolveFrontendPath(`/views/administrativo-notificaciones.html?id=${fromId}`));

      openDetail(fromId, false);

    } else {

      history.replaceState(null, '', resolveFrontendPath('/views/administrativo-notificaciones.html'));

      renderList('Todas');

    }

  });



  if (!isPending) return;



  function refreshDayStyles() {

    $$('.prorroga-day-opt').forEach(lbl => {

      const input = lbl.querySelector('input');

      const d = Number(input?.value);

      const active = d === selectedDays;

      lbl.style.borderColor = active ? '#EA580C' : 'var(--c-gris2)';

      lbl.style.background = active ? '#FFF7ED' : '#fff';

    });

    const changeWrap = $('#prorroga-change-reason-wrap');

    if (changeWrap) {

      changeWrap.style.display = selectedDays !== requestedDays ? 'block' : 'none';

    }

  }



  $$('input[name="dias-aprobados"]').forEach(r => {

    r.addEventListener('change', () => {

      selectedDays = Number(r.value);

      refreshDayStyles();

    });

  });

  $$('.prorroga-day-opt').forEach(opt => {

    opt.addEventListener('click', () => {

      const input = opt.querySelector('input');

      if (input) {

        input.checked = true;

        selectedDays = Number(input.value);

        refreshDayStyles();

      }

    });

  });



  $('#prorroga-approve')?.addEventListener('click', async () => {

    const obs = $('#prorroga-admin-obs')?.value?.trim() || '';

    const changeReason = $('#prorroga-change-reason')?.value?.trim() || '';

    if (selectedDays !== requestedDays && changeReason.length < 5) {

      showToast('warning', 'Motivo requerido', 'Indique por qué otorga un plazo diferente al solicitado.');

      return;

    }

    const btn = $('#prorroga-approve');

    btn.disabled = true;

    try {

      await api.post(`/prorrogas/${prorrogaId}/approve`, {

        dias_aprobados: selectedDays,

        motivo_cambio_dias: selectedDays !== requestedDays ? changeReason : '',

        observacion: obs,

      });

      showToast('success', 'Aprobada', 'La prórroga fue aprobada.');

      if (fromId) {

        history.replaceState(null, '', resolveFrontendPath(`/views/administrativo-notificaciones.html?id=${fromId}`));

        await load();

        await openDetail(fromId, false);

      } else {

        history.replaceState(null, '', resolveFrontendPath('/views/administrativo-notificaciones.html'));

        await load();

      }

    } catch {

      btn.disabled = false;

    }

  });



  $('#prorroga-reject')?.addEventListener('click', async () => {

    const reason = $('#prorroga-reject-reason')?.value?.trim() || '';

    if (reason.length < 5) {

      showToast('warning', 'Motivo requerido', 'Indique el motivo del rechazo.');

      return;

    }

    const btn = $('#prorroga-reject');

    btn.disabled = true;

    try {

      await api.post(`/prorrogas/${prorrogaId}/reject`, { observacion: reason });

      showToast('success', 'Rechazada', 'La solicitud fue rechazada.');

      if (fromId) {

        history.replaceState(null, '', resolveFrontendPath(`/views/administrativo-notificaciones.html?id=${fromId}`));

        await load();

        await openDetail(fromId, false);

      } else {

        history.replaceState(null, '', resolveFrontendPath('/views/administrativo-notificaciones.html'));

        await load();

      }

    } catch {

      btn.disabled = false;

    }

  });

}


