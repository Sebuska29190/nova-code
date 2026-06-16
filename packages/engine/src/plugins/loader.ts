import { resolve, join } from "path";
import { readdir } from "fs/promises";
import type { Plugin, PluginManifest, Hook } from "@nova/shared";

/**
 * Plugin loader — discovers and loads plugins
 * from the plugin directories.
 */
export class PluginLoader {
  private plugins = new Map<string, Plugin>();
  protected pluginPaths: string[];

  constructor(pluginPaths: string[]) {
    this.pluginPaths = pluginPaths;
  }

  /** Discover and load all plugins */
  async loadAll(): Promise<void> {
    this.plugins.clear();

    for (const basePath of this.pluginPaths) {
      try {
        const entries = await readdir(basePath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const manifestPath = join(basePath, entry.name, ".nova-plugin", "plugin.json");
          try {
            const file = Bun.file(manifestPath);
            if (await file.exists()) {
              const manifest = JSON.parse(await file.text()) as PluginManifest;
              const pluginPath = join(basePath, entry.name);

              const plugin: Plugin = {
                manifest,
                basePath: pluginPath,
                hooks: await this.loadHooks(pluginPath, manifest),
                isLoaded: true,
              };

              this.plugins.set(manifest.name, plugin);
            }
          } catch {
            // Skip invalid plugins
          }
        }
      } catch {
        // Path doesn't exist, skip
      }
    }
  }

  /** Get a plugin by name */
  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /** List all loaded plugins */
  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /** Get hooks for a specific type */
  getHooks(type: string): Hook[] {
    const hooks: Hook[] = [];
    for (const plugin of this.plugins.values()) {
      for (const hook of plugin.hooks) {
        if (hook.type === type) {
          hooks.push(hook);
        }
      }
    }
    return hooks;
  }

  /** Load hooks from a plugin */
  private async loadHooks(pluginPath: string, manifest: PluginManifest): Promise<Hook[]> {
    const hooks: Hook[] = [];
    const hooksPath = join(pluginPath, "hooks", "hooks.json");

    try {
      const file = Bun.file(hooksPath);
      if (await file.exists()) {
        const hooksData = JSON.parse(await file.text());
        if (Array.isArray(hooksData)) {
          hooks.push(...hooksData);
        }
      }
    } catch {
      // No hooks
    }

    return hooks;
  }
}
