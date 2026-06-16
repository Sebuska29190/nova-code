import { useState, useEffect, useMemo, useCallback } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface SkillMeta {
  name: string;
  description: string;
  source: "project" | "user" | "plugin";
  tags: string[];
  body: string;
}

const sourceLabel: Record<string, string> = {
  project: "Project",
  user: "User",
  plugin: "Plugin",
};

const sourceColor: Record<string, string> = {
  project: "bg-emerald-600/20 text-emerald-400",
  user: "bg-nova-600/20 text-nova-400",
  plugin: "bg-amber-600/20 text-amber-400",
};

export function SkillPanel() {
  const [skills, setSkills] = useState<SkillMeta[]>([]);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [loadedSkills, setLoadedSkills] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      if (window.nova?.engine?.getSkills) {
        const result = await window.nova.engine.getSkills();
        setSkills(result);
      }
    } catch {
      setSkills([]);
    }
  };

  const handleLoad = useCallback(
    async (name: string) => {
      try {
        if (window.nova?.engine?.loadSkill) {
          await window.nova.engine.loadSkill(name);
          setLoadedSkills((prev) => new Set(prev).add(name));
        }
      } catch {
        // ignore
      }
    },
    []
  );

  const handleUnload = useCallback(
    async (name: string) => {
      try {
        if (window.nova?.engine?.unloadSkill) {
          await window.nova.engine.unloadSkill(name);
          setLoadedSkills((prev) => {
            const next = new Set(prev);
            next.delete(name);
            return next;
          });
        }
      } catch {
        // ignore
      }
    },
    []
  );

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const skill of skills) {
      for (const tag of skill.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }, [skills]);

  const filtered = useMemo(() => {
    let list = skills;

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );
    }

    if (activeTag) {
      list = list.filter((s) =>
        s.tags.some((t) => t.toLowerCase() === activeTag.toLowerCase())
      );
    }

    return list;
  }, [skills, query, activeTag]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950">
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-neutral-100">Skills</h1>
          <span className="text-xs text-neutral-500">
            {filtered.length} of {skills.length}
          </span>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills..."
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-nova-500 focus:ring-1 focus:ring-nova-500/50"
        />

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            <button
              onClick={() => setActiveTag(null)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                activeTag === null
                  ? "bg-nova-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  activeTag === tag
                    ? "bg-nova-600 text-white"
                    : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <EmptyState hasQuery={!!query.trim() || !!activeTag} />
        ) : (
          <div className="space-y-2">
            {filtered.map((skill) => (
              <SkillCard
                key={skill.name}
                skill={skill}
                isExpanded={expandedName === skill.name}
                isLoaded={loadedSkills.has(skill.name)}
                onToggle={() =>
                  setExpandedName(expandedName === skill.name ? null : skill.name)
                }
                onLoad={() => handleLoad(skill.name)}
                onUnload={() => handleUnload(skill.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkillCard({
  skill,
  isExpanded,
  isLoaded,
  onToggle,
  onLoad,
  onUnload,
}: {
  skill: SkillMeta;
  isExpanded: boolean;
  isLoaded: boolean;
  onToggle: () => void;
  onLoad: () => void;
  onUnload: () => void;
}) {
  return (
    <div
      className={`rounded-xl border transition-colors ${
        isExpanded
          ? "border-nova-500/40 bg-neutral-900"
          : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base shrink-0">⚡</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-200 truncate">
                {skill.name}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                  sourceColor[skill.source] ?? "bg-neutral-700 text-neutral-400"
                }`}
              >
                {sourceLabel[skill.source] ?? skill.source}
              </span>
              {isLoaded && (
                <span className="text-[10px] bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded shrink-0">
                  Loaded
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 truncate mt-0.5">
              {skill.description}
            </p>
          </div>
        </div>

        <svg
          className={`w-4 h-4 text-neutral-500 transition-transform shrink-0 ml-2 ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-neutral-800 pt-3 space-y-3">
          {skill.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {skill.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="max-h-80 overflow-y-auto rounded-lg bg-neutral-950 border border-neutral-800 p-3">
            <MarkdownRenderer
              content={skill.body}
              className="prose-sm text-neutral-300"
            />
          </div>

          <div className="flex gap-2">
            {isLoaded ? (
              <button
                onClick={onUnload}
                className="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-sm font-medium transition-colors"
              >
                Unload
              </button>
            ) : (
              <button
                onClick={onLoad}
                className="px-4 py-2 rounded-lg bg-nova-600 hover:bg-nova-500 text-white text-sm font-medium transition-colors"
              >
                Load Skill
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="flex-1 flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-4xl mb-3">⚡</div>
        <h2 className="text-sm font-semibold text-neutral-300 mb-1">
          {hasQuery ? "No skills match" : "No skills found"}
        </h2>
        <p className="text-xs text-neutral-500">
          {hasQuery
            ? "Try a different search or clear filters"
            : "Add SKILL.md files to your project or user directory"}
        </p>
      </div>
    </div>
  );
}
