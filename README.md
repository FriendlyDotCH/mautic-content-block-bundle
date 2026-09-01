# MauticContentBlockBundle

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

## Installing for local development

This plugin lives in its own repository (`friendly/mautic-content-block-bundle`,
package type `mautic-plugin`) and is developed as a checkout inside a working
Mautic instance's `plugins/` directory. Pick one of the two methods below to
get the code in place, then run the shared "Enable the plugin" steps.

### Option A — plain git clone (fastest for day-to-day dev)

```bash
cd <mautic-root>/plugins
git clone git@github.com:friendly/mautic-content-block-bundle.git MauticContentBlockBundle
```

The directory name must be exactly `MauticContentBlockBundle` — Mautic
discovers plugins by folder name, not by the git repo name.

### Option B — via Composer

Mautic ships with `composer/installers`, which understands this plugin's
`type: mautic-plugin` and its `extra.install-directory-name` and will place it
at `plugins/MauticContentBlockBundle` automatically.

1. From the **Mautic root** `composer.json`, add a repository pointing at this
   plugin's git remote (Packagist doesn't host it):
   ```json
   {
     "repositories": [
       {
         "type": "vcs",
         "url": "git@github.com:friendly/mautic-content-block-bundle.git"
       }
     ]
   }
   ```
2. Require the package (use `dev-develop` or `dev-main` to track a branch
   while developing, or a tagged version once one is cut):
   ```bash
   composer require friendly/mautic-content-block-bundle:dev-develop
   ```
3. If you need to edit the plugin's code in place rather than through
   Composer's `vendor`-style checkout, use a `path` repository instead of
   `vcs`, pointing at a local clone, e.g.:
   ```json
   {
     "repositories": [
       { "type": "path", "url": "../mautic-content-block-bundle", "options": { "symlink": true } }
     ]
   }
   ```
   then `composer require friendly/mautic-content-block-bundle:@dev` —
   this symlinks the plugin into `plugins/MauticContentBlockBundle` so edits
   in the source checkout are picked up immediately.

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
│   └── contentblocks.grapesjs.ts # Email builder plugin (loaded on /s/emails/*)
└── dist/
    └── contentblocks.grapesjs.js # Compiled output — do not edit directly
```

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
