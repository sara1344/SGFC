/**
 * Vista: Contratista → Cargar Evidencias.
 *   - Lista evidencias asignadas al periodo actual del contratista.
 *   - Selección de PDF + botón Subir (no sube automáticamente).
 *   - Tras subir: desactiva Subir y muestra Editar para reemplazar el archivo.
 */
import { api } from '../api.js';
import { $, escapeHtml, fmtDate } from '../utils.js';
import { renderLayout, icon, openModal, showToast } from '../components.js';
import { getUser } from '../auth.js';
import { openEvidenceSignatureModal } from '../evidence-signature.js';
import {
  acceptForFormat,
  formatHint,
  formatLabel,
  normalizeFormat,
  validateFileForFormat,
} from '../evidence-formats.js';

let activePeriod = null;
/** @type {Array<Record<string, unknown>>} */
let allPeriods = [];
let assignments = [];
let contract = null;
/** @type {Record<string, unknown>|null} */
let uploadWindow = null;
let unifiedPdf = null;
let zipGc = null;
/** @type {Map<string, File>} Archivos elegidos pero aún no enviados, por id_asignacion */
const pendingFiles = new Map();
let uploadListenersBound = false;

export async function init() {
  const root = await renderLayout({ rootSelector: '#app', activeId: 'cont-cargar', breadcrumb: ['Cargar Evidencias'] });
  root.innerHTML = `<div id="page"><div class="loader-screen"><div class="loader"></div></div></div>`;
  bindUploadListenersOnce();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && $('#page')?.querySelector('#evid-list')) {
      load();
    }
  });
  await load();
}

async function load() {
  const user = getUser();
  const cs = await api.get('/contracts');
  contract = cs.data.find(c => c.estado === 'Activo' && Number(c.id_persona) === Number(user.id));
  if (!contract) {
    $('#page').innerHTML = `<div class="card card-pad"><p>No tienes un contrato activo asignado.</p></div>`;
    return;
  }
  const ps = await api.get('/periods?contrato=' + contract.id_contrato);
  allPeriods = ps.data || [];
  const urlPeriod = new URLSearchParams(location.search).get('periodo');
  activePeriod = pickDefaultPeriod(allPeriods, urlPeriod);
  if (!activePeriod) {
    $('#page').innerHTML = `<div class="card card-pad"><p>No hay un periodo disponible para tu contrato. Si el administrativo asignó evidencias en un mes anterior, verifique que ese periodo esté activo.</p></div>`;
    return;
  }
  await loadPeriodData(activePeriod.id_periodo);
}

function isPeriodOpen(p) {
  return p.estado !== 'Bloqueado' && p.estado !== 'Firmado';
}

function pickDefaultPeriod(periods, preferredId = null) {
  const sorted = [...periods].sort((a, b) => Number(a.anio) - Number(b.anio) || Number(a.mes) - Number(b.mes));
  if (preferredId) {
    const forced = sorted.find(p => String(p.id_periodo) === String(preferredId) && isPeriodOpen(p));
    if (forced) return forced;
  }

  const storageKey = `sgfc:period:${contract?.id_contrato}`;
  const saved = sessionStorage.getItem(storageKey);
  if (saved) {
    const remembered = sorted.find(p => String(p.id_periodo) === saved && isPeriodOpen(p));
    if (remembered) return remembered;
  }

  const now = new Date();
  const curM = now.getMonth() + 1;
  const curY = now.getFullYear();
  const withActiveProrroga = [...sorted].reverse().find(p => isPeriodOpen(p) && Number(p.prorroga_activa || 0) > 0);
  if (withActiveProrroga) return withActiveProrroga;

  const current = sorted.find(p => Number(p.mes) === curM && Number(p.anio) === curY && isPeriodOpen(p));
  if (current) return current;

  const withEvidence = [...sorted].reverse().find(p => isPeriodOpen(p) && Number(p.evidencias_count || 0) > 0);
  if (withEvidence) return withEvidence;

  return [...sorted].reverse().find(p => isPeriodOpen(p)) || null;
}

async function loadPeriodData(periodId) {
  const r = await api.get('/periods/' + periodId);
  activePeriod = r.data.periodo || allPeriods.find(p => String(p.id_periodo) === String(periodId)) || activePeriod;
  assignments = r.data.evidencias || [];
  uploadWindow = r.data.ventana_carga || null;
  unifiedPdf = r.data.pdf_unificado || null;
  zipGc = r.data.zip_gc || null;
  if (contract?.id_contrato) {
    sessionStorage.setItem(`sgfc:period:${contract.id_contrato}`, String(periodId));
  }
  syncPendingFiles();
  render();
}

async function switchPeriod(periodId) {
  pendingFiles.clear();
  await loadPeriodData(periodId);
}

function evidenceEstado(ev) {
  return String(ev?.ultimo_estado || 'Pendiente entrega').trim();
}

function moduleFromEvidenceCode(codigo) {
  const c = String(codigo || '');
  if (c.includes('-GF-')) return 'GF';
  if (c.includes('-GC-')) return 'GC';
  return null;
}

function resolveModuleMeta(ev) {
  const fromCode = moduleFromEvidenceCode(ev?.codigo);
  const codigo = String(ev?.modulo_codigo || fromCode || 'OTRO').trim();
  const defaults = {
    GF: { nombre: 'Gestión Financiera', color: '#39A900' },
    GC: { nombre: 'Gestión Contractual', color: '#00304D' },
  };
  const base = defaults[codigo] || { nombre: ev?.modulo_nombre || codigo, color: ev?.modulo_color || '#666' };
  return {
    codigo,
    nombre: ev?.modulo_nombre || base.nombre,
    color: ev?.modulo_color || base.color,
  };
}

function isEvidenceLocked(ev) {
  return evidenceEstado(ev) === 'Aprobada';
}

function evidenceRequiresSignature(ev) {
  return Number(ev?.requiere_firma) === 1;
}

function evidenceIsSigned(ev) {
  return Number(ev?.firmado_contratista) === 1;
}

function canSignEvidence(ev) {
  return evidenceRequiresSignature(ev)
    && ev.ultimo_upload_id
    && evidenceEstado(ev) !== 'Pendiente entrega'
    && !isEvidenceLocked(ev)
    && !isUploadWindowClosed();
}

function isAssignmentLocked(asignacionId) {
  const ev = assignments.find(a => String(a.id_asignacion) === String(asignacionId));
  return ev ? isEvidenceLocked(ev) : false;
}

function isUploadWindowClosed() {
  return uploadWindow && uploadWindow.puede_subir === false;
}

function canRequestProrroga() {
  return !!uploadWindow?.puede_solicitar_prorroga;
}

function syncPendingFiles() {
  for (const id of [...pendingFiles.keys()]) {
    if (isAssignmentLocked(id)) pendingFiles.delete(id);
  }
}

function calcStats() {
  let apr = 0, rev = 0, rej = 0, sin = 0;
  for (const a of assignments) {
    const e = a.ultimo_estado || 'Pendiente entrega';
    if (e === 'Aprobada') apr++;
    else if (e === 'Pendiente revisión') rev++;
    else if (e === 'Rechazada') rej++;
    else if (e === 'Pendiente entrega') sin++;
  }
  return { apr, rev, rej, sin, total: assignments.length };
}

function calcStatsForModule(moduloCodigo) {
  const items = assignments.filter(a => resolveModuleMeta(a).codigo === moduloCodigo);
  let apr = 0;
  for (const a of items) {
    if (evidenceEstado(a) === 'Aprobada') apr++;
  }
  return { apr, total: items.length };
}

function validateFile(file, ev) {
  if (!file) return false;
  const maxMb = Number(ev?.tamano_max_mb) || 10;
  const mod = resolveModuleMeta(ev).codigo;
  const format = normalizeFormat(ev?.tipo_archivo);
  const result = validateFileForFormat(file, format, maxMb);
  if (!result.ok) {
    showToast('error', 'Archivo inválido', result.message);
    return false;
  }
  if (mod === 'GF' && format !== 'pdf') {
    showToast('error', 'Archivo inválido', 'Las evidencias GF solo aceptan PDF.');
    return false;
  }
  return true;
}

function renderDeliveryCard({ modulo, title, desc, approved, total, done, doneLabel, pendingLabel, btnId, btnLabel, btnIcon, color, light, linkHref, linkLabel }) {
  const allApproved = total > 0 && approved === total;
  const border = done ? `2px solid ${color}` : allApproved ? '2px solid var(--c-verde)' : '2px dashed var(--c-gris2)';
  const bg = done ? light : allApproved ? 'var(--c-verde-light)' : '#fff';

  return `
    <div class="card card-pad text-center" style="border:${border};background:${bg};">
      ${done ? `
        ${icon('checkCircle',{size:32,color,strokeWidth:1.5})}
        <div style="font-size:15px;font-weight:800;color:${color};margin-top:8px;">${doneLabel}</div>
        <div style="font-size:13px;color:var(--c-gris5);margin:6px auto 12px;max-width:430px;">${escapeHtml(desc)}</div>
        ${linkHref ? `<a class="btn btn-sec" href="${linkHref}">${linkLabel}</a>` : ''}
      ` : allApproved ? `
        ${icon('checkCircle',{size:32,color:'#39A900',strokeWidth:1.5})}
        <div style="font-size:15px;font-weight:800;color:var(--c-verde);margin-top:8px;">${escapeHtml(title)} — listo</div>
        <div style="font-size:13px;color:var(--c-gris5);margin:6px auto 16px;max-width:430px;">${escapeHtml(desc)}</div>
        <button class="btn btn-lg" id="${btnId}">${btnIcon}${btnLabel}</button>
      ` : `
        ${icon('fileStack',{size:32,color:'var(--c-gris3)',strokeWidth:1.5})}
        <div style="font-size:14px;font-weight:600;color:var(--c-gris5);margin-top:8px;">${escapeHtml(pendingLabel)}</div>
        <div style="font-size:12px;color:var(--c-gris4);margin-top:4px;">${total - approved} pendiente${total - approved === 1 ? '' : 's'} de ${total} evidencias ${modulo}</div>
      `}
    </div>`;
}

function render() {
  const s = calcStats();
  const gf = calcStatsForModule('GF');
  const gc = calcStatsForModule('GC');
  const hasGf = gf.total > 0;
  const hasGc = gc.total > 0;
  const gfMerged = !!unifiedPdf?.id_pdf;
  const gcZipped = !!zipGc?.id_pdf;

  $('#page').innerHTML = `
    <div class="card mb-3" style="overflow:hidden;background:var(--c-azul);color:#fff;">
      <div style="padding:16px 20px;display:flex;gap:24px;flex-wrap:wrap;align-items:center;">
        <div>
          <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.6px;">Contrato activo</div>
          <div style="font-size:18px;font-weight:900;color:#fff;">#${contract.id_contrato}</div>
        </div>
        <div style="min-width:180px;">
          <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.6px;">Período</div>
          ${renderPeriodSelector()}
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.6px;">Fecha límite</div>
          <div style="font-size:15px;font-weight:700;color:#fff;">${fmtDate(uploadWindow?.fecha_limite_efectiva || activePeriod.fecha_limite)}</div>
          ${uploadWindow?.prorroga_activa ? `<div style="font-size:10px;color:#FDE68A;margin-top:2px;">Prórroga hasta ${fmtDate(uploadWindow.fecha_limite_efectiva)}</div>` : ''}
        </div>
        ${canRequestProrroga() ? `
        <div>
          <button type="button" class="btn btn-sm" id="btn-prorroga" style="background:#EA580C;">${icon('calendar',{size:12,color:'#fff'})}Solicitar prórroga</button>
        </div>` : ''}
        <div style="flex:1;min-width:200px;">
          <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;">Progreso general</div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:8px;background:rgba(255,255,255,0.15);border-radius:4px;">
              <div style="height:100%;width:${s.total ? Math.round(s.apr * 100 / s.total) : 0}%;background:var(--c-verde);border-radius:4px;transition:width .5s;"></div>
            </div>
            <span style="font-size:13px;font-weight:800;">${s.apr}/${s.total}</span>
          </div>
        </div>
      </div>
    </div>

    ${uploadWindow && !uploadWindow.puede_subir ? `
    <div class="card card-pad mb-3" style="background:#FFF7ED;border:1px solid #FDBA74;">
      <div style="display:flex;gap:10px;align-items:flex-start;">
        ${icon('alertTriangle',{size:18,color:'#EA580C'})}
        <div>
          <div style="font-size:14px;font-weight:700;color:#9A3412;">Plazo de entrega cerrado</div>
          <div style="font-size:13px;color:#7C2D12;margin-top:4px;line-height:1.45;">${escapeHtml(uploadWindow.mensaje || 'El plazo venció. Solicite una prórroga para continuar.')}</div>
          ${uploadWindow.prorroga_pendiente ? `<div style="font-size:12px;color:#9A3412;margin-top:6px;">Solicitud enviada: <strong>${uploadWindow.prorroga_pendiente.dias_solicitados} días hábiles</strong> — en revisión.</div>` : ''}
        </div>
      </div>
    </div>` : ''}

    ${uploadWindow?.prorroga_activa ? `
    <div class="card card-pad mb-3" style="background:var(--c-verde-light);border:1px solid #BBF7D0;">
      <div style="display:flex;gap:10px;align-items:center;">
        ${icon('checkCircle',{size:18,color:'#39A900'})}
        <div style="font-size:13px;color:var(--c-gris7);">${escapeHtml(uploadWindow.mensaje || '')}</div>
      </div>
    </div>` : ''}

    <div class="grid grid-4 mb-3">
      <div class="card" style="padding:12px 14px;border-top:3px solid var(--c-verde);display:flex;align-items:center;gap:10px;">${icon('checkCircle',{size:18,color:'#39A900'})}<div><div style="font-size:20px;font-weight:800;">${s.apr}</div><div style="font-size:11px;color:var(--c-gris5);">Aprobadas</div></div></div>
      <div class="card" style="padding:12px 14px;border-top:3px solid var(--c-amarillo);display:flex;align-items:center;gap:10px;">${icon('helpCircle',{size:18,color:'#CA8A04'})}<div><div style="font-size:20px;font-weight:800;">${s.rev}</div><div style="font-size:11px;color:var(--c-gris5);">Pend. revisión</div></div></div>
      <div class="card" style="padding:12px 14px;border-top:3px solid var(--c-naranja);display:flex;align-items:center;gap:10px;">${icon('alertTriangle',{size:18,color:'#EA580C'})}<div><div style="font-size:20px;font-weight:800;">${s.sin}</div><div style="font-size:11px;color:var(--c-gris5);">Pend. entrega</div></div></div>
      <div class="card" style="padding:12px 14px;border-top:3px solid var(--c-rojo);display:flex;align-items:center;gap:10px;">${icon('xCircle',{size:18,color:'#DC2626'})}<div><div style="font-size:20px;font-weight:800;">${s.rej}</div><div style="font-size:11px;color:var(--c-gris5);">Rechazadas</div></div></div>
    </div>

    <div id="evid-list"></div>

    <div class="grid mt-4" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;" id="delivery-cards">
      ${hasGf ? renderDeliveryCard({
        modulo: 'GF',
        title: 'PDF unificado GF',
        desc: gfMerged && unifiedPdf.fecha_generado ? `Generado el ${fmtDate(unifiedPdf.fecha_generado)}. Enviado al administrativo para firma.` : 'Unificar evidencias GF en PDF y enviar al administrativo para firma.',
        approved: gf.apr,
        total: gf.total,
        done: gfMerged,
        doneLabel: 'PDF GF enviado',
        pendingLabel: 'Unificar evidencias GF (PDF)',
        btnId: 'btn-merge-gf',
        btnLabel: 'Unificar GF en PDF',
        btnIcon: icon('fileStack',{size:14,color:'#fff'}),
        color: '#39A900',
        light: 'var(--c-verde-light)',
        linkHref: 'contratista-firmados.html',
        linkLabel: `${icon('fileSignature',{size:14})}Ver en PDFs Firmados`,
      }) : ''}
      ${hasGc ? renderDeliveryCard({
        modulo: 'GC',
        title: 'Paquete ZIP GC',
        desc: gcZipped && zipGc.fecha_generado ? `Generado el ${fmtDate(zipGc.fecha_generado)}. Disponible para descarga (sin firma).` : 'Comprimir evidencias GC aprobadas en ZIP. Disponible para usted y el administrativo.',
        approved: gc.apr,
        total: gc.total,
        done: gcZipped,
        doneLabel: 'ZIP GC generado',
        pendingLabel: 'Generar paquete ZIP GC',
        btnId: 'btn-pack-gc',
        btnLabel: 'Generar ZIP GC',
        btnIcon: icon('download',{size:14,color:'#fff'}),
        color: '#00304D',
        light: 'var(--c-azul-light)',
        linkHref: 'contratista-firmados.html?tab=gc-zip',
        linkLabel: `${icon('download',{size:14})}Descargar ZIP GC`,
      }) : ''}
    </div>
  `;

  const grouped = {};
  for (const a of assignments) {
    const meta = resolveModuleMeta(a);
    const mk = meta.codigo;
    const sk = a.subgrupo_codigo || 'general';
    grouped[mk] ??= { codigo: meta.codigo, nombre: meta.nombre, color: meta.color, sub: {} };
    grouped[mk].sub[sk] ??= { codigo: a.subgrupo_codigo, nombre: a.subgrupo_nombre, items: [] };
    grouped[mk].sub[sk].items.push(a);
  }

  const moduleOrder = { GF: 0, GC: 1 };
  const modules = Object.values(grouped).sort(
    (a, b) => (moduleOrder[a.codigo] ?? 99) - (moduleOrder[b.codigo] ?? 99)
  );

  $('#evid-list').innerHTML = assignments.length === 0 ? `
    <div class="card card-pad text-center" style="padding:32px 20px;">
      ${icon('inbox',{size:36,color:'var(--c-gris3)'})}
      <p style="margin-top:12px;font-size:14px;font-weight:600;color:var(--c-gris6);">No hay evidencias asignadas en <strong>${escapeHtml(activePeriod.nombre_periodo)}</strong></p>
      <p style="font-size:13px;color:var(--c-gris5);margin-top:6px;max-width:480px;margin-left:auto;margin-right:auto;">
        Si el administrativo asignó evidencias en otro mes, selecciónelo en el desplegable <strong>Período</strong> arriba.
      </p>
    </div>` : modules.map(m => `
    <div class="card mb-3" style="overflow:hidden;">
      <div style="padding:14px 18px;background:${m.codigo === 'GF' ? 'var(--c-verde-light)' : 'var(--c-azul-light)'};display:flex;align-items:center;gap:12px;">
        <div style="width:6px;height:32px;border-radius:3px;background:${m.color};"></div>
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:800;color:${m.color};">${escapeHtml(m.codigo)} — ${escapeHtml(m.nombre)}</div>
        </div>
      </div>
      ${Object.values(m.sub).map(sg => `
        <div style="border-top:1px solid var(--c-gris2);">
          <div style="padding:10px 18px 10px 26px;background:var(--c-gris0);display:flex;gap:10px;align-items:center;">
            ${icon('folder',{size:14,color:m.color})}
            <div style="font-size:13px;font-weight:700;">${escapeHtml(sg.nombre)}</div>
            <div style="font-size:11px;color:var(--c-gris5);margin-left:auto;">${sg.items.length} evidencias</div>
          </div>
          ${sg.items.map(ev => renderEvidenceCard(ev, m.color)).join('')}
        </div>
      `).join('')}
    </div>`).join('');

  $('#btn-merge-gf')?.addEventListener('click', confirmMergeGf);
  $('#btn-pack-gc')?.addEventListener('click', confirmPackGc);
  $('#btn-prorroga')?.addEventListener('click', openProrrogaModal);
  $('#period-select')?.addEventListener('change', async (e) => {
    const id = e.target.value;
    if (id && String(id) !== String(activePeriod.id_periodo)) {
      await switchPeriod(id);
    }
  });
}

function renderPeriodSelector() {
  const openPeriods = allPeriods.filter(isPeriodOpen);
  if (openPeriods.length <= 1) {
    return `<div style="font-size:15px;font-weight:700;color:#fff;">${escapeHtml(activePeriod.nombre_periodo)}</div>`;
  }
  return `
    <select id="period-select" class="input" style="margin-top:4px;max-width:220px;font-weight:700;color:var(--c-azul);">
      ${openPeriods.map(p => `
        <option value="${p.id_periodo}" ${String(p.id_periodo) === String(activePeriod.id_periodo) ? 'selected' : ''}>
          ${escapeHtml(p.nombre_periodo)}${Number(p.evidencias_count || 0) > 0 ? ` (${p.evidencias_count} evid.)` : ''}
        </option>`).join('')}
    </select>`;
}

function renderEvidenceCard(ev, color) {
  const est = evidenceEstado(ev);
  const mod = resolveModuleMeta(ev);
  const bcls = { 'Aprobada':'aprobada','Pendiente revisión':'pendiente-rev','Rechazada':'rechazada','Pendiente entrega':'pendiente-ent' }[est] || '';
  const locked = isEvidenceLocked(ev);
  const hasFile = est !== 'Pendiente entrega';
  const id = String(ev.id_asignacion);
  const pending = locked ? null : pendingFiles.get(id);
  const canUpload = !!pending;

  return `
    <div class="evidence-card" data-asignacion="${id}" data-locked="${locked ? '1' : '0'}" style="padding:14px 18px 14px 44px;border-top:1px solid var(--c-gris1);background:${locked ? '#FAFFF9' : '#fff'};">
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="padding:1px 7px;border-radius:20px;font-size:10px;font-weight:700;background:${mod.codigo === 'GF' ? 'var(--c-verde-light)' : 'var(--c-azul-light)'};color:${mod.codigo === 'GF' ? '#39A900' : '#00304D'};">${escapeHtml(mod.codigo)}</span>
            <div style="font-size:13px;font-weight:700;">${escapeHtml(ev.nombre)}</div>
          </div>
          <div style="font-size:11px;color:var(--c-gris5);margin-top:1px;">${escapeHtml(ev.codigo || '')}${ev.descripcion ? ` · ${escapeHtml(ev.descripcion)}` : ''}</div>
          <div style="display:flex;gap:6px;margin-top:5px;flex-wrap:wrap;">
            <span class="badge ${bcls} small">${escapeHtml(est)}</span>
            ${ev.obligatoria == 1
              ? `<span style="font-size:10px;font-weight:700;background:${color}15;color:${color};padding:1px 7px;border-radius:20px;">Obligatoria</span>`
              : `<span style="font-size:10px;color:var(--c-gris4);background:var(--c-gris1);padding:1px 7px;border-radius:20px;">Opcional</span>`
            }
            <span style="font-size:10px;font-weight:700;background:var(--c-gris1);color:var(--c-gris6);padding:1px 7px;border-radius:20px;">Formato: ${escapeHtml(formatLabel(ev.tipo_archivo))}</span>
            ${evidenceRequiresSignature(ev)
              ? (evidenceIsSigned(ev)
                ? `<span style="font-size:10px;font-weight:700;background:var(--c-azul-firma-light);color:var(--c-azul-firma);padding:1px 7px;border-radius:20px;">${icon('penLine',{size:9,color:'currentColor'})} Firmada</span>`
                : `<span style="font-size:10px;font-weight:700;background:#FFF7ED;color:#EA580C;padding:1px 7px;border-radius:20px;">${icon('alertCircle',{size:9,color:'currentColor'})} Pendiente de firma</span>`)
              : ''}
            ${hasFile && !pending && ev.ultimo_archivo
              ? `<span style="font-size:10px;color:var(--c-azul);background:var(--c-azul-light);padding:1px 7px;border-radius:20px;">${icon('fileText',{size:9,color:'currentColor'})} ${escapeHtml(ev.ultimo_archivo)}</span>`
              : ''}
          </div>
          ${pending ? `
            <div style="margin-top:8px;background:var(--c-azul-light);border:1px solid #BFDBFE;border-radius:7px;padding:8px 12px;font-size:12px;color:var(--c-azul);display:flex;gap:7px;align-items:center;">
              ${icon('fileText',{size:13})}
              <span><strong>Archivo seleccionado:</strong> ${escapeHtml(pending.name)}</span>
            </div>` : ''}
          ${ev.ultimo_comentario && !locked ? `
            <div style="margin-top:8px;background:${est === 'Rechazada' ? 'var(--c-rojo-light)' : 'var(--c-amarillo-light)'};border:1px solid ${est === 'Rechazada' ? '#FECACA' : '#FDE047'};border-radius:7px;padding:8px 12px;font-size:12px;color:${est === 'Rechazada' ? 'var(--c-rojo)' : 'var(--c-amarillo)'};display:flex;gap:7px;">
              ${icon('alertCircle',{size:13})}<span><strong>${est === 'Rechazada' ? 'Rechazo:' : 'Observación:'}</strong> ${escapeHtml(ev.ultimo_comentario)}</span>
            </div>` : ''}
          ${locked ? `
            <div style="margin-top:10px;background:var(--c-verde-light);border:1px solid #BBF7D0;border-radius:7px;padding:8px 12px;font-size:12px;color:var(--c-verde);display:flex;gap:7px;align-items:center;">
              ${icon('lock',{size:13})}
              <span>Evidencia aprobada. No puedes editarla ni subir un archivo nuevo.</span>
            </div>` : renderUploadControls(ev, color, hasFile, pending, canUpload)}
        </div>
      </div>
    </div>`;
}

function renderUploadControls(ev, color, hasFile, pending, canUpload) {
  if (isUploadWindowClosed()) {
    return `
      <div style="margin-top:10px;background:var(--c-gris0);border:1px solid var(--c-gris2);border-radius:7px;padding:8px 12px;font-size:12px;color:var(--c-gris5);display:flex;gap:7px;align-items:center;">
        ${icon('lock',{size:13})}
        <span>Carga bloqueada: el plazo de entrega venció.</span>
      </div>`;
  }
  const id = ev.id_asignacion;
  const format = normalizeFormat(ev.tipo_archivo);
  const showPicker = !hasFile || pending;
  const accept = acceptForFormat(format);
  const maxMb = Number(ev.tamano_max_mb) || 10;
  const hint = `${formatHint(format)} · Máx. ${maxMb} MB · Pulsa Subir para enviar`;

  return `
    <input type="file" accept="${accept}" class="upload-input" data-id="${id}" data-format="${format}" style="display:none;">
    ${showPicker ? `
      <div class="drop-zone" data-id="${id}" role="button" tabindex="0" style="margin-top:10px;border:2px dashed var(--c-gris2);border-radius:8px;padding:10px 16px;display:flex;gap:10px;align-items:center;cursor:pointer;transition:.15s;">
        ${icon('upload',{size:15,color:'var(--c-gris4)'})}
        <div style="flex:1;">
          <span style="font-size:12px;color:var(--c-gris5);">${hasFile ? 'Nuevo archivo: arrastra o ' : 'Arrastra aquí o '}</span>
          <span style="font-size:12px;color:${color};font-weight:600;">selecciona un archivo</span>
          <div style="font-size:10px;color:var(--c-gris4);margin-top:1px;">${hint}</div>
        </div>
      </div>` : ''}
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center;">
      ${hasFile && !pending
        ? `<button type="button" class="btn btn-sec btn-sm btn-edit-evidence" data-id="${id}">${icon('edit',{size:12})}Editar</button>`
        : ''}
      ${canSignEvidence(ev)
        ? `<button type="button" class="btn btn-sm btn-sign-evidence" data-upload="${ev.ultimo_upload_id}" data-id="${id}" style="background:var(--c-azul-firma);">${icon('penLine',{size:12,color:'#fff'})}${evidenceIsSigned(ev) ? 'Volver a firmar' : 'Firmar'}</button>`
        : ''}
      <button type="button" class="btn btn-sm btn-upload-evidence" data-id="${id}" ${canUpload ? '' : 'disabled'}>${icon('upload',{size:12,color: canUpload ? '#fff' : 'var(--c-gris4)'})}Subir</button>
      ${pending && hasFile
        ? `<button type="button" class="btn btn-ghost btn-sm btn-cancel-evidence" data-id="${id}">Cancelar</button>`
        : ''}
    </div>`;
}

function bindUploadListenersOnce() {
  if (uploadListenersBound) return;
  uploadListenersBound = true;

  document.addEventListener('change', e => {
    const input = e.target.closest('.upload-input');
    if (!input || !input.closest('#page')) return;
    if (isAssignmentLocked(input.dataset.id) || isUploadWindowClosed()) return;
    const file = input.files?.[0];
    input.value = '';
    const ev = assignments.find(a => String(a.id_asignacion) === String(input.dataset.id));
    if (!file || !validateFile(file, ev)) return;
    pendingFiles.set(String(input.dataset.id), file);
    render();
  });

  document.addEventListener('click', e => {
    const editBtn = e.target.closest('.btn-edit-evidence');
    if (editBtn?.closest('#page')) {
      e.preventDefault();
      if (isAssignmentLocked(editBtn.dataset.id) || isUploadWindowClosed()) return;
      $(`.upload-input[data-id="${editBtn.dataset.id}"]`)?.click();
      return;
    }

    const signBtn = e.target.closest('.btn-sign-evidence');
    if (signBtn?.closest('#page')) {
      e.preventDefault();
      const uploadId = parseInt(signBtn.dataset.upload, 10);
      if (uploadId) {
        openEvidenceSignatureModal(uploadId, { onDone: () => load() });
      }
      return;
    }

    const uploadBtn = e.target.closest('.btn-upload-evidence');
    if (uploadBtn?.closest('#page')) {
      e.preventDefault();
      e.stopPropagation();
      if (uploadBtn.disabled || isAssignmentLocked(uploadBtn.dataset.id) || isUploadWindowClosed()) return;
      const file = pendingFiles.get(String(uploadBtn.dataset.id));
      if (file) handleUpload(uploadBtn.dataset.id, file);
      return;
    }

    const cancelBtn = e.target.closest('.btn-cancel-evidence');
    if (cancelBtn?.closest('#page')) {
      e.preventDefault();
      pendingFiles.delete(String(cancelBtn.dataset.id));
      render();
      return;
    }

    const zone = e.target.closest('.drop-zone');
    if (zone?.closest('#page')) {
      e.preventDefault();
      if (isAssignmentLocked(zone.dataset.id) || isUploadWindowClosed()) return;
      $(`.upload-input[data-id="${zone.dataset.id}"]`)?.click();
    }
  });

  document.addEventListener('dragover', e => {
    const zone = e.target.closest('.drop-zone');
    if (!zone?.closest('#page') || isAssignmentLocked(zone.dataset.id) || isUploadWindowClosed()) return;
    e.preventDefault();
    zone.style.background = 'var(--c-verde-light)';
  });

  document.addEventListener('dragleave', e => {
    const zone = e.target.closest('.drop-zone');
    if (!zone?.closest('#page')) return;
    zone.style.background = 'transparent';
  });

  document.addEventListener('drop', e => {
    const zone = e.target.closest('.drop-zone');
    if (!zone?.closest('#page') || isAssignmentLocked(zone.dataset.id) || isUploadWindowClosed()) return;
    e.preventDefault();
    zone.style.background = 'transparent';
    const file = e.dataTransfer?.files?.[0];
    const ev = assignments.find(a => String(a.id_asignacion) === String(zone.dataset.id));
    if (file && validateFile(file, ev)) {
      pendingFiles.set(String(zone.dataset.id), file);
      render();
    }
  });
}

function openProrrogaModal() {
  let selectedDays = 5;
  openModal({
    title: 'Solicitar prórroga',
    width: 520,
    html: `
      <p style="font-size:13px;color:var(--c-gris6);margin-bottom:14px;">
        No completó la entrega antes del <strong>${fmtDate(uploadWindow?.fecha_limite || activePeriod.fecha_limite)}</strong>.
        Elija el tiempo adicional en <strong>días hábiles</strong> (sin contar fines de semana ni festivos) y justifique su solicitud.
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        ${[5, 15, 20].map(d => `
          <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:2px solid var(--c-gris2);border-radius:8px;cursor:pointer;" class="prorroga-opt" data-days="${d}">
            <input type="radio" name="prorroga-dias" value="${d}" ${d === 5 ? 'checked' : ''}>
            <span style="font-size:14px;font-weight:700;">${d} días hábiles</span>
          </label>`).join('')}
      </div>
      <label class="label">Justificación</label>
      <textarea class="input" id="prorroga-just" rows="4" maxlength="2000" placeholder="Explique por qué necesita la prórroga (mínimo 15 caracteres)"></textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
        <button type="button" class="btn btn-sec" data-cancel>Cancelar</button>
        <button type="button" class="btn" id="prorroga-submit">${icon('send',{size:12,color:'#fff'})}Enviar solicitud</button>
      </div>`,
    onOpen: (modal, close) => {
      modal.querySelector('[data-cancel]').addEventListener('click', close);
      modal.querySelectorAll('.prorroga-opt').forEach(opt => {
        opt.addEventListener('click', () => {
          selectedDays = Number(opt.dataset.days);
          opt.querySelector('input')?.click();
        });
      });
      modal.querySelectorAll('input[name="prorroga-dias"]').forEach(r => {
        r.addEventListener('change', () => { selectedDays = Number(r.value); });
      });
      modal.querySelector('#prorroga-submit').addEventListener('click', async () => {
        const just = modal.querySelector('#prorroga-just')?.value?.trim() || '';
        if (just.length < 15) {
          showToast('warning', 'Justificación', 'Escriba al menos 15 caracteres.');
          return;
        }
        const btn = modal.querySelector('#prorroga-submit');
        btn.disabled = true;
        try {
          await api.post(`/periods/${activePeriod.id_periodo}/prorroga`, {
            dias: selectedDays,
            justificacion: just,
          });
          showToast('success', 'Enviada', 'Su solicitud fue enviada al administrativo de centro.');
          close();
          load();
        } catch {
          btn.disabled = false;
        }
      });
    },
  });
}

async function handleUpload(asignacionId, file) {
  if (isUploadWindowClosed()) {
    showToast('warning', 'Plazo cerrado', uploadWindow?.mensaje || 'El plazo de entrega venció.');
    return;
  }
  if (isAssignmentLocked(asignacionId)) {
    showToast('warning', 'Bloqueada', 'Esta evidencia ya fue aprobada y no puede modificarse.');
    return;
  }
  const fd = new FormData();
  fd.append('id_asignacion', asignacionId);
  fd.append('archivo', file);
  try {
    await api.upload('/uploads/evidence', fd);
    pendingFiles.delete(String(asignacionId));
    showToast('success', 'Cargado', 'Archivo enviado, pendiente de revisión.');
    await load();
  } catch {}
}

function confirmMergeGf() {
  if (unifiedPdf?.id_pdf) {
    showToast('info', 'PDF ya enviado', 'El PDF GF de este periodo ya fue generado.');
    return;
  }
  const gfItems = assignments.filter(a => resolveModuleMeta(a).codigo === 'GF' && a.ultimo_estado === 'Aprobada');
  openModal({
    title: 'Generar PDF Unificado GF',
    html: `
      <p style="font-size:13px;font-weight:600;color:var(--c-verde);margin-bottom:10px;">Evidencias GF que se incluirán:</p>
      <div style="max-height:300px;overflow-y:auto;">
        ${gfItems.map((e, i) => `
          <div style="display:flex;gap:9px;padding:7px 10px;background:${i % 2 === 0 ? 'var(--c-gris0)' : '#fff'};border-radius:6px;font-size:12px;align-items:center;">
            ${icon('checkCircle',{size:12,color:'#39A900',strokeWidth:2.5})}
            <span style="font-weight:500;">${escapeHtml(e.nombre)}</span>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">
        <button class="btn btn-sec" data-close-modal>Cancelar</button>
        <button class="btn" id="do-merge-gf">${icon('send',{size:12,color:'#fff'})}Enviar al administrativo</button>
      </div>`,
    onOpen: (modal, close) => {
      modal.querySelector('[data-close-modal]').addEventListener('click', close);
      modal.querySelector('#do-merge-gf').addEventListener('click', async () => {
        try {
          const r = await api.post('/pdf/merge', { id_periodo: activePeriod.id_periodo });
          showToast('success', 'Listo', `PDF GF unificado (${r.data.paginas} páginas) enviado al administrativo.`);
          close(); load();
        } catch {}
      });
    },
  });
}

function confirmPackGc() {
  if (zipGc?.id_pdf) {
    showToast('info', 'ZIP ya generado', 'El paquete GC de este periodo ya fue creado.');
    return;
  }
  const gcItems = assignments.filter(a => resolveModuleMeta(a).codigo === 'GC' && a.ultimo_estado === 'Aprobada');
  openModal({
    title: 'Generar paquete ZIP GC',
    html: `
      <p style="font-size:13px;font-weight:600;color:var(--c-azul);margin-bottom:10px;">Archivos GC que se incluirán en el ZIP:</p>
      <div style="max-height:300px;overflow-y:auto;">
        ${gcItems.map((e, i) => `
          <div style="display:flex;gap:9px;padding:7px 10px;background:${i % 2 === 0 ? 'var(--c-gris0)' : '#fff'};border-radius:6px;font-size:12px;align-items:center;">
            ${icon('checkCircle',{size:12,color:'#00304D',strokeWidth:2.5})}
            <span style="font-weight:500;">${escapeHtml(e.nombre)}</span>
          </div>`).join('')}
      </div>
      <p style="font-size:12px;color:var(--c-gris5);margin-top:12px;">No requiere firma digital. El ZIP quedará disponible para usted y el administrativo.</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">
        <button class="btn btn-sec" data-close-modal>Cancelar</button>
        <button class="btn" id="do-pack-gc">${icon('download',{size:12,color:'#fff'})}Generar ZIP</button>
      </div>`,
    onOpen: (modal, close) => {
      modal.querySelector('[data-close-modal]').addEventListener('click', close);
      modal.querySelector('#do-pack-gc').addEventListener('click', async () => {
        try {
          const r = await api.post('/zip/pack-gc', { id_periodo: activePeriod.id_periodo });
          showToast('success', 'Listo', `Paquete ZIP GC creado (${r.data.archivos} archivos).`);
          close(); load();
        } catch {}
      });
    },
  });
}
