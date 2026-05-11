(function () {
    'use strict';

    // ── Styles (injected once, globally) ─────────────────────────────
    if (!document.getElementById('cb-styles')) {
        var s = document.createElement('style');
        s.id = 'cb-styles';
        s.textContent = [
            '.cb-dots-wrap{position:relative;display:inline-block}',
            '.cb-dots-btn{background:none;border:none;padding:2px 7px;cursor:pointer;color:#bbb;font-size:18px;line-height:1;border-radius:4px}',
            '.cb-dots-btn:hover{background:#eee;color:#555}',
            '.cb-dropdown{display:none;position:absolute;left:0;top:100%;z-index:9999;background:#fff;border:1px solid #ddd;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.12);min-width:160px;overflow:hidden}',
            '.cb-dropdown.open{display:block}',
            '.cb-dropdown a{display:flex;align-items:center;gap:8px;padding:9px 14px;font-size:13px;color:#444;text-decoration:none;cursor:pointer}',
            '.cb-dropdown a:hover{background:#f5f5f5}',
            '.cb-dropdown .cb-delete-btn{color:#d9534f}',
            '.cb-dropdown a i{font-size:14px;width:16px;text-align:center}',
            '.cb-toggle.btn-ghost{padding:0 2px;line-height:1;display:inline-flex;align-items:center;vertical-align:middle;border:none;background:none;}',
            '.cb-emoji-opt{cursor:pointer;padding:3px 4px;border-radius:4px;display:inline-block;line-height:1;}',
            '.cb-emoji-opt:hover{background:#e0e0e0}',
            '.cb-emoji-opt.selected{background:#c8e0c8;outline:2px solid #7c9a6d;}',
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
    function buildIconGrid(gridEl, previewId, labelId, hiddenId, initial) {
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
            if (hiddenId) document.getElementById(hiddenId).value = gridEl._sel;
            renderIconPreview(previewId, gridEl._sel);
            if (lbl) lbl.textContent = gridEl._sel ? 'Selected (click again to clear)' : 'None selected — click an icon below';
        });
    }

    // ── Utility ──────────────────────────────────────────────────────
    function getCsrf() { return typeof mauticAjaxCsrf !== 'undefined' ? mauticAjaxCsrf : ''; }
    function post(url, body) {
        return fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type':     'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-Token':     getCsrf(),
            },
            body: body ? body.toString() : '',
        });
    }
    function closeDropdowns() { document.querySelectorAll('.cb-dropdown.open').forEach(function (d) { d.classList.remove('open'); }); }
    function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
    function escHtml(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    // ── Mautic SPA entry point ───────────────────────────────────────
    // Called by Mautic's SPA whenever a page with mauticContent='contentBlock' loads.
    Mautic.contentBlockOnLoad = function (container) {
        // Mautic passes a CSS selector string (e.g. '#app-content'); resolve to DOM node.
        var el = (typeof container === 'string' ? document.querySelector(container) : null) || document;

        // Render icons for rows already in the table
        el.querySelectorAll('.cb-icon-cell').forEach(function (s) { renderIconCell(s, s.dataset.emoji); });

        // ── New Block ────────────────────────────────────────────────
        var newBtn     = document.getElementById('cb-new-btn');
        var newSaveBtn = document.getElementById('cb-new-save');

        if (newBtn) {
            newBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (newSaveBtn) { newSaveBtn.textContent = 'Save Block'; newSaveBtn.disabled = false; }
                document.getElementById('cb-new-name').value = '';
                document.getElementById('cb-new-category').value = '';
                document.getElementById('cb-new-code').value = '';
                document.getElementById('cb-new-err').style.display = 'none';
                buildIconGrid(document.getElementById('cb-new-emoji-grid'), 'cb-new-icon-preview', 'cb-new-icon-label', null, '');
                mQuery('#cb-new-modal').modal('show');
                setTimeout(function () { document.getElementById('cb-new-name').focus(); }, 300);
            });
        }

        if (newSaveBtn) {
            newSaveBtn.addEventListener('click', function () {
                var name  = document.getElementById('cb-new-name').value.trim();
                var code  = document.getElementById('cb-new-code').value.trim();
                var errEl = document.getElementById('cb-new-err');
                if (!name) { errEl.textContent = 'Block name is required.'; errEl.style.display = 'block'; return; }
                if (!code) { errEl.textContent = 'Code is required.'; errEl.style.display = 'block'; return; }
                errEl.style.display = 'none';
                var icon  = document.getElementById('cb-new-emoji-grid')._sel || '';
                var cat   = document.getElementById('cb-new-category').value.trim() || 'general';
                newSaveBtn.textContent = 'Saving…';
                newSaveBtn.disabled = true;
                var params = new URLSearchParams();
                params.append('name', name);
                params.append('icon', icon);
                params.append('htmlContent', code);
                params.append('category', cat);
                post(mauticBasePath + '/s/content-blocks/save', params)
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        if (data.error) {
                            newSaveBtn.textContent = 'Save Block';
                            newSaveBtn.disabled = false;
                            errEl.textContent = data.error;
                            errEl.style.display = 'block';
                            return;
                        }
                        mQuery('#cb-new-modal').modal('hide');
                        window.location.reload();
                    })
                    .catch(function () {
                        newSaveBtn.textContent = 'Save Block';
                        newSaveBtn.disabled = false;
                        errEl.textContent = 'Save failed — see console.';
                        errEl.style.display = 'block';
                    });
            });
        }

        // ── Dropdowns (event delegation on container) ────────────────
        el.addEventListener('click', function (e) { if (!e.target.closest('.cb-dots-wrap')) closeDropdowns(); });
        el.addEventListener('click', function (e) {
            var btn = e.target.closest('.cb-dots-btn');
            if (!btn) return;
            e.stopPropagation();
            var dd  = btn.closest('.cb-dots-wrap').querySelector('.cb-dropdown');
            var was = dd.classList.contains('open');
            closeDropdowns();
            if (!was) dd.classList.add('open');
        });

        // ── Toggle ───────────────────────────────────────────────────
        el.addEventListener('click', function (e) {
            var btn = e.target.closest('.cb-toggle');
            if (!btn) return;
            var p  = btn.dataset.published !== '1';
            btn.dataset.published = p ? '1' : '0';
            var ic = btn.querySelector('i');
            if (ic) { ic.className = 'ri-toggle-' + (p ? 'fill' : 'line') + ' font-size-20'; ic.style.color = p ? '#00b19d' : '#bbb'; }
            post(mauticBasePath + '/s/content-blocks/toggle/' + btn.dataset.id);
        });

        // ── Check all ────────────────────────────────────────────────
        var ca = document.getElementById('cb-check-all');
        if (ca) ca.addEventListener('change', function () { document.querySelectorAll('.cb-row-check').forEach(function (c) { c.checked = ca.checked; }); });

        // ── Delete ───────────────────────────────────────────────────
        el.addEventListener('click', function (e) {
            var btn = e.target.closest('.cb-delete-btn');
            if (!btn) return;
            closeDropdowns();
            if (!confirm('Delete "' + btn.dataset.name + '"? This cannot be undone.')) return;
            var row = document.getElementById('cb-row-' + btn.dataset.id);
            if (row) { row.style.opacity = '0.3'; row.style.pointerEvents = 'none'; }
            post(mauticBasePath + '/s/content-blocks/delete/' + btn.dataset.id)
                .then(function () { if (row) row.remove(); });
        });

        // ── Rename ───────────────────────────────────────────────────
        el.addEventListener('click', function (e) {
            var btn = e.target.closest('.cb-rename-btn');
            if (!btn) return;
            closeDropdowns();
            document.getElementById('cb-rename-id').value       = btn.dataset.id;
            document.getElementById('cb-rename-name').value     = btn.dataset.name;
            document.getElementById('cb-rename-category').value = btn.dataset.category;
            document.getElementById('cb-rename-icon').value     = btn.dataset.icon || '';
            buildIconGrid(document.getElementById('cb-rename-emoji-grid'), 'cb-rename-icon-preview', 'cb-rename-icon-label', 'cb-rename-icon', btn.dataset.icon || '');
            mQuery('#cb-rename-modal').modal('show');
        });

        var renameSaveBtn = document.getElementById('cb-rename-save');
        if (renameSaveBtn) {
            renameSaveBtn.addEventListener('click', function () {
                var id   = document.getElementById('cb-rename-id').value;
                var name = document.getElementById('cb-rename-name').value.trim();
                var cat  = document.getElementById('cb-rename-category').value.trim() || 'general';
                var icon = document.getElementById('cb-rename-icon').value.trim();
                if (!name) { alert('Name is required.'); return; }
                var row = document.getElementById('cb-row-' + id);
                if (row) {
                    row.querySelector('.cb-name-text').textContent = name;
                    var rb = row.querySelector('.cb-rename-btn');
                    if (rb) { rb.dataset.name = name; rb.dataset.category = cat; rb.dataset.icon = icon; }
                    var ic = row.querySelector('.cb-icon-cell');
                    if (ic) { ic.dataset.emoji = icon; renderIconCell(ic, icon); }
                }
                mQuery('#cb-rename-modal').modal('hide');
                post(mauticBasePath + '/s/content-blocks/edit/' + id, new URLSearchParams({ name: name, category: cat, icon: icon }));
            });
        }

        // ── Edit Code ────────────────────────────────────────────────
        el.addEventListener('click', function (e) {
            var btn = e.target.closest('.cb-code-btn');
            if (!btn) return;
            closeDropdowns();
            document.getElementById('cb-code-id').value = btn.dataset.id;
            var tmp = document.createElement('textarea');
            tmp.innerHTML = btn.dataset.html;
            document.getElementById('cb-code-html').value = tmp.value;
            mQuery('#cb-code-modal').modal('show');
        });

        var codeSaveBtn = document.getElementById('cb-code-save');
        if (codeSaveBtn) {
            codeSaveBtn.addEventListener('click', function () {
                var id = document.getElementById('cb-code-id').value;
                mQuery('#cb-code-modal').modal('hide');
                post(mauticBasePath + '/s/content-blocks/edit/' + id, new URLSearchParams({ htmlContent: document.getElementById('cb-code-html').value }));
            });
        }
    };

    // ── Edit page entry point ────────────────────────────────────────
    Mautic.contentBlockEditOnLoad = function () {
        var grid     = document.getElementById('cb-edit-emoji-grid');
        var iconInput = document.getElementById('cb-edit-icon');
        if (!grid || !iconInput) return;

        buildIconGrid(grid, 'cb-edit-icon-preview', 'cb-edit-icon-label', 'cb-edit-icon', iconInput.value);
    };

}());
