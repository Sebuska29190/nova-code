import { useState } from "react";

interface Skill {
  name: string;
  description: string;
  source: "project" | "user" | "plugin";
  body?: string;
}

export function SkillPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  // Placeholder skills (will be loaded from engine)
  const skills: Skill[] = [
    { name: "bug-bounty", description: "Complete bug bounty workflow", source: "user" },
    { name: "web2-recon", description: "Web2 reconnaissance pipeline", source: "user" },
    { name: "security-arsenal", description: "Security payloads and bypass tables", source: "user" },
    { name: "tdd", description: "Test-driven development workflow", source: "plugin" },
    { name: "debugging", description: "Systematic debugging process", source: "plugin" },
  ];

  const filtered = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-neutral-950">
      {/* List */}
      <div className="w-80 border-r border-neutral-800 flex flex-col">
        <div className="p-3 border-b border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-200 mb-3">Skills</h2>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills..."
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-nova-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((skill) => (
            <button
              key={skill.name}
              onClick={() => setSelectedSkill(skill.name)}
              className={`w-full text-left px-3 py-2 border-b border-neutral-800/50 hover:bg-neutral-900 transition-colors ${
                selectedSkill === skill.name ? "bg-neutral-900 border-l-2 border-l-nova-500" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs">⚡</span>
                <span className="text-sm text-neutral-200">{skill.name}</span>
                <span className="text-[10px] bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded ml-auto">
                  {skill.source}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 truncate ml-5">{skill.description}</p>
            </button>
          ))}
        </div>

        <div className="p-2 border-t border-neutral-800 text-xs text-neutral-500 text-center">
          {skills.length} skills available
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚡</div>
          <h3 className="text-lg font-semibold text-neutral-200 mb-2">Skill System</h3>
          <p className="text-sm text-neutral-400 max-w-sm">
            Skills provide specialized workflows. Load a skill to give the agent domain knowledge.
          </p>
        </div>
      </div>
    </div>
  );
}
