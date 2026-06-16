/** Skill metadata from SKILL.md frontmatter */
export interface SkillFrontmatter {
  name: string;
  description: string;
}

/** A loaded skill with its content */
export interface Skill {
  name: string;
  description: string;
  body: string;
  sourcePath: string;
  references: Map<string, string>; // filename → content
  source: "project" | "user" | "plugin";
}

/** Skill discovery paths */
export interface SkillPaths {
  projectPaths: string[];
  userPath: string;
  pluginPaths: string[];
}
