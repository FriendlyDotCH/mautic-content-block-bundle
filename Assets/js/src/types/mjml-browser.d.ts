// mjml-browser ships no type definitions; its default export is the mjml2html function.
// Kept in its own file: inside a module file (mjml.d.ts) this would be an augmentation, not a declaration.
declare module 'mjml-browser' {
  const mjml2html: Mjml2Html;
  export default mjml2html;
}
