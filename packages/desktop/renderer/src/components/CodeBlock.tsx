import { useState, useEffect, useRef, useCallback } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-python";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-docker";
import "prismjs/components/prism-diff";
import "prismjs/components/prism-markup";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

const languageMap: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  py: "python",
  rb: "ruby",
  sh: "bash",
  zsh: "bash",
  shell: "bash",
  yml: "yaml",
  md: "markdown",
  dockerfile: "docker",
  html: "markup",
  xml: "markup",
  svg: "markup",
};

function resolveLanguage(lang?: string): string {
  if (!lang) return "plaintext";
  const normalized = lang.toLowerCase();
  return languageMap[normalized] ?? normalized;
}

function highlightCode(code: string, language: string): string {
  const prismLang = Prism.languages[language];
  if (!prismLang) return Prism.util.encode(code) as string;
  return Prism.highlight(code, prismLang, language);
}

export function CodeBlock({ code, language, filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const resolvedLang = resolveLanguage(language);
  const trimmedCode = code.replace(/\n$/, "");
  const lines = trimmedCode.split("\n");

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(trimmedCode);
      setCopied(true);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = trimmedCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
    }
  }, [trimmedCode]);

  const highlighted = highlightCode(trimmedCode, resolvedLang);

  return (
    <div className="group relative rounded-lg overflow-hidden bg-[#0d1117] border border-neutral-800 my-3">
      {(filename || resolvedLang !== "plaintext") && (
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-900/80 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            {filename && (
              <span className="text-xs text-neutral-300 font-mono">{filename}</span>
            )}
            {!filename && resolvedLang !== "plaintext" && (
              <span className="text-xs text-neutral-500 font-mono uppercase tracking-wider">
                {language ?? resolvedLang}
              </span>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50 transition-colors"
            title="Copy code"
          >
            {copied ? (
              <>
                <CheckIcon />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="relative">
        {!filename && resolvedLang === "plaintext" && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copy code"
          >
            {copied ? (
              <>
                <CheckIcon />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon />
                <span>Copy</span>
              </>
            )}
          </button>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="leading-6">
                  <td className="w-12 min-w-[3rem] text-right pr-4 pl-4 select-none text-neutral-600 text-xs font-mono align-top">
                    {i + 1}
                  </td>
                  <td className="pr-4">
                    <code
                      ref={i === 0 ? codeRef : undefined}
                      className="text-sm font-mono text-neutral-200"
                      dangerouslySetInnerHTML={{
                        __html: highlightCode(line, resolvedLang) || " ",
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  );
}
