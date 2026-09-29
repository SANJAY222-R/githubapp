import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { isSafeUrl } from "../../lib/sanitize.js";

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            const safe = isSafeUrl(href);
            const safeHref = safe ? href : "#";
            const isExternal = safe && (href?.startsWith("http://") || href?.startsWith("https://"));

            return (
              <a
                href={safeHref}
                rel="noopener noreferrer nofollow"
                target={isExternal ? "_blank" : undefined}
                {...props}
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt, ...props }) => {
            const safe = isSafeUrl(src);
            if (!safe) return null;

            return (
              <img
                src={src}
                alt={alt ?? ""}
                loading="lazy"
                {...props}
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
