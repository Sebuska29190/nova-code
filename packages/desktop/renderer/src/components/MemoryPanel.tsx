import { useState, useEffect } from "react";
import { useMemoryStore, type MemoryEntry } from "../stores/memory";

export function MemoryPanel() {
  const { entries, loadEntries, deleteEntry, searchQuery, setSearchQuery } = useMemoryStore();
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newEntry, setNewEntry] = useState({ name: "", description: "", type: "project" as const, content: "" });

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const filteredEntries = entries.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    if (!newEntry.name || !newEntry.description) return;
    useMemoryStore.getState().addEntry(newEntry);
    setNewEntry({ name: "", description: "", type: "project", content: "" });
    setIsCreating(false);
  };

  const handleDelete = (name: string) => {
    if (confirm(`Delete memory "${name}"?`)) {
      deleteEntry(name);
      if (selectedEntry === name) setSelectedEntry(null);
    }
  };

  const selected = entries.find((e) => e.name === selectedEntry);

  return (
    <div className="flex-1 flex overflow-hidden bg-neutral-950">
      {/* List */}
      <div className="w-80 border-r border-neutral-800 flex flex-col">
        <div className="p-3 border-b border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-200">Memory</h2>
            <button
              onClick={() => setIsCreating(true)}
              className="px-2 py-1 rounded text-xs bg-nova-600 hover:bg-nova-500 text-white"
            >
              + New
            </button>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-nova-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredEntries.length === 0 ? (
            <div className="p-4 text-center text-neutral-500 text-sm">
              {searchQuery ? "No matches" : "No memories yet"}
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <button
                key={entry.name}
                onClick={() => setSelectedEntry(entry.name)}
                className={`w-full text-left px-3 py-2 border-b border-neutral-800/50 hover:bg-neutral-900 transition-colors ${
                  selectedEntry === entry.name ? "bg-neutral-900 border-l-2 border-l-nova-500" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs">
                    {entry.type === "user" ? "👤" : entry.type === "project" ? "📁" : entry.type === "feedback" ? "💬" : "📎"}
                  </span>
                  <span className="text-sm text-neutral-200 truncate">{entry.name}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 truncate ml-5">{entry.description}</p>
              </button>
            ))
          )}
        </div>

        <div className="p-2 border-t border-neutral-800 text-xs text-neutral-500 text-center">
          {entries.length} memories
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isCreating ? (
          <CreateForm
            entry={newEntry}
            onChange={setNewEntry}
            onSave={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        ) : selected ? (
          <DetailView entry={selected} onDelete={() => handleDelete(selected.name)} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function CreateForm({
  entry,
  onChange,
  onSave,
  onCancel,
}: {
  entry: { name: string; description: string; type: string; content: string };
  onChange: (e: any) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg space-y-4">
        <h3 className="text-lg font-semibold text-neutral-200">New Memory</h3>

        <Field label="Name">
          <input
            type="text"
            value={entry.name}
            onChange={(e) => onChange({ ...entry, name: e.target.value })}
            placeholder="my-fact"
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-nova-500"
          />
        </Field>

        <Field label="Description">
          <input
            type="text"
            value={entry.description}
            onChange={(e) => onChange({ ...entry, description: e.target.value })}
            placeholder="One-line summary"
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-nova-500"
          />
        </Field>

        <Field label="Type">
          <select
            value={entry.type}
            onChange={(e) => onChange({ ...entry, type: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-nova-500"
          >
            <option value="user">User</option>
            <option value="project">Project</option>
            <option value="feedback">Feedback</option>
            <option value="reference">Reference</option>
          </select>
        </Field>

        <Field label="Content">
          <textarea
            value={entry.content}
            onChange={(e) => onChange({ ...entry, content: e.target.value })}
            placeholder="The fact to remember..."
            rows={6}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-nova-500 resize-none"
          />
        </Field>

        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={!entry.name || !entry.description}
            className="px-4 py-2 rounded-lg bg-nova-600 hover:bg-nova-500 disabled:opacity-50 text-white text-sm"
          >
            Save
          </button>
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 text-sm hover:bg-neutral-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailView({ entry, onDelete }: { entry: MemoryEntry; onDelete: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-200">{entry.name}</h3>
            <p className="text-sm text-neutral-400">{entry.description}</p>
          </div>
          <button onClick={onDelete} className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 text-xs hover:bg-red-600/30">
            Delete
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded capitalize">{entry.type}</span>
          <span className="text-xs text-neutral-500">{entry.source}</span>
        </div>

        <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800">
          <pre className="text-sm text-neutral-200 whitespace-pre-wrap font-sans">{entry.content}</pre>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🧠</div>
        <h3 className="text-lg font-semibold text-neutral-200 mb-2">Memory System</h3>
        <p className="text-sm text-neutral-400 max-w-sm">
          Store facts, preferences, and context that persist across sessions.
          The agent remembers what you tell it.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-neutral-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
