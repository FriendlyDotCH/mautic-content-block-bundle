/**
 * MauticContentBlockBundle — GrapesJS Plugin v5
 * Email builder only (mj-section + mj-hero, MJML).
 */
(function () {
    'use strict';

    var LIST_ENDPOINT  = mauticBasePath + '/s/content-blocks/editor';
    var SAVE_ENDPOINT  = mauticBasePath + '/s/content-blocks/editor';
    var PANEL_CATEGORY = 'Saved Blocks';
    var COMMAND_SAVE   = 'contentblock:save';

    // -----------------------------------------------------------------------
    // Icon definitions
    // -----------------------------------------------------------------------

    // Named SVG icons — GrapesJS monochrome style
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
    var SVG_LABELS = {
        header:'Header', footer:'Footer', hero:'Hero', text:'Text', image:'Image',
        button:'Button', columns2:'2 Cols', columns3:'3 Cols', divider:'Divider',
        social:'Social', video:'Video', cta:'CTA',
    };

    // Flag emojis rendered via Twemoji CDN
    var FLAG_EMOJIS = [
        '🇨🇭','🇩🇪','🇫🇷','🇮🇹','🇬🇧','🇺🇸','🇦🇹','🇧🇪','🇳🇱','🇸🇪',
        '🇪🇸','🇵🇱','🇨🇿','🇸🇰','🇭🇺','🇷🇴','🇷🇸','🇭🇷','🇧🇬','🇸🇮',
    ];

    // Puzzle piece fallback (no icon set)
    var PUZZLE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
        'stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 ' +
        '2v3.8h1.5a2.5 2.5 0 0 1 0 5H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.5 2.5 0 0 1 5 0V22H17a2 ' +
        '2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"/></svg>';

    // Is the stored icon value an emoji (non-ASCII) or a named SVG id?
    function isEmoji(icon) {
        return icon && /[^\x00-\x7F]/.test(icon);
    }

    function emojiToTwemojiUrl(emoji) {
        var codePoints = [];
        for (var i = 0; i < emoji.length; ) {
            var code = emoji.codePointAt(i);
            codePoints.push(code.toString(16));
            i += code > 0xFFFF ? 2 : 1;
        }
        codePoints = codePoints.filter(function (c) { return c !== 'fe0f'; });
        return 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0/assets/svg/' + codePoints.join('-') + '.svg';
    }

    function iconToMedia(icon) {
        if (!icon) return PUZZLE_ICON;
        if (isEmoji(icon)) {
            return '<img src="' + emojiToTwemojiUrl(icon) + '" style="width:40px;height:40px;" />';
        }
        // Named SVG id
        return SVG_ICONS[icon] || PUZZLE_ICON;
    }

    // -----------------------------------------------------------------------

    if (typeof MauticGrapesJsPlugins === 'undefined') {
        window.MauticGrapesJsPlugins = [];
    }

    MauticGrapesJsPlugins.push({
        name:   'mautic-content-blocks',
        plugin: function (editor) {
            if (!editor.DomComponents.getType('mj-section')) {
                console.info('[ContentBlocks] Not an email builder — skipping.');
                return;
            }
            console.info('[ContentBlocks] Email builder detected — initialising.');
            ensureModal();
            loadAndRegister(editor);
            addSaveAsBlockCommand(editor);
        },
    });

    // -----------------------------------------------------------------------
    // Blocks panel
    // -----------------------------------------------------------------------
    function registerBlock(editor, block) {
        editor.BlockManager.add('content-block-' + block.id, {
            label:    block.name,
            category: { id: PANEL_CATEGORY, label: PANEL_CATEGORY, open: true },
            media:    iconToMedia(block.icon || ''),
            content:  block.htmlContent,
        });
    }

    function loadAndRegister(editor) {
        fetch(LIST_ENDPOINT, {
            headers:     { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
            credentials: 'same-origin',
        })
        .then(function (r) { return r.ok ? r.json() : {}; })
        .then(function (data) {
            var blocks = Array.isArray(data) ? data : (data.blocks || []);
            blocks.forEach(function (b) { registerBlock(editor, b); });
            console.info('[ContentBlocks] Loaded ' + blocks.length + ' block(s).');
        })
        .catch(function (e) { console.warn('[ContentBlocks] Load failed:', e); });
    }

    // -----------------------------------------------------------------------
    // Save command + toolbar button
    // -----------------------------------------------------------------------
    function addSaveAsBlockCommand(editor) {

        editor.Commands.add(COMMAND_SAVE, {
            run: function (ed) {
                var component = ed.getSelected();
                if (!component) return;

                showModal(function (name, icon, saveBtn) {
                    saveBtn.textContent = 'Saving…';
                    saveBtn.disabled    = true;

                    var token  = (typeof mauticAjaxCsrf !== 'undefined') ? mauticAjaxCsrf : '';
                    var params = new URLSearchParams();
                    params.append('name',        name);
                    params.append('icon',        icon);
                    params.append('htmlContent', component.toHTML());

                    fetch(SAVE_ENDPOINT, {
                        method:      'POST',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type':     'application/x-www-form-urlencoded',
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-CSRF-Token':     token,
                        },
                        body: params.toString(),
                    })
                    .then(function (r) {
                        return r.text().then(function (text) {
                            try { return JSON.parse(text); }
                            catch (e) { return { _rawError: text.substring(0, 300) }; }
                        });
                    })
                    .then(function (data) {
                        if (data._rawError) {
                            showError('Server error: ' + data._rawError);
                            saveBtn.textContent = 'Save'; saveBtn.disabled = false;
                            return;
                        }
                        if (data.flashes || data.error) {
                            var msg = data.error || data.flashes || 'Unknown error';
                            if (typeof msg === 'object') msg = JSON.stringify(msg);
                            showError(msg.replace(/<[^>]+>/g, '').trim().substring(0, 200));
                            saveBtn.textContent = 'Save'; saveBtn.disabled = false;
                            return;
                        }
                        registerBlock(ed, data);
                        hideModal();
                        console.info('[ContentBlocks] Saved "' + data.name + '" id=' + data.id);
                    })
                    .catch(function (e) {
                        showError('Save failed — see console.');
                        saveBtn.textContent = 'Save'; saveBtn.disabled = false;
                        console.error('[ContentBlocks] Save error:', e);
                    });
                });
            },
        });

        var SAVEABLE = { 'mj-section': true, 'mj-hero': true };
        editor.on('component:selected', function (component) {
            if (!SAVEABLE[component.get('type') || '']) return;

            var toolbar = component.get('toolbar') || [];
            if (toolbar.some(function (t) { return t.command === COMMAND_SAVE; })) return;

            var btn = {
                attributes: { title: 'Save as Block' },
                label: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" ' +
                       'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
                       '<path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 ' +
                       '0-2 2v3.8h1.5a2.5 2.5 0 0 1 0 5H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.5 2.5 0 0 1 5 ' +
                       '0V22H17a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"/></svg>',
                command: COMMAND_SAVE,
            };
            var newToolbar = toolbar.slice();
            newToolbar.splice(newToolbar.length - 1, 0, btn);
            component.set('toolbar', newToolbar);
        });
    }

    // -----------------------------------------------------------------------
    // Modal with two-section icon picker
    // -----------------------------------------------------------------------

    var selectedIcon = '';

    function buildPickerHTML() {
        // SVG section
        var svgParts = Object.keys(SVG_ICONS).map(function (id) {
            return '<span class="cb-icon-opt" data-icon="' + id + '" title="' + SVG_LABELS[id] + '" ' +
                   'style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;' +
                   'width:40px;height:40px;border-radius:5px;color:#ccc;flex-shrink:0;">' +
                   SVG_ICONS[id] + '</span>';
        }).join('');

        // Flag section
        var flagParts = FLAG_EMOJIS.map(function (e) {
            return '<span class="cb-icon-opt" data-icon="' + e + '" title="' + e + '" ' +
                   'style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;' +
                   'width:40px;height:40px;border-radius:5px;flex-shrink:0;">' +
                   '<img src="' + emojiToTwemojiUrl(e) + '" style="width:26px;height:26px;" /></span>';
        }).join('');

        return '<div style="background:#1e2428;border-radius:6px;padding:8px;">' +
               '<div style="font-size:11px;color:#888;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px;">Layout</div>' +
               '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;">' + svgParts + '</div>' +
               '<div style="font-size:11px;color:#888;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px;">Language</div>' +
               '<div style="display:flex;flex-wrap:wrap;gap:4px;">' + flagParts + '</div>' +
               '</div>';
    }

    function ensureModal() {
        if (document.getElementById('cb-modal')) return;

        var el = document.createElement('div');
        el.id  = 'cb-modal';
        el.innerHTML =
            '<div id="cb-backdrop" style="display:none;position:fixed;inset:0;' +
            'background:rgba(0,0,0,.55);z-index:99999;align-items:center;justify-content:center;">' +
            '<div style="background:#2d3339;color:#e0e0e0;border-radius:8px;padding:28px 32px;' +
            'width:440px;box-shadow:0 8px 32px rgba(0,0,0,.6);font-family:sans-serif;">' +

            '<h3 style="margin:0 0 16px;font-size:15px;color:#fff;">Save as Block</h3>' +

            '<label style="display:block;margin-bottom:6px;font-size:12px;color:#aaa;">Block name</label>' +
            '<input id="cb-name" type="text" placeholder="e.g. Footer, Signature…" style="' +
            'width:100%;box-sizing:border-box;padding:8px 10px;border-radius:4px;' +
            'border:1px solid #aaa;background:#fff;color:#333;font-size:14px;outline:none;">' +

            '<label style="display:block;margin:14px 0 6px;font-size:12px;color:#aaa;">' +
            'Icon <span style="opacity:.6;">(optional — click to select, click again to clear)</span></label>' +

            '<div id="cb-icon-picker">' + buildPickerHTML() + '</div>' +

            '<div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end;">' +
            '<button id="cb-cancel" style="padding:7px 16px;border-radius:4px;border:1px solid #4a5259;' +
            'background:transparent;color:#aaa;cursor:pointer;font-size:13px;">Cancel</button>' +
            '<button id="cb-save" style="padding:7px 18px;border-radius:4px;border:none;' +
            'background:#7c9a6d;color:#fff;cursor:pointer;font-size:13px;font-weight:600;">Save</button>' +
            '</div>' +
            '<div id="cb-err" style="color:#e07070;font-size:12px;margin-top:10px;display:none;"></div>' +
            '</div></div>';

        document.body.appendChild(el);

        document.getElementById('cb-icon-picker').addEventListener('click', function (e) {
            var opt = e.target.closest('.cb-icon-opt');
            if (!opt) return;
            var icon = opt.dataset.icon;
            if (selectedIcon === icon) {
                selectedIcon = '';
            } else {
                selectedIcon = icon;
            }
            document.querySelectorAll('.cb-icon-opt').forEach(function (o) {
                o.style.background  = o.dataset.icon === selectedIcon ? '#3a5a3a' : '';
                o.style.outline     = o.dataset.icon === selectedIcon ? '2px solid #7c9a6d' : '';
            });
        });

        document.getElementById('cb-cancel').addEventListener('click', hideModal);
        document.getElementById('cb-backdrop').addEventListener('click', function (e) {
            if (e.target === this) hideModal();
        });
    }

    function showModal(onSave) {
        selectedIcon = '';
        var backdrop = document.getElementById('cb-backdrop');
        var input    = document.getElementById('cb-name');
        var errEl    = document.getElementById('cb-err');

        input.value         = '';
        errEl.style.display = 'none';
        document.querySelectorAll('.cb-icon-opt').forEach(function (o) {
            o.style.background = ''; o.style.outline = '';
        });

        var old = document.getElementById('cb-save');
        old.textContent = 'Save';
        old.disabled    = false;
        var btn = old.cloneNode(true);
        old.parentNode.replaceChild(btn, old);

        backdrop.style.display = 'flex';
        setTimeout(function () { input.focus(); }, 60);

        btn.addEventListener('click', function () {
            var name = document.getElementById('cb-name').value.trim();
            if (!name) { showError('Please enter a name.'); return; }
            onSave(name, selectedIcon, btn);
        });
        input.onkeydown = function (e) {
            if (e.key === 'Enter') btn.click();
            if (e.key === 'Escape') hideModal();
        };
    }

    function hideModal() {
        var b = document.getElementById('cb-backdrop');
        if (b) b.style.display = 'none';
    }

    function showError(msg) {
        var e = document.getElementById('cb-err');
        if (e) {
            e.textContent = (typeof msg === 'object') ? JSON.stringify(msg) : String(msg);
            e.style.display = 'block';
        }
    }

}());
