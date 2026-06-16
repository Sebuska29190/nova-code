# NovaCode

Desktop AI coding assistant — multi-provider, skills, plugins, Telegram integration.

## Architecture

```
packages/
  shared/     — Shared types and interfaces
  engine/     — Core agent loop, tools, providers, skills, plugins, memory
  desktop/    — Electron + React desktop application
```

## Quick Start

```bash
# Install dependencies
bun install

# Run in development mode
bun dev

# Build for production
bun build
```

## Features

- **Multi-provider LLM** — Anthropic, OpenAI-compatible, Z.AI, DeepSeek, Qwen, Kimi, MiMo
- **Agent loop** — autonomous tool use with streaming
- **Skills system** — load SKILL.md files for specialized workflows
- **Plugin system** — extensible with hooks, MCP servers, commands
- **Memory** — persistent facts across sessions
- **Telegram integration** — remote notifications and control
- **Modern UI** — React 19, Tailwind, dark theme

## Tech Stack

- **Runtime**: Electron + Bun
- **UI**: React 19 + Tailwind 4 + Zustand
- **Engine**: TypeScript, Node.js
- **Search**: ripgrep (bundled)
- **Database**: better-sqlite3

## License

MIT
