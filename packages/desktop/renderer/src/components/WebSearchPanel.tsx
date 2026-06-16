import { useState } from "react";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export function WebSearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);

    // Placeholder results
    setTimeout(() => {
      setResults([
        { title: "Example Result 1", url: "https://example.com/1", snippet: "This is a placeholder search result." },
        { title: "Example Result 2", url: "https://example.com/2", snippet: "Another placeholder result for testing." },
      ]);
      setSearching(false);
    }, 1000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-950 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-neutral-100">Web Search</h1>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search the web..."
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-nova-500"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 rounded-lg bg-nova-600 hover:bg-nova-500 disabled:opacity-50 text-white text-sm"
          >
            {searching ? "..." : "Search"}
          </button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, i) => (
              <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener"
                  className="text-sm font-medium text-nova-400 hover:text-nova-300 hover:underline"
                >
                  {result.title}
                </a>
                <p className="text-xs text-green-500/60 mt-0.5">{result.url}</p>
                <p className="text-sm text-neutral-400 mt-1">{result.snippet}</p>
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && !searching && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-sm text-neutral-400">Search the web from within NovaCode</p>
          </div>
        )}
      </div>
    </div>
  );
}
