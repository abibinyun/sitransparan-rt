# Karang Taruna Page Modular Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose monolithic `frontend/src/pages/KarangTarunaPage.tsx` (1,341 lines) into modular, single-responsibility tabs and modals in `frontend/src/components/karang-taruna/`, reducing `KarangTarunaPage.tsx` under ~350 lines while preserving all business functionality, animations, and UI library consistency.

**Architecture:** 
- Extract Tab 1 (RT Structure & SK) into `RTStructureTab.tsx`.
- Extract Tab 2 (Karang Taruna youth structure) into `KTStructureTab.tsx`.
- Tab 3 is already modular (`WasteAttendanceTab.tsx`).
- Extract modals: `RTPeriodModal.tsx`, `RTMemberModal.tsx`, `KTPeriodModal.tsx`, `KTMemberModal.tsx`.
- Keep all dropdowns and form controls strictly using UI library components (`Select` from `ui/select`, `Input` from `ui/input`, `Dialog`/`SimpleDialog` from `ui/dialog`).

**Tech Stack:** React 18, TypeScript, TailwindCSS, TanStack Query v5, Zustand, Lucide React, Shadcn/Radix UI.

---

### Task 1: Create Modals for RT Structure (`RTPeriodModal.tsx` & `RTMemberModal.tsx`)
**Files:**
- Create: `frontend/src/components/karang-taruna/RTPeriodModal.tsx`
- Create: `frontend/src/components/karang-taruna/RTMemberModal.tsx`

- [ ] **Step 1: Create RTPeriodModal**
  - Extract form for RT period (name, start_date, end_date, sk_number, status).
  - Use UI library Dialog, Input, Label, Select.
- [ ] **Step 2: Create RTMemberModal**
  - Extract form for RT board member (resident_id, role, section, custom_title, phone_override, status).
  - Include inline new section creation.
- [ ] **Step 3: Verify TypeScript builds without errors**

---

### Task 2: Create Modals for Karang Taruna (`KTPeriodModal.tsx` & `KTMemberModal.tsx`)
**Files:**
- Create: `frontend/src/components/karang-taruna/KTPeriodModal.tsx`
- Create: `frontend/src/components/karang-taruna/KTMemberModal.tsx`

- [ ] **Step 1: Create KTPeriodModal**
  - Extract form for Karang Taruna period (name, start_date, end_date, sk_number, status).
- [ ] **Step 2: Create KTMemberModal**
  - Extract form for youth member (resident_id, role, section, custom_title, phone_override, status).
  - Include inline new section creation.
- [ ] **Step 3: Verify TypeScript builds without errors**

---

### Task 3: Create Tab Components (`RTStructureTab.tsx` & `KTStructureTab.tsx`)
**Files:**
- Create: `frontend/src/components/karang-taruna/RTStructureTab.tsx`
- Create: `frontend/src/components/karang-taruna/KTStructureTab.tsx`

- [ ] **Step 1: Create RTStructureTab**
  - Renders period selector, core executive cards (Ketua, Wakil, Sekretaris, Bendahara), and section groups.
  - Handles promotion, status toggles, deletion with UI library Card, Badge, Button.
- [ ] **Step 2: Create KTStructureTab**
  - Renders Karang Taruna period selector, core officers, sections, and member cards.
- [ ] **Step 3: Verify TypeScript builds without errors**

---

### Task 4: Rewire `KarangTarunaPage.tsx`
**Files:**
- Modify: `frontend/src/pages/KarangTarunaPage.tsx`

- [ ] **Step 1: Replace inline blocks with modular tabs and modals**
  - Import `RTStructureTab`, `KTStructureTab`, `WasteAttendanceTab`.
  - Import modular modals.
- [ ] **Step 2: Verify `npx tsc --noEmit` and `npm run build`**
- [ ] **Step 3: Run Playwright test suite to confirm zero regressions**
