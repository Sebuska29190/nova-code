import { resolve, join } from "path";
import { readdir } from "fs/promises";
import type { Skill, SkillFrontmatter } from "@nova/shared";

/**
 * Skill loader — discovers and loads SKILL.md files
 * from project, user, and plugin directories.
 */
export class SkillLoader {
  private skills = new Map<string, Skill>();
  private searchPaths: string[];

  constructor(searchPaths: string[]) {
    this.searchPaths = searchPaths;
  }

  /** Discover and load all skills from search paths */
  async loadAll(): Promise<void> {
    this.skills.clear();

    for (const basePath of this.searchPaths) {
      try {
        const entries = await readdir(basePath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const skillPath = join(basePath, entry.name, "SKILL.md");
          try {
            const file = Bun.file(skillPath);
            if (await file.exists()) {
              const content = await file.text();
              const skill = this.parseSkill(content, join(basePath, entry.name));
              if (skill) {
                // First found wins (priority order)
                if (!this.skills.has(skill.name)) {
                  this.skills.set(skill.name, skill);
                }
              }
            }
          } catch {
            // Skip invalid skills
          }
        }
      } catch {
        // Path doesn't exist, skip
      }
    }
  }

  /** Get a skill by name */
  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /** List all loaded skill names */
  listSkills(): string[] {
    return Array.from(this.skills.keys());
  }

  /** Get skill metadata for context (name + description only) */
  getMetadataSummary(): string {
    const skills = Array.from(this.skills.values());
    if (skills.length === 0) return "No skills available.";

    return (
      "Available skills:\n" +
      skills.map((s) => `- ${s.name}: ${s.description}`).join("\n")
    );
  }

  /** Parse a SKILL.md file into a Skill object */
  private parseSkill(content: string, sourcePath: string): Skill | null {
    // Extract frontmatter between --- markers
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!fmMatch) return null;

    const [, fmContent, body] = fmMatch;
    const frontmatter = this.parseFrontmatter(fmContent);
    if (!frontmatter?.name || !frontmatter?.description) return null;

    return {
      name: frontmatter.name,
      description: frontmatter.description,
      body: body.trim(),
      sourcePath,
      references: new Map(),
      source: "user",
    };
  }

  /** Parse YAML frontmatter (simple key: value parser) */
  private parseFrontmatter(content: string): SkillFrontmatter | null {
    const result: Record<string, string> = {};

    for (const line of content.split("\n")) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        result[match[1]] = match[2].trim();
      }
    }

    if (!result.name || !result.description) return null;

    // Validate limits
    if (result.name.length > 64) {
      console.warn(`Skill name too long (${result.name.length}/64): ${result.name}`);
    }
    if (result.description.length > 1024) {
      console.warn(`Skill description too long (${result.description.length}/1024): ${result.name}`);
    }

    return {
      name: result.name,
      description: result.description,
    };
  }
}
