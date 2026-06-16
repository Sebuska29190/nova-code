/** Tool parameter schema (JSON Schema subset) */
export interface ToolParameterSchema {
  type: string;
  description?: string;
  properties?: Record<string, ToolParameterSchema>;
  required?: string[];
  items?: ToolParameterSchema;
  enum?: string[];
}

/** Tool definition sent to the LLM */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
}

/** Result of executing a tool */
export interface ToolResult {
  content: string;
  isError?: boolean;
}

/** Tool execution context */
export interface ToolContext {
  workingDirectory: string;
  abortSignal?: AbortSignal;
  onProgress?: (message: string) => void;
}

/** A tool that the agent can call */
export interface Tool {
  readonly name: string;
  readonly description: string;
  readonly parameters: ToolParameterSchema;

  /** Execute the tool with given input */
  execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}
