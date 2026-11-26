/**
 * Content Blocks - MJML editing on the block form.
 *
 * Ported from the Email Snippets plugin's snippet editor. Mautic has no server-side MJML
 * compiler (the GrapesJS builder also compiles in the browser), so this script:
 *   1. wraps the block's MJML in the selected theme's <mj-head> and <mj-body> attributes,
 *   2. compiles it with mjml-browser,
 *   3. renders a live preview of the result,
 *   4. shows the compiled HTML read-only, for reference.
 *
 * Unlike the snippet editor there is no compile-before-submit step: a content block stores
 * its MJML source and GrapesJS compiles it when the block is dropped into an email, so the
 * saved value is simply what is in the textarea. Nothing compiled can go stale.
 */

import './types/mjml.d';
import { NO_THEME, buildDocument, extractFragment, loadMjml, type ThemeParts } from './common/mjml';

const STARTER_MJML = [
  '<mj-section background-color="#f4f4f4" padding="20px 0">',
  '  <mj-column>',
  '    <mj-text align="center" font-size="12px" color="#666666">',
  '      Your reusable block goes here.',
  '    </mj-text>',
  '  </mj-column>',
  '</mj-section>',
].join('\n');

const themeCache = new Map<string, Promise<ThemeParts>>();

// Resolved themes, readable without awaiting - the submit handler must run synchronously.
const themeResolved = new Map<string, ThemeParts>([['', NO_THEME]]);

// The submit hook is document-level, so bind it once no matter how often init() runs.
let submitBound = false;

function loadTheme(urlTemplate: string, theme: string): Promise<ThemeParts> {
  if (!theme) return Promise.resolve(NO_THEME);

  let pending = themeCache.get(theme);
  if (!pending) {
    pending = fetch(urlTemplate.replace('__THEME__', encodeURIComponent(theme)), {
      credentials: 'same-origin',
      headers:     { 'X-Requested-With': 'XMLHttpRequest' },
    })
      .then(r => (r.ok ? r.json() as Promise<ThemeParts> : NO_THEME))
      .then(parts => { themeResolved.set(theme, parts); return parts; })
      .catch(() => { themeCache.delete(theme); return NO_THEME; });
    themeCache.set(theme, pending);
  }

  return pending;
}

function debounce(fn: () => void, wait: number): () => void {
  let timer: ReturnType<typeof setTimeout>;
  return () => { clearTimeout(timer); timer = setTimeout(fn, wait); };
}

function init(): void {
  const root = document.getElementById('cb-mjml-editor');
  if (!root || root.dataset['initialized']) return;
  root.dataset['initialized'] = '1';

  const mjmlLibUrl = root.dataset['mjmlLib']  ?? '';
  const themeUrl   = root.dataset['themeUrl'] ?? '';

  const mjmlField = document.getElementById('content_block_htmlContent') as HTMLTextAreaElement | null;
  const themeField = document.getElementById('content_block_theme')      as HTMLSelectElement   | null;
  const preview   = document.getElementById('cb-editor-preview')         as HTMLIFrameElement   | null;
  const status    = document.getElementById('cb-editor-status')          as HTMLDivElement      | null;
  const generated = document.getElementById('cb-generated-html')         as HTMLTextAreaElement | null;
  const compiled  = document.getElementById('content_block_compiledHtml') as HTMLInputElement    | null;
  const usage     = document.getElementById('cb-linked-usage');

  if (!mjmlField) return;

  // A linked block is referenced by {contentblock=<id>} and injected at send time, so its
  // compiled HTML must be submitted with the form. A copy block stores MJML only.
  const isLinked = (): boolean =>
    root.querySelector<HTMLInputElement>('input[name="content_block[linked]"]:checked')?.value === '1';

  const setStatus = (text: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info'): void => {
    if (!status) return;
    status.className     = `alert alert-${type} small`;
    status.style.display = text ? '' : 'none';
    status.innerHTML     = text;
  };

  const showPreview = (html: string): void => {
    if (preview) {
      preview.srcdoc = html || '<p style="font:13px Arial;color:#999;padding:12px;">Nothing to preview yet.</p>';
    }
  };

  let compileRun = 0;

  function compile(): Promise<void> {
    const run = ++compileRun;

    if (!mjmlField!.value.trim()) {
      setStatus('Enter MJML (body-level elements such as &lt;mj-section&gt;).', 'warning');
      showPreview('');
      if (generated) generated.value = '';
      return Promise.resolve();
    }

    setStatus('Compiling…', 'info');

    return Promise.all([loadMjml(mjmlLibUrl), loadTheme(themeUrl, themeField?.value ?? '')])
      .then(([mjml2html, theme]) => {
        if (run !== compileRun) return; // a newer compile is already running

        let output: MjmlResult;
        try {
          output = mjml2html(buildDocument(mjmlField!.value, theme), {
            validationLevel: 'soft',
            keepComments:    true,
          });
        } catch (e) {
          setStatus(`MJML error: ${(e as Error).message}`, 'danger');
          return;
        }

        const fragment = extractFragment(output.html);
        showPreview(output.html);
        if (generated) generated.value = fragment;
        // Cleared for copy blocks so a block switched back to copy stops carrying stale HTML.
        if (compiled)  compiled.value  = isLinked() ? fragment : '';

        const notes: string[] = [];
        if (themeField?.value && !theme.isMjml) {
          notes.push('The selected theme is not an MJML theme – previewed without theme styles.');
        }
        (output.errors ?? []).forEach(err => notes.push(err.formattedMessage ?? err.message ?? ''));

        if (notes.filter(Boolean).length) {
          setStatus(notes.filter(Boolean).map(n => n.replace(/</g, '&lt;')).join('<br>'), 'warning');
        } else {
          setStatus(
            isLinked()
              ? 'Compiled. This HTML is injected into every email using this block, each time one is sent.'
              : 'Compiled. This is how the block renders inside an email built from the selected theme.',
            'success',
          );
        }
      })
      .catch((e: Error) => setStatus(`Could not compile: ${e.message}`, 'danger'));
  }

  const compileLater = debounce(() => void compile(), 400);

  const applyLinkedMode = (): void => {
    if (usage) usage.style.display = isLinked() ? '' : 'none';
    void compile();
  };

  root.querySelectorAll<HTMLInputElement>('input[name="content_block[linked]"]')
    .forEach(input => input.addEventListener('change', applyLinkedMode));

  /**
   * Compile synchronously right before submit, so saving inside the 400ms debounce window
   * never stores stale HTML against a linked block. Capture phase: ahead of Mautic's ajax
   * handler serialising the form. Copy blocks need nothing here - they submit MJML only.
   */
  if (!submitBound) {
    submitBound = true;
    document.addEventListener('submit', (event: Event) => {
      const form  = document.getElementById('content_block_htmlContent') as HTMLTextAreaElement | null;
      const field = document.getElementById('content_block_compiledHtml') as HTMLInputElement | null;
      const sel   = document.getElementById('content_block_theme') as HTMLSelectElement | null;
      const live  = document.querySelector<HTMLInputElement>('input[name="content_block[linked]"]:checked');

      if (!form || !field || event.target !== form.form || live?.value !== '1') return;

      const theme = themeResolved.get(sel?.value ?? '');
      if (!window.mjml || !theme) return; // the async compile already wrote the best available result

      try {
        const output = window.mjml(buildDocument(form.value, theme), {
          validationLevel: 'soft',
          keepComments:    true,
        });
        field.value = form.value.trim() ? extractFragment(output.html) : '';
      } catch {
        field.value = '';
      }
    }, true);
  }

  mjmlField.addEventListener('input', compileLater);

  if (themeField) {
    themeField.addEventListener('change', () => void compile());
    // Mautic turns selects into Chosen widgets, which fire change through jQuery only.
    window.mQuery?.(themeField).on('change', () => void compile());
  }

  // Tab inserts two spaces instead of leaving the field.
  mjmlField.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || mjmlField.readOnly) return;
    e.preventDefault();
    const s = mjmlField.selectionStart;
    mjmlField.value = `${mjmlField.value.substring(0, s)}  ${mjmlField.value.substring(mjmlField.selectionEnd)}`;
    mjmlField.selectionStart = mjmlField.selectionEnd = s + 2;
  });

  if (!mjmlField.value.trim()) mjmlField.value = STARTER_MJML;

  applyLinkedMode();
}

// Mautic injects the edit form into #app-content by AJAX, often after this bodyClose
// script has run. Mirror contentblocks.admin.ts: observe and initialise when it appears.
function boot(): void {
  init();

  // Absent under the Node test harness, which only needs the pure functions below.
  if (typeof MutationObserver === 'undefined') return;

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; init(); });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Exposed for tests (see Tests/js/contentblocks-editor.test.cjs).
window.CbMjmlEditor = { buildDocument, extractFragment };
