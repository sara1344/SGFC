/**
 * Formatos de archivo para evidencias master (tipo_archivo).
 */

export const EVIDENCE_FORMATS = {
  pdf:    { label: 'PDF',    hint: 'Documento PDF (.pdf)' },
  excel:  { label: 'Excel',  hint: 'Hoja de cálculo (.xls, .xlsx)' },
  word:   { label: 'Word',   hint: 'Documento Word (.doc, .docx)' },
  imagen: { label: 'Imagen', hint: 'PNG, JPG, WEBP o GIF' },
};

export const FORMAT_ACCEPT = {
  pdf:    'application/pdf,.pdf',
  excel:  '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  word:   '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  imagen: '.png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif',
};

const FORMAT_EXTENSIONS = {
  pdf:    ['pdf'],
  excel:  ['xls', 'xlsx'],
  word:   ['doc', 'docx'],
  imagen: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
};

const MIME_ALIASES = {
  'application/pdf': 'pdf',
  'application/vnd.ms-excel': 'excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'application/msword': 'word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
  'image/png': 'imagen',
  'image/jpeg': 'imagen',
  'image/jpg': 'imagen',
  'image/webp': 'imagen',
  'image/gif': 'imagen',
};

export function normalizeFormat(value) {
  const v = String(value || 'pdf').toLowerCase().trim();
  if (MIME_ALIASES[v]) return MIME_ALIASES[v];
  return EVIDENCE_FORMATS[v] ? v : 'pdf';
}

export function formatLabel(value) {
  return EVIDENCE_FORMATS[normalizeFormat(value)]?.label || 'PDF';
}

export function formatHint(value) {
  return EVIDENCE_FORMATS[normalizeFormat(value)]?.hint || EVIDENCE_FORMATS.pdf.hint;
}

export function normalizeModuleCode(codigo) {
  const c = String(codigo ?? '').trim().toUpperCase();
  if (c === 'GC' || c.includes('CONTRACTUAL')) return 'GC';
  return 'GF';
}

/** Gestión Financiera (GF) → solo PDF. Gestión Contractual (GC) → todos. */
export function isFinancialModule(codigo) {
  return normalizeModuleCode(codigo) === 'GF';
}

/** @param {string} moduloCodigo GF | GC o nombre del módulo */
export function allowedFormatsForModule(moduloCodigo) {
  return isFinancialModule(moduloCodigo)
    ? ['pdf']
    : ['pdf', 'excel', 'word', 'imagen'];
}

export function acceptForFormat(format) {
  return FORMAT_ACCEPT[normalizeFormat(format)] || FORMAT_ACCEPT.pdf;
}

export function validateFileForFormat(file, format, maxMb = 10) {
  if (!file) return { ok: false, message: 'No se seleccionó ningún archivo.' };
  const fmt = normalizeFormat(format);
  const name = file.name.toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() : '';
  const allowed = FORMAT_EXTENSIONS[fmt] || ['pdf'];

  if (!allowed.includes(ext)) {
    return {
      ok: false,
      message: `Formato incorrecto. Se espera un archivo ${formatLabel(fmt)}.`,
    };
  }

  if (file.size > maxMb * 1024 * 1024) {
    return { ok: false, message: `Tamaño máximo: ${maxMb} MB.` };
  }

  return { ok: true };
}
