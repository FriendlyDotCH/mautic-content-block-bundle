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
  set(key: string, value: unknown): void;
  components?(): GrapesJSComponent[];
  toHTML(): string;
  /** Replaces this component in its parent; returns the new component(s). */
  replaceWith(definition: Record<string, unknown>): GrapesJSComponent[];
}

export interface GrapesJSBlockDefinition {
  id:          string;
  label:       string;
  category?:   string;
  media?:      string;
  /** A string of markup, or a component definition such as { type, cbId }. */
  content:     string | Record<string, unknown>;
  attributes?: Record<string, string>;
}

interface GrapesJSBlockManager {
  /**
   * With `external: true` the definitions need not be registered with the manager: GrapesJS
   * builds a detached block list, native drag and drop included, and returns its element.
   */
  render(blocks: GrapesJSBlockDefinition[], opts: { external: true; ignoreCategories?: boolean }): HTMLElement;
}

interface GrapesJSDomComponents {
  getType(type: string): unknown;
}

/**
 * Custom component registration. GrapesJS definitions are loosely shaped by design
 * (Backbone model/view hashes), so model and view stay untyped here on purpose.
 */
interface GrapesJSComponents {
  getType(type: string): unknown;
  addType(name: string, definition: {
    extend?:      string;
    isComponent?: (el: Element) => false | Record<string, unknown>;
    model?:       Record<string, unknown>;
    view?:        Record<string, unknown>;
  }): void;
}

interface GrapesJSWrapper {
  findType?(type: string): GrapesJSComponent[];
  find(selector: string): GrapesJSComponent[];
}

interface GrapesJSCommands {
  add(name: string, opts: { run: (editor: GrapesJSEditor) => void; stop?: (editor: GrapesJSEditor) => void }): void;
}

interface GrapesJSPanelButton {
  id:          string;
  label?:      string;
  className?:  string;
  command?:    string | (() => void);
  attributes?: Record<string, string>;
  active?:     boolean;
  togglable?:  boolean;
}

/** Backbone model; `appendContent` is how the built-in views mount into the sidebar. */
interface GrapesJSPanel {
  set(key: 'appendContent', el: HTMLElement): GrapesJSPanel;
  trigger(event: string): void;
}

interface GrapesJSPanels {
  addButton(panelId: string, button: GrapesJSPanelButton): void;
  getPanel(id: string): GrapesJSPanel | null;
  addPanel(panel: { id: string }): GrapesJSPanel;
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
  Components:    GrapesJSComponents;
  getWrapper():  GrapesJSWrapper | null;
  Commands:      GrapesJSCommands;
  Modal:         GrapesJSModal;
  Panels:        GrapesJSPanels;
  getSelected(): GrapesJSComponent | null;
  select(component: GrapesJSComponent): void;
  runCommand(name: string): void;
  getContainer(): HTMLElement | undefined;
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
