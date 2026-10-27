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
- Browser `localStorage` persistence
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

Practice needs no API keys or database. Mock tests use a Gemini API key and a local json-server store.

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

2. Run the app and the mock-test store together:

   ```bash
   npm run dev:all   # next dev + json-server on http://localhost:4100 (db.json)
   ```

3. Open **Mock Tests**, upload a prelims PDF, then generate as many tests as you like.

How it works:

- The PDF is sent to Gemini once (`src/app/api/mock-tests/parse/route.ts`). Numeric Quant questions come back as templates — variables with ranges plus an answer formula — so every test gets fresh numbers locally, with no further API calls (`src/lib/mock-generator.ts`, evaluated safely by `src/lib/expression.ts`).
- Reasoning, English and Quant that can't be templated (DI, series, puzzles…) get AI-rewritten versions in smaller follow-up calls. Each test prefers versions you haven't seen; **Generate more with AI** adds more.
- Tests, attempts and papers are saved in `db.json` (git-ignored). Deleting a paper also deletes its tests and attempts.
- The exam screen copies the IBPS / SBI interface: section tabs, sectional or composite timing, question palette with the official status legend, Save & Next, Mark for Review & Next, Clear Response and the pre-submit summary. Marking is +1 / −0.25. Progress autosaves, so a reload resumes the same question.

## Production validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Data storage

The MVP stores progress under a single browser `localStorage` key. The persistence boundary is isolated in `src/context/stats-context.tsx`, so it can later be replaced with Firebase or a backend API without rewriting the practice engine.

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
  context/                # localStorage stats provider
  lib/
    question-generator.ts # Dynamic question generation + answer checking
    session-url.ts        # Session settings <-> URL query
    gemini.ts             # Server-only Gemini calls for mock tests
    mock-generator.ts     # Builds mock tests from parsed papers
    stats.ts              # Analytics, XP, levels, weak areas
  types/                  # Shared TypeScript models
```

## Notes

- Question difficulty adapts during a session based on recent accuracy and response time.
- Weak Area Training weights categories with low accuracy / slow average response time.
- Pausing hides the current question and freezes its timer.
- Fraction answers accept equivalent simplified or unsimplified fractions because checking uses cross multiplication.
