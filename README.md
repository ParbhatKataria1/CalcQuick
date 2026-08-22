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

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn-compatible local UI primitives (`src/components/ui` + `components.json`)
- Lucide React
- Recharts

No Firebase, API keys, database, or other external credentials are required for this first version.

## Run locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

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
    session-engine.tsx    # Core practice/game loop
    session-setup.tsx     # Practice configuration
    ui/                   # Local UI primitives
  constants/              # Category definitions
  context/                # localStorage stats provider
  lib/
    question-generator.ts # Dynamic question generation + answer checking
    stats.ts              # Analytics, XP, levels, weak areas
  types/                  # Shared TypeScript models
```

## Notes

- Question difficulty adapts during a session based on recent accuracy and response time.
- Weak Area Training weights categories with low accuracy / slow average response time.
- Pausing hides the current question and freezes its timer.
- Fraction answers accept equivalent simplified or unsimplified fractions because checking uses cross multiplication.
