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

const LIST_ENDPOINT  = `${mauticBasePath}/s/content-blocks/editor`;
const SAVE_ENDPOINT  = `${mauticBasePath}/s/content-blocks/editor`;
const DEFAULT_CATEGORY = 'General';
const COMMAND_SAVE   = 'contentblock:save';
const COMMAND_IMPORT = 'contentblock:import';
const PLUGIN_NAME    = 'mautic-content-blocks';

// ── Blocks panel ─────────────────────────────────────────────────────────────

function registerBlock(editor: GrapesJSEditor, block: ContentBlock): void {
  editor.BlockManager.add(`content-block-${block.id}`, {
    label:    block.name,
    category: block.category && block.category.trim() ? block.category : DEFAULT_CATEGORY,
    media:    iconToMedia(block.icon),
    content:  block.htmlContent,
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

// ── Shared save fetch ─────────────────────────────────────────────────────────

function performSave(
  editor:      GrapesJSEditor,
  name:        string,
  icon:        string,
  htmlContent: string,
  saveBtn:     HTMLButtonElement,
  errEl:       HTMLDivElement,
): void {
  saveBtn.textContent = 'Saving…';
  saveBtn.disabled    = true;

  const token   = typeof mauticAjaxCsrf !== 'undefined' ? mauticAjaxCsrf : '';
  const payload = JSON.stringify({ name, icon, htmlContent });

  fetch(SAVE_ENDPOINT, {
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
    void loadAndRegister(editor);
  })
  .catch(() => {
    errEl.textContent = 'Save failed — please try again.';
    errEl.style.display = 'block';
    saveBtn.textContent = 'Save'; saveBtn.disabled = false;
  });
}

// ── Modal content (built fresh each open, rendered inside GrapesJS Modal) ─────

function buildPickerHTML(): string {
  const svgParts = (Object.keys(SVG_ICONS) as SvgIconKey[]).map(id =>
    `<span class="cb-icon-opt" data-icon="${id}" title="${SVG_LABELS[id]}" ` +
    'style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;' +
    'width:40px;height:40px;border-radius:5px;color:#ccc;flex-shrink:0;">' +
    SVG_ICONS[id] + '</span>'
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

function buildModalContent(editor: GrapesJSEditor, component: GrapesJSComponent): HTMLElement {
  let selectedIcon = '';

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

  // All queries on the detached element — no reflow.
  const nameInput = wrap.querySelector<HTMLInputElement>('.cb-name')!;
  const saveBtn   = wrap.querySelector<HTMLButtonElement>('.cb-save')!;
  const cancelBtn = wrap.querySelector<HTMLButtonElement>('.cb-cancel')!;
  const errEl     = wrap.querySelector<HTMLDivElement>('.cb-err')!;

  const showErr = (msg: string | object) => {
    errEl.textContent   = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
    errEl.style.display = 'block';
  };

  wrap.querySelector('.cb-icon-picker')!.addEventListener('click', e => {
    const opt = (e.target as Element).closest('.cb-icon-opt') as HTMLElement | null;
    if (!opt) return;
    const icon = opt.dataset['icon'] ?? '';
    selectedIcon = selectedIcon === icon ? '' : icon;
    wrap.querySelectorAll<HTMLElement>('.cb-icon-opt').forEach(o => {
      const active = o.dataset['icon'] === selectedIcon && selectedIcon !== '';
      o.style.background = active ? '#3a5a3a' : '';
      o.style.outline    = active ? '2px solid #7c9a6d' : '';
    });
  });

  const doSave = () => {
    const name = nameInput.value.trim();
    if (!name) { showErr('Please enter a name.'); return; }
    errEl.style.display = 'none';
    performSave(editor, name, selectedIcon, component.toHTML(), saveBtn, errEl);
  };

  saveBtn.addEventListener('click', doSave);
  cancelBtn.addEventListener('click', () => editor.Modal.close());
  nameInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') doSave();
    if (e.key === 'Escape') editor.Modal.close();
  });

  return wrap;
}

// ── Import MJML command + panel button ────────────────────────────────────────

function buildImportModalContent(editor: GrapesJSEditor): HTMLElement {
  let selectedIcon = '';

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

  const showErr = (msg: string) => {
    errEl.textContent   = msg;
    errEl.style.display = 'block';
  };

  wrap.querySelector('.cb-icon-picker')!.addEventListener('click', e => {
    const opt = (e.target as Element).closest('.cb-icon-opt') as HTMLElement | null;
    if (!opt) return;
    const icon = opt.dataset['icon'] ?? '';
    selectedIcon = selectedIcon === icon ? '' : icon;
    wrap.querySelectorAll<HTMLElement>('.cb-icon-opt').forEach(o => {
      const active = o.dataset['icon'] === selectedIcon && selectedIcon !== '';
      o.style.background = active ? '#3a5a3a' : '';
      o.style.outline    = active ? '2px solid #7c9a6d' : '';
    });
  });

  const doSave = () => {
    const name = nameInput.value.trim();
    const mjml = mjmlInput.value.trim();
    if (!name) { showErr('Please enter a block name.'); return; }
    if (!mjml) { showErr('Please paste MJML code.'); return; }
    errEl.style.display = 'none';
    performSave(editor, name, selectedIcon, mjml, saveBtn, errEl);
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
      const content = buildImportModalContent(ed);
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
        loadAndRegister(editor);
        addSaveAsBlockCommand(editor);
        addImportMjmlCommand(editor);
      },
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
