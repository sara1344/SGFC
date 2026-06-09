/**
 * Firma del contratista sobre una evidencia ya subida (PDF o imagen).
 */
import { api, API_BASE } from './api.js';
import { openModal, showToast, icon } from './components.js';
import { readFileAsDataUrl } from './utils.js';
import { getUser, setUser } from './auth.js';

let pdfJsPromise = null;

function ensureStyles() {
  const id = 'ev-sig-styles-v2';
  document.getElementById('ev-sig-styles')?.remove();
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = `
    .ev-sig-stage {
      position: relative; margin: 0 auto; background: var(--c-gris1);
      border: 1px solid var(--c-gris2); border-radius: 8px; overflow: auto;
      max-height: 420px; display: flex; justify-content: center; align-items: flex-start;
    }
    .ev-sig-doc-wrap { position: relative; display: inline-block; line-height: 0; }
    .ev-sig-doc-wrap canvas { display: block; pointer-events: none; user-select: none; }
    .ev-sig-box {
      position: absolute; z-index: 20; border: 2px dashed var(--c-azul);
      background: rgba(255,255,255,.88); box-shadow: 0 2px 10px rgba(0,48,77,.15);
      cursor: grab; touch-action: none; box-sizing: border-box;
      min-width: 80px; min-height: 36px;
    }
    .ev-sig-box.is-dragging { cursor: grabbing; }
    .ev-sig-box img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; display: block; }
    .ev-sig-box-placeholder {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700; color: var(--c-azul); text-align: center; padding: 4px;
      pointer-events: none;
    }
    .ev-sig-resize {
      position: absolute; right: -6px; bottom: -6px; width: 16px; height: 16px; z-index: 21;
      background: var(--c-azul); border: 2px solid #fff; border-radius: 3px; cursor: nwse-resize;
    }
    .ev-sig-toolbar {
      display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 12px;
      font-size: 12px; color: var(--c-gris6);
    }
    .ev-sig-scale-wrap { display: flex; align-items: center; gap: 8px; margin-left: auto; }
    .ev-sig-scale-wrap input[type=range] { width: 120px; accent-color: var(--c-azul); }
    .ev-sig-upload-block { margin-bottom: 14px; }
    .ev-sig-hint { font-size: 11px; color: var(--c-gris5); margin-top: 6px; }
  `;
  document.head.appendChild(el);
}

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfJsPromise) {
    pdfJsPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      s.onerror = () => reject(new Error('No se pudo cargar PDF.js'));
      document.head.appendChild(s);
    });
  }
  return pdfJsPromise;
}

/**
 * @param {number} uploadId
 * @param {{ onDone?: () => void }} opts
 */
export async function openEvidenceSignatureModal(uploadId, opts = {}) {
  ensureStyles();
  let meta;
  try {
    const r = await api.get(`/uploads/evidence/${uploadId}/signature-meta`);
    meta = r.data;
  } catch {
    return;
  }

  const user = getUser();
  let imagenB64 = '';
  let hasSignature = !!meta.tiene_firma_usuario || !!user?.tiene_firma;

  openModal({
    title: 'Firmar documento',
    width: 720,
    html: `
      <p style="font-size:13px;color:var(--c-gris6);margin-bottom:14px;">
        Coloque su firma sobre <strong>${meta.nombre_evidencia || 'la evidencia'}</strong>.
        Arrastre el <strong>recuadro de su firma</strong> (borde azul) sobre el documento. Puede desplazarse el documento con la rueda del mouse si es largo.
      </p>
      ${meta.kind === 'pdf' && meta.pdf_firmable === false ? `
      <div class="ev-sig-pdf-warn" style="margin-bottom:14px;padding:12px 14px;border-radius:8px;background:#fff4e5;border:1px solid #f5c26b;color:#7a4b00;font-size:13px;line-height:1.45;">
        <strong>No se puede firmar este PDF en el servidor.</strong><br>
        ${meta.pdf_firma_aviso || 'Suba una copia sin contraseña o reexportada como PDF estándar.'}
      </div>` : ''}
      <div id="ev-sig-upload" class="ev-sig-upload-block" style="display:${hasSignature ? 'none' : 'block'};">
        <label class="label">Imagen de su firma (PNG o JPG)</label>
        <input type="file" class="input" id="ev-sig-file" accept="image/png,image/jpeg,image/jpg">
        <p class="ev-sig-hint">Solo la primera vez. Luego se reutilizará en otras evidencias.</p>
        <div id="ev-sig-file-preview" style="display:none;margin-top:10px;text-align:center;">
          <img id="ev-sig-file-img" alt="Vista previa" style="max-height:70px;border:1px solid var(--c-gris2);border-radius:8px;padding:6px;background:#fff;">
        </div>
      </div>
      <div id="ev-sig-place" style="display:${hasSignature ? 'block' : 'none'};">
        <div class="ev-sig-stage" id="ev-sig-stage">
          <div class="ev-sig-doc-wrap" id="ev-sig-doc-wrap">
            <canvas id="ev-sig-canvas"></canvas>
            <div class="ev-sig-box" id="ev-sig-box" style="left:52%;top:58%;width:32%;height:14%;">
              <img id="ev-sig-box-img" alt="Firma" src="">
              <span class="ev-sig-box-placeholder" id="ev-sig-box-ph">Arrastre su firma aquí</span>
              <span class="ev-sig-resize" id="ev-sig-resize"></span>
            </div>
          </div>
        </div>
        <div class="ev-sig-toolbar">
          <button type="button" class="btn btn-ghost btn-sm" id="ev-sig-prev" disabled>‹</button>
          <span id="ev-sig-page-lbl">Página 1</span>
          <button type="button" class="btn btn-ghost btn-sm" id="ev-sig-next" disabled>›</button>
          <div class="ev-sig-scale-wrap">
            <span>Tamaño</span>
            <input type="range" id="ev-sig-scale" min="40" max="220" value="100">
          </div>
        </div>
        <p class="ev-sig-hint">Arrastre la firma al lugar deseado. Use la esquina o el control de tamaño.</p>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
        <button type="button" class="btn btn-sec" data-cancel>Cancelar</button>
        <button type="button" class="btn" id="ev-sig-submit" disabled>
          ${icon('penLine', { size: 12, color: '#fff' })}Aplicar firma al documento
        </button>
      </div>`,
    onOpen: async (modal, close) => {
      modal.querySelector('[data-cancel]').addEventListener('click', close);

      const uploadBlock = modal.querySelector('#ev-sig-upload');
      const placeBlock = modal.querySelector('#ev-sig-place');
      const submitBtn = modal.querySelector('#ev-sig-submit');
      const fileInput = modal.querySelector('#ev-sig-file');
      const filePreview = modal.querySelector('#ev-sig-file-preview');
      const filePreviewImg = modal.querySelector('#ev-sig-file-img');
      const docWrap = modal.querySelector('#ev-sig-doc-wrap');
      const canvas = modal.querySelector('#ev-sig-canvas');
      const box = modal.querySelector('#ev-sig-box');
      const boxImg = modal.querySelector('#ev-sig-box-img');
      const boxPh = modal.querySelector('#ev-sig-box-ph');
      const scaleInput = modal.querySelector('#ev-sig-scale');
      const prevBtn = modal.querySelector('#ev-sig-prev');
      const nextBtn = modal.querySelector('#ev-sig-next');
      const pageLbl = modal.querySelector('#ev-sig-page-lbl');

      let currentPage = 1;
      let pageCount = meta.page_count || 1;
      let pdfDoc = null;
      let baseBoxW = 28;
      let baseBoxH = 12;

      const pdfFirmable = meta.kind !== 'pdf' || meta.pdf_firmable !== false;

      function updateSubmitState() {
        submitBtn.disabled = !pdfFirmable || !hasSignature || placeBlock.style.display === 'none';
      }

      function refreshBoxPlaceholder() {
        const hasImg = !!(boxImg?.src && boxImg.naturalWidth > 0);
        if (boxPh) boxPh.style.display = hasImg ? 'none' : 'flex';
      }

      async function loadSignaturePreview() {
        if (imagenB64) {
          boxImg.src = imagenB64;
          await new Promise((res) => { boxImg.onload = res; boxImg.onerror = res; });
          refreshBoxPlaceholder();
          return true;
        }
        if (meta.tiene_firma_usuario || user?.tiene_firma) {
          const stored = await fetchUserSignatureB64();
          if (stored) {
            boxImg.src = stored;
            await new Promise((res) => { boxImg.onload = res; boxImg.onerror = res; });
            refreshBoxPlaceholder();
            return true;
          }
        }
        refreshBoxPlaceholder();
        return false;
      }

      async function fetchUserSignatureB64() {
        try {
          const r = await api.get('/auth/signature', { silent: true });
          return r.data?.imagen_b64 || '';
        } catch {
          return '';
        }
      }

      function restorePlacementFromMeta() {
        if (meta.firma_x_pct != null) {
          box.style.left = `${meta.firma_x_pct}%`;
          box.style.top = `${meta.firma_y_pct}%`;
          box.style.width = `${meta.firma_w_pct}%`;
          box.style.height = `${meta.firma_h_pct}%`;
          baseBoxW = parseFloat(meta.firma_w_pct) || 28;
          baseBoxH = parseFloat(meta.firma_h_pct) || 12;
        }
        if (meta.firma_pagina) currentPage = Math.max(1, parseInt(meta.firma_pagina, 10));
      }

      async function renderPdfPage(pageNum) {
        const ctx = canvas.getContext('2d');
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.2 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        pageLbl.textContent = `Página ${pageNum} de ${pageCount}`;
        prevBtn.disabled = pageNum <= 1;
        nextBtn.disabled = pageNum >= pageCount;
      }

      async function renderImageDoc() {
        const res = await fetch(`${API_BASE}/uploads/evidence/${uploadId}/view`, { credentials: 'include' });
        if (!res.ok) throw new Error('No se pudo cargar el documento');
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = () => res();
          img.onerror = rej;
          img.src = objUrl;
        });
        const maxW = 640;
        const scale = img.width > maxW ? maxW / img.width : 1;
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(objUrl);
        pageLbl.textContent = 'Imagen';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
      }

      let dragBound = false;

      async function initPlacement() {
        placeBlock.style.display = 'block';
        const sigOk = await loadSignaturePreview();
        if (!sigOk && !imagenB64) {
          hasSignature = false;
          uploadBlock.style.display = 'block';
          showToast('info', 'Firma requerida', 'Adjunte su imagen de firma para continuar.');
          updateSubmitState();
          return;
        }
        hasSignature = true;
        restorePlacementFromMeta();

        if (meta.kind === 'pdf') {
          const pdfjs = await loadPdfJs();
          const res = await fetch(`${API_BASE}/uploads/evidence/${uploadId}/view`, { credentials: 'include' });
          pdfDoc = await pdfjs.getDocument({ data: await res.arrayBuffer() }).promise;
          pageCount = pdfDoc.numPages;
          currentPage = Math.min(currentPage, pageCount);
          await renderPdfPage(currentPage);
        } else {
          await renderImageDoc();
        }

        if (!dragBound) {
          bindDragResize();
          dragBound = true;
        }
        updateSubmitState();
        box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }

      function bindDragResize() {
        const resizeHandle = modal.querySelector('#ev-sig-resize');
        let mode = null;
        let activePointer = null;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;
        let startW = 0;
        let startH = 0;
        const pct = (val, total) => (total > 0 ? (val / total) * 100 : 0);

        function onPointerDown(e, kind) {
          if (kind === 'resize' && e.target !== resizeHandle) return;
          if (kind === 'drag' && e.target === resizeHandle) return;
          e.preventDefault();
          e.stopPropagation();
          mode = kind;
          activePointer = e.pointerId;
          box.setPointerCapture?.(e.pointerId);
          box.classList.add('is-dragging');
          startX = e.clientX;
          startY = e.clientY;
          const rect = box.getBoundingClientRect();
          const sRect = docWrap.getBoundingClientRect();
          startLeft = pct(rect.left - sRect.left, sRect.width);
          startTop = pct(rect.top - sRect.top, sRect.height);
          startW = pct(rect.width, sRect.width);
          startH = pct(rect.height, sRect.height);
        }

        function onPointerMove(e) {
          if (!mode || e.pointerId !== activePointer) return;
          e.preventDefault();
          const sRect = docWrap.getBoundingClientRect();
          const dx = pct(e.clientX - startX, sRect.width);
          const dy = pct(e.clientY - startY, sRect.height);
          if (mode === 'drag') {
            box.style.left = `${Math.max(0, Math.min(95 - startW, startLeft + dx))}%`;
            box.style.top = `${Math.max(0, Math.min(95 - startH, startTop + dy))}%`;
          } else {
            const nw = Math.max(8, Math.min(60, startW + dx));
            const nh = Math.max(5, Math.min(40, startH + dy));
            box.style.width = `${nw}%`;
            box.style.height = `${nh}%`;
            baseBoxW = nw;
            baseBoxH = nh;
            scaleInput.value = '100';
          }
        }

        function onPointerUp(e) {
          if (e.pointerId !== activePointer) return;
          mode = null;
          activePointer = null;
          box.classList.remove('is-dragging');
          try { box.releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
        }

        box.addEventListener('pointerdown', e => onPointerDown(e, 'drag'));
        resizeHandle.addEventListener('pointerdown', e => onPointerDown(e, 'resize'));
        box.addEventListener('pointermove', onPointerMove);
        box.addEventListener('pointerup', onPointerUp);
        box.addEventListener('pointercancel', onPointerUp);
        resizeHandle.addEventListener('pointermove', onPointerMove);
        resizeHandle.addEventListener('pointerup', onPointerUp);
        resizeHandle.addEventListener('pointercancel', onPointerUp);
        scaleInput.addEventListener('input', () => {
          const factor = parseInt(scaleInput.value, 10) / 100;
          box.style.width = `${Math.min(60, baseBoxW * factor)}%`;
          box.style.height = `${Math.min(40, baseBoxH * factor)}%`;
        });
      }

      if (!hasSignature && fileInput) {
        fileInput.addEventListener('change', async () => {
          const file = fileInput.files?.[0];
          imagenB64 = '';
          hasSignature = false;
          if (!file) {
            filePreview.style.display = 'none';
            placeBlock.style.display = 'none';
            updateSubmitState();
            return;
          }
          if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) {
            showToast('error', 'Archivo inválido', 'Use PNG o JPG.');
            fileInput.value = '';
            return;
          }
          if (file.size > 2 * 1024 * 1024) {
            showToast('error', 'Archivo grande', 'La firma no puede superar 2 MB.');
            fileInput.value = '';
            return;
          }
          try {
            imagenB64 = await readFileAsDataUrl(file);
            filePreviewImg.src = imagenB64;
            filePreview.style.display = 'block';
            hasSignature = true;
            uploadBlock.style.display = 'none';
            dragBound = false;
            await initPlacement();
          } catch {
            showToast('error', 'Error', 'No se pudo leer la imagen.');
          }
        });
      } else {
        await initPlacement();
      }

      prevBtn.addEventListener('click', async () => {
        if (currentPage > 1) {
          currentPage--;
          await renderPdfPage(currentPage);
        }
      });
      nextBtn.addEventListener('click', async () => {
        if (currentPage < pageCount) {
          currentPage++;
          await renderPdfPage(currentPage);
        }
      });

      submitBtn.addEventListener('click', async () => {
        const wrapRect = docWrap.getBoundingClientRect();
        const boxRect = box.getBoundingClientRect();
        const body = {
          pagina: currentPage,
          x_pct: Math.round(((boxRect.left - wrapRect.left) / wrapRect.width) * 10000) / 100,
          y_pct: Math.round(((boxRect.top - wrapRect.top) / wrapRect.height) * 10000) / 100,
          w_pct: Math.round((boxRect.width / wrapRect.width) * 10000) / 100,
          h_pct: Math.round((boxRect.height / wrapRect.height) * 10000) / 100,
        };
        const sigForSubmit = imagenB64 || boxImg?.src || '';
        if (sigForSubmit && sigForSubmit.startsWith('data:image')) body.imagen_b64 = sigForSubmit;

        submitBtn.disabled = true;
        try {
          await api.post(`/uploads/evidence/${uploadId}/sign`, body);
          if (imagenB64 && user) setUser({ ...user, tiene_firma: true });
          showToast('success', 'Firmado', 'La firma quedó aplicada en el documento.');
          close();
          opts.onDone?.();
        } catch {
          submitBtn.disabled = false;
        }
      });
    },
  });
}
