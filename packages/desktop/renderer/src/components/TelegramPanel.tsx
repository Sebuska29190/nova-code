import { useState, useEffect, useRef } from "react";

interface TelegramMessage {
  id: number;
  chatId: string;
  text: string;
  timestamp: number;
  isIncoming: boolean;
  command?: string;
}

export function TelegramPanel() {
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [showToken, setShowToken] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleConnect = async () => {
    if (!token.trim() || !chatId.trim()) return;

    try {
      if (window.nova?.telegram?.connect) {
        await window.nova.telegram.connect(token, chatId);
        setConnected(true);
      }
    } catch (err) {
      console.error("Failed to connect Telegram bot:", err);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (window.nova?.telegram?.disconnect) {
        await window.nova.telegram.disconnect();
        setConnected(false);
      }
    } catch (err) {
      console.error("Failed to disconnect Telegram bot:", err);
    }
  };

  const handleTestNotification = async () => {
    if (!connected) return;

    try {
      if (window.nova?.telegram?.sendTestNotification) {
        await window.nova.telegram.sendTestNotification();
      }
    } catch (err) {
      console.error("Failed to send test notification:", err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-950 p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-neutral-100">Telegram Bot</h1>

        <Section title="Connection">
          <div className="space-y-5">
            <FieldRow label="Bot Token">
              <div className="flex gap-2 flex-1">
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-nova-500 focus:ring-1 focus:ring-nova-500/50 font-mono"
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="px-3 py-2 rounded-lg bg-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 transition-colors"
                >
                  {showToken ? "Hide" : "Show"}
                </button>
              </div>
            </FieldRow>

            <FieldRow label="Chat ID">
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="-1001234567890"
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-nova-500 focus:ring-1 focus:ring-nova-500/50 font-mono"
              />
            </FieldRow>

            <div className="flex items-center gap-4">
              <div className="w-36 shrink-0" />
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-neutral-600"}`} />
                <span className="text-sm text-neutral-400">
                  {connected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-36 shrink-0" />
              <div className="flex gap-2">
                {connected ? (
                  <>
                    <button
                      onClick={handleDisconnect}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
                    >
                      Disconnect
                    </button>
                    <button
                      onClick={handleTestNotification}
                      className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 text-sm transition-colors"
                    >
                      Test Notification
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={!token.trim() || !chatId.trim()}
                    className="px-4 py-2 rounded-lg bg-nova-600 hover:bg-nova-500 disabled:opacity-50 disabled:hover:bg-nova-600 text-white text-sm font-medium transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Message History">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="h-80 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
                  No messages yet
                </div>
              ) : (
                messages.slice(-10).map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isIncoming ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.isIncoming
                          ? "bg-neutral-800 text-neutral-200"
                          : "bg-nova-600/20 text-nova-300"
                      }`}
                    >
                      <div className="text-sm">{msg.text}</div>
                      <div className={`text-[10px] mt-1 ${msg.isIncoming ? "text-neutral-500" : "text-nova-400/50"}`}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </Section>

        <Section title="Commands">
          <div className="space-y-3">
            <CommandItem command="/status" description="Get current bot and engine status" />
            <CommandItem command="/abort" description="Stop all running tasks" />
            <CommandItem command="/prompt <message>" description="Send a prompt to the AI engine" />
          </div>
        </Section>
      </div>
    </div>
  );
}

function CommandItem({ command, description }: { command: string; description: string }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-neutral-900 border border-neutral-800">
      <code className="text-sm font-mono text-nova-400 bg-neutral-800 px-2 py-1 rounded">
        {command}
      </code>
      <span className="text-sm text-neutral-400">{description}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-200 mb-4 pb-2 border-b border-neutral-800">
        {title}
      </h2>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm text-neutral-400 w-36 shrink-0">{label}</label>
      {children}
    </div>
  );
}
