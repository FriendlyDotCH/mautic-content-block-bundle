import { SVG_ICONS, FLAG_EMOJIS, emojiToTwemojiUrl, type SvgIconKey } from './common/icons';
import './types/mautic.d';

// ── Icon rendering ────────────────────────────────────────────────────────────

function renderIconCell(span: HTMLElement, icon: string | null | undefined): void {
  span.innerHTML = '';
  if (!icon) return;

  if (SVG_ICONS[icon as SvgIconKey]) {
    span.innerHTML = SVG_ICONS[icon as SvgIconKey];
    const svg = span.querySelector('svg');
    if (svg) svg.style.cssText = 'width:18px;height:18px;vertical-align:middle;color:#666;';
  } else {
    const img = document.createElement('img');
    img.src = emojiToTwemojiUrl(icon);
    img.style.cssText = 'width:20px;height:20px;vertical-align:middle;';
    img.onerror = () => { span.textContent = icon; };
    span.appendChild(img);
  }
}

function renderIconPreview(spanId: string, icon: string): void {
  const span = document.getElementById(spanId);
  if (!span) return;
  span.innerHTML = '';
  if (!icon) return;

  if (SVG_ICONS[icon as SvgIconKey]) {
    span.innerHTML = SVG_ICONS[icon as SvgIconKey];
    const svg = span.querySelector('svg');
    if (svg) svg.style.cssText = 'width:28px;height:28px;color:#555;';
  } else {
    const img = document.createElement('img');
    img.src = emojiToTwemojiUrl(icon);
    img.style.cssText = 'width:28px;height:28px;vertical-align:middle;';
    img.onerror = () => { span.textContent = icon; };
    span.appendChild(img);
  }
}

// ── Icon grid builder ─────────────────────────────────────────────────────────
// `selected` is kept in closure instead of as a property on the DOM element.

function buildIconGrid(
  gridEl:   HTMLElement,
  previewId: string,
  labelId:   string,
  hiddenEl:  HTMLInputElement | null,
  initial:   string,
): void {
  let selected = initial;

  gridEl.innerHTML = '';

  const secStyle =
    'font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin:8px 0 4px;';

  const secLayout = document.createElement('div');
  secLayout.style.cssText = secStyle;
  secLayout.textContent = 'Layout';
  gridEl.appendChild(secLayout);

  const rowLayout = document.createElement('div');
  rowLayout.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;';
  (Object.keys(SVG_ICONS) as SvgIconKey[]).forEach(id => {
    const isActive = id === selected;
    const span = document.createElement('span');
    span.className = 'cb-icon-opt' + (isActive ? ' selected' : '');
    span.dataset['icon'] = id;
    span.style.cssText =
      'cursor:pointer;display:inline-flex;align-items:center;justify-content:center;' +
      'width:36px;height:36px;border-radius:5px;color:#555;flex-shrink:0;border:1px solid #ddd;' +
      (isActive ? 'background:#d0e8d0;' : '');
    span.innerHTML = SVG_ICONS[id];
    span.querySelector('svg')!.style.cssText = 'width:26px;height:26px;pointer-events:none;';
    rowLayout.appendChild(span);
  });
  gridEl.appendChild(rowLayout);

  const secLang = document.createElement('div');
  secLang.style.cssText = secStyle;
  secLang.textContent = 'Language';
  gridEl.appendChild(secLang);

  const rowLang = document.createElement('div');
  rowLang.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
  FLAG_EMOJIS.forEach(e => {
    const isActive = e === selected;
    const span = document.createElement('span');
    span.className = 'cb-icon-opt' + (isActive ? ' selected' : '');
    span.dataset['icon'] = e;
    span.style.cssText =
      'cursor:pointer;display:inline-flex;align-items:center;justify-content:center;' +
      'width:36px;height:36px;border-radius:5px;flex-shrink:0;border:1px solid #ddd;' +
      (isActive ? 'background:#d0e8d0;' : '');
    const img = document.createElement('img');
    img.src = emojiToTwemojiUrl(e);
    img.style.cssText = 'width:24px;height:24px;pointer-events:none;';
    img.onerror = () => { span.textContent = e; };
    span.appendChild(img);
    rowLang.appendChild(span);
  });
  gridEl.appendChild(rowLang);

  const lbl = document.getElementById(labelId);
  const updateLabel = () => {
    if (lbl) lbl.textContent = selected
      ? 'Selected (click again to clear)'
      : 'None selected — click an icon below';
  };

  renderIconPreview(previewId, selected);
  updateLabel();

  gridEl.addEventListener('click', ev => {
    const opt = (ev.target as Element).closest('.cb-icon-opt') as HTMLElement | null;
    if (!opt) return;

    const icon = opt.dataset['icon'] ?? '';
    const same = selected === icon;

    gridEl.querySelectorAll<HTMLElement>('.cb-icon-opt.selected').forEach(o => {
      o.classList.remove('selected');
      o.style.background = '';
    });

    selected = same ? '' : icon;
    if (!same) { opt.classList.add('selected'); opt.style.background = '#d0e8d0'; }
    if (hiddenEl) hiddenEl.value = selected;

    renderIconPreview(previewId, selected);
    updateLabel();
  });
}

// ── Mautic entry points ───────────────────────────────────────────────────────

// Render the list icon cells inside the given root (defaults to document).
// Idempotent: each cell is rendered once and flagged so observer churn is cheap.
function renderListIcons(container?: string | Element | null): void {
  const root: ParentNode =
    typeof container === 'string' ? document.querySelector(container) ?? document
    : container ?? document;
  root.querySelectorAll<HTMLElement>('.cb-icon-cell:not([data-cb-done])').forEach(span => {
    span.dataset['cbDone'] = '1';
    renderIconCell(span, span.dataset['emoji'] ?? null);
  });
}

// Build the icon picker on the edit form when present (once per grid instance).
function renderEditGrid(): void {
  const grid      = document.getElementById('cb-form-emoji-grid');
  const iconInput = document.querySelector<HTMLInputElement>('[name="content_block[icon]"]');
  if (!grid || !iconInput || grid.dataset['cbBuilt'] === '1') return;

  grid.dataset['cbBuilt'] = '1';
  buildIconGrid(grid, 'cb-form-icon-preview', 'cb-form-icon-label', iconInput, iconInput.value);
}

function renderAll(): void {
  renderListIcons();
  renderEditGrid();
}

function init(): void {
  if (!document.getElementById('cb-styles')) {
    const s = document.createElement('style');
    s.id = 'cb-styles';
    s.textContent =
      '.cb-name-text{color:#4e5d6c;font-weight:500;}' +
      '.cb-name-text:hover{color:#00b19d;text-decoration:underline;}';
    document.head.appendChild(s);
  }

  if (window.Mautic) {
    window.Mautic.contentBlockOnLoad     = (container) => renderListIcons(container);
    window.Mautic.contentBlockEditOnLoad = () => renderEditGrid();
  }

  // Mautic injects list/edit markup into #app-content via AJAX — often after this
  // bodyClose script has already run, and without reliably calling the *OnLoad hooks
  // above (notably on hard loads). A MutationObserver guarantees the flags/icon
  // picker render whenever their markup appears, in every navigation path.
  renderAll();

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; renderAll(); });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
