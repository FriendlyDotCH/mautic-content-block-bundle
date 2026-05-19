/** Minimal ambient declaration for the Mautic global object. */
declare global {
  var Mautic: {
    contentBlockOnLoad:     (container: string | Element | null) => void;
    contentBlockEditOnLoad: () => void;
    loadedContent?:         Record<string, unknown>;
    [key: string]:          unknown;
  };
}

export {};
