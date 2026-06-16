import { useState } from "react";

export function TelegramPanel() {
  const [token, setToken] = useState(localStorage.getItem("nova-tg-token") ?? "");
  const [chatId, setChatId] = useState(localStorage.getItem("nova-tg-chatid") ?? "");
  const [connected, setConnected] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleSave = () => {
    localStorage.setItem("nova-tg-token", token);
    localStorage.setItem("nova-tg-chatid", chatId);
  };

  const handleTest = async () => {
    setTesting(true);
    setTimeout(() => setTesting(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-950 p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-neutral-100">Telegram Integration</h1>
        <p className="text-sm text-neutral-400">
          Connect a Telegram bot to receive notifications and send commands remotely.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Bot Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 font-mono focus:outline-none focus:border-nova-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">Chat ID</label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="123456789"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 font-mono focus:outline-none focus:border-nova-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-nova-600 hover:bg-nova-500 text-white text-sm"
            >
              Save
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 text-sm hover:bg-neutral-700 disabled:opacity-50"
            >
              {testing ? "Sending..." : "Test Notification"}
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-neutral-600"}`} />
            <span className="text-neutral-400">{connected ? "Connected" : "Disconnected"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
