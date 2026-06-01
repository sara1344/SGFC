/**
 * Vista: Contratista → Notificaciones.
 */
import { api } from '../api.js';
import { $, escapeHtml, fmtDateTime } from '../utils.js';
import { renderLayout, renderSectionTitle, icon, showToast } from '../components.js';

const ALERT_TYPES = ['Rechazada', 'Periodo por vencer'];

function isAlert(tipo) {
  return ALERT_TYPES.includes(tipo);
}

function notifStyle(n) {
  const alert = isAlert(n.tipo);
  if (n.leida == 0 && alert) {
    return {
      border: '#e53935',
      bg: 'rgba(229,57,53,0.07)',
      iconBg: 'rgba(229,57,53,0.14)',
      iconColor: '#c62828',
      iconName: n.tipo === 'Periodo por vencer' ? 'calendar' : 'alertCircle',
      labelColor: '#c62828',
    };
  }
  if (n.leida == 0) {
    return {
      border: 'var(--c-verde)',
      bg: 'var(--c-verde-light)',
      iconBg: 'rgba(57,169,0,0.12)',
      iconColor: '#39A900',
      iconName: 'bell',
      labelColor: 'var(--c-verde)',
    };
  }
  return {
    border: alert ? 'rgba(229,57,53,0.4)' : 'var(--c-gris2)',
    bg: '#fff',
    iconBg: alert ? 'rgba(229,57,53,0.08)' : 'rgba(0,48,77,0.06)',
    iconColor: alert ? '#e53935' : 'var(--c-gris5)',
    iconName: alert ? (n.tipo === 'Periodo por vencer' ? 'calendar' : 'alertCircle') : 'bell',
    labelColor: alert ? '#e53935' : 'var(--c-gris5)',
  };
}

export async function init() {
  const root = await renderLayout({ rootSelector: '#app', activeId: 'cont-notificaciones', breadcrumb: ['Notificaciones'] });
  const r = await api.get('/notifications');
  const items = r.data.items || [];
  root.innerHTML = `
    ${renderSectionTitle({
      title: 'Mis Notificaciones',
      subtitle: 'Alertas y novedades sobre tus evidencias y contratos',
      rightHtml: `<button class="btn btn-ghost" id="bar">${icon('check',{size:12})}Marcar leídas</button>`,
    })}
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${items.length === 0 ? `<div class="card card-pad text-center" style="color:var(--c-gris4);">Sin notificaciones aún</div>` :
        items.map(n => {
          const s = notifStyle(n);
          return `
          <div class="card" style="padding:14px 18px;display:flex;gap:12px;align-items:center;border-left:4px solid ${s.border};background:${s.bg};">
            <div style="width:36px;height:36px;border-radius:9px;background:${s.iconBg};display:flex;align-items:center;justify-content:center;">${icon(s.iconName,{size:17,color:s.iconColor})}</div>
            <div style="flex:1;">
              <div style="font-size:10px;font-weight:800;color:${s.labelColor};text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(n.tipo)}</div>
              <div style="font-size:13px;font-weight:500;color:var(--c-gris7);margin-top:2px;line-height:1.4;">${escapeHtml(n.titulo)}</div>
              <div style="font-size:12px;color:var(--c-gris5);margin-top:3px;">${escapeHtml(n.mensaje || '')}</div>
              <div style="font-size:11px;color:var(--c-gris4);margin-top:3px;">${fmtDateTime(n.fecha_creacion)}</div>
            </div>
          </div>`;
        }).join('')}
    </div>`;
  $('#bar').addEventListener('click', async () => { await api.put('/notifications/read-all', {}); showToast('success', 'Listo', 'Notificaciones marcadas como leídas.'); init(); });
}
