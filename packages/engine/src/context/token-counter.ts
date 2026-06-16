import type { Message, ToolDefinition, ContentBlock } from "@nova/shared";

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  "claude-sonnet-4-20250514": 200000,
  "claude-opus-4-20250514": 200000,
  "claude-3.5-sonnet-20241022": 200000,
  "claude-3.5-haiku-20241022": 200000,
  "gpt-4o": 128000,
  "gpt-4o-mini": 128000,
  "gpt-4-turbo": 128000,
  "gpt-4": 8192,
  "gpt-3.5-turbo": 16385,
  "gemini-2.5-pro": 1048576,
  "gemini-2.5-flash": 1048576,
  "gemini-2.0-flash": 1048576,
  "deepseek-chat": 64000,
  "deepseek-reasoner": 64000,
  "llama-3.3-70b": 128000,
};

function extractTextFromBlock(block: ContentBlock): string {
  switch (block.type) {
    case "text":
      return block.text;
    case "thinking":
      return block.thinking;
    case "tool_use":
      return JSON.stringify(block.input);
    case "tool_result":
      return block.content;
  }
}

export class TokenCounter {
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  countMessageTokens(messages: Message[]): number {
    let total = 0;
    for (const msg of messages) {
      total += 4;
      for (const block of msg.content) {
        total += this.estimateTokens(extractTextFromBlock(block));
      }
    }
    return total;
  }

  countToolTokens(tools: ToolDefinition[]): number {
    let total = 0;
    for (const tool of tools) {
      total += this.estimateTokens(tool.name);
      total += this.estimateTokens(tool.description);
      total += this.estimateTokens(JSON.stringify(tool.parameters));
    }
    return total;
  }

  getMaxTokens(model: string): number {
    const normalized = model.toLowerCase();
    for (const [key, value] of Object.entries(MODEL_CONTEXT_WINDOWS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    return 128000;
  }

  isNearLimit(used: number, max: number, threshold = 0.9): boolean {
    return used >= max * threshold;
  }
}
