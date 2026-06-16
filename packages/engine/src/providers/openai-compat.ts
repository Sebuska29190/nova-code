import type {
  LLMProvider,
  Message,
  ContentBlock,
  StreamChunk,
  StreamOptions,
  ProviderConfig,
} from "@nova/shared";

/**
 * OpenAI-compatible API provider.
 * Works with: DeepSeek, Qwen, Kimi, MiMo, Z.AI, and any OpenAI-compatible endpoint.
 */
export class OpenAICompatProvider implements LLMProvider {
  readonly id: string;
  readonly name: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.id = config.id;
    this.name = config.name;
    this.config = config;
  }

  isReady(): boolean {
    return !!this.config.apiKey && this.config.enabled;
  }

  async *stream(
    messages: Message[],
    options: StreamOptions,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.config.apiKey) {
      yield { type: "error", error: "API key not set" };
      return;
    }

    const url = `${this.config.baseUrl}/chat/completions`;

    // Convert messages to OpenAI format
    const openaiMessages = this.convertMessages(messages, options.systemPrompt);

    // Convert tools
    const tools = options.tools?.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const body: Record<string, unknown> = {
      model: options.model,
      max_tokens: options.maxTokens ?? 8192,
      messages: openaiMessages,
      stream: true,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      yield { type: "error", error: `API error ${response.status}: ${errorText}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", error: "No response body" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            yield { type: "done" };
            return;
          }

          try {
            const event = JSON.parse(data);
            yield* this.parseEvent(event);
          } catch {
            // Skip malformed events
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private *parseEvent(event: Record<string, unknown>): Generator<StreamChunk, void, unknown> {
    const choices = event.choices as Array<Record<string, unknown>> | undefined;
    if (!choices || choices.length === 0) return;

    const choice = choices[0];
    const delta = choice.delta as Record<string, unknown> | undefined;
    if (!delta) return;

    if (typeof delta.content === "string" && delta.content) {
      yield { type: "text", content: delta.content };
    }

    // Tool calls
    const toolCalls = delta.tool_calls as Array<Record<string, unknown>> | undefined;
    if (toolCalls) {
      for (const tc of toolCalls) {
        const fn = tc.function as Record<string, unknown> | undefined;
        if (fn) {
          yield {
            type: "tool_use",
            toolName: fn.name as string | undefined,
            toolInput: fn.arguments as string | undefined,
          };
        }
      }
    }
  }

  private convertMessages(
    messages: Message[],
    systemPrompt?: string,
  ): Array<Record<string, unknown>> {
    const result: Array<Record<string, unknown>> = [];

    if (systemPrompt) {
      result.push({ role: "system", content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === "system") continue;

      const content = this.convertContent(msg.content);
      result.push({ role: msg.role === "tool" ? "user" : msg.role, content });
    }

    return result;
  }

  private convertContent(blocks: ContentBlock[]): unknown {
    if (blocks.length === 1 && blocks[0].type === "text") {
      return blocks[0].text;
    }

    return blocks.map((block) => {
      switch (block.type) {
        case "text":
          return { type: "text", text: block.text };
        case "tool_result":
          return { type: "text", text: block.content };
        default:
          return { type: "text", text: "" };
      }
    });
  }
}
