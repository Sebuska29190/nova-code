import { nanoid } from "nanoid";
import type {
  Message,
  ContentBlock,
  StreamChunk,
  ToolDefinition,
  ToolResult,
  Conversation,
  TokenUsage,
  LLMProvider,
} from "@nova/shared";
import { ToolRegistry } from "./tools/registry.js";
import { SkillLoader } from "./skills/loader.js";

/** Events emitted by the agent loop */
export interface AgentEvents {
  onText?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onToolStart?: (toolName: string, input: Record<string, unknown>) => void;
  onToolEnd?: (toolName: string, result: ToolResult) => void;
  onTokenUsage?: (usage: TokenUsage) => void;
  onError?: (error: string) => void;
  onDone?: () => void;
}

/** Configuration for agent loop */
export interface AgentLoopConfig {
  provider: LLMProvider;
  model: string;
  maxTokens?: number;
  systemPrompt?: string;
  workingDirectory: string;
  maxToolRounds?: number;
}

/**
 * Core agent loop — handles the conversation cycle:
 * 1. Send messages to LLM
 2. Stream response
 * 3. If tool_use → execute tool → append result → loop back to 1
 * 4. If text → emit to user
 */
export class AgentLoop {
  private conversation: Conversation;
  private config: AgentLoopConfig;
  private toolRegistry: ToolRegistry;
  private skillLoader: SkillLoader;
  private abortController: AbortController | null = null;

  constructor(config: AgentLoopConfig, toolRegistry: ToolRegistry, skillLoader: SkillLoader) {
    this.config = config;
    this.toolRegistry = toolRegistry;
    this.skillLoader = skillLoader;
    this.conversation = {
      id: nanoid(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /** Get the current conversation */
  getConversation(): Conversation {
    return { ...this.conversation };
  }

  /** Abort the current generation */
  abort(): void {
    this.abortController?.abort();
  }

  /** Send a user message and run the agent loop */
  async sendMessage(userInput: string, events: AgentEvents): Promise<void> {
    // Add user message
    const userMessage: Message = {
      id: nanoid(),
      role: "user",
      content: [{ type: "text", text: userInput }],
      timestamp: Date.now(),
    };
    this.conversation.messages.push(userMessage);

    // Run agent loop (max N rounds to prevent infinite loops)
    const maxRounds = this.config.maxToolRounds ?? 20;

    for (let round = 0; round < maxRounds; round++) {
      this.abortController = new AbortController();

      try {
        // Build tool definitions
        const tools = this.buildToolDefinitions();

        // Stream from provider
        const stream = this.config.provider.stream(
          this.conversation.messages,
          {
            model: this.config.model,
            maxTokens: this.config.maxTokens,
            systemPrompt: this.config.systemPrompt,
            tools: tools.length > 0 ? tools : undefined,
            abortSignal: this.abortController.signal,
          },
        );

        // Collect response blocks
        const responseBlocks: ContentBlock[] = [];
        let hasToolUse = false;

        for await (const chunk of stream) {
          switch (chunk.type) {
            case "text":
              responseBlocks.push({ type: "text", text: chunk.content ?? "" });
              events.onText?.(chunk.content ?? "");
              break;

            case "thinking":
              responseBlocks.push({ type: "thinking", thinking: chunk.content ?? "" });
              events.onThinking?.(chunk.content ?? "");
              break;

            case "tool_use":
              hasToolUse = true;
              responseBlocks.push({
                type: "tool_use",
                id: nanoid(),
                name: chunk.toolName ?? "",
                input: JSON.parse(chunk.toolInput ?? "{}"),
              });
              break;

            case "error":
              events.onError?.(chunk.error ?? "Unknown error");
              return;

            case "done":
              break;
          }
        }

        // Add assistant message
        const assistantMessage: Message = {
          id: nanoid(),
          role: "assistant",
          content: responseBlocks,
          timestamp: Date.now(),
          model: this.config.model,
        };
        this.conversation.messages.push(assistantMessage);

        // If no tool use, we're done
        if (!hasToolUse) {
          events.onDone?.();
          return;
        }

        // Execute tools and collect results
        const toolResultBlocks: ContentBlock[] = [];

        for (const block of responseBlocks) {
          if (block.type === "tool_use") {
            events.onToolStart?.(block.name, block.input);

            const result = await this.toolRegistry.execute(
              block.name,
              block.input,
              { workingDirectory: this.config.workingDirectory },
            );

            events.onToolEnd?.(block.name, result);

            toolResultBlocks.push({
              type: "tool_result",
              toolUseId: block.id,
              content: result.content,
              isError: result.isError,
            });
          }
        }

        // Add tool results as a user message
        if (toolResultBlocks.length > 0) {
          this.conversation.messages.push({
            id: nanoid(),
            role: "user",
            content: toolResultBlocks,
            timestamp: Date.now(),
          });
        }

        // Continue loop for next round
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          events.onDone?.();
          return;
        }
        events.onError?.(error instanceof Error ? error.message : String(error));
        return;
      }
    }

    events.onError?.("Max tool rounds exceeded");
  }

  /** Build tool definitions from registry + skills */
  private buildToolDefinitions(): ToolDefinition[] {
    const tools = this.toolRegistry.getDefinitions();

    // Add skill tool if skills exist
    const skills = this.skillLoader.listSkills();
    if (skills.length > 0) {
      tools.push({
        name: "skill",
        description: "Load a skill into context. Use when the user's request might match an available skill.",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The skill name to load",
            },
          },
          required: ["name"],
        },
      });
    }

    return tools;
  }
}
