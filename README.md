# MauticContentBlockBundle

## JavaScript / TypeScript Build

Source files live in `Assets/js/src/`. Compiled output goes to `Assets/js/dist/` — that is what Mautic loads.

All commands run from the **plugin root** (`plugins/MauticContentBlockBundle/`).

### Setup

```bash
npm install
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production build — minified, no source maps |
| `npm run build:dev` | Development build — unminified, inline source maps |
| `npm run watch` | Watch mode — recompiles to `dist/` on every `.ts` save |

### Development workflow

```bash
npm run watch
```

Leave the terminal open. Edit any file under `Assets/js/src/`, save, then reload the Mautic page — the updated JS is picked up immediately. No PHP restart needed.

### Source structure

```
Assets/js/
├── src/
│   ├── common/
│   │   └── icons.ts              # Shared SVG icons, flag emojis, helper functions
│   ├── types/
│   │   ├── api.ts                # Request / response interfaces for the editor API
│   │   └── grapesjs.d.ts         # Minimal ambient types for the GrapesJS editor
│   ├── contentblocks.grapesjs.ts # Email builder plugin (loaded on /s/emails/*)
│   ├── contentblocks.admin.ts    # Icon rendering on the list and edit form
│   └── contentblocks.editor.ts   # MJML editor on the block form (live preview)
└── dist/
    └── *.js                      # Compiled output — do not edit directly
```

## Content Blocks tab in the builder

Blocks are not in the core **Blocks** panel. They have their own tab in the sidebar's view
buttons (the stacked-layers icon after Styles / Settings / Layers / Blocks), shown as a
searchable list of rows rather than tiles, so full names fit and nothing sits below the core
MJML blocks. Copy blocks are grouped by category once there is more than one; linked blocks
follow in their own section with their `{contentblock=<id>}` token, showing their own icon
with a small chain badge. Drag a row onto the canvas
as usual; right-click a copy block to edit or delete it; **+** imports MJML.

### Save as Block

The puzzle button on a selected `mj-section` / `mj-hero` opens **Save as Block** with a
**Copy block / Linked block** choice. *Copy* saves the section's MJML as before. *Linked*
compiles the section in the browser (the same `common/mjml.ts` helpers as the block form,
against the email's own theme, which is stored as the block's theme), saves MJML + compiled
HTML, and then **replaces the section in the email with the linked block** - so this email is
the first one using it. Ctrl+Z restores the section.

The blocks are never registered with the GrapesJS BlockManager:
`BlockManager.render(definitions, { external: true })` draws them into the tab and keeps native
drag and drop. Anything that expects them in `editor.BlockManager.getAll()` will not find them.

## Copy blocks vs linked blocks

Every block is one of two kinds, set by the **Linked block** toggle on the form.

| | Copy block (default) | Linked block |
|---|---|---|
| Dropping it into an email | Inlines the block's MJML | Inserts `<mj-raw>{contentblock=<id>}</mj-raw>` |
| Editing the block later | Existing emails unchanged | Every future send picks up the new content |
| Editable in the builder | Yes, it is now ordinary email content | No - read-only preview, edit it here instead |
| Stored content | MJML only | MJML **and** compiled HTML |

### How a linked block is identified

By its numeric id, so renaming a block never breaks the emails using it. The id is also why
an email exported to a *different* Mautic instance will not resolve - the token is removed and
the miss logged as `[ContentBlocks]`.

The marker has to survive MJML compilation, because what Mautic sends is the compiled HTML in
`emails.custom_html`, not the MJML in `bundle_grapesjsbuilder.custom_mjml`. `mj-raw` is the one
MJML element that passes its content through verbatim, so the token lands in both.

### Why linked blocks store compiled HTML

Copy blocks never need it - GrapesJS compiles them when they are dropped. A linked block is
injected at send time, where there is no MJML compiler, so the browser compiles it on save into
`compiled_html` and the form refuses to save a linked block whose MJML did not compile. For a
linked block the theme selector therefore stops being cosmetic: it decides the HTML that ships.

### The archive stays faithful

Resolution happens at `EMAIL_ON_SEND`, before Mautic writes the sent body to `email_copies`.
The web view of a sent email renders from that copy and never re-dispatches `EMAIL_ON_DISPLAY`,
so an old email keeps showing the version that actually went out even after the block changes.
No extra storage, no snapshot table. `EMAIL_ON_DISPLAY` only drives previews, which should - and
do - show the current version.

### Safety

Deleting a linked block still referenced by an email is refused, naming the emails
(`ContentBlockRepository::findEmailsUsingBlock()`). Unpublishing one, or deleting it once nothing
references it, removes the token from future sends and logs an error rather than shipping a raw
`{contentblock=…}` to a recipient.

### Performance

One query per sending process loads every published linked block into memory
(`LinkedBlockResolver`), so a 100k broadcast costs one query, not 100k. The cache is dropped when
a block is saved or deleted and after `content_block_cache_ttl` seconds (default 60, set in
`config/local.php`) so long-running workers pick up changes. An email with no linked blocks costs
a single `stripos`.

## MJML block editor

The block form (`/s/content-blocks/new`, `/s/content-blocks/edit/{id}`) edits a block's MJML
with a live preview, ported from the Email Snippets plugin.

Mautic has no server-side MJML compiler — the GrapesJS builder also compiles in the browser —
so `contentblocks.editor.ts` does the same:

1. wraps the block's MJML in the selected theme's `<mj-head>` and `<mj-body>` attributes,
2. compiles it with the vendored `mjml-browser` 4.18 (MIT, `Assets/vendor/`),
3. renders the result in a sandboxed preview iframe,
4. shows the compiled HTML read-only under "Generated HTML".

**The block stores MJML, never the compiled HTML.** GrapesJS compiles it when the block is
dropped into an email, so there is no compile-before-submit step and nothing can go stale.
The `theme` column only records which theme to *preview* against; the stored MJML is theme-free.

The ~1.3 MB compiler is fetched on demand from `data-mjml-lib` on the form, so it never loads
on other admin pages.

Theme parts come from `GET /s/content-blocks/editor/theme/{theme}`
(`Service/ThemeMjmlProvider.php`, which reads the theme the same way the GrapesJS builder does).

### Tests

```bash
node plugins/MauticContentBlockBundle/Tests/js/contentblocks-editor.test.cjs   # build first
bin/phpunit plugins/MauticContentBlockBundle/Tests/Unit                        # token matching rules
```

The JS test runs against the built `dist/` bundle, so run `npm run build` first.

### Adding a new script

1. Create `Assets/js/src/your-script.ts`
2. Add an entry to `build.js`:
   ```js
   { in: 'Assets/js/src/your-script.ts', out: 'Assets/js/dist/your-script.js' },
   ```
3. Register it in `EventListener/AssetsSubscriber.php`:
   ```php
   $assetsEvent->addScript('plugins/MauticContentBlockBundle/Assets/js/dist/your-script.js', 'bodyClose');
   ```
4. Run `npm run build` (or keep `npm run watch` running).
