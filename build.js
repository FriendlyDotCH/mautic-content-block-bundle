import * as esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args      = process.argv.slice(2);
const isWatch   = args.includes('--watch');
const isMinify  = args.includes('--minify');

const shared = {
  bundle:    true,
  format:    'iife',
  target:    ['es2022'],
  sourcemap: isMinify ? false : 'inline',
  minify:    isMinify,
};

const entries = [
  { in: 'Assets/js/src/contentblocks.grapesjs.ts', out: 'Assets/js/dist/contentblocks.grapesjs.js' },
  { in: 'Assets/js/src/contentblocks.admin.ts',   out: 'Assets/js/dist/contentblocks.admin.js' },
];

const configs = entries.map(e => ({
  ...shared,
  entryPoints: [resolve(__dirname, e.in)],
  outfile:     resolve(__dirname, e.out),
}));

if (isWatch) {
  const ctxs = await Promise.all(configs.map(c => esbuild.context(c)));
  await Promise.all(ctxs.map(ctx => ctx.watch()));
  console.log('[esbuild] Watching for changes in Assets/js/src/…');
} else {
  await Promise.all(configs.map(c => esbuild.build(c)));
  console.log('[esbuild] Build complete.');
}
