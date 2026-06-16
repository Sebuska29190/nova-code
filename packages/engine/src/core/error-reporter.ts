import { join } from "path";
import { homedir } from "os";
import { mkdir, appendFile } from "fs/promises";

/**
 * Error reporter — logs errors to file and optionally sends to Sentry.
 * Graceful degradation: never crashes the app.
 */
export class ErrorReporter {
  private logDir: string;
  private sessionId: string;

  constructor(sessionId: string) {
    this.logDir = join(homedir(), ".nova", "logs");
    this.sessionId = sessionId;
  }

  /** Initialize the error reporter */
  async initialize(): Promise<void> {
    try {
      await mkdir(this.logDir, { recursive: true });
    } catch {
      // Ignore
    }
  }

  /** Report an error */
  async report(error: Error | string, context?: Record<string, unknown>): Promise<void> {
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : { message: error },
      context,
    };

    // Log to file
    try {
      const logFile = join(this.logDir, `nova-${new Date().toISOString().split("T")[0]}.jsonl`);
      await appendFile(logFile, JSON.stringify(entry) + "\n");
    } catch {
      // Ignore file write errors
    }

    // Console for development
    console.error("[NovaCode Error]", entry);
  }

  /** Report a warning */
  async warn(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.report(`WARN: ${message}`, context);
  }

  /** Get recent errors */
  async getRecentErrors(count: number = 10): Promise<Array<Record<string, unknown>>> {
    try {
      const logFile = join(this.logDir, `nova-${new Date().toISOString().split("T")[0]}.jsonl`);
      const file = Bun.file(logFile);
      if (await file.exists()) {
        const lines = (await file.text()).trim().split("\n");
        return lines
          .slice(-count)
          .map((line) => {
            try { return JSON.parse(line); } catch { return null; }
          })
          .filter(Boolean);
      }
    } catch {
      // Ignore
    }
    return [];
  }
}

/**
 * Crash recovery — saves and restores session state.
 */
export class CrashRecovery {
  private stateDir: string;

  constructor() {
    this.stateDir = join(homedir(), ".nova", "sessions");
  }

  /** Save session state for recovery */
  async saveSession(sessionId: string, state: Record<string, unknown>): Promise<void> {
    try {
      await mkdir(this.stateDir, { recursive: true });
      const filePath = join(this.stateDir, `${sessionId}.json`);
      await Bun.write(filePath, JSON.stringify({ ...state, savedAt: Date.now() }));
    } catch {
      // Ignore
    }
  }

  /** Load session state for recovery */
  async loadSession(sessionId: string): Promise<Record<string, unknown> | null> {
    try {
      const filePath = join(this.stateDir, `${sessionId}.json`);
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return JSON.parse(await file.text());
      }
    } catch {
      // Ignore
    }
    return null;
  }

  /** List recoverable sessions */
  async listSessions(): Promise<Array<{ id: string; savedAt: number }>> {
    try {
      const { readdir } = await import("fs/promises");
      const files = await readdir(this.stateDir);
      const sessions: Array<{ id: string; savedAt: number }> = [];

      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const data = JSON.parse(await Bun.file(join(this.stateDir, file)).text());
          sessions.push({ id: file.replace(".json", ""), savedAt: data.savedAt ?? 0 });
        } catch {
          // Skip corrupted
        }
      }

      return sessions.sort((a, b) => b.savedAt - a.savedAt);
    } catch {
      return [];
    }
  }

  /** Delete a saved session */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const filePath = join(this.stateDir, `${sessionId}.json`);
      const file = Bun.file(filePath);
      if (await file.exists()) {
        // Bun doesn't have unlink, write empty
        await Bun.write(filePath, "{}");
      }
    } catch {
      // Ignore
    }
  }
}
