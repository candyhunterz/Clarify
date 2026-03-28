# Clarify

A career clarity tool for software developers who feel stuck. Instead of giving you generic advice, Clarify runs you through a structured coaching experience — guided reflection, AI-driven conversation that surfaces what you actually want, personalized career paths, and a weighted decision matrix — then produces an actionable 90-day plan.

Everything runs in the browser. No backend, no accounts, no data leaves your machine (except Gemini API calls).

## How it works

Clarify is a 7-step wizard:

1. **Reflect** — 12 questions covering what energizes you, what drains you, your priorities, and deeper prompts about regrets, competence traps, and identity barriers
2. **Discover** — An AI coaching conversation that identifies tensions in your answers ("You want creative freedom but rated stability 5/5 — tell me about that") and synthesizes your core values
3. **Explore** — 4-6 personalized career paths generated from your profile, each with salary ranges, skill gaps, timelines, and risk levels. Chat with any path to dig deeper
4. **Compare** — Weighted decision matrix with "what if" scenario modeling and sensitivity analysis
5. **Commit** — Gut-check your top path. If the numbers say one thing and your instinct says another, that gap is the most valuable data
6. **Plan** — A 30/60/90 day action plan that addresses your specific blockers, includes identity milestones, and has built-in decision checkpoints with off-ramps
7. **Summary** — A personal narrative connecting your journey, plus a comprehensive PDF export

## Getting started

```bash
git clone https://github.com/candyhunterz/Clarify.git
cd Clarify
npm install
```

### Set up your Gemini API key

Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey).

**Option A:** Create a `.env` file:
```
VITE_GEMINI_API_KEY=your_key_here
```

**Option B:** The app will prompt you for the key on first use and store it in localStorage.

### Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Tech stack

- **React 19** + **Vite** + **TypeScript**
- **Tailwind CSS 4** — clean, calming aesthetic
- **Framer Motion** — smooth wizard transitions
- **Google Gemini API** — all LLM calls (client-side, streaming)
- **jsPDF** — client-side PDF generation
- **Vitest** + **React Testing Library** — 64 tests

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Type-check + production build
npm test         # Run all tests
npm run lint     # ESLint
```

## Project structure

```
src/
  components/        # UI components (wizard steps, questions, cards, panels)
  hooks/             # useWizard (state + undo/redo), useSessionPersistence
  services/          # Gemini API calls, PDF generation
  test/              # Test fixtures
  types.ts           # All TypeScript interfaces
  App.tsx            # 7-step wizard shell
```

## Key features

- **AI coaching conversation** — not a chatbot, a structured dialogue that surfaces tensions and contradictions in your thinking
- **Values hierarchy** — ranked by what the conversation revealed, not just what you put on sliders
- **Path exploration** — ask anything about a career path before committing to it
- **Scenario modeling** — "What if money didn't matter?" with instant re-ranking
- **Conviction check** — captures the gap between spreadsheet logic and gut instinct
- **Session persistence** — auto-saves progress, resume anytime, cross-tab conflict detection
- **Undo/redo** — full history across all steps with stale data detection
- **PDF export** — comprehensive career coaching document, not just a summary

## License

MIT
