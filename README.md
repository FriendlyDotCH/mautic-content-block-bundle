# MauticContentBlockBundle

## Development
Reusable, saved content blocks for the Mautic 5/7 GrapesJS page and email builder.

Editors can save a selection from the GrapesJS canvas as a named block (with an
optional icon/thumbnail and category), then reuse it across other emails and
pages via the block panel. Blocks are stored as their own entity
(`friendly_content_blocks`) with full CRUD exposed both as a Mautic-native
CRUD controller (`/content-blocks/...`, list/view/edit/delete UI) and as an
AJAX API consumed by the GrapesJS editor (`/content-blocks/editor`, used to
list, create, update and delete blocks from within the builder). Access is
gated by the plugin's own permissions (`contentBlock:blocks:*`).

## Requirements

- Mautic **7.0** (`mautic/core-lib: ^7.0`)
- PHP **8.2 – 8.5**
- Node.js (for building the GrapesJS plugin assets, see below)

## Installing

Pick one of the two methods below to get the code in place, then run the
shared "Enable the plugin" steps.

### Option A — via Composer

The package is published on Packagist as
[`friendly/mautic-content-block-bundle`](https://packagist.org/packages/friendly/mautic-content-block-bundle).
Mautic ships with `composer/installers`, which understands this plugin's
`type: mautic-plugin` and its `extra.install-directory-name` and will place it
at `plugins/MauticContentBlockBundle` automatically.

From the **Mautic root**, require the package:

```bash
composer require friendly/mautic-content-block-bundle
```

### Option B — place directly in the plugins folder

Download or clone the plugin into your Mautic instance's `plugins/`
directory, making sure the directory name is exactly
`MauticContentBlockBundle` — Mautic discovers plugins by folder name.

```bash
cd <mautic-root>/plugins
git clone git@github.com:friendly/mautic-content-block-bundle.git MauticContentBlockBundle
```

### Enable the plugin (both options)

1. From the Mautic root, install/refresh the plugin so Mautic picks up its
   routes, permissions and database schema:
   ```bash
   bin/console mautic:plugins:install
   # or, if the plugin was already installed before and you just changed PHP:
   bin/console mautic:plugins:reload
   bin/console cache:clear
   ```
   This runs the plugin's `Migrations/` to create the `friendly_content_blocks`
   table.
2. Build the plugin's JavaScript (see below) so the GrapesJS integration is
   available in the email/page builder.
3. Log in to Mautic and check **Settings > Plugins** — "Friendly Content
   Blocks Plugin" should be listed, and a **Content Blocks** entry should
   appear in the main menu.

If you're using the DDEV-based Mautic setup (`ddev start` from the Mautic
root), run the commands above with `ddev exec` (or `ddev ssh` first), e.g.
`ddev exec bin/console mautic:plugins:install`.

## JavaScript / TypeScript Build

### Prerequisites

- A running Mautic dev instance with this plugin in `plugins/MauticContentBlockBundle/`
  (this repo uses DDEV: `https://tf79formtest.ddev.site:30001`).
- Node.js 22+ and npm, only for building the JavaScript. Use the one on your machine or the one
  in the DDEV web container (Node 24). Production installs never need Node: `Assets/js/dist/` is committed.

All `npm` commands run from the **plugin root** (`plugins/MauticContentBlockBundle/`). With DDEV, run
them in the container instead:

```bash
ddev exec --dir /var/www/html/plugins/MauticContentBlockBundle npm run watch
```

### First-time setup

```bash
# 1. JavaScript dependencies (esbuild, TypeScript, mjml-browser)
cd plugins/MauticContentBlockBundle
npm install
npm run build

# 2. Register the plugin and run its migrations (from the Mautic root)
ddev exec bin/console mautic:plugins:reload
ddev exec bin/console cache:clear
```

Then open *Settings > Plugins*. The **Content Blocks** card is already enabled: the integration
publishes itself when Mautic first creates its row, and it cannot be unpublished (its Enabled/Auth
tab shows a note instead of the toggle, see `Form/Extension/IntegrationConfigTypeExtension.php`).
Its *Features* tab holds the plugin's settings.
The blocks themselves are under *Components > Content Blocks*.

### npm scripts

| Command | What it does |
|---------|--------------|
| `npm run build` | Production build: minified, no source maps. **Run this before committing.** |
| `npm run build:dev` | Development build: unminified, inline source maps |
| `npm run watch` | `build:dev` that rebuilds on every save |
| `npm run typecheck` | Type-checks `Assets/js/src/` with `tsc`. esbuild only strips types, so run this before committing too. |

The build is plain esbuild CLI, defined in `package.json` (there is no build script). Every
top-level `Assets/js/src/*.ts` becomes `Assets/js/dist/*.js`. That includes `mjml-browser.js`,
bundled from the pinned `mjml-browser` devDependency. To upgrade mjml, bump its version in
`package.json`, then run `npm install && npm run build` and commit the result.

### Day-to-day workflow

```bash
npm run watch
```

Leave it running, edit files under `Assets/js/src/`, save, and reload the Mautic page. No cache clear is
needed for JavaScript. `AssetsSubscriber` appends the file's modification time (`?cb=…`) to
every plugin script, so the browser fetches the new build instead of a cached one.

Other changes need Mautic to pick them up (run from the Mautic root):

| You changed | Run |
|-------------|-----|
| JavaScript / TypeScript | nothing (just reload the page) |
| PHP services, Twig templates, translations, `Config/` | `ddev exec bin/console cache:clear` |
| Plugin `version` in `Config/config.php`, or added a migration | `ddev exec bin/console mautic:plugins:reload` |

Migrations in `Migrations/` run only when the plugin version in `Config/config.php` goes up. Never edit
a released migration; add a new `Version_X_Y_Z` class instead.

### Before committing

```bash
npm run typecheck
npm run build          # watch leaves unminified dev builds with source maps in dist/
node Tests/js/contentblocks-editor.test.cjs
ddev exec bin/phpunit plugins/MauticContentBlockBundle/Tests/Unit
```

Commit the rebuilt `Assets/js/dist/` together with the source change.

### Source structure

```
Assets/js/
├── src/
│   ├── common/
│   │   ├── icons.ts              # Shared SVG icons, flag emojis, helper functions
│   │   └── mjml.ts               # MJML loading/compiling shared by the form and the builder
│   ├── types/
│   │   ├── api.ts                # Request / response interfaces for the editor API
│   │   ├── grapesjs.d.ts         # Minimal ambient types for the GrapesJS editor
│   │   ├── mjml.d.ts             # window.mjml and friends
│   │   └── mjml-browser.d.ts     # Typing for the untyped mjml-browser package
│   ├── contentblocks.grapesjs.ts # Email builder plugin (loaded on /s/emails/*)
│   ├── contentblocks.admin.ts    # Icon rendering on the list and edit form
│   ├── contentblocks.editor.ts   # MJML editor on the block form (live preview)
│   └── mjml-browser.ts           # Bundles mjml-browser as window.mjml (loaded on demand)
└── dist/
    └── *.js                      # Built output, committed. Do not edit by hand.
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
a block is saved or deleted and after the cache lifetime (default 60 seconds) so long-running
workers pick up changes. The lifetime is set under *Plugins > Content Blocks > Features* and is used
only while that integration is published (it is by default); unpublished or never configured, the
default applies. Content blocks themselves work either way - the integration only holds settings
(`Integration/ContentBlocksIntegration.php`, read through `Service/ContentBlockConfigService.php`). An email with no linked blocks costs
a single `stripos`.

## MJML block editor

The block form (`/s/content-blocks/new`, `/s/content-blocks/edit/{id}`) edits a block's MJML
with a live preview, ported from the Email Snippets plugin.

Mautic has no server-side MJML compiler — the GrapesJS builder also compiles in the browser —
so `contentblocks.editor.ts` does the same:

1. wraps the block's MJML in the selected theme's `<mj-head>` and `<mj-body>` attributes,
2. compiles it with `mjml-browser` 4.18 (MIT, pinned in `package.json`; bundled to `Assets/js/dist/mjml-browser.js`),
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
ddev exec bin/phpunit plugins/MauticContentBlockBundle/Tests/Unit              # token matching, config fallbacks
```

The JS test runs against the built `dist/` bundles (including `dist/mjml-browser.js`), so build first.

### Adding a new script

1. Create `Assets/js/src/your-script.ts`. Any top-level file there is built to `Assets/js/dist/your-script.js`;
   shared code goes in `common/`, typings in `types/`.
2. If it should load on every admin page, add it to `SCRIPTS` in `EventListener/AssetsSubscriber.php`.
3. Run `npm run build` (or keep `npm run watch` running).
