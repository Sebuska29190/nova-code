import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { ChatPanel } from "./components/ChatPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { SkillPanel } from "./components/SkillPanel";
import { PluginPanel } from "./components/PluginPanel";
import { TelegramPanel } from "./components/TelegramPanel";
import { AgentTree } from "./components/AgentTree";
import { useAppStore } from "./stores/app";

export default function App() {
  const { sidebarOpen, activeView } = useAppStore();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Custom titlebar */}
      <TitleBar />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && <Sidebar />}

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeView === "chat" && <ChatPanel />}
            {activeView === "settings" && <SettingsPanel />}
            {activeView === "skills" && <SkillPanel />}
            {activeView === "plugins" && <PluginPanel />}
            {activeView === "telegram" && <TelegramPanel />}
          </div>

          {/* Agent tree sidebar (always visible when agents exist) */}
          <AgentTreeSidebar />
        </div>
      </div>
    </div>
  );
}

/** Agent tree sidebar — shows active agents */
function AgentTreeSidebar() {
  const { agents } = useAgentStore();

  // Only show when there are active agents
  if (agents.length === 0) return null;

  return (
    <div className="w-80 border-l border-neutral-800 bg-neutral-900 overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-neutral-800">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Agents ({agents.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        <AgentTree />
      </div>
    </div>
  );
}

// Import agent store
import { useAgentStore } from "./stores/agents";
