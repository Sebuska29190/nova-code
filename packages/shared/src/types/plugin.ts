/** Plugin manifest (nova-plugin/plugin.json) */
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  skills?: string;
  commands?: string;
  mcpServers?: Record<string, McpServerConfig>;
  userConfig?: Record<string, UserConfigField>;
}

/** MCP server configuration in plugin */
export interface McpServerConfig {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
}

/** User-configurable plugin setting */
export interface UserConfigField {
  type: "string" | "number" | "boolean";
  description: string;
  default?: unknown;
}

/** Hook types */
export type HookType = "SessionStart" | "PreToolUse" | "PostToolUse";

/** Hook definition */
export interface Hook {
  type: HookType;
  command: string;
  args?: string[];
}

/** A loaded plugin */
export interface Plugin {
  manifest: PluginManifest;
  basePath: string;
  hooks: Hook[];
  isLoaded: boolean;
}
