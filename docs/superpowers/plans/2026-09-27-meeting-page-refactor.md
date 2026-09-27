# Meeting Page Modular Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose monolithic `frontend/src/pages/MeetingPage.tsx` (1,039 lines) into modular single-responsibility tabs and modals in `frontend/src/components/meetings/`, reducing `MeetingPage.tsx` under ~300 lines while preserving all business functionality, status toggles, and UI library consistency.

**Architecture:**
- Create `frontend/src/components/meetings/`:
  - `MeetingsTab.tsx`: Master-detail view for meetings list, active meeting agenda, decisions, meeting action items, attendees.
  - `ActionItemsTab.tsx`: Full tracking table of citizen action items with status toggles and filter/delete.
  - `MeetingFormModal.tsx`: Create / edit meeting modal with datetime, location, visibility (public/internal/confidential).
  - `ActionItemModal.tsx`: Create / edit action item modal with meeting selection, task, assignee, due date, status.
  - `DecisionModal.tsx`: Add decision modal with decision text and category.
  - `AttendeeModal.tsx`: Add attendee modal with name and role/title.
- Ensure all dropdowns and form controls strictly use UI library components (`Select` from `ui/select`, `Input` from `ui/input`, `Textarea` from `ui/textarea`, `Dialog` from `ui/dialog`).

**Tech Stack:** React 18, TypeScript, TailwindCSS, TanStack Query v5, Lucide React, Shadcn/Radix UI.

---

### Task 1: Create Meeting Modals
**Files:**
- Create: `frontend/src/components/meetings/MeetingFormModal.tsx`
- Create: `frontend/src/components/meetings/ActionItemModal.tsx`
- Create: `frontend/src/components/meetings/DecisionModal.tsx`
- Create: `frontend/src/components/meetings/AttendeeModal.tsx`

- [ ] **Step 1: Create MeetingFormModal**
- [ ] **Step 2: Create ActionItemModal**
- [ ] **Step 3: Create DecisionModal & AttendeeModal**
- [ ] **Step 4: Verify TypeScript compiles**

---

### Task 2: Create Tab Components
**Files:**
- Create: `frontend/src/components/meetings/MeetingsTab.tsx`
- Create: `frontend/src/components/meetings/ActionItemsTab.tsx`

- [ ] **Step 1: Create MeetingsTab**
- [ ] **Step 2: Create ActionItemsTab**
- [ ] **Step 3: Verify TypeScript compiles**

---

### Task 3: Rewire `MeetingPage.tsx` and Verify
**Files:**
- Modify: `frontend/src/pages/MeetingPage.tsx`

- [ ] **Step 1: Replace inline blocks with modular tabs and modals**
- [ ] **Step 2: Run `tsc --noEmit` and `npm run build`**
- [ ] **Step 3: Run Playwright meeting tests to verify zero regressions**
