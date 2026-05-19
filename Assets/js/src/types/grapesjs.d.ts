/** Minimal ambient types for the GrapesJS editor surface used by this plugin. */

interface GrapesJSToolbarItem {
  attributes?: Record<string, string>;
  label?: string;
  command: string;
}

export interface GrapesJSComponent {
  get(key: 'type'): string;
  get(key: 'toolbar'): GrapesJSToolbarItem[];
  get(key: string): unknown;
  set(key: 'toolbar', value: GrapesJSToolbarItem[]): void;
  toHTML(): string;
}

interface GrapesJSBlockManager {
  add(id: string, opts: {
    label:    string;
    category: string;
    media?:   string;
    content:  string;
  }): void;
}

interface GrapesJSDomComponents {
  getType(type: string): unknown;
}

interface GrapesJSCommands {
  add(name: string, opts: { run: (editor: GrapesJSEditor) => void }): void;
}

interface GrapesJSPanelButton {
  id:          string;
  label?:      string;
  command?:    string | (() => void);
  attributes?: Record<string, string>;
  active?:     boolean;
  togglable?:  boolean;
}

interface GrapesJSPanels {
  addButton(panelId: string, button: GrapesJSPanelButton): void;
}

interface GrapesJSModal {
  open(opts: { title: string | HTMLElement; content: string | HTMLElement }): void;
  close(): void;
  isOpen(): boolean;
  setTitle(title: string | HTMLElement): void;
  setContent(content: string | HTMLElement): void;
  onceClose(cb: () => void): void;
}

export interface GrapesJSEditor {
  BlockManager:  GrapesJSBlockManager;
  DomComponents: GrapesJSDomComponents;
  Commands:      GrapesJSCommands;
  Modal:         GrapesJSModal;
  Panels:        GrapesJSPanels;
  getSelected(): GrapesJSComponent | null;
  on(event: string, cb: (component: GrapesJSComponent) => void): void;
}

interface MauticGrapesJsPlugin {
  name:   string;
  plugin: (editor: GrapesJSEditor) => void;
}

declare global {
  var MauticGrapesJsPlugins: MauticGrapesJsPlugin[] | undefined;
  var mauticBasePath: string;
  var mauticAjaxCsrf: string | undefined;
}
