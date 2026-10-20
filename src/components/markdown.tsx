import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders student-written Markdown. Raw HTML is not rendered (react-markdown's
 * default), so notes can't inject scripts or styles.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`prose-note ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: linkChildren }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
              {linkChildren}
            </a>
          ),
          img: ({ alt }) => <span className="text-muted">[image: {alt || "not shown"}]</span>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
