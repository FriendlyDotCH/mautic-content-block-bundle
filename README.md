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
