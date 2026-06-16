import { resolve, relative } from "path";
import type { Tool, ToolParameterSchema, ToolResult, ToolContext } from "@nova/shared";

/**
 * Read tool — read files from the filesystem.
 * Returns content with line numbers.
 */
export class ReadTool implements Tool {
  readonly name = "read";
  readonly description = "Read a file from the filesystem. Returns content with line numbers.";
  readonly parameters: ToolParameterSchema = {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Absolute path to the file",
      },
      offset: {
        type: "number",
        description: "Line number to start reading from (0-based)",
      },
      limit: {
        type: "number",
        description: "Number of lines to read (default: 2000)",
      },
    },
    required: ["file_path"],
  };

  async execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = resolve(input.file_path as string);
    const offset = (input.offset as number) ?? 0;
    const limit = (input.limit as number) ?? 2000;

    // Security check — don't escape working directory
    const rel = relative(context.workingDirectory, filePath);
    if (rel.startsWith("..")) {
      return { content: "Access denied: path is outside working directory", isError: true };
    }

    try {
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        return { content: `File not found: ${filePath}`, isError: true };
      }

      const text = await file.text();
      const lines = text.split("\n");
      const sliced = lines.slice(offset, offset + limit);

      const numbered = sliced
        .map((line, i) => `${offset + i + 1}\t${line}`)
        .join("\n");

      return {
        content: numbered || "(empty file)",
      };
    } catch (error) {
      return {
        content: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }
}
