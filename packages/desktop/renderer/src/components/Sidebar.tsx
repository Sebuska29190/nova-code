import { useAppStore } from "../stores/app";

const navItems = [
  { id: "chat" as const, icon: "💬", label: "Chat" },
  { id: "skills" as const, icon: "⚡", label: "Skills" },
  { id: "plugins" as const, icon: "🔌", label: "Plugins" },
  { id: "telegram" as const, icon: "📱", label: "Telegram" },
  { id: "settings" as const, icon: "⚙️", label: "Settings" },
];

export function Sidebar() {
  const { activeView, setActiveView } = useAppStore();

  return (
    <div className="w-56 bg-neutral-900 border-r border-neutral-800 flex flex-col">
      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === item.id
                ? "bg-nova-600/20 text-nova-300"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-neutral-800">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Engine ready</span>
        </div>
      </div>
    </div>
  );
}
