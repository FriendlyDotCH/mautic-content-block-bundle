// Run: node plugins/MauticContentBlockBundle/Tests/js/contentblocks-editor.test.cjs
const assert = require('assert');
const path   = require('path');

global.window   = global;
global.document = { getElementById: () => null, addEventListener: () => {}, readyState: 'complete' };

require(path.join(__dirname, '../../Assets/vendor/mjml-browser.js'));
require(path.join(__dirname, '../../Assets/js/dist/contentblocks.editor.js'));

const { buildDocument, extractFragment } = window.CbMjmlEditor;

const theme = {
  isMjml: true,
  head: '<mj-title>T</mj-title><mj-preview>Preview text</mj-preview>'
      + '<mj-attributes><mj-text color="#b00020" /></mj-attributes>',
  bodyAttributes: 'width="640px" background-color="#eeeeee"',
};

const block = '<mj-section><mj-column width="50%"><mj-text>Left</mj-text></mj-column>'
            + '<mj-column width="50%"><mj-text><a href="https://example.com">R</a></mj-text></mj-column></mj-section>';

// --- buildDocument -----------------------------------------------------------
const doc = buildDocument(block, theme);
assert.ok(!doc.includes('mj-preview') && !doc.includes('mj-title'), 'mj-preview/mj-title stripped');
assert.ok(doc.includes('<mj-body width="640px" background-color="#eeeeee">'), 'theme body attributes applied');

// --- compile -----------------------------------------------------------------
const out = window.mjml(doc, { validationLevel: 'soft', keepComments: true });
assert.deepStrictEqual(out.errors, [], 'compiles without errors');

// --- extractFragment ---------------------------------------------------------
const fragment = extractFragment(out.html);
assert.ok(!/<body|<html|<head/i.test(fragment), 'no document-level tags');
assert.ok(/^<style/.test(fragment) && fragment.includes('.mj-column-per-50'), 'responsive @media styles kept');
assert.ok(fragment.includes('#b00020'), 'theme mj-attributes inlined');
assert.ok(fragment.includes('max-width:640px'), 'theme width applied');
assert.ok(fragment.includes('<!--[if mso | IE]>'), 'Outlook conditional comments kept');
assert.ok(!fragment.includes('Preview text'), 'no theme preview text leaked');

// --- no theme ----------------------------------------------------------------
const plain = buildDocument(block, { isMjml: false, head: '', bodyAttributes: '' });
assert.ok(plain.startsWith('<mjml><mj-body>'), 'no-theme document has a bare mj-body');
assert.deepStrictEqual(window.mjml(plain, { validationLevel: 'soft' }).errors, [], 'compiles without a theme');

console.log('OK - contentblocks editor tests passed');
