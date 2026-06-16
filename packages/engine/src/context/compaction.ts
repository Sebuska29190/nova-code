import type { Message, TextBlock } from "@nova/shared";
import { nanoid } from "nanoid";
import { TokenCounter } from "./token-counter.js";

export class CompactionManager {
  private counter = new TokenCounter();

  shouldCompact(messages: Message[], maxTokens: number): boolean {
    const used = this.counter.countMessageTokens(messages);
    return this.counter.isNearLimit(used, maxTokens);
  }

  async compact(messages: Message[], targetTokens: number): Promise<Message[]> {
    const systemMessages = messages.filter((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    if (nonSystemMessages.length <= 4) {
      return messages;
    }

    const keepCount = this.calculateKeepCount(nonSystemMessages, targetTokens);
    const keepMessages = nonSystemMessages.slice(-keepCount);
    const middleMessages = nonSystemMessages.slice(0, -keepCount);

    if (middleMessages.length === 0) {
      return messages;
    }

    const summary = await this.generateSummary(middleMessages);
    const summaryMessage: Message = {
      id: nanoid(),
      role: "system",
      content: [{ type: "text", text: summary } satisfies TextBlock],
      timestamp: Date.now(),
    };

    return [...systemMessages, summaryMessage, ...keepMessages];
  }

  async generateSummary(messages: Message[]): Promise<string> {
    const toolCalls: string[] = [];
    const topics: string[] = [];

    for (const msg of messages) {
      for (const block of msg.content) {
        if (block.type === "tool_use") {
          toolCalls.push(block.name);
        }
        if (block.type === "text") {
          const preview = block.text.slice(0, 100);
          if (preview.trim().length > 0) {
            topics.push(preview);
          }
        }
      }
    }

    const sections: string[] = [];
    sections.push(`[Compacted conversation summary]`);
    sections.push(`Messages: ${messages.length}`);

    if (topics.length > 0) {
      const unique = Array.from(new Set(topics)).slice(0, 10);
      sections.push(`Topics discussed:\n${unique.map((t) => `- ${t}`).join("\n")}`);
    }

    if (toolCalls.length > 0) {
      const counts: Record<string, number> = {};
      for (const name of toolCalls) {
        counts[name] = (counts[name] ?? 0) + 1;
      }
      const lines = Object.entries(counts).map(([name, count]) => `- ${name} (${count}x)`);
      sections.push(`Tools used:\n${lines.join("\n")}`);
    }

    return sections.join("\n\n");
  }

  private calculateKeepCount(messages: Message[], targetTokens: number): number {
    let total = 0;
    let count = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = this.counter.countMessageTokens([messages[i]]);
      if (total + msgTokens > targetTokens * 0.7) {
        break;
      }
      total += msgTokens;
      count++;
    }

    return Math.max(count, 2);
  }
}
