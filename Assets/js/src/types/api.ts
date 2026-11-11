export interface ContentBlock {
  id:          number;
  name:        string;
  icon:        string | null;
  category:    string | null;
  htmlContent: string;
  thumbnail:   string | null;
  /** Linked blocks are referenced by token, not copied into the email. */
  linked:      boolean;
}

/** One published linked block, as returned by GET /s/content-blocks/editor/linked. */
export interface LinkedBlock {
  id:   number;
  name: string;
  icon: string | null;
  html: string;
}

/** GET /s/content-blocks/editor/linked */
export type LinkedResponse =
  | { success: true;  blocks: Record<string, LinkedBlock>; editUrl: string | null }
  | { success: false; error: string };

/** GET /s/content-blocks/editor */
export type ListResponse =
  | { success: true;  blocks: ContentBlock[] }
  | { success: false; error: string };

/** POST /s/content-blocks/editor — request body */
export interface SaveRequest {
  name:        string;
  icon:        string;   // empty string = no icon
  htmlContent: string;
}

/** POST /s/content-blocks/editor — response */
export type SaveResponse =
  | { success: true;  block: ContentBlock }
  | { success: false; error: string };
