import type { Tool, ToolDefinition, ToolResult, ToolContext } from "@nova/shared";

/**
 * Registry of tools available to the agent.
 * Manages tool registration, lookup, and execution.
 */
export class ToolRegistry {
  private tools = new Map<string, Tool>();

  /** Register a tool */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /** Get a tool by name */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /** List all registered tool names */
  list(): string[] {
    return Array.from(this.tools.keys());
  }

  /** Get tool definitions for the LLM */
  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }

  /** Execute a tool by name */
  async execute(
    name: string,
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        content: `Tool "${name}" not found. Available: ${this.list().join(", ")}`,
        isError: true,
      };
    }

    try {
      return await tool.execute(input, context);
    } catch (error) {
      return {
        content: `Tool "${name}" error: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }
}
