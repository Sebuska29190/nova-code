import { resolve, relative } from "path";
import type { Tool, ToolParameterSchema, ToolResult, ToolContext } from "@nova/shared";

/**
 * Grep tool — content search using ripgrep (bundled) or fallback to Bun.
 */
export class GrepTool implements Tool {
  readonly name = "grep";
  readonly description = "Search file contents using regex. Fast search powered by ripgrep.";
  readonly parameters: ToolParameterSchema = {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Regex pattern to search for",
      },
      path: {
        type: "string",
        description: "File or directory to search in (default: working directory)",
      },
      glob: {
        type: "string",
        description: "File glob filter (e.g. '*.ts')",
      },
      output_mode: {
        type: "string",
        enum: ["content", "files_with_matches", "count"],
        description: "Output mode (default: files_with_matches)",
      },
      context: {
        type: "number",
        description: "Lines of context before and after match",
      },
      head_limit: {
        type: "number",
        description: "Max results to return (default: 250)",
      },
    },
    required: ["pattern"],
  };

  async execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const pattern = input.pattern as string;
    const searchPath = resolve((input.path as string) ?? context.workingDirectory);
    const glob = input.glob as string | undefined;
    const outputMode = (input.output_mode as string) ?? "files_with_matches";
    const ctx = input.context as number | undefined;
    const headLimit = (input.head_limit as number) ?? 250;

    const rel = relative(context.workingDirectory, searchPath);
    if (rel.startsWith("..")) {
      return { content: "Access denied: path is outside working directory", isError: true };
    }

    // Build ripgrep command
    const args = ["--no-heading", "--line-number"];

    if (outputMode === "files_with_matches") {
      args.push("--files-with-matches");
    } else if (outputMode === "count") {
      args.push("--count");
    }

    if (glob) {
      args.push("--glob", glob);
    }
    if (ctx) {
      args.push("--context", String(ctx));
    }

    args.push("--", pattern, searchPath);

    try {
      const proc = Bun.spawn(["rg", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      // exitCode 1 = no matches, 2 = error
      if (exitCode === 2) {
        return { content: `ripgrep error: ${stderr}`, isError: true };
      }

      if (exitCode === 1 || !stdout.trim()) {
        return { content: "No matches found" };
      }

      const lines = stdout.trim().split("\n");
      const limited = lines.slice(0, headLimit);
      let result = limited.join("\n");

      if (lines.length > headLimit) {
        result += `\n\n... and ${lines.length - headLimit} more results`;
      }

      return { content: result };
    } catch (error) {
      // Fallback to basic search if ripgrep not available
      return this.fallbackSearch(pattern, searchPath, glob, outputMode, headLimit);
    }
  }

  private async fallbackSearch(
    pattern: string,
    searchPath: string,
    glob: string | undefined,
    outputMode: string,
    headLimit: number,
  ): Promise<ToolResult> {
    const regex = new RegExp(pattern, "gi");
    const results: string[] = [];

    // Simple recursive file walk
    const walk = async (dir: string) => {
      if (results.length >= headLimit) return;

      for await (const entry of new Bun.Glob("*").scan({ cwd: dir })) {
        if (results.length >= headLimit) return;

        const fullPath = `${dir}/${entry}`;
        const file = Bun.file(fullPath);

        if (await file.exists()) {
          const text = await file.text();
          const lines = text.split("\n");

          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              if (outputMode === "files_with_matches") {
                results.push(fullPath);
                break;
              } else {
                results.push(`${fullPath}:${i + 1}: ${lines[i].trim()}`);
              }
              regex.lastIndex = 0;
            }
          }
        }
      }
    };

    try {
      await walk(searchPath);
      return { content: results.length > 0 ? results.join("\n") : "No matches found" };
    } catch (error) {
      return {
        content: `Search error: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }
}
