import React, { useState, useMemo } from "react";
import { LuCopy, LuCheck, LuCode } from "react-icons/lu";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

const objectToMarkdown = (obj) => {
  if (!obj || typeof obj !== "object") return "";

  if (obj.explanation && typeof obj.explanation === "string") {
    return obj.explanation;
  }

  return Object.entries(obj)
    .map(([key, value]) => {
      if (value === null || value === undefined) {
        return `## ${key}\n\n-`;
      }

      if (typeof value === "object") {
        return `## ${key}\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
      }

      return `## ${key}\n\n${String(value)}`;
    })
    .join("\n\n");
};

const stripMarkdownFences = (str) => {
  if (typeof str !== "string") return str;

  let s = str.trim();

  // remove ```json ... ``` or ``` ... ```
  if (s.startsWith("```")) {
    s = s.replace(/^```[a-zA-Z]*\s*/i, "");
    s = s.replace(/```$/i, "");
  }

  return s.trim();
};

const safeJsonParse = (str) => {
  if (typeof str !== "string") return null;

  const s = stripMarkdownFences(str);

  if (!s.startsWith("{") && !s.startsWith("[")) return null;

  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const unescapeCommon = (str) => {
  if (typeof str !== "string") return str;

  return str
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\`/g, "`")
    .replace(/\\\*/g, "*")
    .replace(/\\_/g, "_")
    .replace(/\\\//g, "/")
    .replace(/\\\\/g, "\\");
};

const extractExplanationFromJsonLikeString = (str) => {
  if (typeof str !== "string") return null;

  const s = stripMarkdownFences(str).trim();

  // 1) if it is valid JSON, parse and return explanation
  const parsed = safeJsonParse(s);
  if (parsed) {
    if (typeof parsed === "string") return parsed;
    if (typeof parsed.explanation === "string") return parsed.explanation;
    if (typeof parsed.content === "string") return parsed.content;
    if (typeof parsed.message === "string") return parsed.message;
    return objectToMarkdown(parsed);
  }

  // 2) JSON-like fallback extraction
  // Matches "explanation": "...."
  const match = s.match(/"explanation"\s*:\s*"([\s\S]*?)"\s*(,|\})/i);
  if (!match) return null;

  return unescapeCommon(match[1]).trim();
};

const cleanupWeirdMixedOutput = (str) => {
  if (typeof str !== "string") return "";

  let s = str.trim();

  // If response starts with a JSON blob then markdown after it, remove the JSON blob section
  // Example: { ... }\n\n### Something
  if (s.startsWith("{") && s.includes("}\n")) {
    const idx = s.indexOf("}\n");
    const after = s.slice(idx + 2).trim();
    if (after) s = after;
  }

  // remove accidental surrounding quotes
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1);
  }

  // fix escaped markdown in plain string
  s = unescapeCommon(s);

  return s.trim();
};

const normalizeToMarkdownString = (content) => {
  if (!content) return "";

  // Case 1: already object (API returns object)
  if (typeof content === "object") {
    return objectToMarkdown(content);
  }

  // Case 2: string content
  if (typeof content === "string") {
    const raw = content.trim();
    if (!raw) return "";

    // 1) if JSON or JSON fenced
    const parsedJson = safeJsonParse(raw);
    if (parsedJson) {
      // string itself inside json (rare)
      if (typeof parsedJson === "string") return parsedJson;

      // primary field
      if (typeof parsedJson.explanation === "string") {
        return cleanupWeirdMixedOutput(parsedJson.explanation);
      }

      // sometimes API may use another key
      if (typeof parsedJson.content === "string") {
        return cleanupWeirdMixedOutput(parsedJson.content);
      }

      return objectToMarkdown(parsedJson);
    }

    // 2) json-like extraction from string
    if (raw.includes('"explanation"')) {
      const extracted = extractExplanationFromJsonLikeString(raw);
      if (extracted) return cleanupWeirdMixedOutput(extracted);
    }

    // 3) fallback cleanup (handles escaped markdown, mixed garbage etc.)
    return cleanupWeirdMixedOutput(raw);
  }

  return "";
};

const AIResponsePreview = ({ content }) => {
  if (!content) return null;

  const normalizedContent = useMemo(() => {
    return normalizeToMarkdownString(content);
  }, [content]);

  if (!normalizedContent) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="max-w-none text-[14px]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1({ children }) {
              return (
                <h1 className="text-lg font-bold text-gray-900 mt-2 mb-4">
                  {children}
                </h1>
              );
            },

            h2({ children }) {
              return (
                <h2 className="mt-6 mb-2 text-base font-semibold text-gray-900">
                  {children}
                </h2>
              );
            },

            h3({ children }) {
              return (
                <h3 className="mt-5 mb-2 text-sm font-semibold text-gray-800">
                  {children}
                </h3>
              );
            },

            strong({ children }) {
              return (
                <strong className="font-semibold text-gray-900">
                  {children}
                </strong>
              );
            },

            p({ children }) {
              return <p className="mb-3 leading-6 text-gray-800">{children}</p>;
            },

            ul({ children }) {
              return (
                <ul className="list-disc pl-6 space-y-2 my-3 text-gray-800">
                  {children}
                </ul>
              );
            },

            ol({ children }) {
              return (
                <ol className="list-decimal pl-6 space-y-2 my-3 text-gray-800">
                  {children}
                </ol>
              );
            },

            li({ children }) {
              return <li className="text-gray-800">{children}</li>;
            },

            hr() {
              return <hr className="my-5 border-gray-200" />;
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
                <code className="px-1 py-0.5 bg-gray-100 rounded text-[13px] font-medium">
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
