import type { Tool, ToolParameterSchema, ToolResult, ToolContext } from "@nova/shared";

/**
 * Bash tool — execute shell commands.
 * Supports timeout and background execution.
 */
export class BashTool implements Tool {
  readonly name = "bash";
  readonly description = "Execute a shell command. Use for running scripts, installing packages, git operations, etc.";
  readonly parameters: ToolParameterSchema = {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to execute",
      },
      description: {
        type: "string",
        description: "Short description of what this command does",
      },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds (default: 120000, max: 600000)",
      },
    },
    required: ["command"],
  };

  async execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const command = input.command as string;
    const timeout = Math.min((input.timeout as number) ?? 120_000, 600_000);

    try {
      const proc = Bun.spawn(["bash", "-c", command], {
        cwd: context.workingDirectory,
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, FORCE_COLOR: "0" },
      });

      const timer = setTimeout(() => proc.kill(), timeout);

      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      clearTimeout(timer);
      const exitCode = await proc.exited;

      let output = "";
      if (stdout) output += stdout;
      if (stderr) output += `\n[stderr]\n${stderr}`;
      if (exitCode !== 0) output += `\n[exit code: ${exitCode}]`;

      return {
        content: output.trim() || "(no output)",
        isError: exitCode !== 0,
      };
    } catch (error) {
      return {
        content: `Failed to execute: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }
}
