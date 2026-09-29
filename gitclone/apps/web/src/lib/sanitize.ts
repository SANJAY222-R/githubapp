import DOMPurify from "dompurify";
import { isSafeUrl } from "@gitclone/shared";

export { isSafeUrl };

export const ALLOWED_TAGS = [
  "p", "div", "span", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote", "code", "pre", "hr", "br",
  "table", "thead", "tbody", "tr", "th", "td",
  "a", "img", "strong", "em", "del", "s", "b", "i", "sub", "sup",
  "details", "summary", "input"
];

export const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "class", "type", "checked", "disabled", "target", "rel", "align", "width", "height"
];

export function sanitizeHtml(html: string): string {
  if (typeof globalThis.window === "undefined") {
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["rel", "target"],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "svg", "math", "style"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "style"],
  });
}
