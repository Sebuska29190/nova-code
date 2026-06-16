import type { Tool, ToolParameterSchema, ToolResult, ToolContext } from "@nova/shared";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface FetchResult {
  content: string;
  title: string;
}

export class WebSearchTool implements Tool {
  readonly name = "web_search";
  readonly description = "Search the web or fetch URL content. Supports DuckDuckGo (free) and Brave Search (needs API key).";
  readonly parameters: ToolParameterSchema = {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["search", "fetch"],
        description: "Action to perform: 'search' for web search, 'fetch' to get page content",
      },
      query: {
        type: "string",
        description: "Search query (required for search action)",
      },
      url: {
        type: "string",
        description: "URL to fetch (required for fetch action)",
      },
      provider: {
        type: "string",
        enum: ["duckduckgo", "brave"],
        description: "Search provider (default: duckduckgo)",
      },
      count: {
        type: "number",
        description: "Number of results to return (default: 10)",
      },
    },
    required: ["action"],
  };

  private braveApiKey: string | undefined;

  constructor(braveApiKey?: string) {
    this.braveApiKey = braveApiKey;
  }

  async execute(input: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
    const action = input.action as string;

    if (action === "search") {
      return this.handleSearch(input);
    }

    if (action === "fetch") {
      return this.handleFetch(input);
    }

    return { content: "Invalid action. Use 'search' or 'fetch'.", isError: true };
  }

  private async handleSearch(input: Record<string, unknown>): Promise<ToolResult> {
    const query = input.query as string;
    if (!query) {
      return { content: "Query is required for search action.", isError: true };
    }

    const provider = (input.provider as string) ?? "duckduckgo";
    const count = (input.count as number) ?? 10;

    try {
      let results: SearchResult[];

      if (provider === "brave") {
        results = await this.searchBrave(query, count);
      } else {
        results = await this.searchDuckDuckGo(query, count);
      }

      if (results.length === 0) {
        return { content: "No results found." };
      }

      const formatted = results
        .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`)
        .join("\n\n");

      return { content: formatted };
    } catch (error) {
      return {
        content: `Search error: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }

  private async handleFetch(input: Record<string, unknown>): Promise<ToolResult> {
    const url = input.url as string;
    if (!url) {
      return { content: "URL is required for fetch action.", isError: true };
    }

    try {
      const result = await this.fetchUrl(url);
      return { content: `# ${result.title}\n\n${result.content}` };
    } catch (error) {
      return {
        content: `Fetch error: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }

  async search(query: string, options?: { provider?: string; count?: number }): Promise<SearchResult[]> {
    const provider = options?.provider ?? "duckduckgo";
    const count = options?.count ?? 10;

    if (provider === "brave") {
      return this.searchBrave(query, count);
    }
    return this.searchDuckDuckGo(query, count);
  }

  async fetchUrl(url: string): Promise<FetchResult> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NovaCode/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return this.parseHtml(html, url);
  }

  private async searchDuckDuckGo(query: string, count: number): Promise<SearchResult[]> {
    const encoded = encodeURIComponent(query);
    const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;

    const response = await fetch(url, {
      headers: { "User-Agent": "NovaCode/1.0" },
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo API error: ${response.status}`);
    }

    const data = await response.json();
    const results: SearchResult[] = [];

    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: data.AbstractText,
      });
    }

    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics) {
        if (results.length >= count) break;
        if (topic.FirstURL && topic.Text) {
          results.push({
            title: topic.Text.split(" - ")[0] || topic.Text.substring(0, 60),
            url: topic.FirstURL,
            snippet: topic.Text,
          });
        }
      }
    }

    if (results.length === 0) {
      return this.searchDuckDuckGoHtml(query, count);
    }

    return results.slice(0, count);
  }

  private async searchDuckDuckGoHtml(query: string, count: number): Promise<SearchResult[]> {
    const encoded = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encoded}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo HTML error: ${response.status}`);
    }

    const html = await response.text();
    const results: SearchResult[] = [];

    const resultRegex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = resultRegex.exec(html)) !== null && results.length < count) {
      const link = match[1];
      const title = this.stripHtml(match[2]);
      const snippet = this.stripHtml(match[3]);

      if (link && title) {
        const decodedLink = link.includes("uddg=")
          ? decodeURIComponent(link.match(/uddg=([^&]*)/)?.[1] || link)
          : link;

        results.push({
          title: title.trim(),
          url: decodedLink,
          snippet: snippet.trim(),
        });
      }
    }

    return results;
  }

  private async searchBrave(query: string, count: number): Promise<SearchResult[]> {
    if (!this.braveApiKey) {
      throw new Error("Brave Search API key not configured. Set braveApiKey in constructor or use DuckDuckGo.");
    }

    const encoded = encodeURIComponent(query);
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encoded}&count=${count}`;

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": this.braveApiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Brave API error: ${response.status}`);
    }

    const data = await response.json();
    const results: SearchResult[] = [];

    if (data.web?.results) {
      for (const item of data.web.results) {
        results.push({
          title: item.title || "",
          url: item.url || "",
          snippet: item.description || "",
        });
      }
    }

    return results.slice(0, count);
  }

  private parseHtml(html: string, url: string): FetchResult {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? this.stripHtml(titleMatch[1]).trim() : url;

    let content = html;

    content = content.replace(/<script[\s\S]*?<\/script>/gi, "");
    content = content.replace(/<style[\s\S]*?<\/style>/gi, "");
    content = content.replace(/<nav[\s\S]*?<\/nav>/gi, "");
    content = content.replace(/<header[\s\S]*?<\/header>/gi, "");
    content = content.replace(/<footer[\s\S]*?<\/footer>/gi, "");

    content = content.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, "\n## $1\n");
    content = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n");
    content = content.replace(/<br\s*\/?>/gi, "\n");
    content = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1");
    content = content.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)");
    content = content.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
    content = content.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
    content = content.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
    content = content.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
    content = content.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
    content = content.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n```\n$1\n```\n");
    content = content.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "\n> $1\n");

    content = content.replace(/<[^>]+>/g, " ");
    content = this.decodeHtmlEntities(content);
    content = content.replace(/[ \t]+/g, " ");
    content = content.replace(/\n{3,}/g, "\n\n");
    content = content.trim();

    const maxLength = 8000;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + "\n\n[Content truncated]";
    }

    return { content, title };
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, "").trim();
  }

  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
      "&nbsp;": " ",
      "&#x27;": "'",
      "&#x2F;": "/",
    };

    return text.replace(/&[#\w]+;/g, (match) => entities[match] ?? match);
  }
}
