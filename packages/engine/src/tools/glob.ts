import { resolve, relative } from "path";
import type { Tool, ToolParameterSchema, ToolResult, ToolContext } from "@nova/shared";

/**
 * Glob tool — fast file pattern matching using Bun's built-in Glob.
 */
export class GlobTool implements Tool {
  readonly name = "glob";
  readonly description = "Find files matching a glob pattern. Returns matching file paths sorted by modification time.";
  readonly parameters: ToolParameterSchema = {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Glob pattern (e.g. '**/*.ts', 'src/**/*.json')",
      },
      path: {
        type: "string",
        description: "Directory to search in (default: working directory)",
      },
    },
    required: ["pattern"],
  };

  async execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const pattern = input.pattern as string;
    const searchPath = resolve((input.path as string) ?? context.workingDirectory);

    const rel = relative(context.workingDirectory, searchPath);
    if (rel.startsWith("..")) {
      return { content: "Access denied: path is outside working directory", isError: true };
    }

    try {
      const glob = new Bun.Glob(pattern);
      const files: string[] = [];

      for await (const match of glob.scan({ cwd: searchPath })) {
        files.push(match);
        if (files.length >= 500) break;
      }

      if (files.length === 0) {
        return { content: "No files found matching pattern" };
      }

      return {
        content: files.join("\n"),
      };
    } catch (error) {
      return {
        content: `Glob error: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }
}
