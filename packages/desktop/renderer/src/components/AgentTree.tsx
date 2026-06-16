import { useState, useRef, useEffect } from "react";
import { useAgentStore, type AgentTask, type AgentToolCall } from "../stores/agents";

const STATUS_ICON: Record<AgentTask["status"], string> = {
  pending: "⏳",
  running: "🔄",
  completed: "✅",
  failed: "❌",
  cancelled: "🚫",
};

const TOOL_STATUS_ICON: Record<AgentToolCall["status"], string> = {
  running: "⏳",
  completed: "✅",
  error: "❌",
};

function formatDuration(start: number, end?: number): string {
  const ms = (end ?? Date.now()) - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

function formatTokens(usage?: { input: number; output: number }): string {
  if (!usage) return "";
  const total = usage.input + usage.output;
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`;
  if (total >= 1_000) return `${(total / 1_000).toFixed(1)}k`;
  return `${total}`;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}

interface AgentTreeProps {
  compact?: boolean;
}

export function AgentTree({ compact = false }: AgentTreeProps) {
  const { agents, activeAgentId, setActiveAgent } = useAgentStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [agents]);

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
        No active agents
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-2 space-y-1">
      {agents.map((agent) => (
        <AgentNode
          key={agent.id}
          agent={agent}
          depth={0}
          compact={compact}
          activeAgentId={activeAgentId}
          onSelect={setActiveAgent}
        />
      ))}
    </div>
  );
}

interface AgentNodeProps {
  agent: AgentTask;
  depth: number;
  compact: boolean;
  activeAgentId: string | null;
  onSelect: (id: string | null) => void;
}

function AgentNode({ agent, depth, compact, activeAgentId, onSelect }: AgentNodeProps) {
  const [expanded, setExpanded] = useState(!compact);
  const isActive = agent.id === activeAgentId;
  const hasContent = agent.children.length > 0 || agent.toolCalls.length > 0;

  return (
    <div>
      <div
        onClick={() => onSelect(isActive ? null : agent.id)}
        className={`
          flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors
          ${isActive ? "border border-nova-500 bg-neutral-900" : "border border-transparent hover:bg-neutral-900/50"}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasContent ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="w-4 h-4 flex items-center justify-center text-neutral-500 hover:text-neutral-300 shrink-0"
          >
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <span className="text-sm shrink-0">{STATUS_ICON[agent.status]}</span>

        <span className="text-sm text-neutral-200 truncate flex-1 min-w-0">
          {agent.label}
        </span>

        {!compact && (
          <span className="flex items-center gap-2 shrink-0 text-xs text-neutral-500">
            {agent.tokenUsage && (
              <span className="bg-neutral-800 px-1.5 py-0.5 rounded">
                {formatTokens(agent.tokenUsage)} tok
              </span>
            )}
            <span>{formatDuration(agent.startTime, agent.endTime)}</span>
          </span>
        )}
      </div>

      {expanded && !compact && (
        <div>
          {agent.prompt && (
            <div
              className="mx-2 mt-1 mb-1 px-2 py-1.5 rounded bg-neutral-950 border border-neutral-800 text-xs text-neutral-400"
              style={{ marginLeft: `${depth * 16 + 32}px` }}
            >
              {truncate(agent.prompt, 200)}
            </div>
          )}

          {agent.toolCalls.map((tc) => (
            <ToolCallNode key={tc.id} toolCall={tc} depth={depth + 1} />
          ))}

          {agent.children.map((child) => (
            <AgentNode
              key={child.id}
              agent={child}
              depth={depth + 1}
              compact={compact}
              activeAgentId={activeAgentId}
              onSelect={onSelect}
            />
          ))}

          {agent.result && (
            <div
              className="mx-2 mt-1 px-2 py-1.5 rounded bg-neutral-950 border border-neutral-800 text-xs text-neutral-400"
              style={{ marginLeft: `${depth * 16 + 32}px` }}
            >
              {truncate(agent.result, 300)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolCallNode({ toolCall, depth }: { toolCall: AgentToolCall; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = toolCall.input || toolCall.result;

  return (
    <div
      className="flex flex-col"
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <div
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`flex items-center gap-2 px-2 py-1 rounded ${hasDetails ? "cursor-pointer hover:bg-neutral-900/30" : ""}`}
      >
        {hasDetails ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="w-4 h-4 flex items-center justify-center text-neutral-600 hover:text-neutral-400 shrink-0"
          >
            <svg
              className={`w-2.5 h-2.5 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <span className="text-xs shrink-0">{TOOL_STATUS_ICON[toolCall.status]}</span>
        <span className="text-xs font-mono text-nova-400 truncate">
          {toolCall.name}
        </span>
        <span className="text-[10px] text-neutral-600 shrink-0">
          {formatDuration(toolCall.startTime, toolCall.endTime)}
        </span>
      </div>

      {expanded && (
        <div className="ml-6 space-y-1 mb-1">
          {toolCall.input && (
            <div className="px-2 py-1 rounded bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-500 font-mono break-all">
              {truncate(toolCall.input, 300)}
            </div>
          )}
          {toolCall.result && (
            <div className="px-2 py-1 rounded bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-500 font-mono break-all">
              {truncate(toolCall.result, 300)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
