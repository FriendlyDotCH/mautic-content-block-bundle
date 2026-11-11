import {
  SVG_ICONS,
  SVG_LABELS,
  FLAG_EMOJIS,
  emojiToTwemojiUrl,
  iconToMedia,
  type SvgIconKey,
} from './common/icons';
import { NO_THEME, buildDocument, extractFragment, loadMjml, type ThemeParts } from './common/mjml';
import type { ContentBlock, LinkedBlock } from './types/api';
import type { GrapesJSEditor, GrapesJSComponent, GrapesJSBlockDefinition } from './types/grapesjs.d';

// ── Mautic page globals ──────────────────────────────────────────────────────
declare const mauticBasePath: string;
declare const mauticAjaxCsrf: string | undefined;

const LIST_ENDPOINT    = `${mauticBasePath}/s/content-blocks/editor`;
const LINKED_ENDPOINT  = `${mauticBasePath}/s/content-blocks/editor/linked`;
const SAVE_ENDPOINT    = `${mauticBasePath}/s/content-blocks/editor`;
const THEME_ENDPOINT   = `${mauticBasePath}/s/content-blocks/editor/theme/`;
// ~1.3 MB, so fetched only when a section is saved as a linked block.
const MJML_LIB_URL     = `${mauticBasePath}/plugins/MauticContentBlockBundle/Assets/vendor/mjml-browser.js`;
const DEFAULT_CATEGORY = 'General';
const COMMAND_SAVE     = 'contentblock:save';
const COMMAND_IMPORT   = 'contentblock:import';
const COMMAND_LIBRARY  = 'contentblock:open-library';
// Deliberately NOT 'mautic-content-blocks'. Mautic's generated media/js/app.js once carried a
// v1 copy of this plugin under that name, and the registration guard below is name-based - so a
// browser still holding the old app.js would silently block this plugin from registering at all.
// app.js is versioned by Mautic release, not by content, so that stale copy can linger for a
// long time. A distinct name means both can register and only the live one does any work.
const PLUGIN_NAME      = 'mautic-content-blocks-v2';
const LINKED_TYPE      = 'cb-linked';

// Only the numeric id, and only when it is the entire content of the mj-raw.
const LINKED_TOKEN_RE  = /^\s*\{contentblock=(\d+)\}\s*$/;

// Loaded block data, keyed by id — powers the right-click edit/delete menu.
const blockCache = new Map<number, ContentBlock>();

// Copy blocks for the Content Blocks tab; null until the list fetch resolves.
let copyBlocks: ContentBlock[] | null = null;

// Compiled HTML of published linked blocks, so the canvas can draw them in place.
// null until the one fetch per builder opening resolves.
let linkedBlocks: Record<string, LinkedBlock> | null = null;
let linkedEditUrl: string | null = null;

// The currently-active editor (one builder open at a time); used by the
// document-level context-menu handler which is bound only once.
let currentEditor: GrapesJSEditor | null = null;
let menuBound = false;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

// ── Block definitions ────────────────────────────────────────────────────────

function categoryOf(block: ContentBlock): string {
  return block.category && block.category.trim() ? block.category.trim() : DEFAULT_CATEGORY;
}

function copyBlockDefinition(block: ContentBlock): GrapesJSBlockDefinition {
  return {
    id:         `content-block-${block.id}`,
    label:      escapeHtml(block.name),
    media:      iconToMedia(block.icon),
    content:    block.htmlContent,
    attributes: { 'data-cb-id': String(block.id), title: `${block.name} (right-click to edit)` },
  };
}

const LINK_BADGE =
  '<span class="cb-lib__link-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
  '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>';

function linkedBlockDefinition(block: LinkedBlock): GrapesJSBlockDefinition {
  return {
    id:    `content-block-linked-${block.id}`,
    label: `${escapeHtml(block.name)}<span class="cb-lib__token">{contentblock=${block.id}}</span>`,
    // The block's own icon, as for copy blocks, with a chain badge so it still reads as linked.
    media: iconToMedia(block.icon) + LINK_BADGE,
    attributes: { title: `Insert {contentblock=${block.id}} – stays linked to the block` },
    content:    { type: LINKED_TYPE, cbId: String(block.id) },
  };
}

// ── Content Blocks tab ───────────────────────────────────────────────────────
// Our blocks get their own tab in the sidebar's views panel (beside Styles / Settings / Layers /
// Blocks) rather than tiles in the core Blocks panel, where they truncated names and sat below
// every core MJML block. They are never registered with the BlockManager: its
// render(..., { external: true }) draws any definitions into a detached list and keeps
// GrapesJS's native drag and drop, so the tab is a plain filtered rendering of our own state.

const LIBRARY_STYLE_ID = 'cb-lib-style';

// One per editor; reset when a new builder opens.
let libraryEl: HTMLElement | null = null;
let searchTerm = '';

// Rows instead of 45%-wide tiles. Scoped to .cb-lib so the core Blocks panel is untouched.
const LIBRARY_CSS = `
.cb-lib { padding: 10px 10px 16px; font-family: Helvetica, sans-serif; color: #e6e9ec; }
.cb-lib__head { display: flex; gap: 6px; margin-bottom: 10px; position: sticky; top: 0; z-index: 1;
  background: inherit; }
.cb-lib__search { flex: 1; min-width: 0; padding: 6px 8px; font-size: 12px; border-radius: 3px;
  border: 1px solid rgba(0,0,0,.2); background: #fff; color: #333; }
.cb-lib__import { flex: none; padding: 0 8px; border-radius: 3px; border: 1px solid rgba(0,0,0,.2);
  background: #fff; color: #555; cursor: pointer; display: inline-flex; align-items: center; }
.cb-lib__import:hover { color: #4e5d9d; border-color: #4e5d9d; }
.cb-lib__import svg { width: 16px; height: 16px; }
.cb-lib__section { margin-top: 12px; }
.cb-lib__section:first-of-type { margin-top: 0; }
.cb-lib__title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px;
  color: #f2f4f5; display: flex; justify-content: space-between; }
.cb-lib__hint { font-size: 11px; color: #c3c9ce; margin: 2px 0 6px; }
.cb-lib__category { font-size: 11px; font-weight: 600; color: #d5dadd; margin: 8px 0 4px; }
.cb-lib__msg { font-size: 12px; color: #d5dadd; padding: 8px 2px; line-height: 1.5; }
.cb-lib .gjs-blocks-c { display: block; }
.cb-lib .gjs-block { width: 100%; min-height: 0; margin: 0 0 4px; padding: 6px 8px;
  flex-direction: row; justify-content: flex-start; align-items: center; gap: 8px; text-align: left;
  background: #fff; color: #222; cursor: grab; }
.cb-lib .gjs-block:hover { border-color: #4e5d9d; color: #4e5d9d; }
.cb-lib .gjs-block__media { flex: none; width: 18px; height: 18px; margin: 0;
  display: flex; align-items: center; justify-content: center; position: relative; }
.cb-lib .cb-lib__link-badge { position: absolute; right: -5px; bottom: -4px; width: 11px; height: 11px;
  border-radius: 50%; background: #4e5d9d; color: #fff; box-shadow: 0 0 0 1.5px #fff;
  display: flex; align-items: center; justify-content: center; pointer-events: none; }
.cb-lib .gjs-block__media .cb-lib__link-badge svg { width: 7px !important; height: 7px !important;
  max-height: 7px; }
.cb-lib .gjs-block__media svg, .cb-lib .gjs-block__media img { width: 18px !important;
  height: 18px !important; max-height: 18px; }
.cb-lib .gjs-block-label { flex: 1; min-width: 0; font-size: 12px; line-height: 1.35;
  font-weight: 500; color: inherit; white-space: normal; overflow-wrap: anywhere; }
.cb-lib__token { display: block; font-size: 10px; color: #666; font-weight: 400; font-family: monospace; }
`;

function ensureLibraryStyles(): void {
  if (document.getElementById(LIBRARY_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = LIBRARY_STYLE_ID;
  style.textContent = LIBRARY_CSS;
  document.head.appendChild(style);
}

function buildLibraryEl(editor: GrapesJSEditor): HTMLElement {
  ensureLibraryStyles();

  const el = document.createElement('div');
  el.className = 'cb-lib';
  el.innerHTML =
    '<div class="cb-lib__head">' +
    '<input class="cb-lib__search" type="search" placeholder="Search blocks…" aria-label="Search content blocks">' +
    '<button class="cb-lib__import" type="button" title="Import MJML Block">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/>' +
    '<line x1="5" y1="12" x2="19" y2="12"/></svg></button>' +
    '</div>' +
    '<div class="cb-lib__body"></div>';

  const search = el.querySelector<HTMLInputElement>('.cb-lib__search')!;
  search.value = searchTerm;
  search.addEventListener('input', () => {
    searchTerm = search.value;
    renderLibrary(editor);
  });
  // GrapesJS keymaps listen on the document - keep Backspace in the search box from deleting
  // the selected component.
  search.addEventListener('keydown', e => e.stopPropagation());

  el.querySelector('.cb-lib__import')!.addEventListener('click', () => editor.runCommand(COMMAND_IMPORT));

  return el;
}

function message(text: string): HTMLElement {
  const div = document.createElement('div');
  div.className = 'cb-lib__msg';
  div.textContent = text;
  return div;
}

function section(title: string, count: number, hint: string): HTMLElement {
  const div = document.createElement('div');
  div.className = 'cb-lib__section';
  div.innerHTML =
    `<div class="cb-lib__title"><span>${escapeHtml(title)}</span><span>${count}</span></div>` +
    `<div class="cb-lib__hint">${escapeHtml(hint)}</div>`;
  return div;
}

function renderLibrary(editor: GrapesJSEditor): void {
  const body = libraryEl?.querySelector('.cb-lib__body');
  if (!body) return;
  body.innerHTML = '';

  if (copyBlocks === null && linkedBlocks === null) {
    body.appendChild(message('Loading…'));
    return;
  }

  const q       = searchTerm.trim().toLowerCase();
  const matches = (...fields: string[]) => !q || fields.some(f => f.toLowerCase().includes(q));

  const copies = (copyBlocks ?? [])
    .filter(b => matches(b.name, categoryOf(b)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const linked = Object.values(linkedBlocks ?? {})
    .filter(b => matches(b.name, `{contentblock=${b.id}}`))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!copies.length && !linked.length) {
    const total = (copyBlocks?.length ?? 0) + Object.keys(linkedBlocks ?? {}).length;
    body.appendChild(message(total
      ? `No blocks match “${searchTerm.trim()}”.`
      : 'No content blocks yet. Select a section and use “Save as Block” in its toolbar, or import MJML with +.'));
    return;
  }

  if (copies.length) {
    const sec = section('Copy blocks', copies.length, 'Dropped in as an editable copy.');

    const groups = new Map<string, ContentBlock[]>();
    copies.forEach(b => {
      const cat = categoryOf(b);
      groups.set(cat, [...(groups.get(cat) ?? []), b]);
    });
    // Category headings only earn their space once there is more than one.
    const showHeadings = groups.size > 1;

    [...groups.keys()].sort((a, b) => a.localeCompare(b)).forEach(cat => {
      if (showHeadings) {
        const h = document.createElement('div');
        h.className = 'cb-lib__category';
        h.textContent = cat;
        sec.appendChild(h);
      }
      sec.appendChild(editor.BlockManager.render(
        groups.get(cat)!.map(copyBlockDefinition), { external: true, ignoreCategories: true },
      ));
    });
    body.appendChild(sec);
  }

  if (linked.length) {
    const sec = section('Linked blocks', linked.length, 'Stay in sync – edit them on the block page.');
    sec.appendChild(editor.BlockManager.render(
      linked.map(linkedBlockDefinition), { external: true, ignoreCategories: true },
    ));
    body.appendChild(sec);
  }
}

function addLibraryTab(editor: GrapesJSEditor): void {
  editor.Commands.add(COMMAND_LIBRARY, {
    run(ed: GrapesJSEditor) {
      if (!libraryEl) {
        libraryEl = buildLibraryEl(ed);
        // The same mount point the built-in Styles / Layers / Blocks views use.
        const panel = ed.Panels.getPanel('views-container') ?? ed.Panels.addPanel({ id: 'views-container' });
        panel.set('appendContent', libraryEl).trigger('change:appendContent');
        renderLibrary(ed);
      }
      libraryEl.style.display = 'block';
    },
    stop() {
      if (libraryEl) libraryEl.style.display = 'none';
    },
  });

  // Same SVG sizing as the preset's own view buttons.
  editor.Panels.addButton('views', {
    id:         'cb-open-library',
    className:  'cb-open-library',
    command:    COMMAND_LIBRARY,
    togglable:  false,
    attributes: { title: 'Content Blocks' },
    label:      '<svg style="display: block; max-width: 22px" viewBox="0 0 24 24" fill="none" ' +
                'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
                '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/>' +
                '<polyline points="2 12 12 17 22 12"/></svg>',
  });

  // addButton() can only append, which puts the tab after Blocks. Move it next to the Style
  // Manager brush, the preset's first view button. A DOM move only: the button's command and
  // active state live on its model, which is unaffected.
  editor.on('load', () => {
    const button = editor.getContainer()?.querySelector<HTMLElement>('.cb-open-library');
    const brush  = button?.parentElement?.firstElementChild;
    if (button && brush && brush !== button) brush.after(button);
  });
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

async function loadCopyBlocks(): Promise<void> {
  try {
    const response = await fetchWithRetry(LIST_ENDPOINT, {
      headers:     { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
      credentials: 'same-origin',
    });

    if (!response.ok) { copyBlocks = []; return; }

    const data = await response.json() as unknown;
    const blocks: ContentBlock[] = Array.isArray(data)
      ? (data as ContentBlock[])
      : ((data as Record<string, unknown>).blocks as ContentBlock[] | undefined) ?? [];

    copyBlocks = blocks.filter(b => !b.linked);
    blockCache.clear();
    copyBlocks.forEach(b => blockCache.set(b.id, b));
  } catch {
    /* silent — the tab shows its empty state on failure */
    copyBlocks = [];
  }
}

// Re-sync the tab after a create / update / delete. A block's copy/linked mode is set on its
// edit page, but a saved or deleted block may be linked, so both lists are refetched.
function reloadBlocks(editor: GrapesJSEditor): Promise<void> {
  return Promise.all([loadCopyBlocks(), loadLinkedBlocks()]).then(() => {
    renderLibrary(editor);
    refreshLinkedComponents(editor);
  });
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
  extra:       Record<string, unknown> = {},
  onSaved?:    (block: ContentBlock, reloaded: Promise<void>) => void,
): void {
  saveBtn.textContent = 'Saving…';
  saveBtn.disabled    = true;

  const token   = typeof mauticAjaxCsrf !== 'undefined' ? mauticAjaxCsrf : '';
  const url     = id === null ? SAVE_ENDPOINT : `${SAVE_ENDPOINT}/${id}`;
  const payload = JSON.stringify({ name, icon, htmlContent, ...extra });

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
    const reloaded = reloadBlocks(editor);
    if (onSaved && data['block']) onSaved(data['block'] as ContentBlock, reloaded);
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

function kindOption(value: string, title: string, checked: boolean, hint: string): string {
  return `<label style="display:flex;gap:8px;align-items:flex-start;margin:0 0 8px;cursor:pointer;` +
         'font-weight:normal;">' +
         `<input type="radio" name="cb-kind" value="${value}"${checked ? ' checked' : ''} ` +
         'style="margin:3px 0 0;flex:none;">' +
         `<span><span style="font-size:13px;color:#e0e0e0;font-weight:600;">${title}</span>` +
         `<span style="display:block;font-size:12px;color:#aaa;line-height:1.4;">${hint}</span></span></label>`;
}

/** The email's theme, as the email form's theme picker holds it. */
function currentEmailTheme(): string {
  const value = document.querySelector<HTMLInputElement | HTMLSelectElement>('#emailform_template')?.value ?? '';
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : '';
}

async function fetchThemeParts(theme: string): Promise<ThemeParts> {
  if (!theme) return NO_THEME;
  try {
    const response = await fetch(THEME_ENDPOINT + encodeURIComponent(theme), {
      credentials: 'same-origin',
      headers:     { 'X-Requested-With': 'XMLHttpRequest' },
    });
    return response.ok ? await response.json() as ThemeParts : NO_THEME;
  } catch {
    return NO_THEME;
  }
}

/**
 * A linked block is injected at send time, where there is no MJML compiler, so it is saved
 * with compiled HTML - built here exactly as the block form builds it (common/mjml.ts),
 * against the email's theme, which is then also stored as the block's theme.
 */
async function compileLinked(mjml: string): Promise<{ html: string; theme: string }> {
  const theme             = currentEmailTheme();
  const [mjml2html, parts] = await Promise.all([loadMjml(MJML_LIB_URL), fetchThemeParts(theme)]);
  const output            = mjml2html(buildDocument(mjml, parts), { validationLevel: 'soft', keepComments: true });
  const html              = extractFragment(output.html);
  if (!html.trim()) throw new Error('the compiler returned no HTML');

  return { html, theme };
}

/** Swap the saved section for its linked block, once the linked list knows the new block. */
function linkSection(
  editor:    GrapesJSEditor,
  component: GrapesJSComponent,
  block:     ContentBlock,
  reloaded:  Promise<void>,
): void {
  void reloaded.then(() => {
    const [linked] = component.replaceWith({ type: LINKED_TYPE, cbId: String(block.id) });
    if (linked) editor.select(linked);
  });
}

function buildModalContent(editor: GrapesJSEditor, component: GrapesJSComponent): HTMLElement {
  const wrap = document.createElement('div');
  wrap.innerHTML =
    '<label style="display:block;margin-bottom:6px;font-size:12px;color:#aaa;">Block name</label>' +
    '<input class="cb-name" type="text" placeholder="e.g. Footer, Signature…" style="' +
    'width:100%;box-sizing:border-box;padding:8px 10px;border-radius:4px;' +
    'border:1px solid #aaa;background:#fff;color:#333;font-size:14px;outline:none;">' +

    '<label style="display:block;margin:14px 0 6px;font-size:12px;color:#aaa;">Block type</label>' +
    kindOption('copy', 'Copy block', true,
      'Inserted as an editable copy. Later changes to the block do not affect emails already using it.') +
    kindOption('linked', 'Linked block', false,
      'This section is replaced by a link to the block. Edits to the block reach every email ' +
      'using it, each time one is sent. Edit it on the block page, not in the email.') +

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
  const isLinked = () => wrap.querySelector<HTMLInputElement>('input[name="cb-kind"]:checked')?.value === 'linked';

  const showErr = (msg: string) => {
    errEl.textContent = msg;
    errEl.style.display = 'block';
    saveBtn.textContent = 'Save';
    saveBtn.disabled = false;
  };

  const doSave = () => {
    const name = nameInput.value.trim();
    if (!name) { showErr('Please enter a name.'); return; }
    errEl.style.display = 'none';

    const mjml = component.toHTML();
    if (!isLinked()) {
      performUpsert(editor, null, name, getIcon(), mjml, saveBtn, errEl);
      return;
    }

    saveBtn.textContent = 'Compiling…';
    saveBtn.disabled    = true;
    compileLinked(mjml)
      .then(({ html, theme }) => performUpsert(
        editor, null, name, getIcon(), mjml, saveBtn, errEl,
        { linked: true, compiledHtml: html, theme },
        (block, reloaded) => linkSection(editor, component, block, reloaded),
      ))
      .catch((e: Error) => showErr(`Could not compile the section: ${e.message}`));
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


// ── Linked blocks ────────────────────────────────────────────────────────────
// An email stores only <mj-raw>{contentblock=<id>}</mj-raw>; the content is injected at
// send time. In the canvas we paint the real compiled HTML so the email still reads as a
// whole, but read-only: the one place to change it is the block's own edit page.

async function loadLinkedBlocks(): Promise<void> {
  try {
    const response = await fetchWithRetry(LINKED_ENDPOINT, {
      headers:     { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (!response.ok) { linkedBlocks = {}; return; }

    const data = await response.json() as { blocks?: Record<string, LinkedBlock>; editUrl?: string | null };
    linkedBlocks  = data.blocks ?? {};
    linkedEditUrl = data.editUrl ?? null;
  } catch {
    linkedBlocks = {};
  }
}

// Static (not absolutely positioned) so it never covers the block's own content.
function badge(text: string, color: string): string {
  return `<div style="display:inline-block;font:11px/1.6 Arial,sans-serif;color:#fff;` +
         `background:${color};padding:0 6px;border-bottom-right-radius:3px;` +
         `pointer-events:none;">${text}</div>`;
}

function frame(inner: string, color: string): string {
  return `<div class="cb-linked-preview" style="position:relative;outline:1px dashed ${color};` +
         `outline-offset:-1px;min-height:22px;">${inner}</div>`;
}

function renderLinkedPreview(id: string): string {
  const token = `{contentblock=${escapeHtml(id)}}`;

  if (linkedBlocks === null) {
    return frame(badge(`Linked block ${token} – loading…`, '#4e5d9d'), '#4e5d9d');
  }

  const block = linkedBlocks[id];
  if (!block) {
    return frame(
      badge(`Linked block ${token} not found or unpublished`, '#c0392b') +
      '<div style="padding:8px 12px 10px;font:13px Arial,sans-serif;color:#c0392b;background:#fdecea;">' +
      'This token is removed when the email is sent. Publish the block, or remove this from the email.</div>',
      '#c0392b',
    );
  }

  if (!block.html.trim()) {
    return frame(
      badge(`Linked block: ${escapeHtml(block.name)} ${token} – no compiled content`, '#c0392b') +
      '<div style="padding:8px 12px 10px;font:13px Arial,sans-serif;color:#c0392b;background:#fdecea;">' +
      'Open the block and save it again so its MJML compiles.</div>',
      '#c0392b',
    );
  }

  const label = `Linked block: ${escapeHtml(block.name)} ${token}` +
                (linkedEditUrl ? ' · double-click to edit' : '');

  // pointer-events:none stops links inside the preview being followed or selected in the canvas
  return frame(badge(label, '#4e5d9d') + `<div style="pointer-events:none;">${block.html}</div>`, '#4e5d9d');
}

/**
 * grapesjs-mjml restricts what may be dropped into a container with a CSS selector built from
 * child type names - mj-body allows exactly [mj-section, mj-wrapper, mj-hero, mj-raw], matched
 * as [data-gjs-type="..."] against the dragged element. Our component renders as
 * data-gjs-type="cb-linked", so without this the tile simply refuses to drop.
 *
 * Widening the two container types is additive: nothing that was droppable before stops being so.
 */
function allowLinkedInContainers(editor: GrapesJSEditor): void {
  ['mj-body', 'mj-wrapper'].forEach(parent => {
    const type  = editor.Components.getType(parent) as { model?: { prototype?: Record<string, unknown> } } | undefined;
    const proto = type?.model?.prototype;
    if (!proto) return;

    const defaults = proto['defaults'];
    if (!defaults || typeof defaults !== 'object') return; // unexpected shape - leave it alone

    const current = (defaults as Record<string, unknown>)['droppable'];
    if (typeof current !== 'string' || current.includes(LINKED_TYPE)) return;

    (defaults as Record<string, unknown>)['droppable'] = `${current}, [data-gjs-type="${LINKED_TYPE}"]`;
  });
}

/**
 * Second line of defence for the same constraint. Depending on the GrapesJS version, a type's
 * `defaults` may be a getter returning a fresh object, in which case the mutation above is lost.
 * Setting `droppable` on the live component instances does not depend on that shape.
 */
function relaxContainerInstances(editor: GrapesJSEditor): void {
  const relax = (component: GrapesJSComponent): void => {
    const type = component.get('type');
    if ('mj-body' !== type && 'mj-wrapper' !== type) return;

    const current = component.get('droppable');
    if ('string' !== typeof current || current.includes(LINKED_TYPE)) return;

    component.set('droppable', `${current}, [data-gjs-type="${LINKED_TYPE}"]`);
  };

  const walk = (component: GrapesJSComponent): void => {
    relax(component);
    (component.components?.() ?? []).forEach(walk);
  };

  editor.on('load', () => {
    const wrapper = editor.getWrapper();
    if (wrapper) walk(wrapper as unknown as GrapesJSComponent);
  });

  // Covers an mj-wrapper added after load.
  editor.on('component:add', component => { if (component) relax(component); });
}

function registerLinkedType(editor: GrapesJSEditor): void {
  const rawType = editor.Components.getType('mj-raw') as { model: { prototype: Record<string, unknown> } } | undefined;
  if (!rawType) return;

  const rawModelProto = rawType.model.prototype;

  editor.Components.addType(LINKED_TYPE, {
    extend: 'mj-raw',

    isComponent(el: Element) {
      const tag = el?.tagName?.toLowerCase();
      if (tag !== 'mj-raw' || el.children.length) return false;

      const match = (el.textContent ?? '').match(LINKED_TOKEN_RE);
      if (!match) return false;

      // components: [] stops the parser turning the token into an editable text node
      return { type: LINKED_TYPE, cbId: match[1], components: [] };
    },

    model: {
      defaults: {
        tagName:   'mj-raw',
        name:      'Linked block',
        cbId:      '',
        editable:  false,
        droppable: false,
        stylable:  false,
        draggable: '[data-gjs-type="mj-body"], [data-gjs-type="mj-wrapper"]',
        traits:    [{ type: 'select', name: 'cbId', label: 'Linked block', changeProp: true, options: [] }],
      },

      init(this: Record<string, Function>) {
        if (typeof rawModelProto['init'] === 'function') {
          (rawModelProto['init'] as Function).apply(this, arguments as unknown as unknown[]);
        }
        (this['updateBlockTrait'] as Function)?.call(this);
      },

      updateBlockTrait(this: { getTrait?: (n: string) => { set: (k: string, v: unknown) => void } | undefined }) {
        const trait = this.getTrait?.('cbId');
        trait?.set('options', Object.values(linkedBlocks ?? {}).map(b => ({
          id: String(b.id), name: `${b.name} {contentblock=${b.id}}`,
        })));
      },

      getName(this: { get: (k: string) => unknown }) {
        return `Linked block {contentblock=${this.get('cbId')}}`;
      },

      // What is saved in the email: only the token, never the rendered preview.
      toHTML(this: { get: (k: string) => unknown }) {
        return `<mj-raw>{contentblock=${this.get('cbId')}}</mj-raw>`;
      },
    },

    view: {
      events: { dblclick: 'openBlock' },

      init(this: { listenTo: (o: unknown, e: string, cb: unknown) => void; model: unknown; render: unknown }) {
        this.listenTo(this.model, 'change:cbId', this.render);
      },

      render(this: { renderAttributes: () => void; el: HTMLElement; model: { get: (k: string) => unknown } }) {
        this.renderAttributes();
        this.el.innerHTML = renderLinkedPreview(String(this.model.get('cbId')));
        return this;
      },

      openBlock(this: { model: { get: (k: string) => unknown } }, event?: Event) {
        const id = String(this.model.get('cbId'));
        if (!linkedBlocks?.[id] || !linkedEditUrl) return;
        event?.stopPropagation();
        window.open(linkedEditUrl.replace('__ID__', id), '_blank');
      },
    },
  });
}

function refreshLinkedComponents(editor: GrapesJSEditor): void {
  const wrapper = editor.getWrapper();
  if (!wrapper) return;

  const components = wrapper.findType
    ? wrapper.findType(LINKED_TYPE)
    : wrapper.find(`[data-gjs-type="${LINKED_TYPE}"]`);

  components.forEach(component => {
    const c = component as unknown as {
      updateBlockTrait?: () => void;
      view?: { render: () => void };
    };
    c.updateBlockTrait?.();
    c.view?.render();
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
        // Module state outlives a builder: Mautic opens a fresh editor per email.
        libraryEl    = null;
        copyBlocks   = null;
        linkedBlocks = null;

        registerLinkedType(editor);
        allowLinkedInContainers(editor);
        relaxContainerInstances(editor);
        addSaveAsBlockCommand(editor);
        addImportMjmlCommand(editor);
        addLibraryTab(editor);
        bindContextMenuOnce();

        // One pair of requests per builder opening; also redraws linked placeholders painted
        // while they were in flight.
        void reloadBlocks(editor);
      },
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
