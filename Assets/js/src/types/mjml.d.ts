/** Ambient declarations for the lazily-loaded mjml-browser compiler and Mautic's jQuery. */
export {};

declare global {
  interface MjmlError {
    message?:          string;
    formattedMessage?: string;
  }

  interface MjmlResult {
    html:    string;
    errors?: MjmlError[];
  }

  type Mjml2Html = (mjml: string, options?: Record<string, unknown>) => MjmlResult;

  interface Window {
    mjml?:    Mjml2Html;
    mQuery?:  (el: Element) => { on: (event: string, handler: () => void) => void };
    CbMjmlEditor?: {
      buildDocument:   (blockMjml: string, theme: { isMjml: boolean; head: string; bodyAttributes: string }) => string;
      extractFragment: (html: string) => string;
    };
  }
}
