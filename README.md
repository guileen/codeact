# CodeAct & LightAgent

Minimal AI Code Agent with a clean TypeScript implementation.

**Principles**
- Think → Write code → Execute → Answer
- Results must be based on actual execution output

## Quick Start

```bash
pnpm install

# Optional LLM config
echo "LLM_API_KEY=your_key" >> .env
echo "LLM_BASE_URL=https://api.openai.com/v1" >> .env
echo "LLM_MODEL=gpt-4o-mini" >> .env

# Dev (interactive if no args)
pnpm dev

# One‑shot prompt
pnpm dev "say hello"
```

Notes
- Without `LLM_API_KEY`, responses are stubbed with the prompt content.
- One‑shot mode runs `src/cli.ts` single flow; otherwise interactive mode starts.

## Scripts
- `pnpm dev`: run `tsx src/cli.ts`
- `pnpm build`: compile TypeScript to `dist`
- `pnpm start`: build and run `dist/cli.js`

## Environment
- `LLM_API_KEY`: API key for chat completions
- `LLM_BASE_URL`: base URL for the LLM API
- `LLM_MODEL`: model name (defaults to `gpt-4o-mini`)

## Structure
```
src/
├── cli.ts                # CLI entry
├── core/
│   ├── light-agent.ts    # Agent core
│   └── light-swarm.ts    # Multi‑agent orchestration
├── shared/
│   ├── llm.ts            # LLM calls
│   ├── sandbox.ts        # Sandboxed code execution
│   ├── config.ts         # Sandbox/exec settings
│   └── schemas.ts        # Zod schemas & types
├── tools/
│   ├── tool-decorator.ts
│   ├── tool-registry.ts
│   ├── tool-dispatcher.ts
│   └── tool_executor.ts
└── ui/clean.ts           # Clean UI utilities
```

## One‑Shot Examples
- `pnpm dev "list files in cwd"`
- `pnpm dev "create hello.txt with 'Hello'"`

MIT License
