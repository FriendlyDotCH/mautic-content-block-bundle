export type SvgIconKey =
  | 'header' | 'footer' | 'hero' | 'text' | 'image' | 'button'
  | 'columns2' | 'columns3' | 'divider' | 'social' | 'video' | 'cta';

export const SVG_ICONS: Record<SvgIconKey, string> = {
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

export const SVG_LABELS: Record<SvgIconKey, string> = {
  header: 'Header', footer: 'Footer', hero: 'Hero', text: 'Text',
  image: 'Image', button: 'Button', columns2: '2 Cols', columns3: '3 Cols',
  divider: 'Divider', social: 'Social', video: 'Video', cta: 'CTA',
};

export const FLAG_EMOJIS: readonly string[] = [
  '🇨🇭','🇩🇪','🇫🇷','🇮🇹','🇬🇧','🇺🇸','🇦🇹','🇧🇪','🇳🇱','🇸🇪',
  '🇪🇸','🇵🇱','🇨🇿','🇸🇰','🇭🇺','🇷🇴','🇷🇸','🇭🇷','🇧🇬','🇸🇮',
] as const;

const PUZZLE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
  'stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 ' +
  '2v3.8h1.5a2.5 2.5 0 0 1 0 5H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.5 2.5 0 0 1 5 0V22H17a2 ' +
  '2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"/></svg>';

export function isEmoji(icon: string): boolean {
  return /[^\x00-\x7F]/.test(icon);
}

export function emojiToTwemojiUrl(emoji: string): string {
  const codePoints: string[] = [];
  for (let i = 0; i < emoji.length; ) {
    const code = emoji.codePointAt(i) as number;
    codePoints.push(code.toString(16));
    i += code > 0xFFFF ? 2 : 1;
  }
  return (
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0/assets/svg/' +
    codePoints.filter(c => c !== 'fe0f').join('-') +
    '.svg'
  );
}

/** Returns an HTML string suitable for GrapesJS BlockManager `media` property. */
export function iconToMedia(icon: string | null | undefined): string {
  if (!icon) return PUZZLE_ICON;
  if (isEmoji(icon)) {
    return `<img src="${emojiToTwemojiUrl(icon)}" style="width:40px;height:40px;" />`;
  }
  return SVG_ICONS[icon as SvgIconKey] ?? PUZZLE_ICON;
}
