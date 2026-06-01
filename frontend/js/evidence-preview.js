/**
 * Vista previa de evidencias (PDF, imagen, Excel, Word).
 */
import { normalizeFormat } from './evidence-formats.js';

/** @returns {'pdf'|'image'|'excel'|'word'|'other'} */
export function detectEvidenceFileKind(ev) {
  const mime = String(ev?.mime_type || '').toLowerCase();
  const name = String(ev?.nombre_original || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() : '';
  const format = normalizeFormat(ev?.tipo_archivo);

  if (format === 'pdf' || mime.includes('pdf') || ext === 'pdf') return 'pdf';
  if (format === 'imagen' || mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  if (format === 'excel' || mime.includes('spreadsheet') || mime.includes('excel') || ['xls', 'xlsx'].includes(ext)) return 'excel';
  if (format === 'word' || mime.includes('word') || mime.includes('wordprocessing') || ['doc', 'docx'].includes(ext)) return 'word';
  return 'other';
}

/**
 * @param {number|string} id
 * @param {'pdf'|'image'|'excel'|'word'|'other'} kind
 * @param {string} apiBase
 */
export function buildEvidencePreviewMarkup(id, kind, apiBase) {
  const fileUrl = `${apiBase}/uploads/evidence/${id}/view`;
  const previewUrl = `${apiBase}/uploads/evidence/${id}/preview`;

  if (kind === 'pdf') {
    return `<iframe class="ev-preview-frame" src="${fileUrl}" title="Vista previa PDF"></iframe>`;
  }
  if (kind === 'image') {
    return `<div class="ev-preview-image-wrap" data-preview-image="${fileUrl}"><div class="ev-preview-loading">Cargando imagen…</div></div>`;
  }
  if (kind === 'excel' || kind === 'word') {
    return `<iframe class="ev-preview-frame" src="${previewUrl}" title="Vista previa ${kind === 'excel' ? 'Excel' : 'Word'}"></iframe>`;
  }
  return `<div class="ev-preview-fallback">
    <div class="ev-preview-fallback-title">Vista previa no disponible</div>
    <div class="ev-preview-fallback-msg">Descargue el archivo para revisarlo.</div>
  </div>`;
}

/** Monta imagen con sesión (fetch + blob URL). */
export async function mountEvidencePreview(root) {
  if (!root) return;
  const wrap = root.querySelector('[data-preview-image]');
  if (!wrap || wrap.dataset.mounted === '1') return;

  const url = wrap.dataset.previewImage;
  wrap.dataset.mounted = '1';

  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    wrap.innerHTML = `<img src="${objUrl}" alt="Vista previa" class="ev-preview-image">`;
  } catch {
    wrap.innerHTML = `<div class="ev-preview-fallback"><div class="ev-preview-fallback-title">No se pudo cargar la imagen</div></div>`;
  }
}

export function previewLabel(kind) {
  return ({ pdf: 'PDF', image: 'Imagen', excel: 'Excel', word: 'Word', other: 'Archivo' })[kind] || 'Archivo';
}
