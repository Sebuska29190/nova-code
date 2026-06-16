import TelegramBotApi from "node-telegram-bot-api";
import { EventEmitter } from "events";

export type NotificationType = "task_complete" | "error" | "question";

export interface TelegramMessage {
  id: number;
  chatId: string;
  text: string;
  timestamp: number;
  isIncoming: boolean;
  command?: string;
}

export interface TelegramBotConfig {
  token: string;
  chatId: string;
}

export type MessageHandler = (msg: TelegramMessage) => void;
export type CommandHandler = (command: string, args: string, chatId: string) => void;

export class TelegramBot extends EventEmitter {
  private bot: TelegramBotApi | null = null;
  private config: TelegramBotConfig | null = null;
  private connected = false;
  private messageHistory: TelegramMessage[] = [];
  private messageCounter = 0;
  private maxHistory = 50;

  async connect(token: string, chatId: string): Promise<void> {
    if (this.connected) {
      await this.disconnect();
    }

    this.config = { token, chatId };
    this.bot = new TelegramBotApi(token, { polling: true });

    this.bot.on("message", (msg) => {
      const chatIdStr = String(msg.chat.id);
      const text = msg.text ?? "";

      const telegramMsg: TelegramMessage = {
        id: ++this.messageCounter,
        chatId: chatIdStr,
        text,
        timestamp: Date.now(),
        isIncoming: true,
      };

      if (text.startsWith("/")) {
        const [command, ...argsParts] = text.split(" ");
        telegramMsg.command = command.slice(1);
        this.handleCommand(command.slice(1), argsParts.join(" "), chatIdStr);
      }

      this.addToHistory(telegramMsg);
      this.emit("message", telegramMsg);
    });

    this.bot.on("polling_error", (error) => {
      this.emit("error", error.message);
    });

    this.connected = true;
    this.emit("connected");

    await this.sendMessage(chatId, "NovaCode bot connected successfully.");
  }

  async disconnect(): Promise<void> {
    if (this.bot) {
      await this.bot.stopPolling();
      this.bot = null;
    }
    this.connected = false;
    this.config = null;
    this.emit("disconnected");
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Bot is not connected");
    }

    await this.bot.sendMessage(chatId, text);

    const telegramMsg: TelegramMessage = {
      id: ++this.messageCounter,
      chatId,
      text,
      timestamp: Date.now(),
      isIncoming: false,
    };

    this.addToHistory(telegramMsg);
    this.emit("messageSent", telegramMsg);
  }

  async sendNotification(type: NotificationType, data: Record<string, string>): Promise<void> {
    if (!this.config || !this.bot) {
      throw new Error("Bot is not connected");
    }

    const templates: Record<NotificationType, string> = {
      task_complete: `Task completed: ${data.task ?? "Unknown"}\nResult: ${data.result ?? "No details"}`,
      error: `Error occurred: ${data.error ?? "Unknown error"}\nContext: ${data.context ?? "No context"}`,
      question: `Question from NovaCode: ${data.question ?? "No question"}`,
    };

    await this.sendMessage(this.config.chatId, templates[type]);
  }

  isConnected(): boolean {
    return this.connected;
  }

  getHistory(): TelegramMessage[] {
    return [...this.messageHistory];
  }

  getConfig(): TelegramBotConfig | null {
    return this.config;
  }

  onMessage(handler: MessageHandler): () => void {
    this.on("message", handler);
    return () => this.off("message", handler);
  }

  onCommand(handler: CommandHandler): () => void {
    this.on("command", handler);
    return () => this.off("command", handler);
  }

  private handleCommand(command: string, args: string, chatId: string): void {
    this.emit("command", command, args, chatId);

    switch (command) {
      case "status":
        this.handleStatusCommand(chatId);
        break;
      case "abort":
        this.handleAbortCommand(chatId);
        break;
      case "prompt":
        this.handlePromptCommand(args, chatId);
        break;
    }
  }

  private async handleStatusCommand(chatId: string): Promise<void> {
    const status = this.connected ? "Connected" : "Disconnected";
    await this.sendMessage(chatId, `Bot status: ${status}`);
  }

  private async handleAbortCommand(chatId: string): Promise<void> {
    this.emit("abort");
    await this.sendMessage(chatId, "Abort signal sent. Stopping current tasks.");
  }

  private async handlePromptCommand(args: string, chatId: string): Promise<void> {
    if (!args.trim()) {
      await this.sendMessage(chatId, "Usage: /prompt <message>");
      return;
    }
    this.emit("prompt", args, chatId);
    await this.sendMessage(chatId, `Prompt received: ${args}`);
  }

  private addToHistory(msg: TelegramMessage): void {
    this.messageHistory.push(msg);
    if (this.messageHistory.length > this.maxHistory) {
      this.messageHistory.shift();
    }
  }
}
