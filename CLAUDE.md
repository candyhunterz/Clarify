# Clarify - Career Path Explorer & Decision Tool

## What Is This
React + Vite web app that helps software developers navigate career decisions through guided self-reflection, LLM-powered path generation (Gemini), and a weighted decision matrix. See `PRD.md` for full spec.

## Tech Stack
- React 18+ with Vite
- TypeScript
- Gemini API (client-side)
- Tailwind CSS

## Build & Verify
```bash
npm run build    # Must succeed — no compile errors
npm run lint     # Must pass clean
npm run dev      # Dev server
```

## Instructions
- Use the `/superpowers:brainstorming` skill before designing any new feature or component
- Use the `frontend-design` skill when building UI components and layouts
- Follow the PRD.md strictly for flow, questions, and features
- Keep the aesthetic clean, calming, and minimal — guided meditation app, not enterprise dashboard
- One question/section visible at a time in the wizard flow
- All LLM calls go through Gemini API client-side
