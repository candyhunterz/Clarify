# Clarify - Career Path Explorer & Decision Tool

## Overview
A React + Vite web app that helps software developers figure out whether they need a career change, a job change, or a direction change. Combines guided self-reflection, LLM-powered career path generation, and a weighted decision matrix into a structured 4-step wizard.

## Target User
Software developer who feels stuck, undervalued, or unsure whether they dislike their job or their career. Prefers structured guidance over open-ended exploration.

## Tech Stack
- React 18+ with Vite
- TypeScript
- Gemini API (client-side, user provides API key)
- CSS Modules or Tailwind (clean, calming aesthetic)
- No backend, no database — everything runs in the browser

## Flow

### Step 1: Reflection
Guided self-assessment to separate "bad job" from "bad career." ~8-10 questions.

**Question types:**
- Multiple choice with 4-5 options
- Slider/scale (1-5)
- 1-2 open-ended text fields

**Sample questions:**
1. What parts of your current work make time fly? (multi-select: building UI, solving bugs, system design, mentoring, learning new tech, writing docs, talking to users, none of these)
2. What drains you the most? (multi-select: repetitive tasks, meetings, unclear requirements, legacy code, lack of growth, politics, isolation, on-call)
3. If you could redesign your job, what would you keep? (open-ended)
4. How important is each of these to you? (sliders: salary, flexibility, creative freedom, team quality, learning opportunity, impact/meaning, stability, leadership path)
5. Do you see yourself writing code in 5 years? (yes/maybe/no/not sure)
6. What's your energy level at the end of a work day? (scale: completely drained → energized)
7. When you learn something new outside work, what is it? (multi-select: tech/coding, design, business/startups, writing, teaching, something non-tech)
8. What would success look like in 2 years? (open-ended)

Results in a structured profile sent to the LLM.

### Step 2: Path Generation
Send the reflection profile to Gemini API with a system prompt that generates 4-6 personalized career paths.

**Each path includes:**
- Title and one-line description
- Why it fits (based on their reflection answers)
- Typical salary range (entry → experienced)
- Skills they already have vs need to build
- Realistic timeline to transition
- Risk level (low/medium/high)
- Day-in-the-life summary (3-4 sentences)

**Path categories to guide the LLM:**
- Level up in current track (e.g., senior full-stack at a better company)
- Specialize (frontend, backend, DevOps, data engineering, mobile)
- Adjacent pivot (product management, UX design, dev rel, technical writing, engineering management)
- Bigger pivot (only if reflection suggests low interest in staying in tech)

User reviews paths, selects 2-4 that interest them to bring into the comparison step.

### Step 3: Decision Matrix
Interactive comparison of selected paths against weighted criteria.

**Default criteria (user can customize weights 1-5):**
- Salary / financial growth
- Work-life balance / flexibility
- Learning & growth potential
- Creative fulfillment
- Job market demand / stability
- Transition difficulty (inverted — easier = higher score)

**For each selected path × criterion:**
- LLM pre-fills a suggested score (1-5) with brief rationale
- User can override any score
- Real-time ranked results as scores change

**Display:**
- Matrix table with paths as columns, criteria as rows
- Weighted total at the bottom
- Visual bar chart or ranking visualization
- Highlight the top-ranked path

### Step 4: Action Plan
For the top-ranked path (or user-selected path), generate a concrete 30/60/90 day plan.

**Structure:**
- **First 30 days:** Research & foundations (courses, communities, portfolio pieces to start)
- **Days 31-60:** Build & practice (projects, networking, skill-building)
- **Days 61-90:** Launch (apply, interview prep, portfolio polish, transition steps)

Each phase has 3-5 specific, actionable items — not generic advice.

Include:
- Resources (specific courses, communities, books)
- Resume/portfolio tips specific to the target path
- Interview preparation guidance
- Risk mitigation (what to do if it's not working)

## UI Design

**Aesthetic:** Clean, calming, minimal. Think guided meditation app, not enterprise dashboard. Soft colors, generous whitespace, smooth transitions between steps.

**Layout:**
- Progress bar at top showing current step (1/4, 2/4, etc.)
- One question or section visible at a time (no overwhelming walls of content)
- Back/Next navigation
- Step 3 (matrix) is the most information-dense — use a clean table layout

**Responsive:** Should work on desktop and tablet. Mobile is nice-to-have but not required.

## API Integration

**Gemini setup:**
- On first load, prompt for Gemini API key
- Store in localStorage (warn user it's stored locally)
- Use Gemini 2.0 Flash or latest available model

**API calls:**
1. After Step 1 completion → generate career paths (Step 2)
2. After path selection → pre-fill decision matrix scores (Step 3)
3. After path ranking → generate action plan (Step 4)

**Error handling:**
- Show inline error if API call fails with retry button
- Allow proceeding without LLM if needed (manual entry fallback for paths)

### Step 5: Summary & Export
After the action plan, present a complete summary of the entire journey and offer two export options.

**Summary includes:**
- Reflection highlights (key values, energizers, drainers)
- All generated paths with the selected ones highlighted
- Decision matrix results with final rankings
- Full 30/60/90 action plan

**Export options:**
- **Download PDF** — client-side PDF generation (html2pdf.js or jsPDF), styled to match the app aesthetic
- **Send to email** — use a lightweight email service (EmailJS or Resend) to deliver the PDF summary to an email address. No backend needed — these services work client-side with an API key.

Both options generate the same content — a clean, printable career plan document.

## Advanced Requirements

### Session Persistence with Conflict Resolution
- Auto-save wizard progress to localStorage after each step and each answer change
- On load, detect existing session and offer "Resume where you left off" or "Start fresh"
- Handle multi-tab conflict: if the app is open in two tabs and both write, use a version timestamp strategy to detect stale writes
- On conflict detection, show a merge prompt: "This session was updated in another tab. Load latest or keep current?"
- Use `storage` event listener to detect cross-tab writes in real-time
- Each save includes a monotonic version counter + timestamp

### Animated Step Transitions
- Wizard steps transition with enter/exit animations — not just mount/unmount
- Use Framer Motion or CSS transitions with proper lifecycle handling
- Outgoing step slides/fades out, incoming step slides/fades in
- Component state must be preserved during transitions (don't remount and lose form state)
- Back navigation reverses the animation direction
- Loading states (waiting for LLM) have their own animation (skeleton shimmer or pulse)

### Streaming LLM Responses
- Path generation (Step 2) and action plan (Step 4) stream tokens in real-time instead of waiting for full response
- Use Gemini's streaming API (generateContentStream)
- Render partial markdown as tokens arrive — paths appear one by one, action items fill in progressively
- Show a typing indicator / cursor while streaming
- User can cancel mid-stream (AbortController)
- If streaming fails mid-response, show what was received with a "retry" option to continue
- Decision matrix scores (Step 3) can use non-streaming since the response is small

### Undo/Redo Across the Wizard
- Full undo/redo stack that works across all steps
- Going back to Step 2 and changing path selections invalidates Steps 3 and 4
- Invalidated steps show a "Your selections changed — regenerate?" prompt instead of silently using stale data
- Undo/redo includes: answer changes, path selections, weight adjustments, score overrides
- State dependency chain: Step 1 answers → Step 2 paths → Step 3 selections → Step 3 scores → Step 4 plan
- Changing anything upstream marks all downstream steps as stale
- Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z

## Testing Requirements

Use Vitest + React Testing Library. Tests must pass via `npm test` (non-interactive, single run). The orchestrator uses `npm run build && npm test` as the verification gate — if either fails, changes are reverted.

### Unit Tests

**Wizard state management:**
- Advancing and going back preserves form state
- Step completion gates (can't advance past Step 1 without answering required questions)
- Selecting/deselecting paths in Step 2 updates Step 3 availability

**Decision matrix logic:**
- Weight changes recalculate totals correctly
- Score overrides replace LLM-suggested scores
- Ranking updates in real-time when scores or weights change
- Tied scores are handled (deterministic ordering)

**Undo/redo:**
- Undo reverts the last change, redo re-applies it
- Changing a Step 1 answer marks Steps 2-4 as stale
- Changing path selection in Step 2 marks Steps 3-4 as stale
- Undo stack clears redo stack on new action

**Session persistence:**
- Save/load round-trips correctly (save state, reload, verify all fields restored)
- Version counter increments on each save
- Conflict detection triggers when version is stale

### Integration Tests

**Wizard flow (mocked Gemini API):**
- Complete the full flow: fill Step 1 → generate paths → select paths → score matrix → generate action plan → view summary
- Mock Gemini responses with realistic fixture data
- Verify each step renders correct content based on previous step's data

**Streaming (mocked):**
- Mock a streaming response, verify partial content renders progressively
- Cancel mid-stream, verify partial content is shown with retry option
- Stream error mid-response, verify graceful degradation

**PDF export:**
- Generate PDF from summary data, verify it's a valid blob (non-zero size)
- Verify summary content is present in the generated output

### Build Verification
```json
{
  "scripts": {
    "build": "tsc && vite build",
    "test": "vitest run",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  }
}
```

All three must pass. `npm run build` catches type errors. `npm test` catches logic errors. `npm run lint` catches code quality issues.

## Out of Scope (v1)
- User accounts / authentication
- Backend / database
- Sharing results
- Multiple sessions / history comparison
