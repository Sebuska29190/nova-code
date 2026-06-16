import type { Skill } from "@nova/shared";
import { SkillLoader } from "./loader.js";

interface SkillStats {
  total: number;
  bySource: Record<string, number>;
  loaded: number;
}

type SkillEvent = "load" | "unload";
type SkillListener = (skill: Skill) => void;

export class SkillRegistry extends SkillLoader {
  private loadedSkills = new Set<string>();
  private listeners = new Map<SkillEvent, SkillListener[]>();

  constructor(searchPaths: string[]) {
    super(searchPaths);
  }

  search(query: string): Skill[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();

    return this.getAll().filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }

  getByTag(tag: string): Skill[] {
    const t = tag.toLowerCase().trim();
    return this.getAll().filter((s) =>
      this.extractTags(s).some((skillTag) => skillTag.toLowerCase() === t)
    );
  }

  getAllTags(): string[] {
    const tags = new Set<string>();
    for (const skill of this.getAll()) {
      for (const tag of this.extractTags(skill)) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }

  getStats(): SkillStats {
    const all = this.getAll();
    const bySource: Record<string, number> = {};

    for (const skill of all) {
      bySource[skill.source] = (bySource[skill.source] ?? 0) + 1;
    }

    return {
      total: all.length,
      bySource,
      loaded: this.loadedSkills.size,
    };
  }

  markLoaded(name: string): void {
    const skill = this.get(name);
    if (!skill) return;

    this.loadedSkills.add(name);
    this.emit("load", skill);
  }

  markUnloaded(name: string): void {
    const skill = this.get(name);
    if (!skill) return;

    this.loadedSkills.delete(name);
    this.emit("unload", skill);
  }

  isLoaded(name: string): boolean {
    return this.loadedSkills.has(name);
  }

  getLoadedNames(): string[] {
    return Array.from(this.loadedSkills);
  }

  onSkillLoad(listener: SkillListener): () => void {
    return this.addListener("load", listener);
  }

  onSkillUnload(listener: SkillListener): () => void {
    return this.addListener("unload", listener);
  }

  private getAll(): Skill[] {
    return this.listSkills()
      .map((name) => this.get(name))
      .filter((s): s is Skill => s !== undefined);
  }

  private extractTags(skill: Skill): string[] {
    const match = skill.body.match(/^tags:\s*(.+)$/m);
    if (!match) return [];

    return match[1]
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);
  }

  private addListener(event: SkillEvent, listener: SkillListener): () => void {
    const list = this.listeners.get(event) ?? [];
    list.push(listener);
    this.listeners.set(event, list);

    return () => {
      const current = this.listeners.get(event);
      if (!current) return;
      const idx = current.indexOf(listener);
      if (idx >= 0) current.splice(idx, 1);
    };
  }

  private emit(event: SkillEvent, skill: Skill): void {
    const list = this.listeners.get(event);
    if (!list) return;

    for (const listener of list) {
      listener(skill);
    }
  }
}
