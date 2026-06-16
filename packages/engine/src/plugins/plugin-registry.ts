import { join } from "path";
import { rm, mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { spawn, type ChildProcess } from "child_process";
import { PluginLoader } from "./loader.js";
import type { Plugin, PluginManifest, McpServerConfig } from "@nova/shared";

interface McpServerProcess {
  name: string;
  process: ChildProcess;
  config: McpServerConfig;
  status: "running" | "stopped" | "error";
}

interface PluginState {
  name: string;
  enabled: boolean;
  installedAt: string;
  source: string;
}

export class PluginRegistry extends PluginLoader {
  private states = new Map<string, PluginState>();
  private mcpServers = new Map<string, McpServerProcess>();
  private statePath: string;
  private installPath: string;

  constructor(pluginPaths: string[], statePath?: string) {
    super(pluginPaths);
    this.installPath = pluginPaths[0] ?? ".nova/plugins";
    this.statePath = statePath ?? join(this.installPath, "plugin-states.json");
  }

  async init(): Promise<void> {
    await this.loadStates();
    await this.loadAll();
  }

  async install(url: string): Promise<Plugin> {
    const repoInfo = this.parseGitHubUrl(url);
    const pluginPath = join(this.installPath, repoInfo.name);

    if (existsSync(pluginPath)) {
      throw new Error(`Plugin ${repoInfo.name} already installed`);
    }

    await mkdir(pluginPath, { recursive: true });
    await this.cloneRepo(url, pluginPath);

    const manifestPath = join(pluginPath, ".nova-plugin", "plugin.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf-8")) as PluginManifest;

    this.states.set(manifest.name, {
      name: manifest.name,
      enabled: true,
      installedAt: new Date().toISOString(),
      source: url,
    });

    await this.saveStates();
    await this.loadAll();

    const plugin = this.get(manifest.name);
    if (!plugin) throw new Error("Failed to load installed plugin");
    return plugin;
  }

  async uninstall(name: string): Promise<void> {
    const plugin = this.get(name);
    if (!plugin) throw new Error(`Plugin ${name} not found`);

    await this.stopServer(name);
    await rm(plugin.basePath, { recursive: true, force: true });
    this.states.delete(name);
    await this.saveStates();
    await this.loadAll();
  }

  async enable(name: string): Promise<void> {
    const state = this.states.get(name);
    if (!state) throw new Error(`Plugin ${name} not found`);
    state.enabled = true;
    await this.saveStates();
  }

  async disable(name: string): Promise<void> {
    const state = this.states.get(name);
    if (!state) throw new Error(`Plugin ${name} not found`);
    state.enabled = false;
    await this.stopServer(name);
    await this.saveStates();
  }

  isEnabled(name: string): boolean {
    return this.states.get(name)?.enabled ?? false;
  }

  getEnabledPlugins(): Plugin[] {
    return this.list().filter((p) => this.isEnabled(p.manifest.name));
  }

  async startServer(name: string): Promise<void> {
    const plugin = this.get(name);
    if (!plugin) throw new Error(`Plugin ${name} not found`);
    if (!this.isEnabled(name)) throw new Error(`Plugin ${name} is disabled`);

    const serverConfigs = plugin.manifest.mcpServers;
    if (!serverConfigs || Object.keys(serverConfigs).length === 0) {
      throw new Error(`Plugin ${name} has no MCP servers`);
    }

    for (const [serverName, config] of Object.entries(serverConfigs)) {
      const fullKey = `${name}:${serverName}`;
      if (this.mcpServers.has(fullKey)) continue;

      const child = spawn(config.command, config.args, {
        cwd: config.cwd ?? plugin.basePath,
        env: { ...process.env, ...config.env },
        stdio: ["pipe", "pipe", "pipe"],
      });

      const serverProcess: McpServerProcess = {
        name: fullKey,
        process: child,
        config,
        status: "running",
      };

      child.on("error", () => { serverProcess.status = "error"; });
      child.on("exit", () => { serverProcess.status = "stopped"; this.mcpServers.delete(fullKey); });
      this.mcpServers.set(fullKey, serverProcess);
    }
  }

  async stopServer(name: string): Promise<void> {
    for (const [key, server] of this.mcpServers) {
      if (key.startsWith(`${name}:`)) {
        server.process.kill("SIGTERM");
        server.status = "stopped";
        this.mcpServers.delete(key);
      }
    }
  }

  listServers(): Array<{ name: string; status: string; config: McpServerConfig }> {
    return Array.from(this.mcpServers.values()).map((s) => ({
      name: s.name,
      status: s.status,
      config: s.config,
    }));
  }

  async searchGitHub(query: string): Promise<Array<{ name: string; url: string; description: string }>> {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+nova-plugin&per_page=10`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    if (!response.ok) throw new Error("GitHub search failed");
    const data = await response.json();
    return data.items.map((item: { name: string; html_url: string; description: string }) => ({
      name: item.name,
      url: item.html_url,
      description: item.description ?? "",
    }));
  }

  private parseGitHubUrl(url: string): { owner: string; name: string } {
    const match = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
    if (!match) throw new Error("Invalid GitHub URL");
    return { owner: match[1], name: match[2] };
  }

  private async cloneRepo(url: string, targetPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn("git", ["clone", "--depth", "1", url, targetPath], { stdio: "pipe" });
      child.on("close", (code) => { if (code === 0) resolve(); else reject(new Error(`Git clone failed: ${code}`)); });
      child.on("error", reject);
    });
  }

  private async loadStates(): Promise<void> {
    try {
      if (existsSync(this.statePath)) {
        const data = JSON.parse(await readFile(this.statePath, "utf-8")) as PluginState[];
        for (const state of data) this.states.set(state.name, state);
      }
    } catch { /* No states file */ }
  }

  private async saveStates(): Promise<void> {
    const states = Array.from(this.states.values());
    await writeFile(this.statePath, JSON.stringify(states, null, 2));
  }
}
