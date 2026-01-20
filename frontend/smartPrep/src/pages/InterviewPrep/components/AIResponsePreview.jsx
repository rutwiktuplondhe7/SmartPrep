import React, { useState, useMemo } from "react";
import { LuCopy, LuCheck, LuCode } from "react-icons/lu";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

//  Converts structured explanation object into readable markdown
 
const objectToMarkdown = (obj) => {
  if (!obj || typeof obj !== "object") return "";


  // If it has explanation field, use only that.
  if (obj.explanation && typeof obj.explanation === "string") {
    return obj.explanation;
  }

  return Object.entries(obj)
    .map(([key, value]) => {
      if (typeof value === "object") {
        return `## ${key}\n\n${JSON.stringify(value, null, 2)}`;
      }
      return `## ${key}\n\n${String(value)}`;
    })
    .join("\n\n");
};

const AIResponsePreview = ({ content }) => {
  if (!content) return null;

  const normalizedContent = useMemo(() => {
    // ✅ If already an object
    if (typeof content === "object") {
      return objectToMarkdown(content);
    }

    // ✅ If string
    if (typeof content === "string") {
      const trimmed = content.trim();

      // If looks like JSON, try to parse
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const parsed = JSON.parse(trimmed);
          return objectToMarkdown(parsed);
        } catch {
          // parsing failed → return raw string
          return content;
        }
      }

      return content;
    }

    return "";
  }, [content]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="prose prose-slate max-w-none text-[14px]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2({ children }) {
              return (
                <h2 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                  {children}
                </h2>
              );
            },

            p({ children }) {
              return <p className="mb-3 leading-6 text-gray-800">{children}</p>;
            },

            ul({ children }) {
              return <ul className="list-disc pl-6 space-y-2 my-3">{children}</ul>;
            },

            ol({ children }) {
              return <ol className="list-decimal pl-6 space-y-2 my-3">{children}</ol>;
            },

            li({ children }) {
              return <li>{children}</li>;
            },

            code({ className, children }) {
              const match = /language-(\w+)/.exec(className || "");
              const language = match ? match[1] : "";
              const isInline = !className;

              return !isInline ? (
                <CodeBlock
                  code={String(children).replace(/\n$/, "")}
                  language={language}
                />
              ) : (
                <code className="px-1 py-0.5 bg-gray-100 rounded text-sm">
                  {children}
                </code>
              );
            },

            blockquote({ children }) {
              return (
                <blockquote className="border-l-4 border-gray-200 pl-4 italic my-4 text-gray-700">
                  {children}
                </blockquote>
              );
            },
          }}
        >
          {normalizedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
};

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-6 rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <LuCode size={16} className="text-gray-500" />
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {language || "Code"}
          </span>
        </div>

        <button
          onClick={copyCode}
          className="text-gray-500 hover:text-gray-700 relative"
        >
          {copied ? <LuCheck size={16} /> : <LuCopy size={16} />}
        </button>
      </div>

      <SyntaxHighlighter
        language={language}
        style={oneLight}
        customStyle={{
          fontSize: 12.5,
          margin: 0,
          padding: "1rem",
          background: "transparent",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default AIResponsePreview;
