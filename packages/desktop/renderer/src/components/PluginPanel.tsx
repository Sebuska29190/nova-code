import { useState } from "react";

interface Plugin {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  hasMcp: boolean;
  skills: string[];
}

export function PluginPanel() {
  const [searchQuery, setSearchQuery] = useState("");

  // Placeholder plugins (will be loaded from engine)
  const plugins: Plugin[] = [
    { name: "superpowers", version: "5.1.0", description: "TDD, debugging, code review workflows", enabled: true, hasMcp: false, skills: ["tdd", "debugging", "code-review"] },
    { name: "web-search", version: "0.1.0", description: "Web search via DuckDuckGo/Brave", enabled: true, hasMcp: true, skills: ["web-search"] },
    { name: "telegram", version: "0.1.0", description: "Telegram bot integration", enabled: false, hasMcp: false, skills: [] },
  ];

  const filtered = plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-950 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-100">Plugins</h1>
          <button className="px-3 py-1.5 rounded-lg bg-nova-600 hover:bg-nova-500 text-white text-sm">
            Install from URL
          </button>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search plugins..."
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-nova-500"
        />

        <div className="space-y-2">
          {filtered.map((plugin) => (
            <div
              key={plugin.name}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${plugin.enabled ? "bg-green-500" : "bg-neutral-600"}`} />
                  <div>
                    <span className="text-sm font-medium text-neutral-200">{plugin.name}</span>
                    <span className="text-xs text-neutral-500 ml-2">v{plugin.version}</span>
                  </div>
                </div>
                <button
                  className={`px-3 py-1 rounded-lg text-xs ${
                    plugin.enabled
                      ? "bg-green-600/20 text-green-400 hover:bg-green-600/30"
                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                  }`}
                >
                  {plugin.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
              <p className="text-sm text-neutral-400 mt-2">{plugin.description}</p>
              {plugin.skills.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {plugin.skills.map((s) => (
                    <span key={s} className="text-[10px] bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
