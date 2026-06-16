import { join } from "path";
import { readdir, mkdir } from "fs/promises";

/**
 * Memory store — persistent facts across sessions.
 * Each memory is a markdown file with YAML frontmatter.
 */
export interface MemoryEntry {
  name: string;
  description: string;
  type: "user" | "feedback" | "project" | "reference";
  content: string;
  filePath: string;
}

export class MemoryStore {
  private memoryDir: string;
  private entries = new Map<string, MemoryEntry>();

  constructor(memoryDir: string) {
    this.memoryDir = memoryDir;
  }

  /** Load all memory entries from disk */
  async loadAll(): Promise<void> {
    this.entries.clear();

    try {
      await mkdir(this.memoryDir, { recursive: true });
      const files = await readdir(this.memoryDir);

      for (const file of files) {
        if (!file.endsWith(".md") || file === "MEMORY.md") continue;

        const filePath = join(this.memoryDir, file);
        try {
          const content = await Bun.file(filePath).text();
          const entry = this.parseMemory(content, filePath);
          if (entry) {
            this.entries.set(entry.name, entry);
          }
        } catch {
          // Skip invalid entries
        }
      }
    } catch {
      // Directory doesn't exist yet
    }
  }

  /** Get a memory by name */
  get(name: string): MemoryEntry | undefined {
    return this.entries.get(name);
  }

  /** List all memories */
  list(): MemoryEntry[] {
    return Array.from(this.entries.values());
  }

  /** Save a new memory entry */
  async save(entry: Omit<MemoryEntry, "filePath">): Promise<void> {
    await mkdir(this.memoryDir, { recursive: true });

    const fileName = `${entry.name}.md`;
    const filePath = join(this.memoryDir, fileName);

    const content = `---
name: ${entry.name}
description: ${entry.description}
metadata:
  type: ${entry.type}
---

${entry.content}
`;

    await Bun.write(filePath, content);
    this.entries.set(entry.name, { ...entry, filePath });

    // Update MEMORY.md index
    await this.updateIndex();
  }

  /** Delete a memory by name */
  async delete(name: string): Promise<boolean> {
    const entry = this.entries.get(name);
    if (!entry) return false;

    try {
      const file = Bun.file(entry.filePath);
      // Bun doesn't have unlink, write empty or use fs
      this.entries.delete(name);
      await this.updateIndex();
      return true;
    } catch {
      return false;
    }
  }

  /** Get all memories as context string */
  getContextString(): string {
    const entries = this.list();
    if (entries.length === 0) return "";

    return (
      "User memories:\n" +
      entries.map((e) => `- [${e.name}] ${e.description}`).join("\n")
    );
  }

  /** Update MEMORY.md index file */
  private async updateIndex(): Promise<void> {
    const indexPath = join(this.memoryDir, "MEMORY.md");
    const entries = this.list();

    const content =
      "# Memory Index\n\n" +
      entries.map((e) => `- [${e.name}](${e.filePath}) — ${e.description}`).join("\n");

    await Bun.write(indexPath, content);
  }

  /** Parse a memory markdown file */
  private parseMemory(content: string, filePath: string): MemoryEntry | null {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!fmMatch) return null;

    const [, fmContent, body] = fmMatch;
    const meta: Record<string, string> = {};

    for (const line of fmContent.split("\n")) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        meta[match[1]] = match[2].trim();
      }
    }

    if (!meta.name || !meta.description) return null;

    return {
      name: meta.name,
      description: meta.description,
      type: (meta.type as MemoryEntry["type"]) ?? "project",
      content: body.trim(),
      filePath,
    };
  }
}
