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

## Out of Scope (v1)
- User accounts / authentication
- Saving/loading sessions (could add localStorage save later)
- Backend / database
- Sharing results
- PDF export
- Multiple sessions / history comparison
