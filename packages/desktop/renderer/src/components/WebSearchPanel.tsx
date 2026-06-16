import { useState, useCallback } from "react";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface FetchedPage {
  title: string;
  content: string;
}

type SearchProvider = "duckduckgo" | "brave";

export function WebSearchPanel({ onInsertUrl }: { onInsertUrl?: (url: string) => void }) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<SearchProvider>("duckduckgo");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedPage, setFetchedPage] = useState<FetchedPage | null>(null);
  const [fetchingUrl, setFetchingUrl] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setFetchedPage(null);

    try {
      if (window.nova?.engine?.executeTool) {
        const result = await window.nova.engine.executeTool("web_search", {
          action: "search",
          query: query.trim(),
          provider,
          count: 10,
        });

        if (result.isError) {
          setError(result.content);
        } else {
          const parsed = parseSearchResults(result.content);
          setResults(parsed);
        }
      } else {
        setError("Engine not available. Run inside Electron.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [query, provider]);

  const handleFetch = useCallback(async (url: string) => {
    setFetchingUrl(url);
    setError(null);

    try {
      if (window.nova?.engine?.executeTool) {
        const result = await window.nova.engine.executeTool("web_search", {
          action: "fetch",
          url,
        });

        if (result.isError) {
          setError(result.content);
        } else {
          const parsed = parseFetchResult(result.content);
          setFetchedPage(parsed);
        }
      } else {
        setError("Engine not available. Run inside Electron.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setFetchingUrl(null);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 border-l border-neutral-800">
      <div className="p-4 border-b border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-200 mb-3">Web Search</h2>

        <div className="flex gap-2 mb-3">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as SearchProvider)}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-2 text-xs text-neutral-300 focus:outline-none focus:border-nova-500 appearance-none cursor-pointer"
          >
            <option value="duckduckgo">DuckDuckGo</option>
            <option value="brave">Brave</option>
          </select>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search the web..."
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-nova-500 focus:ring-1 focus:ring-nova-500/50"
          />

          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-3 py-2 rounded-lg bg-nova-600 hover:bg-nova-500 disabled:opacity-50 text-white text-sm transition-colors"
          >
            {loading ? (
              <span className="inline-flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-800/50 text-sm text-red-400">
            {error}
          </div>
        )}

        {fetchedPage && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-neutral-200">{fetchedPage.title}</h3>
              <button
                onClick={() => setFetchedPage(null)}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {fetchedPage.content}
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors"
              >
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-nova-400 hover:text-nova-300 line-clamp-1"
                >
                  {result.title}
                </a>
                <p className="text-[10px] text-green-500/70 mt-0.5 truncate">{result.url}</p>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{result.snippet}</p>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleFetch(result.url)}
                    disabled={fetchingUrl === result.url}
                    className="px-2 py-1 rounded text-[10px] bg-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                  >
                    {fetchingUrl === result.url ? "Fetching..." : "Fetch"}
                  </button>
                  {onInsertUrl && (
                    <button
                      onClick={() => onInsertUrl(result.url)}
                      className="px-2 py-1 rounded text-[10px] bg-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 transition-colors"
                    >
                      Insert URL
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && results.length === 0 && !fetchedPage && (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-xs text-neutral-500">Search the web or fetch page content</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function parseSearchResults(content: string): SearchResult[] {
  const results: SearchResult[] = [];
  const blocks = content.split("\n\n");

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length >= 2) {
      const titleLine = lines[0];
      const urlLine = lines[1];
      const snippetLine = lines.slice(2).join(" ");

      const titleMatch = titleLine.match(/^\d+\.\s+(.+)$/);
      if (titleMatch && urlLine.trim().startsWith("http")) {
        results.push({
          title: titleMatch[1].trim(),
          url: urlLine.trim(),
          snippet: snippetLine.trim(),
        });
      }
    }
  }

  return results;
}

function parseFetchResult(content: string): FetchedPage {
  const titleMatch = content.match(/^#\s+(.+)\n\n/);
  const title = titleMatch ? titleMatch[1] : "Fetched Page";
  const body = titleMatch ? content.substring(titleMatch[0].length) : content;

  return { title, content: body };
}
