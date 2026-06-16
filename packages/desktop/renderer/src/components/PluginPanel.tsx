import { useState, useEffect, useCallback } from "react";

interface PluginInfo {
  name: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;
  skills: string[];
  commands: string[];
  mcpServers: Array<{ name: string; status: string; command: string }>;
  userConfig: Record<string, { type: string; description: string; default?: unknown; value?: unknown }>;
}

interface SearchResult {
  name: string;
  url: string;
  description: string;
}

export function PluginPanel() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
  const [installUrl, setInstallUrl] = useState("");
  const [installing, setInstalling] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlugins = useCallback(async () => {
    try {
      const result = await window.nova.engine.plugins?.list();
      if (result) setPlugins(result);
    } catch (err) {
      console.error("Failed to load plugins:", err);
    }
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  const handleToggle = async (name: string, enabled: boolean) => {
    try {
      if (enabled) {
        await window.nova.engine.plugins?.enable(name);
      } else {
        await window.nova.engine.plugins?.disable(name);
      }
      setPlugins((prev) =>
        prev.map((p) => (p.name === name ? { ...p, enabled } : p))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle plugin");
    }
  };

  const handleInstall = async () => {
    if (!installUrl.trim()) return;

    setInstalling(true);
    setError(null);

    try {
      await window.nova.engine.plugins?.install(installUrl);
      setInstallUrl("");
      await loadPlugins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Installation failed");
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async (name: string) => {
    try {
      await window.nova.engine.plugins?.uninstall(name);
      await loadPlugins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uninstall failed");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);

    try {
      const results = await window.nova.engine.plugins?.search(searchQuery);
      if (results) setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleStartServer = async (pluginName: string) => {
    try {
      await window.nova.engine.plugins?.startServer(pluginName);
      await loadPlugins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start server");
    }
  };

  const handleStopServer = async (pluginName: string) => {
    try {
      await window.nova.engine.plugins?.stopServer(pluginName);
      await loadPlugins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop server");
    }
  };

  const handleConfigChange = async (pluginName: string, key: string, value: unknown) => {
    try {
      await window.nova.engine.plugins?.updateConfig(pluginName, key, value);
      await loadPlugins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update config");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-100">Plugins</h1>
          <span className="text-sm text-neutral-500">{plugins.length} installed</span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline hover:text-red-300">
              Dismiss
            </button>
          </div>
        )}

        {/* Install from GitHub */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4">
          <h2 className="text-sm font-semibold text-neutral-200 mb-3">Install from GitHub</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={installUrl}
              onChange={(e) => setInstallUrl(e.target.value)}
              placeholder="https://github.com/user/nova-plugin-xyz"
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-nova-500 focus:ring-1 focus:ring-nova-500/50"
              onKeyDown={(e) => { if (e.key === "Enter") handleInstall(); }}
            />
            <button
              onClick={handleInstall}
              disabled={installing || !installUrl.trim()}
              className="px-4 py-2 rounded-lg bg-nova-600 hover:bg-nova-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white text-sm font-medium transition-colors"
            >
              {installing ? "Installing..." : "Install"}
            </button>
          </div>
        </div>

        {/* Search marketplace */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4">
          <h2 className="text-sm font-semibold text-neutral-200 mb-3">Search Marketplace</h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plugins..."
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-nova-500 focus:ring-1 focus:ring-nova-500/50"
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm transition-colors"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((result) => (
                <div key={result.url} className="flex items-center justify-between p-2 rounded-lg bg-neutral-800/50">
                  <div>
                    <span className="text-sm text-neutral-200">{result.name}</span>
                    <p className="text-xs text-neutral-500">{result.description}</p>
                  </div>
                  <button
                    onClick={() => setInstallUrl(result.url)}
                    className="px-3 py-1 rounded bg-nova-600/20 text-nova-400 text-xs hover:bg-nova-600/30"
                  >
                    Use URL
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plugin list */}
        <div className="space-y-3">
          {plugins.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <div className="text-4xl mb-3">🔌</div>
              <p className="text-sm">No plugins installed</p>
              <p className="text-xs text-neutral-600 mt-1">Install from GitHub or search the marketplace</p>
            </div>
          ) : (
            plugins.map((plugin) => (
              <PluginCard
                key={plugin.name}
                plugin={plugin}
                isExpanded={expandedPlugin === plugin.name}
                onToggle={() => setExpandedPlugin((prev) => (prev === plugin.name ? null : plugin.name))}
                onEnable={() => handleToggle(plugin.name, true)}
                onDisable={() => handleToggle(plugin.name, false)}
                onUninstall={() => handleUninstall(plugin.name)}
                onStartServer={() => handleStartServer(plugin.name)}
                onStopServer={() => handleStopServer(plugin.name)}
                onConfigChange={(key, value) => handleConfigChange(plugin.name, key, value)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PluginCard({
  plugin,
  isExpanded,
  onToggle,
  onEnable,
  onDisable,
  onUninstall,
  onStartServer,
  onStopServer,
  onConfigChange,
}: {
  plugin: PluginInfo;
  isExpanded: boolean;
  onToggle: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onUninstall: () => void;
  onStartServer: () => void;
  onStopServer: () => void;
  onConfigChange: (key: string, value: unknown) => void;
}) {
  return (
    <div
      className={`rounded-xl border transition-colors ${
        plugin.enabled ? "border-neutral-700 bg-neutral-900" : "border-neutral-800 bg-neutral-900/60"
      }`}
    >
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${plugin.enabled ? "bg-green-500" : "bg-neutral-600"}`} />
          <div>
            <span className="text-sm font-medium text-neutral-200">{plugin.name}</span>
            <span className="text-xs text-neutral-500 ml-2">v{plugin.version}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500 max-w-xs truncate">{plugin.description}</span>
          <svg
            className={`w-4 h-4 text-neutral-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-neutral-800 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Status</span>
            <Toggle checked={plugin.enabled} onChange={(v) => (v ? onEnable() : onDisable())} />
          </div>

          {plugin.author && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Author</span>
              <span className="text-sm text-neutral-200">{plugin.author}</span>
            </div>
          )}

          {/* Skills */}
          {plugin.skills.length > 0 && (
            <div>
              <span className="text-sm text-neutral-400 block mb-2">Skills</span>
              <div className="flex flex-wrap gap-2">
                {plugin.skills.map((skill) => (
                  <span key={skill} className="px-2 py-1 rounded bg-neutral-800 text-xs text-neutral-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Commands */}
          {plugin.commands.length > 0 && (
            <div>
              <span className="text-sm text-neutral-400 block mb-2">Commands</span>
              <div className="flex flex-wrap gap-2">
                {plugin.commands.map((cmd) => (
                  <span key={cmd} className="px-2 py-1 rounded bg-neutral-800 text-xs font-mono text-neutral-300">
                    /{cmd}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* MCP Servers */}
          {plugin.mcpServers.length > 0 && (
            <div>
              <span className="text-sm text-neutral-400 block mb-2">MCP Servers</span>
              <div className="space-y-2">
                {plugin.mcpServers.map((server) => (
                  <div key={server.name} className="flex items-center justify-between p-2 rounded-lg bg-neutral-800/50">
                    <div>
                      <span className="text-sm text-neutral-200">{server.name}</span>
                      <span className="text-xs text-neutral-500 ml-2 font-mono">{server.command}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          server.status === "running"
                            ? "bg-green-500/20 text-green-400"
                            : server.status === "error"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-neutral-700 text-neutral-400"
                        }`}
                      >
                        {server.status}
                      </span>
                      {server.status === "running" ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); onStopServer(); }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Stop
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); onStartServer(); }}
                          className="text-xs text-green-400 hover:text-green-300"
                        >
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Config */}
          {Object.keys(plugin.userConfig).length > 0 && (
            <div>
              <span className="text-sm text-neutral-400 block mb-2">Settings</span>
              <div className="space-y-3">
                {Object.entries(plugin.userConfig).map(([key, field]) => (
                  <ConfigField
                    key={key}
                    fieldKey={key}
                    field={field}
                    onChange={(value) => onConfigChange(key, value)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-neutral-800">
            <button
              onClick={(e) => { e.stopPropagation(); onUninstall(); }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Uninstall plugin
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigField({
  fieldKey,
  field,
  onChange,
}: {
  fieldKey: string;
  field: { type: string; description: string; default?: unknown; value?: unknown };
  onChange: (value: unknown) => void;
}) {
  const currentValue = field.value ?? field.default;

  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-neutral-200">{fieldKey}</span>
          <p className="text-xs text-neutral-500">{field.description}</p>
        </div>
        <Toggle checked={!!currentValue} onChange={onChange} />
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-neutral-200">{fieldKey}</span>
          <span className="text-xs text-neutral-500">{field.description}</span>
        </div>
        <input
          type="number"
          value={currentValue != null ? String(currentValue) : ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-nova-500 focus:ring-1 focus:ring-nova-500/50"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-neutral-200">{fieldKey}</span>
        <span className="text-xs text-neutral-500">{field.description}</span>
      </div>
      <input
        type="text"
        value={currentValue != null ? String(currentValue) : ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-nova-500 focus:ring-1 focus:ring-nova-500/50"
      />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-nova-600" : "bg-neutral-700"}`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
