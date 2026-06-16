/** Role in conversation */
export type MessageRole = "user" | "assistant" | "system" | "tool";

/** Content block types */
export interface TextBlock {
  type: "text";
  text: string;
}

export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock
  | ToolResultBlock;

/** A single message in the conversation */
export interface Message {
  id: string;
  role: MessageRole;
  content: ContentBlock[];
  timestamp: number;
  model?: string;
  tokenUsage?: TokenUsage;
}

/** Token usage statistics */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  thinkingTokens?: number;
}

/** Conversation = ordered list of messages */
export interface Conversation {
  id: string;
  title?: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  projectId?: string;
}
