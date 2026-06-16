import { resolve, relative } from "path";
import type { Tool, ToolParameterSchema, ToolResult, ToolContext } from "@nova/shared";

/**
 * Edit tool — exact string replacement in files.
 * The old_string must be unique in the file.
 */
export class EditTool implements Tool {
  readonly name = "edit";
  readonly description = "Replace text in a file. The old_string must match exactly and be unique.";
  readonly parameters: ToolParameterSchema = {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Absolute path to the file",
      },
      old_string: {
        type: "string",
        description: "The exact text to find and replace",
      },
      new_string: {
        type: "string",
        description: "The replacement text",
      },
      replace_all: {
        type: "boolean",
        description: "Replace all occurrences (default: false)",
      },
    },
    required: ["file_path", "old_string", "new_string"],
  };

  async execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = resolve(input.file_path as string);
    const oldStr = input.old_string as string;
    const newStr = input.new_string as string;
    const replaceAll = (input.replace_all as boolean) ?? false;

    const rel = relative(context.workingDirectory, filePath);
    if (rel.startsWith("..")) {
      return { content: "Access denied: path is outside working directory", isError: true };
    }

    try {
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        return { content: `File not found: ${filePath}`, isError: true };
      }

      let content = await file.text();

      if (!content.includes(oldStr)) {
        return { content: "old_string not found in file", isError: true };
      }

      if (!replaceAll) {
        // Check uniqueness
        const count = content.split(oldStr).length - 1;
        if (count > 1) {
          return {
            content: `old_string found ${count} times. Use replace_all or make it more specific.`,
            isError: true,
          };
        }
      }

      content = replaceAll
        ? content.replaceAll(oldStr, newStr)
        : content.replace(oldStr, newStr);

      await Bun.write(filePath, content);

      return {
        content: `File edited: ${filePath}`,
      };
    } catch (error) {
      return {
        content: `Error editing file: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }
}
