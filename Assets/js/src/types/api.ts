export interface ContentBlock {
  id:          number;
  name:        string;
  icon:        string | null;
  category:    string | null;
  htmlContent: string;
  thumbnail:   string | null;
}

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
