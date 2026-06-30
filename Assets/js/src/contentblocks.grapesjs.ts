import {
  SVG_ICONS,
  SVG_LABELS,
  FLAG_EMOJIS,
  emojiToTwemojiUrl,
  iconToMedia,
  type SvgIconKey,
} from './common/icons';
import type { ContentBlock } from './types/api';
import type { GrapesJSEditor, GrapesJSComponent } from './types/grapesjs.d';

// ── Mautic page globals ──────────────────────────────────────────────────────
declare const mauticBasePath: string;
declare const mauticAjaxCsrf: string | undefined;

const LIST_ENDPOINT    = `${mauticBasePath}/s/content-blocks/editor`;
const SAVE_ENDPOINT    = `${mauticBasePath}/s/content-blocks/editor`;
const DEFAULT_CATEGORY = 'General';
const COMMAND_SAVE     = 'contentblock:save';
const COMMAND_IMPORT   = 'contentblock:import';
const PLUGIN_NAME      = 'mautic-content-blocks';

// Loaded block data, keyed by id — powers the right-click edit/delete menu.
const blockCache    = new Map<number, ContentBlock>();
const registeredIds = new Set<string>();

// The currently-active editor (one builder open at a time); used by the
// document-level context-menu handler which is bound only once.
let currentEditor: GrapesJSEditor | null = null;
let menuBound = false;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

// ── Blocks panel ─────────────────────────────────────────────────────────────

function registerBlock(editor: GrapesJSEditor, block: ContentBlock): void {
  const blockId = `content-block-${block.id}`;
  editor.BlockManager.add(blockId, {
    label:      block.name,
    category:   block.category && block.category.trim() ? block.category : DEFAULT_CATEGORY,
    media:      iconToMedia(block.icon),
    content:    block.htmlContent,
    attributes: { 'data-cb-id': String(block.id), title: `${block.name} (right-click to edit)` },
  });
  registeredIds.add(blockId);
  blockCache.set(block.id, block);
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (e) {
    if (retries <= 0) throw e;
    await new Promise(r => setTimeout(r, 1500));
    return fetchWithRetry(url, options, retries - 1);
  }
}

async function loadAndRegister(editor: GrapesJSEditor): Promise<void> {
  try {
    const response = await fetchWithRetry(LIST_ENDPOINT, {
      headers:     { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
      credentials: 'same-origin',
    });

    if (!response.ok) return;

    const data = await response.json() as unknown;
    const blocks: ContentBlock[] = Array.isArray(data)
      ? (data as ContentBlock[])
      : ((data as Record<string, unknown>).blocks as ContentBlock[] | undefined) ?? [];

    blocks.forEach(b => registerBlock(editor, b));
  } catch {
    /* silent — blocks panel simply stays empty on failure */
  }
}

// Re-sync the panel after a create / update / delete.
function reloadBlocks(editor: GrapesJSEditor): void {
  registeredIds.forEach(id => editor.BlockManager.remove(id));
  registeredIds.clear();
  blockCache.clear();
  void loadAndRegister(editor);
}

// ── Save command + toolbar button ────────────────────────────────────────────

function addSaveAsBlockCommand(editor: GrapesJSEditor): void {
  editor.Commands.add(COMMAND_SAVE, {
    run(ed: GrapesJSEditor) {
      const component = ed.getSelected();
      if (!component) return;

      const content = buildModalContent(ed, component);
      ed.Modal.open({ title: 'Save as Block', content });
      setTimeout(() => content.querySelector<HTMLInputElement>('.cb-name')?.focus(), 60);
    },
  });

  const SAVEABLE: Record<string, boolean> = { 'mj-section': true, 'mj-hero': true };
  editor.on('component:selected', component => {
    if (!SAVEABLE[component.get('type') ?? '']) return;

    const toolbar = component.get('toolbar') ?? [];
    if (toolbar.some(t => t.command === COMMAND_SAVE)) return;

    const btn = {
      attributes: { title: 'Save as Block' },
      label: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" ' +
             'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
             '<path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 ' +
             '0-2 2v3.8h1.5a2.5 2.5 0 0 1 0 5H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.5 2.5 0 0 1 5 ' +
             '0V22H17a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"/></svg>',
      command: COMMAND_SAVE,
    };
    const newToolbar = toolbar.slice();
    newToolbar.splice(newToolbar.length - 1, 0, btn);
    component.set('toolbar', newToolbar);
  });
}

// ── Shared upsert / delete fetches ────────────────────────────────────────────

// id === null → create (POST /editor); id set → update (POST /editor/{id}).
function performUpsert(
  editor:      GrapesJSEditor,
  id:          number | null,
  name:        string,
  icon:        string,
  htmlContent: string,
  saveBtn:     HTMLButtonElement,
  errEl:       HTMLDivElement,
): void {
  saveBtn.textContent = 'Saving…';
  saveBtn.disabled    = true;

  const token   = typeof mauticAjaxCsrf !== 'undefined' ? mauticAjaxCsrf : '';
  const url     = id === null ? SAVE_ENDPOINT : `${SAVE_ENDPOINT}/${id}`;
  const payload = JSON.stringify({ name, icon, htmlContent });

  fetch(url, {
    method:      'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type':     'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-Token':     token,
    },
    body: payload,
  })
  .then(r => r.text().then(text => {
    try { return JSON.parse(text) as Record<string, unknown>; }
    catch { return { _rawError: text.substring(0, 300) }; }
  }))
  .then(data => {
    if (data['_rawError']) {
      errEl.textContent = `Server error: ${data['_rawError'] as string}`;
      errEl.style.display = 'block';
      saveBtn.textContent = 'Save'; saveBtn.disabled = false;
      return;
    }
    if (data['error'] || data['flashes']) {
      const raw = data['error'] ?? data['flashes'] ?? 'Unknown error';
      const msg = typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
      errEl.textContent = msg.replace(/<[^>]+>/g, '').trim().substring(0, 200);
      errEl.style.display = 'block';
      saveBtn.textContent = 'Save'; saveBtn.disabled = false;
      return;
    }
    editor.Modal.close();
    reloadBlocks(editor);
  })
  .catch(() => {
    errEl.textContent = 'Save failed — please try again.';
    errEl.style.display = 'block';
    saveBtn.textContent = 'Save'; saveBtn.disabled = false;
  });
}

function performDelete(editor: GrapesJSEditor, id: number): void {
  const token = typeof mauticAjaxCsrf !== 'undefined' ? mauticAjaxCsrf : '';

  fetch(`${SAVE_ENDPOINT}/${id}`, {
    method:      'DELETE',
    credentials: 'same-origin',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-Token':     token,
    },
  })
  .then(r => r.json().catch(() => ({})))
  .then((data: Record<string, unknown>) => {
    if (data['success']) reloadBlocks(editor);
    else window.alert('Could not delete the block.');
  })
  .catch(() => window.alert('Could not delete the block.'));
}

// ── Icon picker (shared) ──────────────────────────────────────────────────────

function buildPickerHTML(): string {
  // Inline SVGs declare only a viewBox; without explicit dimensions they collapse
  // to ~0 as flex items and render invisibly. Force a fixed render size.
  const sizedSvg = (svg: string): string =>
    svg.replace('<svg ', '<svg width="26" height="26" style="pointer-events:none;" ');

  const svgParts = (Object.keys(SVG_ICONS) as SvgIconKey[]).map(id =>
    `<span class="cb-icon-opt" data-icon="${id}" title="${SVG_LABELS[id]}" ` +
    'style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;' +
    'width:40px;height:40px;border-radius:5px;color:#ccc;flex-shrink:0;">' +
    sizedSvg(SVG_ICONS[id]) + '</span>'
  ).join('');

  const flagParts = FLAG_EMOJIS.map(e =>
    `<span class="cb-icon-opt" data-icon="${e}" title="${e}" ` +
    'style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;' +
    'width:40px;height:40px;border-radius:5px;flex-shrink:0;">' +
    `<img src="${emojiToTwemojiUrl(e)}" style="width:26px;height:26px;" /></span>`
  ).join('');

  return (
    '<div style="background:#1e2428;border-radius:6px;padding:8px;">' +
    '<div style="font-size:11px;color:#888;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px;">Layout</div>' +
    `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;">${svgParts}</div>` +
    '<div style="font-size:11px;color:#888;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px;">Language</div>' +
    `<div style="display:flex;flex-wrap:wrap;gap:4px;">${flagParts}</div>` +
    '</div>'
  );
}

// Wire the icon picker inside a modal `wrap`; returns a getter for the selection.
function wireIconPicker(wrap: HTMLElement, initial: string): () => string {
  let selectedIcon = initial;

  const highlight = () => {
    wrap.querySelectorAll<HTMLElement>('.cb-icon-opt').forEach(o => {
      const active = o.dataset['icon'] === selectedIcon && selectedIcon !== '';
      o.style.background = active ? '#3a5a3a' : '';
      o.style.outline    = active ? '2px solid #7c9a6d' : '';
    });
  };

  wrap.querySelector('.cb-icon-picker')!.addEventListener('click', e => {
    const opt = (e.target as Element).closest('.cb-icon-opt') as HTMLElement | null;
    if (!opt) return;
    const icon = opt.dataset['icon'] ?? '';
    selectedIcon = selectedIcon === icon ? '' : icon;
    highlight();
  });

  highlight();
  return () => selectedIcon;
}

// ── "Save as Block" modal (from a selected canvas component) ──────────────────

function buildModalContent(editor: GrapesJSEditor, component: GrapesJSComponent): HTMLElement {
  const wrap = document.createElement('div');
  wrap.innerHTML =
    '<label style="display:block;margin-bottom:6px;font-size:12px;color:#aaa;">Block name</label>' +
    '<input class="cb-name" type="text" placeholder="e.g. Footer, Signature…" style="' +
    'width:100%;box-sizing:border-box;padding:8px 10px;border-radius:4px;' +
    'border:1px solid #aaa;background:#fff;color:#333;font-size:14px;outline:none;">' +

    '<label style="display:block;margin:14px 0 6px;font-size:12px;color:#aaa;">' +
    'Icon <span style="opacity:.6;">(optional — click to select, click again to clear)</span></label>' +

    `<div class="cb-icon-picker">${buildPickerHTML()}</div>` +

    '<div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end;">' +
    '<button class="cb-cancel" style="padding:7px 16px;border-radius:4px;border:1px solid #4a5259;' +
    'background:transparent;color:#aaa;cursor:pointer;font-size:13px;">Cancel</button>' +
    '<button class="cb-save" style="padding:7px 18px;border-radius:4px;border:none;' +
    'background:#7c9a6d;color:#fff;cursor:pointer;font-size:13px;font-weight:600;">Save</button>' +
    '</div>' +
    '<div class="cb-err" style="color:#e07070;font-size:12px;margin-top:10px;display:none;"></div>';

  const nameInput = wrap.querySelector<HTMLInputElement>('.cb-name')!;
  const saveBtn   = wrap.querySelector<HTMLButtonElement>('.cb-save')!;
  const cancelBtn = wrap.querySelector<HTMLButtonElement>('.cb-cancel')!;
  const errEl     = wrap.querySelector<HTMLDivElement>('.cb-err')!;

  const getIcon = wireIconPicker(wrap, '');

  const doSave = () => {
    const name = nameInput.value.trim();
    if (!name) { errEl.textContent = 'Please enter a name.'; errEl.style.display = 'block'; return; }
    errEl.style.display = 'none';
    performUpsert(editor, null, name, getIcon(), component.toHTML(), saveBtn, errEl);
  };

  saveBtn.addEventListener('click', doSave);
  cancelBtn.addEventListener('click', () => editor.Modal.close());
  nameInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') doSave();
    if (e.key === 'Escape') editor.Modal.close();
  });

  return wrap;
}

// ── MJML modal — shared by Import (create) and right-click Edit (update) ──────

interface MjmlModalInitial {
  name: string;
  icon: string;
  mjml: string;
  id:   number | null;
}

function buildMjmlModalContent(editor: GrapesJSEditor, initial?: MjmlModalInitial): HTMLElement {
  const wrap = document.createElement('div');
  wrap.innerHTML =
    '<label style="display:block;margin-bottom:6px;font-size:12px;color:#aaa;">Block name</label>' +
    '<input class="cb-name" type="text" placeholder="e.g. Footer, Signature…" style="' +
    'width:100%;box-sizing:border-box;padding:8px 10px;border-radius:4px;' +
    'border:1px solid #aaa;background:#fff;color:#333;font-size:14px;outline:none;">' +

    '<label style="display:block;margin:14px 0 6px;font-size:12px;color:#aaa;">' +
    'Icon <span style="opacity:.6;">(optional — click to select, click again to clear)</span></label>' +

    `<div class="cb-icon-picker">${buildPickerHTML()}</div>` +

    '<label style="display:block;margin:14px 0 6px;font-size:12px;color:#aaa;">MJML code</label>' +
    '<textarea class="cb-mjml" placeholder="<mj-section>…</mj-section>" style="' +
    'width:100%;box-sizing:border-box;min-height:180px;padding:8px 10px;border-radius:4px;' +
    'border:1px solid #555;background:#1e2428;color:#e0e0e0;font-family:monospace;' +
    'font-size:12px;line-height:1.5;resize:vertical;outline:none;"></textarea>' +

    '<div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end;">' +
    '<button class="cb-cancel" style="padding:7px 16px;border-radius:4px;border:1px solid #4a5259;' +
    'background:transparent;color:#aaa;cursor:pointer;font-size:13px;">Cancel</button>' +
    '<button class="cb-save" style="padding:7px 18px;border-radius:4px;border:none;' +
    'background:#7c9a6d;color:#fff;cursor:pointer;font-size:13px;font-weight:600;">Save</button>' +
    '</div>' +
    '<div class="cb-err" style="color:#e07070;font-size:12px;margin-top:10px;display:none;"></div>';

  const nameInput = wrap.querySelector<HTMLInputElement>('.cb-name')!;
  const mjmlInput = wrap.querySelector<HTMLTextAreaElement>('.cb-mjml')!;
  const saveBtn   = wrap.querySelector<HTMLButtonElement>('.cb-save')!;
  const cancelBtn = wrap.querySelector<HTMLButtonElement>('.cb-cancel')!;
  const errEl     = wrap.querySelector<HTMLDivElement>('.cb-err')!;

  nameInput.value = initial?.name ?? '';
  mjmlInput.value = initial?.mjml ?? '';
  const targetId  = initial?.id ?? null;

  const getIcon = wireIconPicker(wrap, initial?.icon ?? '');

  const showErr = (msg: string) => { errEl.textContent = msg; errEl.style.display = 'block'; };

  const doSave = () => {
    const name = nameInput.value.trim();
    const mjml = mjmlInput.value.trim();
    if (!name) { showErr('Please enter a block name.'); return; }
    if (!mjml) { showErr('Please paste MJML code.'); return; }
    errEl.style.display = 'none';
    performUpsert(editor, targetId, name, getIcon(), mjml, saveBtn, errEl);
  };

  saveBtn.addEventListener('click', doSave);
  cancelBtn.addEventListener('click', () => editor.Modal.close());
  nameInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') editor.Modal.close();
  });

  return wrap;
}

function addImportMjmlCommand(editor: GrapesJSEditor): void {
  editor.Commands.add(COMMAND_IMPORT, {
    run(ed: GrapesJSEditor) {
      const content = buildMjmlModalContent(ed);
      ed.Modal.open({ title: 'Import MJML Block', content });
      setTimeout(() => content.querySelector<HTMLInputElement>('.cb-name')?.focus(), 60);
    },
  });

  editor.Panels.addButton('options', {
    id:         'cb-import-mjml',
    label:      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
                'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
                '<polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>' +
                '<path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>',
    command:    COMMAND_IMPORT,
    attributes: { title: 'Import MJML Block' },
  });
}

function openEditModal(editor: GrapesJSEditor, block: ContentBlock): void {
  const content = buildMjmlModalContent(editor, {
    name: block.name,
    icon: block.icon ?? '',
    mjml: block.htmlContent,
    id:   block.id,
  });
  editor.Modal.open({ title: 'Edit Block', content });
  setTimeout(() => content.querySelector<HTMLInputElement>('.cb-name')?.focus(), 60);
}

// ── Right-click context menu on saved-block tiles ─────────────────────────────

function removeContextMenu(): void {
  document.querySelectorAll('.cb-ctx-menu').forEach(m => m.remove());
}

function showBlockContextMenu(editor: GrapesJSEditor, block: ContentBlock, x: number, y: number): void {
  removeContextMenu();

  const menu = document.createElement('div');
  menu.className = 'cb-ctx-menu';
  menu.style.cssText =
    'position:fixed;z-index:100000;background:#272e33;border:1px solid #3a444b;border-radius:6px;' +
    'padding:4px;min-width:150px;box-shadow:0 6px 24px rgba(0,0,0,.45);font-size:13px;' +
    `left:${x}px;top:${y}px;`;

  const btnStyle =
    'display:block;width:100%;text-align:left;padding:7px 10px;border:none;border-radius:4px;' +
    'background:transparent;color:#e0e0e0;cursor:pointer;font-size:13px;';

  menu.innerHTML =
    `<div style="padding:4px 10px 6px;color:#8a949b;font-size:11px;max-width:220px;` +
    `white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(block.name)}</div>` +
    `<button class="cb-ctx-edit"   style="${btnStyle}">✎ Edit…</button>` +
    `<button class="cb-ctx-delete" style="${btnStyle}color:#e88;">🗑 Delete</button>`;

  document.body.appendChild(menu);

  // Nudge back on-screen if it overflows the viewport.
  const r = menu.getBoundingClientRect();
  if (r.right  > window.innerWidth)  menu.style.left = `${Math.max(4, window.innerWidth  - r.width  - 4)}px`;
  if (r.bottom > window.innerHeight) menu.style.top  = `${Math.max(4, window.innerHeight - r.height - 4)}px`;

  const editBtn = menu.querySelector<HTMLButtonElement>('.cb-ctx-edit')!;
  const delBtn  = menu.querySelector<HTMLButtonElement>('.cb-ctx-delete')!;
  editBtn.addEventListener('mouseenter', () => { editBtn.style.background = '#333d44'; });
  editBtn.addEventListener('mouseleave', () => { editBtn.style.background = 'transparent'; });
  delBtn.addEventListener('mouseenter',  () => { delBtn.style.background  = '#4a2e2e'; });
  delBtn.addEventListener('mouseleave',  () => { delBtn.style.background  = 'transparent'; });

  editBtn.addEventListener('click', e => {
    e.stopPropagation();
    removeContextMenu();
    openEditModal(editor, block);
  });
  delBtn.addEventListener('click', e => {
    e.stopPropagation();
    removeContextMenu();
    if (window.confirm(`Delete block "${block.name}"? This cannot be undone.`)) {
      performDelete(editor, block.id);
    }
  });
}

function bindContextMenuOnce(): void {
  if (menuBound) return;
  menuBound = true;

  document.addEventListener('contextmenu', (e: MouseEvent) => {
    const tile = (e.target as Element | null)?.closest('[data-cb-id]') as HTMLElement | null;
    if (!tile || !currentEditor) return;

    const id = parseInt(tile.dataset['cbId'] ?? '', 10);
    if (Number.isNaN(id)) return;

    const block = blockCache.get(id);
    if (!block) return;

    e.preventDefault();
    showBlockContextMenu(currentEditor, block, e.clientX, e.clientY);
  });

  document.addEventListener('click', removeContextMenu);
  document.addEventListener('scroll', removeContextMenu, true);
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') removeContextMenu();
  });
}

// ── Plugin registration ───────────────────────────────────────────────────────
// Guard prevents double-registration when Mautic SPA navigations re-run bodyClose scripts.

function init(): void {
  if (!window.MauticGrapesJsPlugins) window.MauticGrapesJsPlugins = [];

  if (!window.MauticGrapesJsPlugins.some(p => p.name === PLUGIN_NAME)) {
    window.MauticGrapesJsPlugins.push({
      name:   PLUGIN_NAME,
      plugin: (editor: GrapesJSEditor) => {
        if (!editor.DomComponents.getType('mj-section')) {
          return;
        }
        currentEditor = editor;
        reloadBlocks(editor);
        addSaveAsBlockCommand(editor);
        addImportMjmlCommand(editor);
        bindContextMenuOnce();
      },
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
