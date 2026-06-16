import type { Message } from "@nova/shared";
import { nanoid } from "nanoid";

interface BranchMeta {
  messages: Message[];
  createdAt: number;
}

export class ConversationBranch {
  readonly branches = new Map<string, BranchMeta>();

  createBranch(messageId: string, messages: Message[]): string {
    const index = messages.findIndex((m) => m.id === messageId);
    const branchMessages = index >= 0 ? messages.slice(0, index + 1) : [...messages];
    const branchId = nanoid();

    this.branches.set(branchId, {
      messages: branchMessages,
      createdAt: Date.now(),
    });

    return branchId;
  }

  getBranch(branchId: string): Message[] {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }
    return branch.messages;
  }

  listBranches(): Array<{ id: string; createdAt: number; messageCount: number }> {
    return Array.from(this.branches.entries()).map(([id, meta]) => ({
      id,
      createdAt: meta.createdAt,
      messageCount: meta.messages.length,
    }));
  }
}
