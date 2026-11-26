/**
 * MJML compile helpers shared by the block form (contentblocks.editor.ts) and the builder's
 * "Save as Block" modal, so a linked block compiles the same way wherever it is saved.
 */

import '../types/mjml.d';

export interface ThemeParts {
  isMjml:         boolean;
  head:           string;
  bodyAttributes: string;
}

export const NO_THEME: ThemeParts = { isMjml: false, head: '', bodyAttributes: '' };

let mjmlLoading: Promise<Mjml2Html> | null = null;

export function loadMjml(url: string): Promise<Mjml2Html> {
  if (window.mjml) return Promise.resolve(window.mjml);

  if (!mjmlLoading) {
    mjmlLoading = new Promise<Mjml2Html>((resolve, reject) => {
      const script = document.createElement('script');
      script.src     = url;
      script.onload  = () => {
        window.mjml ? resolve(window.mjml) : reject(new Error('mjml-browser did not register window.mjml'));
      };
      script.onerror = () => { mjmlLoading = null; reject(new Error(`Could not load ${url}`)); };
      document.head.appendChild(script);
    });
  }

  return mjmlLoading;
}

/**
 * Build the MJML document the block is compiled in.
 * mj-preview / mj-title are dropped: they would add hidden preview text to the output.
 */
export function buildDocument(blockMjml: string, theme: ThemeParts): string {
  const head = (theme.head || '').replace(/<mj-(preview|title)\b[\s\S]*?<\/mj-\1>/gi, '');

  return '<mjml>' +
    (head ? `<mj-head>${head}</mj-head>` : '') +
    `<mj-body${theme.bodyAttributes ? ` ${theme.bodyAttributes}` : ''}>` +
    blockMjml +
    '</mj-body></mjml>';
}

/**
 * Full compiled email -> the fragment this block contributes.
 * Keeps everything inside the mj-body wrapper div (sections incl. Outlook conditional
 * comments) plus <style> blocks carrying @media rules (responsive column widths).
 */
export function extractFragment(html: string): string {
  const bodyOpen = html.match(/<body\b[^>]*>/i);
  if (!bodyOpen || bodyOpen.index === undefined) return html;

  const start = bodyOpen.index + bodyOpen[0].length;
  const end   = html.lastIndexOf('</body>');
  let   body  = html.substring(start, end === -1 ? html.length : end).trim();

  const wrapper = body.match(/^<div\b[^>]*>([\s\S]*)<\/div>$/i);
  if (wrapper?.[1]) body = wrapper[1].trim();

  const styles = (html.substring(0, bodyOpen.index).match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) ?? [])
    .filter(style => /@media/i.test(style));

  return `${styles.join('\n')}\n${body}`.trim();
}
