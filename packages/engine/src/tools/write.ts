import { resolve, relative, dirname } from "path";
import type { Tool, ToolParameterSchema, ToolResult, ToolContext } from "@nova/shared";

/**
 * Write tool — create or overwrite files.
 */
export class WriteTool implements Tool {
  readonly name = "write";
  readonly description = "Write content to a file. Creates the file if it doesn't exist, overwrites if it does.";
  readonly parameters: ToolParameterSchema = {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Absolute path to the file",
      },
      content: {
        type: "string",
        description: "Content to write to the file",
      },
    },
    required: ["file_path", "content"],
  };

  async execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = resolve(input.file_path as string);
    const content = input.content as string;

    const rel = relative(context.workingDirectory, filePath);
    if (rel.startsWith("..")) {
      return { content: "Access denied: path is outside working directory", isError: true };
    }

    try {
      // Create directory if needed
      await Bun.write(filePath, content);

      return {
        content: `File written: ${filePath} (${content.split("\n").length} lines)`,
      };
    } catch (error) {
      return {
        content: `Error writing file: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }
}
