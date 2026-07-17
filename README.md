# ReCode Plus - Local-First Algorithm Practice and Review

[中文](./README_CN.md)

ReCode Plus is a personal algorithm practice manager. It brings problem notes, current solution code, mastery ratings, spaced repetition scheduling, and practice replay timelines into one local application.

The project currently runs from source code and stores data locally in SQLite by default.

## Features

- **Local problem library**: Track problem ID, title, difficulty, tags, link, notes, and current solution code.
- **Spaced repetition scheduling**: Calculates the next review date from difficulty, mastery rating, interval, easiness, and review count.
- **Daily review queue**: Lists due problems and updates review state after each rating.
- **Conversational review Agent**: Uses either local Ollama or a remote OpenAI-compatible API in a dedicated review workspace with an on-demand coding editor.
- **Practice replay timeline**: Records problem creation, code saves, and review ratings so each problem has a visible learning history.
- **Code editor and local execution**: Built-in Monaco Editor with local execution support for TypeScript, JavaScript, Python, Java, and C++.
- **Markdown notes**: Supports Markdown, syntax highlighting, and LaTeX math rendering.
- **Learning dashboard**: Shows mastery distribution, due reviews, weekly additions, and suggested focus tasks.
- **Future review view**: Shows the scheduled review distribution for the next 30 days.
- **Local data ownership**: All data lives in `prisma/dev.db`, making backup and migration straightforward.

## Screenshot

>  Home dashboard with due reviews, mastery distribution, and focus tasks.
![home](./public/images/home.png)

> Questions table with search, filters, preview modal, and practice replay timeline.
![questions](./public/images/question.png)

> Question editor with Monaco code editor, metadata sidebar, Markdown notes, and timeline.
![editor](./public/images/display.png)
![editor](./public/images/record.png)

> Review page with review cards, rating buttons, and problem preview.
![review](./public/images/review.png)

> Future page with the next 30 days review distribution chart.
![future](./public/images/future.png)

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

On first launch, if no local user exists, the app redirects to onboarding. Enter a username, preferred programming language, and UI language to start using ReCode Plus.

## Conversational Review Agent

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

Then start ReCode Plus in another terminal after the standard Prisma setup:

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

- ReCode Plus is local-first and does not include cloud sync or account authentication.
- `prisma/dev.db` contains your personal data. Back it up regularly.
- The project currently uses `prisma db push` for local schema sync. For team collaboration or release workflows, standard Prisma migrations are recommended.
- Local code execution depends on installed runtimes such as `node`, `python3`, `javac`, and `g++`. Missing runtimes will make the corresponding language execution fail.
- Regular notebook features do not depend on a model. Only the conversational Agent is unavailable when mock mode is off and the selected local or remote model cannot be reached.

## Acknowledgements

Thanks to [CoisiniIce/ReCode](https://github.com/CoisiniIce/ReCode). This project was developed by extending that project and adding new features and adjustments on top of it.

## License

This project is licensed under the [MIT License](./LICENSE).
