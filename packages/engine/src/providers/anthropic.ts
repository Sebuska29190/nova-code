import type {
  LLMProvider,
  Message,
  ContentBlock,
  StreamChunk,
  StreamOptions,
  ToolDefinition,
  ProviderConfig,
} from "@nova/shared";

/**
 * Anthropic Messages API provider.
 * Supports Claude models via the native Anthropic API.
 */
export class AnthropicProvider implements LLMProvider {
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

    const url = `${this.config.baseUrl}/v1/messages`;

    // Convert messages to Anthropic format
    const anthropicMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "tool" ? ("user" as const) : (m.role as "user" | "assistant"),
        content: this.convertContent(m.content),
      }));

    // Convert tools
    const tools = options.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));

    const body: Record<string, unknown> = {
      model: options.model,
      max_tokens: options.maxTokens ?? 8192,
      messages: anthropicMessages,
      stream: true,
    };

    if (options.systemPrompt) {
      body.system = options.systemPrompt;
    }
    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      yield { type: "error", error: `API error ${response.status}: ${errorText}` };
      return;
    }

    // Parse SSE stream
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
    switch (event.type) {
      case "content_block_delta": {
        const delta = event.delta as Record<string, unknown>;
        if (delta.type === "text_delta") {
          yield { type: "text", content: delta.text as string };
        } else if (delta.type === "thinking_delta") {
          yield { type: "thinking", content: delta.thinking as string };
        } else if (delta.type === "input_json_delta") {
          // Tool input streaming — accumulate
          yield {
            type: "tool_use",
            toolInput: delta.partial_json as string,
          };
        }
        break;
      }
      case "content_block_start": {
        const block = event.content_block as Record<string, unknown>;
        if (block.type === "tool_use") {
          yield {
            type: "tool_use",
            toolName: block.name as string,
            toolInput: "",
          };
        }
        break;
      }
      case "message_stop":
        yield { type: "done" };
        break;
    }
  }

  private convertContent(blocks: ContentBlock[]): unknown[] {
    return blocks.map((block) => {
      switch (block.type) {
        case "text":
          return { type: "text", text: block.text };
        case "tool_use":
          return { type: "tool_use", id: block.id, name: block.name, input: block.input };
        case "tool_result":
          return {
            type: "tool_result",
            tool_use_id: block.toolUseId,
            content: block.content,
            is_error: block.isError,
          };
        case "thinking":
          return { type: "thinking", thinking: block.thinking };
        default:
          return { type: "text", text: "" };
      }
    });
  }
}
