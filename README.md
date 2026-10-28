# CalcSprint — Banking Calculation Trainer

A responsive, gamified calculation-practice frontend for SBI Clerk, IBPS Clerk/CSA and IBPS RRB Office Assistant preparation.

## Included in this MVP

- Tables 1–30
- Squares 1–40
- Cubes 1–20
- Fraction → percentage
- Percentage → fraction
- Powers of 2 (2¹–2¹⁰)
- Perfect square roots up to 2500
- Addition, subtraction, 2-digit multiplication and exact division
- Mixed practice and adaptive difficulty
- 1 / 2 / 5 / 10 minute speed challenges
- Banking calculation drill for DI, percentages, ratios and simplification
- Keyboard-first practice (`Enter` submit, `Esc` pause, `Space` resume)
- Correct/incorrect feedback and optional sound
- Streaks, XP and levels
- Daily 50-question challenge with a 500 XP completion bonus
- Mistake review and retry
- Weak-area weighted practice
- Personal bests and achievements
- Performance analytics with Recharts
- Accounts (sign up, log in, log out); progress and mock tests are saved per user
- Responsive sidebar/mobile navigation
- Every screen has its own URL: sessions keep their settings in the query (`/practice/session?cat=tables&diff=medium&n=20`) and results live at `<setup>/result/[sessionId]`
- Mock tests from PDFs (Quant, Reasoning, English) in an IBPS / SBI-style exam interface — see below

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn-compatible local UI primitives (`src/components/ui` + `components.json`)
- Lucide React
- Recharts

Data is stored in Upstash Redis (or in a local `.data/` folder during development). Mock tests also need a Gemini API key.

## Run locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Mock tests

1. Put a Gemini key in `.env.local` (see `.env.example`):

   ```bash
   GEMINI_API_KEY=your-key
   ```

2. Run `npm run dev`, log in, then open **Mock Tests**, upload a prelims PDF, then generate as many tests as you like.

How it works:

- The PDF is sent to Gemini once (`src/app/api/mock-tests/parse/route.ts`). Numeric Quant questions come back as templates — variables with ranges plus an answer formula — so every test gets fresh numbers locally, with no further API calls (`src/lib/mock-generator.ts`, evaluated safely by `src/lib/expression.ts`).
- Reasoning, English and Quant that can't be templated (DI, series, puzzles…) get AI-rewritten versions in smaller follow-up calls. Each test prefers versions you haven't seen; **Generate more with AI** adds more.
- Papers, tests and attempts are saved to the user's account. Deleting a paper also deletes its tests and attempts. PDFs can be up to 4 MB (Vercel's request size limit).
- The exam screen copies the IBPS / SBI interface: section tabs, sectional or composite timing, question palette with the official status legend, Save & Next, Mark for Review & Next, Clear Response and the pre-submit summary. Marking is +1 / −0.25. Progress autosaves, so a reload resumes the same question.

## Production validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Accounts and data storage

- Every page except the landing page, `/login` and `/signup` needs an account. `src/proxy.ts` redirects visitors without a session cookie; every API route checks the session itself (`src/lib/server/auth.ts`).
- Passwords are hashed with scrypt. Sessions are random tokens in an httpOnly cookie, stored hashed for 30 days. Logins are limited to 10 wrong attempts per 15 minutes per email.
- All data lives under per-user keys (`src/lib/server/store.ts`), so one account can never read another's.
- Practice sessions are sent to the server as events and applied there (`applySession` in `src/lib/stats.ts`), so two devices don't overwrite each other.
- Progress saved in the browser before accounts existed is imported into the account on first login, if the account has no progress yet.
- **Settings → Storage** shows what the account uses and has delete buttons for practice history, mock results, unstarted tests and each paper.

### Database

- **Vercel:** in the project, open **Storage**, connect **Upstash for Redis** and redeploy. It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
- **Local:** without those variables, data is kept in `.data/` (git-ignored). To use the Vercel database locally instead, run `vercel env pull .env.local`.

## Main source areas

```text
src/
  app/                    # Next.js routes
  components/
    app-shell.tsx         # Responsive application shell
    exam/                 # IBPS / SBI-style mock test interface
    session-engine.tsx    # Core practice/game loop
    session-route.tsx     # Builds a session from its URL
    session-setup.tsx     # Practice configuration
    ui/                   # Local UI primitives
  constants/              # Category definitions
  context/                # Auth and stats providers (synced with the server)
  lib/
    question-generator.ts # Dynamic question generation + answer checking
    session-url.ts        # Session settings <-> URL query
    gemini.ts             # Server-only Gemini calls for mock tests
    server/               # Auth, database access and API helpers (server only)
    mock-generator.ts     # Builds mock tests from parsed papers
    stats.ts              # Analytics, XP, levels, weak areas
  types/                  # Shared TypeScript models
```

## Notes

- Question difficulty adapts during a session based on recent accuracy and response time.
- Weak Area Training weights categories with low accuracy / slow average response time.
- Pausing hides the current question and freezes its timer.
- Fraction answers accept equivalent simplified or unsimplified fractions because checking uses cross multiplication.
