# ReCode Plus - Local-First Algorithm Practice and Review

[中文](./README.md)

ReCode Plus is a personal algorithm practice manager. It brings problem notes, current solution code, mastery ratings, spaced repetition scheduling, and practice replay timelines into one local application.

The project currently runs from source code and stores data locally in SQLite by default.

## Features

- **Local problem library**: Track problem ID, title, difficulty, tags, link, notes, and current solution code.
- **Spaced repetition scheduling**: Calculates the next review date from difficulty, mastery rating, interval, easiness, and review count.
- **Daily review queue**: Lists due problems and updates review state after each rating.
- **Practice replay timeline**: Records problem creation, code saves, and review ratings so each problem has a visible learning history.
- **Code editor and local execution**: Built-in Monaco Editor with local execution support for TypeScript, JavaScript, Python, Java, and C++.
- **Markdown notes**: Supports Markdown, syntax highlighting, and LaTeX math rendering.
- **Learning dashboard**: Shows mastery distribution, due reviews, weekly additions, and suggested focus tasks.
- **Future review view**: Shows the scheduled review distribution for the next 30 days.
- **Local data ownership**: All data lives in `prisma/dev.db`, making backup and migration straightforward.

## Screenshot Placeholders

> Screenshot placeholder: Home dashboard with due reviews, mastery distribution, and focus tasks.

> Screenshot placeholder: Questions table with search, filters, preview modal, and practice replay timeline.

> Screenshot placeholder: Question editor with Monaco code editor, metadata sidebar, Markdown notes, and timeline.

> Screenshot placeholder: Review page with review cards, rating buttons, and problem preview.

> Screenshot placeholder: Future page with the next 30 days review distribution chart.

## Tech Stack

- Framework: `Next.js 16`
- UI: `React 19`, `Tailwind CSS 4`, `Framer Motion`, `Radix UI`
- Database: `SQLite` + `Prisma`
- Editor: `Monaco Editor`
- Document rendering: `React Markdown`, `KaTeX`, `rehype-highlight`
- State management: `Zustand`

## Data Model

The application uses Prisma models:

- `User`: local user profile and preferences
- `Problem`: platform problem metadata
- `Progress`: per-user mastery state, review status, and SRS parameters
- `Submission`: current solution code. Each `Progress` has at most one current code record; saving updates it instead of keeping code-history copies
- `ReviewEvent`: timeline events such as problem creation, code saves, and review ratings

Default database file:

```text
prisma/dev.db
```

## Getting Started

### Requirements

- `Node.js` 20 or newer
- `npm`

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

The script installs dependencies, initializes the database, and starts the dev server.

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

## Acknowledgements

Thanks to [CoisiniIce/ReCode](https://github.com/CoisiniIce/ReCode). This project was developed by extending that project and adding new features and adjustments on top of it.

## License

This project is licensed under the [MIT License](./LICENSE).
