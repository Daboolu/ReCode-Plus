# RecallAgent — Memory-Aware Coding Review Agent

[中文](./README_CN.md)

RecallAgent is a memory-aware coding review Agent for deliberate practice. It reads the current problem, submitted code, review history, and Note memory; plans safe function calls, executes the code locally, explains real outputs, and carries useful findings into the next review.

The project currently runs from source code and stores data locally in SQLite by default.

## Features

- **Local problem library**: Track problem ID, title, difficulty, tags, link, notes, and current solution code.
- **Spaced repetition scheduling**: Calculates the next review date from difficulty, mastery rating, interval, easiness, and review count.
- **Daily review queue**: Lists due problems and updates review state after each rating.
- **Agent-driven review loop**: Reads the current problem and code, plans calls, validates arguments, executes tests, explains actual outputs, and records the result as memory.
- **Persistent Note memory**: Reuses code-versioned observations and review notes in later conversations instead of starting from zero.
- **Local or remote reasoning**: Uses local Ollama by default or an OpenAI-compatible remote API when configured.
- **Practice replay timeline**: Records problem creation, code saves, and review ratings so each problem has a visible learning history.
- **Code editor and local execution**: Built-in Monaco Editor with local execution support for TypeScript, JavaScript, Python, Java, and C++.
- **Markdown notes**: Supports Markdown, syntax highlighting, and LaTeX math rendering.
- **Learning dashboard**: Shows mastery distribution, due reviews, weekly additions, and suggested focus tasks.
- **Future review view**: Shows the scheduled review distribution for the next 30 days.
- **Local data ownership**: All data lives in `prisma/dev.db`, making backup and migration straightforward.

## Tech Stack

- Framework: `Next.js 16`
- UI: `React 19`, `Tailwind CSS 4`, `Framer Motion`, `Radix UI`
- Database: `SQLite` + `Prisma`
- Editor: `Monaco Editor`
- AI: local `Ollama` + `qwen2.5-coder:7b`, or a remote OpenAI-compatible API
- Document rendering: `React Markdown`, `KaTeX`, `rehype-highlight`
- State management: `Zustand`

## Data Model

The application uses Prisma models:

- `User`: local user profile and preferences
- `Problem`: platform problem metadata
- `Progress`: per-user mastery state, review status, and SRS parameters
- `Submission`: current solution code. Each `Progress` has at most one current code record; saving updates it instead of keeping code-history copies
- `ReviewEvent`: timeline events such as problem creation, code saves, and review ratings
- `AgentReviewSession`: resumable local Agent review state and the user-confirmed result
- `AgentMessage`: persisted user/assistant messages and constrained UI actions for a session

Default database file:

```text
prisma/dev.db
```

## Getting Started

### Requirements

- `Node.js` 20 or newer
- `npm`
- Optional for real Agent responses: Ollama and a local model, or an OpenAI-compatible remote API

### Quick Start

Windows:

```text
Double-click start_windows.bat
```

Mac / Linux:

```bash
chmod +x start_mac.sh
./start_mac.sh
```

On the first run, the script installs dependencies, generates Prisma Client, synchronizes the database, and starts the dev server. Local mode installs Ollama when needed and downloads the default 7B model (about 4.7 GB); remote mode skips every Ollama step. Later runs skip unchanged setup, and interrupted model downloads resume on the next run.

### Manual Setup

1. Install dependencies

```bash
npm install
```

2. Initialize the database and generate Prisma Client

```bash
npx prisma generate
npx prisma db push
```

3. Start the application

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

On first launch, if no local user exists, the app redirects to onboarding. Enter a username, preferred programming language, and UI language to start using RecallAgent.

## How the RecallAgent Loop Works

1. Select a suggested problem or choose one manually.
2. RecallAgent assembles the problem, current code, review history, and Note memory.
3. After code submission, the model identifies a callable function or class method and proposes JSON-only arguments.
4. The server validates the target and executes the exact submitted code in a constrained local runner.
5. Actual outputs return to the Agent for explanation; model-planned probes are treated as observations, not an authoritative online judge.
6. The resulting calls, outputs, and analysis are saved into the problem Note with a code-version hash.
7. The UI streams each stage into the conversation, including planning, validation, execution, judgment, and memory persistence.

## Model Configuration

The independent `/agent-review` page leaves the existing dashboard, question, and review pages unchanged. It initially shows suggestion bubbles generated from local review data. The model is called only after you choose a suggestion or send a message.

During a session, the Agent can guide the discussion, request that you open the coding dialog, analyze code you explicitly submit, and prepare a review summary. Code execution and final review confirmation remain user-triggered actions.

### Option 1: local Ollama (default)

1. Install [Ollama](https://ollama.com/download) and make sure `ollama` is available in your terminal.
2. Download the default model once:

```bash
ollama pull qwen2.5-coder:7b
```

The default 7B model is about 4.7 GB with a 32K context window. `start_mac.sh` installs Ollama and downloads it automatically when needed.

For a lighter setup, use `qwen2.5-coder:3b` (about 1.9 GB); machines with more memory can use `qwen2.5-coder:14b` (about 9 GB). Sizes come from the [Ollama model page](https://ollama.com/library/qwen2.5-coder).

Then run:

```bash
./start_mac.sh
```

Open [http://localhost:3000/agent-review](http://localhost:3000/agent-review) to use the Agent.

### Agent configuration

The generated `.env` uses these defaults:

```env
AGENT_PROVIDER="ollama"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="qwen2.5-coder:7b"
AGENT_MOCK_MODE="false"
```

- `OLLAMA_BASE_URL` selects the local Ollama endpoint. For privacy, the Agent accepts only `localhost` or `127.0.0.1` addresses.
- `OLLAMA_MODEL` selects the installed model used for review conversations.
- `AGENT_MOCK_MODE="true"` enables deterministic mock replies for UI development without Ollama.

### Option 2: remote OpenAI-compatible API

Any service exposing standard `/models` and `/chat/completions` endpoints can be used:

```env
AGENT_PROVIDER="openai-compatible"
AGENT_BASE_URL="https://your-provider.example/v1"
AGENT_API_KEY="your-secret-api-key"
AGENT_MODEL="your-model-name"
AGENT_TIMEOUT_SECONDS="120"
AGENT_MOCK_MODE="false"
```

- Include the version prefix (usually `/v1`) in the base URL, but not `/chat/completions`.
- Non-local remote URLs must use HTTPS.
- The API key is read only by the Next.js server. Never commit `.env`.
- `./start_mac.sh` skips Ollama installation, startup, and model downloads in remote mode.
- Problem data, code, notes, and recent conversation context are sent to the remote provider; use local mode for sensitive material.

For a one-off mock-mode launch:

```bash
AGENT_MOCK_MODE=true ./start_mac.sh
```

For persistent mock mode, change the value in `.env`. Set it back to `false` before testing real local inference.

### Manual Agent startup

If you prefer to manage each process yourself, start Ollama in one terminal:

```bash
ollama serve
```

Then start RecallAgent in another terminal after the standard Prisma setup:

```bash
npm run dev
```

The browser communicates only with the Next.js server. The server sends review context to local Ollama or the remote API selected by `AGENT_PROVIDER`.

## Useful Commands

```bash
npm run dev
```

Start the development server.

```bash
npm run build
```

Build the production app.

```bash
npm run lint
```

Run ESLint.

```bash
npx tsc --noEmit
```

Run TypeScript type checking.

```bash
npx prisma db push
```

Sync `prisma/schema.prisma` to the local SQLite database.

```bash
npx prisma studio
```

Open Prisma Studio to inspect or manage local data.

## Backup and Migration

To back up your data, copy:

```text
prisma/dev.db
```

To move to another machine, place `dev.db` under the new project's `prisma/` directory, then run:

```bash
npm install
npx prisma generate
npm run dev
```

## Notes

- RecallAgent is local-first and does not include cloud sync or account authentication.
- `prisma/dev.db` contains your personal data. Back it up regularly.
- The project currently uses `prisma db push` for local schema sync. For team collaboration or release workflows, standard Prisma migrations are recommended.
- Local code execution depends on installed runtimes such as `node`, `python3`, `javac`, and `g++`. Missing runtimes will make the corresponding language execution fail.
- Regular notebook features do not depend on a model. Only the conversational Agent is unavailable when mock mode is off and the selected local or remote model cannot be reached.

## License

This project is licensed under the [MIT License](./LICENSE).
