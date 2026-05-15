(function () {
    'use strict';

    // ── Styles (injected once, globally) ─────────────────────────────
    if (!document.getElementById('cb-styles')) {
        var s = document.createElement('style');
        s.id = 'cb-styles';
        s.textContent = [
            '.cb-name-text{color:#4e5d6c;font-weight:500;}',
            '.cb-name-text:hover{color:#00b19d;text-decoration:underline;}'
        ].join('');
        document.head.appendChild(s);
    }

    // ── Icon definitions ─────────────────────────────────────────────
    var SVG_ICONS = {
        header:   '<svg viewBox="0 0 60 50" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="4" width="52" height="16" rx="2" fill="currentColor" opacity=".9"/><line x1="4" y1="28" x2="56" y2="28"/><line x1="4" y1="36" x2="44" y2="36"/><line x1="4" y1="44" x2="50" y2="44"/></svg>',
        footer:   '<svg viewBox="0 0 60 50" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="6" x2="56" y2="6"/><line x1="4" y1="14" x2="44" y2="14"/><line x1="4" y1="22" x2="50" y2="22"/><rect x="4" y="30" width="52" height="16" rx="2" fill="currentColor" opacity=".9"/></svg>',
        hero:     '<svg viewBox="0 0 60 50" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="4" width="52" height="30" rx="2"/><line x1="14" y1="16" x2="46" y2="16" stroke-width="3"/><line x1="18" y1="23" x2="42" y2="23"/><rect x="20" y="38" width="20" height="8" rx="3" fill="currentColor" opacity=".8"/></svg>',
        text:     '<svg viewBox="0 0 60 50" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="10" x2="56" y2="10"/><line x1="4" y1="20" x2="56" y2="20"/><line x1="4" y1="30" x2="56" y2="30"/><line x1="4" y1="40" x2="36" y2="40"/></svg>',
        image:    '<svg viewBox="0 0 60 50" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="6" width="52" height="38" rx="3"/><circle cx="18" cy="18" r="5" fill="currentColor" opacity=".7"/><polyline points="4,38 18,24 30,32 42,20 56,34" stroke-width="2.5"/></svg>',
        button:   '<svg viewBox="0 0 60 50" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="10" x2="56" y2="10"/><line x1="4" y1="18" x2="44" y2="18"/><rect x="10" y="28" width="40" height="14" rx="7" stroke="currentColor" fill="currentColor" opacity=".2"/><line x1="22" y1="35" x2="38" y2="35" stroke-width="2"/></svg>',
        columns2: '<svg viewBox="0 0 60 50" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="4" width="24" height="42" rx="2"/><rect x="32" y="4" width="24" height="42" rx="2"/></svg>',
        columns3: '<svg viewBox="0 0 60 50" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="4" width="17" height="42" rx="2"/><rect x="21" y="4" width="17" height="42" rx="2"/><rect x="40" y="4" width="17" height="42" rx="2"/></svg>',
        divider:  '<svg viewBox="0 0 60 50" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="14" x2="56" y2="14"/><line x1="4" y1="25" x2="56" y2="25" stroke-width="4"/><line x1="4" y1="36" x2="56" y2="36"/></svg>',
        social:   '<svg viewBox="0 0 60 50" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="25" r="7"/><circle cx="30" cy="25" r="7"/><circle cx="48" cy="25" r="7"/></svg>',
        video:    '<svg viewBox="0 0 60 50" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="6" width="52" height="38" rx="3"/><polygon points="24,16 24,34 42,25" fill="currentColor" opacity=".8"/></svg>',
        cta:      '<svg viewBox="0 0 60 50" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="10" x2="56" y2="10"/><line x1="4" y1="18" x2="44" y2="18"/><rect x="4" y="28" width="52" height="14" rx="7" fill="currentColor" opacity=".25"/><line x1="16" y1="35" x2="44" y2="35" stroke-width="2.5"/></svg>',
    };
    var FLAG_EMOJIS = [
        '🇨🇭','🇩🇪','🇫🇷','🇮🇹','🇬🇧','🇺🇸','🇦🇹','🇧🇪','🇳🇱','🇸🇪',
        '🇪🇸','🇵🇱','🇨🇿','🇸🇰','🇭🇺','🇷🇴','🇷🇸','🇭🇷','🇧🇬','🇸🇮',
    ];

    // ── Twemoji helpers ──────────────────────────────────────────────
    function emojiUrl(emoji) {
        var cp = [];
        for (var i = 0; i < emoji.length; ) {
            var code = emoji.codePointAt(i);
            cp.push(code.toString(16));
            i += code > 0xFFFF ? 2 : 1;
        }
        return 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0/assets/svg/' +
               cp.filter(function (c) { return c !== 'fe0f'; }).join('-') + '.svg';
    }

    function renderIconCell(span, icon) {
        span.innerHTML = '';
        if (!icon) return;
        if (SVG_ICONS[icon]) {
            span.innerHTML = SVG_ICONS[icon];
            var svg = span.querySelector('svg');
            if (svg) svg.style.cssText = 'width:18px;height:18px;vertical-align:middle;color:#666;';
        } else {
            var img = document.createElement('img');
            img.src = emojiUrl(icon);
            img.style.cssText = 'width:20px;height:20px;vertical-align:middle;';
            img.onerror = function () { span.textContent = icon; };
            span.appendChild(img);
        }
    }

    function renderIconPreview(spanId, icon) {
        var span = document.getElementById(spanId);
        if (!span) return;
        span.innerHTML = '';
        if (!icon) return;
        if (SVG_ICONS[icon]) {
            span.innerHTML = SVG_ICONS[icon];
            var svg = span.querySelector('svg');
            if (svg) svg.style.cssText = 'width:28px;height:28px;color:#555;';
        } else {
            var img = document.createElement('img');
            img.src = emojiUrl(icon);
            img.style.cssText = 'width:28px;height:28px;vertical-align:middle;';
            img.onerror = function () { span.textContent = icon; };
            span.appendChild(img);
        }
    }

    // ── Icon grid builder ────────────────────────────────────────────
    // hiddenEl may be an element reference or a string id (legacy)
    function buildIconGrid(gridEl, previewId, labelId, hiddenEl, initial) {
        if (typeof hiddenEl === 'string') hiddenEl = document.getElementById(hiddenEl);
        gridEl.innerHTML = '';
        gridEl._sel = initial || '';
        var secStyle = 'font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin:8px 0 4px;';

        var secLayout = document.createElement('div');
        secLayout.style.cssText = secStyle;
        secLayout.textContent = 'Layout';
        gridEl.appendChild(secLayout);

        var rowLayout = document.createElement('div');
        rowLayout.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;';
        Object.keys(SVG_ICONS).forEach(function (id) {
            var span = document.createElement('span');
            span.className = 'cb-icon-opt' + (id === gridEl._sel ? ' selected' : '');
            span.dataset.icon = id;
            span.style.cssText = 'cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:5px;color:#555;flex-shrink:0;border:1px solid #ddd;' + (id === gridEl._sel ? 'background:#d0e8d0;' : '');
            span.innerHTML = SVG_ICONS[id];
            span.querySelector('svg').style.cssText = 'width:26px;height:26px;pointer-events:none;';
            rowLayout.appendChild(span);
        });
        gridEl.appendChild(rowLayout);

        var secLang = document.createElement('div');
        secLang.style.cssText = secStyle;
        secLang.textContent = 'Language';
        gridEl.appendChild(secLang);

        var rowLang = document.createElement('div');
        rowLang.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
        FLAG_EMOJIS.forEach(function (e) {
            var span = document.createElement('span');
            span.className = 'cb-icon-opt' + (e === gridEl._sel ? ' selected' : '');
            span.dataset.icon = e;
            span.style.cssText = 'cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:5px;flex-shrink:0;border:1px solid #ddd;' + (e === gridEl._sel ? 'background:#d0e8d0;' : '');
            var img = document.createElement('img');
            img.src = emojiUrl(e);
            img.style.cssText = 'width:24px;height:24px;pointer-events:none;';
            img.onerror = function () { span.textContent = e; };
            span.appendChild(img);
            rowLang.appendChild(span);
        });
        gridEl.appendChild(rowLang);

        renderIconPreview(previewId, gridEl._sel);
        var lbl = document.getElementById(labelId);
        if (lbl) lbl.textContent = gridEl._sel ? 'Selected (click again to clear)' : 'None selected — click an icon below';

        gridEl.addEventListener('click', function (ev) {
            var opt = ev.target.closest('.cb-icon-opt');
            if (!opt) return;
            var icon = opt.dataset.icon;
            var same = gridEl._sel === icon;
            gridEl.querySelectorAll('.cb-icon-opt.selected').forEach(function (o) {
                o.classList.remove('selected');
                o.style.background = '';
            });
            gridEl._sel = same ? '' : icon;
            if (!same) { opt.classList.add('selected'); opt.style.background = '#d0e8d0'; }
            if (hiddenEl) hiddenEl.value = gridEl._sel;
            renderIconPreview(previewId, gridEl._sel);
            if (lbl) lbl.textContent = gridEl._sel ? 'Selected (click again to clear)' : 'None selected — click an icon below';
        });
    }

    // ── List page entry point ────────────────────────────────────────
    Mautic.contentBlockOnLoad = function (container) {
        var el = (typeof container === 'string' ? document.querySelector(container) : null) || document;

        el.querySelectorAll('.cb-icon-cell').forEach(function (s) { renderIconCell(s, s.dataset.emoji); });

        setTimeout(function () {
            if (Mautic.loadedContent) delete Mautic.loadedContent.contentBlock;
        }, 0);
    };

    // ── New / Edit page entry point ──────────────────────────────────
    Mautic.contentBlockEditOnLoad = function () {
        var grid      = document.getElementById('cb-form-emoji-grid');
        var iconInput = document.querySelector('[name="content_block[icon]"]');
        if (!grid || !iconInput) return;

        buildIconGrid(grid, 'cb-form-icon-preview', 'cb-form-icon-label', iconInput, iconInput.value);

        // Mautic caches loadedContent per mauticContent key; reset after Mautic sets it
        // so repeated SPA navigations to new/edit pages re-initialize the icon picker.
        setTimeout(function () {
            if (Mautic.loadedContent) delete Mautic.loadedContent.contentBlockEdit;
        }, 0);
    };

}());
