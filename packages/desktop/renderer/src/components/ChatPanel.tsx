import { useState, useRef, useEffect, useCallback } from "react";
import { useChatStore, type ChatMessage } from "../stores/chat";
import { nanoid } from "nanoid";

export function ChatPanel() {
  const { messages, isGenerating, addMessage, setGenerating, appendToLastMessage, setStreamingDone } = useChatStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Set up engine event listeners
  useEffect(() => {
    if (!window.nova) return;

    const handleText = (text: unknown) => {
      appendToLastMessage(String(text));
    };

    const handleDone = () => {
      setGenerating(false);
      setStreamingDone();
    };

    const handleError = (error: unknown) => {
      appendToLastMessage(`\n\n❌ Error: ${String(error)}`);
      setGenerating(false);
      setStreamingDone();
    };

    const handleToolStart = (toolName: unknown, input: unknown) => {
      // TODO: Update tool call state
      console.log("Tool start:", toolName, input);
    };

    const handleToolEnd = (toolName: unknown, result: unknown) => {
      // TODO: Update tool call state
      console.log("Tool end:", toolName, result);
    };

    window.nova.on("engine:text", handleText);
    window.nova.on("engine:done", handleDone);
    window.nova.on("engine:error", handleError);
    window.nova.on("engine:toolStart", handleToolStart);
    window.nova.on("engine:toolEnd", handleToolEnd);

    return () => {
      window.nova.off("engine:text", handleText);
      window.nova.off("engine:done", handleDone);
      window.nova.off("engine:error", handleError);
      window.nova.off("engine:toolStart", handleToolStart);
      window.nova.off("engine:toolEnd", handleToolEnd);
    };
  }, [appendToLastMessage, setGenerating, setStreamingDone]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isGenerating) return;

    setInput("");

    // Add user message
    addMessage({
      id: nanoid(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    });

    // Add empty assistant message for streaming
    addMessage({
      id: nanoid(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    });

    setGenerating(true);

    // Send to engine via IPC
    if (window.nova) {
      await window.nova.engine.sendMessage(text);
    } else {
      // Fallback for development without Electron
      setTimeout(() => {
        appendToLastMessage("⚠️ Engine not available. Run inside Electron to use the agent.");
        setGenerating(false);
        setStreamingDone();
      }, 500);
    }
  }, [input, isGenerating, addMessage, setGenerating, appendToLastMessage, setStreamingDone]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAbort = async () => {
    if (window.nova) {
      await window.nova.engine.abort();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-950">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState onSuggestion={(s) => { setInput(s); inputRef.current?.focus(); }} />
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-neutral-800">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask NovaCode anything... (Shift+Enter for newline)"
            rows={1}
            disabled={isGenerating}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 pr-24 text-sm text-neutral-100 placeholder-neutral-500 resize-none focus:outline-none focus:border-nova-500 focus:ring-1 focus:ring-nova-500/50 disabled:opacity-50"
            style={{ minHeight: "48px", maxHeight: "200px" }}
          />

          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {isGenerating ? (
              <button
                onClick={handleAbort}
                className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
                title="Stop generation"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-2 rounded-lg bg-nova-600 hover:bg-nova-500 disabled:opacity-50 disabled:hover:bg-nova-600 text-white transition-colors"
                title="Send message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-3">
            <span>Model: glm-5-turbo</span>
            <span>Provider: zai</span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Connected
            </span>
          </div>
          <span>{messages.length} messages</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (s: string) => void }) {
  const suggestions = [
    "Write a REST API in Express with TypeScript",
    "Debug this React component re-rendering issue",
    "Explain async/await vs Promises",
    "Create a Python web scraper for news",
    "Set up a Docker compose for Node.js + PostgreSQL",
    "Write unit tests for this authentication module",
  ];

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-lg">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-nova-500 to-nova-700 flex items-center justify-center shadow-lg shadow-nova-500/20">
          <span className="text-2xl font-bold text-white">N</span>
        </div>
        <h2 className="text-xl font-semibold text-neutral-200 mb-2">
          Welcome to NovaCode
        </h2>
        <p className="text-sm text-neutral-400 mb-6">
          Your AI coding assistant. Ask me to write code, debug issues, explain concepts, or help with any development task.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestion(s)}
              className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:border-nova-500/50 hover:bg-neutral-800 transition-colors text-left"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 ${
          isUser
            ? "bg-nova-600 text-white"
            : "bg-neutral-900 border border-neutral-800 text-neutral-100"
        }`}
      >
        {/* Thinking indicator */}
        {message.thinking && (
          <div className="mb-2 text-xs text-neutral-400 italic border-l-2 border-nova-500/30 pl-2">
            💭 {message.thinking}
          </div>
        )}

        {/* Content */}
        <div className="text-sm whitespace-pre-wrap font-sans">
          {message.content || (message.isStreaming ? <StreamingDots /> : "(empty)")}
        </div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.toolCalls.map((tc) => (
              <div
                key={tc.id}
                className="text-xs bg-neutral-800/50 rounded px-2 py-1 flex items-center gap-2"
              >
                <span className={tc.status === "error" ? "text-red-400" : "text-nova-400"}>
                  {tc.status === "running" ? "⏳" : tc.status === "error" ? "❌" : "✅"}
                </span>
                <span className="font-mono text-neutral-300">{tc.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className={`mt-1 text-[10px] ${isUser ? "text-nova-200/50" : "text-neutral-500"}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

function StreamingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-nova-400 animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-nova-400 animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-nova-400 animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  );
}
