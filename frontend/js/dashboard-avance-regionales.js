/**
 * Widget: avance de entrega de evidencias por regional / centro.
 */
import { api } from './api.js';
import { escapeHtml } from './utils.js';
import { icon, renderProgress } from './components.js';

const PAGE_SIZE = 8;

function progressColor(pct) {
  if (pct >= 80) return 'var(--c-verde)';
  if (pct >= 50) return 'var(--c-amarillo)';
  return 'var(--c-naranja)';
}

function renderAvanceRow({ id, title, subtitle, porcentaje, entregadas, total, aprobadas, expandable, expanded }) {
  const color = progressColor(porcentaje);
  return `
    <div class="avance-row ${expandable ? 'avance-row--clickable' : ''}" ${expandable ? `data-avance-toggle="${id}"` : ''} role="${expandable ? 'button' : 'presentation'}" tabindex="${expandable ? '0' : '-1'}" aria-expanded="${expanded ? 'true' : 'false'}">
      <div class="avance-row-main">
        <div class="avance-row-title">
          ${expandable ? `<span class="avance-chevron">${icon('chevronDown', { size: 14, color: 'var(--c-gris4)' })}</span>` : ''}
          <div>
            <div class="avance-name">${escapeHtml(title)}</div>
            ${subtitle ? `<div class="avance-sub">${escapeHtml(subtitle)}</div>` : ''}
          </div>
        </div>
        <div class="avance-row-meta">
          <span class="avance-stat">${entregadas}/${total} entregadas · ${aprobadas} aprobadas</span>
          <div class="avance-progress-wrap">${renderProgress(porcentaje, color)}</div>
        </div>
      </div>
    </div>`;
}

function renderRegionalBlock(r) {
  return `
    <div class="avance-regional-block" data-regional="${r.id_regional}">
      ${renderAvanceRow({
        id: r.id_regional,
        title: r.nombre,
        subtitle: `${r.centros_count} centro${r.centros_count === 1 ? '' : 's'}`,
        porcentaje: r.porcentaje,
        entregadas: r.entregadas,
        total: r.total,
        aprobadas: r.aprobadas,
        expandable: true,
        expanded: false,
      })}
      <div class="avance-centros-panel hidden" id="avance-centros-${r.id_regional}">
        ${r.centros.map(c => renderAvanceRow({
          id: `c-${c.id_centro}`,
          title: c.nombre,
          subtitle: `${c.porcentaje_aprobacion}% aprobación`,
          porcentaje: c.porcentaje,
          entregadas: c.entregadas,
          total: c.total,
          aprobadas: c.aprobadas,
          expandable: false,
          expanded: false,
        })).join('')}
      </div>
    </div>`;
}

function renderRegionalBlocks(regionales, page) {
  const start = (page - 1) * PAGE_SIZE;
  return regionales.slice(start, start + PAGE_SIZE).map(renderRegionalBlock).join('');
}

function bindAvanceToggles(scope) {
  scope.querySelectorAll('[data-avance-toggle]').forEach(btn => {
    if (btn.dataset.avanceBound) return;
    btn.dataset.avanceBound = '1';
    const toggle = () => {
      const id = btn.dataset.avanceToggle;
      const block = btn.closest('.avance-regional-block');
      const panel = scope.querySelector(`#avance-centros-${id}`);
      if (!panel || !block) return;
      const open = panel.classList.toggle('hidden') === false;
      block.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

function updatePager(widget, page, totalPages) {
  const prev = widget.querySelector('[data-avance-page="prev"]');
  const next = widget.querySelector('[data-avance-page="next"]');
  const label = widget.querySelector('[data-avance-pager-label]');
  if (prev) prev.disabled = page <= 1;
  if (next) next.disabled = page >= totalPages;
  if (label) label.textContent = `${page} / ${totalPages}`;
  widget.dataset.currentPage = String(page);
}

export function renderAvanceRegionalesWidget(regionales = [], { inline = false } = {}) {
  const cardClass = `card avance-regionales-card${inline ? ' avance-regionales-card--inline' : ' mb-4'}`;

  if (!regionales.length) {
    return `
      <div class="${cardClass}">
        <h4 style="font-size:14px;font-weight:700;color:var(--c-azul);margin-bottom:8px;">Avance de entrega por regional</h4>
        <p style="font-size:13px;color:var(--c-gris5);">Sin evidencias asignadas en periodos abiertos con contratistas vinculados a un centro.</p>
      </div>`;
  }

  const totalPages = Math.ceil(regionales.length / PAGE_SIZE);
  const showPager = regionales.length > PAGE_SIZE;

  return `
    <div class="${cardClass}" data-avance-widget data-total-pages="${totalPages}" data-current-page="1">
      <div style="padding:14px 18px;border-bottom:1px solid var(--c-gris2);">
        <h4 style="font-size:14px;font-weight:700;color:var(--c-azul);">Avance de entrega de evidencias por regional</h4>
        <p style="font-size:11px;color:var(--c-gris5);margin-top:4px;">Clic en una regional para ver el detalle por centro · Periodos abiertos en contratos activos</p>
      </div>
      <div class="avance-regionales-list" id="avance-regionales-list">
        ${renderRegionalBlocks(regionales, 1)}
      </div>
      ${showPager ? `
        <div class="avance-regionales-pager">
          <button type="button" class="avance-pager-btn" data-avance-page="prev" disabled aria-label="Página anterior">&lt;</button>
          <span class="avance-pager-label" data-avance-pager-label>1 / ${totalPages}</span>
          <button type="button" class="avance-pager-btn" data-avance-page="next"${totalPages <= 1 ? ' disabled' : ''} aria-label="Página siguiente">&gt;</button>
        </div>
      ` : ''}
    </div>`;
}

export function bindAvanceRegionalesWidget(root = document, regionales = []) {
  root.querySelectorAll('[data-avance-widget]').forEach(widget => {
    bindAvanceToggles(widget);

    const totalPages = parseInt(widget.dataset.totalPages || '1', 10);
    if (totalPages <= 1 || !regionales.length) return;

    const list = widget.querySelector('#avance-regionales-list');
    if (!list || widget.dataset.avancePagerBound) return;
    widget.dataset.avancePagerBound = '1';

    let page = parseInt(widget.dataset.currentPage || '1', 10);

    const goToPage = (nextPage) => {
      page = Math.max(1, Math.min(totalPages, nextPage));
      list.innerHTML = renderRegionalBlocks(regionales, page);
      bindAvanceToggles(widget);
      updatePager(widget, page, totalPages);
    };

    widget.querySelector('[data-avance-page="prev"]')?.addEventListener('click', () => goToPage(page - 1));
    widget.querySelector('[data-avance-page="next"]')?.addEventListener('click', () => goToPage(page + 1));
  });
}

export async function fetchAvanceRegionales() {
  const r = await api.get('/dashboard/avance-regionales', { silent: true });
  return r.data || [];
}
