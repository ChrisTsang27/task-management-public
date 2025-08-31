declare module 'sanitize-html' {
  export type Attributes = Record<string, string>;
  export interface Options {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedSchemes?: string[];
    allowProtocolRelative?: boolean;
    disallowedTagsMode?: 'discard' | 'escape';
    transformTags?: Record<string, (tagName: string, attribs: Record<string, string>) => { tagName: string; attribs: Record<string, string> }>;
  }
  interface SanitizeHtml {
    (dirty: string, options?: Options): string;
    simpleTransform: (tagName: string, attributes?: Attributes, merge?: boolean) => (tagName: string, attribs: Record<string, string>) => { tagName: string; attribs: Record<string, string> };
  }
  const sanitizeHtml: SanitizeHtml;
  export default sanitizeHtml;
}