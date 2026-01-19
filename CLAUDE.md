# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Seat Planner is a React + TypeScript web application for teachers to create classroom seating arrangements. It supports constraint-based seating optimization with bans, preferences, gender grouping, and front/back row preferences.

## Commands

```bash
npm run dev      # Start development server (Vite)
npm run build    # TypeScript check + production build
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Architecture

### State Management

All application state flows through a single `useSeatingPlan` hook (`src/hooks/useSeatingPlan.ts`) using React's `useReducer`. The hook manages:
- Student list and grid placement
- Constraints (ban/prefer pairs, manual placements)
- Row preferences (front/back)
- Gender mode settings

State changes that affect seating trigger `generateSeating()` to re-optimize the grid.

### Seating Algorithm

`src/utils/seatingAlgorithm.ts` implements a weighted constraint satisfaction algorithm:

1. **Initial placement**: Random shuffle of students into grid positions
2. **Optimization loop**: Iterative pairwise swaps to maximize total score
3. **Scoring weights**:
   - Manual placements: Absolute (never swapped)
   - Bans: -1000 penalty per violation
   - Preferences: +50 bonus when satisfied
   - Row preferences: Gradual scoring based on distance from front/back
   - Gender mode: ±10 based on same/different gender pairing

**Important**: After any successful swap in the optimization loop, it must `break outerLoop` to restart iteration with fresh grid values. Failing to do this causes duplicate student placements.

### Data Flow

```
CSV Import → parseCSV() → SET_STUDENTS action → generateSeating() → grid rendered
User action → dispatch action → generateSeating() → grid re-rendered
```

### Key Types (`src/types/index.ts`)

- `SeatingPlan`: Main state object containing students, constraints, rowPreferences, grid
- `Constraint`: Pair relationship (ban/prefer/manual)
- `StudentRowPreference`: Individual front/back row preference

### File Save/Load

Plans are saved as JSON files via browser File API (`src/utils/fileIO.ts`). No server required.
