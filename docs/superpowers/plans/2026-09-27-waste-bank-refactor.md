# Waste Bank Page Modular Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose monolithic `frontend/src/pages/WasteBankPage.tsx` (888 lines) into modular single-responsibility tabs and modals in `frontend/src/components/waste-bank/`, reducing `WasteBankPage.tsx` under ~300 lines while preserving all business functionality, splits calculation, and UI library consistency.

**Architecture:**
- Create `frontend/src/components/waste-bank/`:
  - `WasteDepositsTab.tsx`: Deposits history, weights, earnings split, and action controls.
  - `WasteHouseholdsTab.tsx`: Citizen household savings passbook (Buku Tabungan KK).
  - `WasteCategoriesTab.tsx`: Waste categories master & pricing per kg.
  - `WasteDepositModal.tsx`: Record deposit modal with dynamic multi-row waste item entry.
  - `WasteCategoryModal.tsx`: Create / edit waste category and price modal.
  - `HouseholdSavingsModal.tsx`: Citizen passbook detailed breakdown modal.
- Ensure all dropdowns and form controls strictly use UI library components (`Select` from `ui/select`, `Input` from `ui/input`, `Dialog` from `ui/dialog`).

**Tech Stack:** React 18, TypeScript, TailwindCSS, TanStack Query v5, Lucide React, Shadcn/Radix UI.

---

### Task 1: Create Waste Bank Modals
**Files:**
- Create: `frontend/src/components/waste-bank/WasteCategoryModal.tsx`
- Create: `frontend/src/components/waste-bank/WasteDepositModal.tsx`
- Create: `frontend/src/components/waste-bank/HouseholdSavingsModal.tsx`

- [ ] **Step 1: Create WasteCategoryModal**
- [ ] **Step 2: Create WasteDepositModal**
- [ ] **Step 3: Create HouseholdSavingsModal**
- [ ] **Step 4: Verify TypeScript compiles**

---

### Task 2: Create Waste Bank Tab Components
**Files:**
- Create: `frontend/src/components/waste-bank/WasteDepositsTab.tsx`
- Create: `frontend/src/components/waste-bank/WasteHouseholdsTab.tsx`
- Create: `frontend/src/components/waste-bank/WasteCategoriesTab.tsx`

- [ ] **Step 1: Create WasteDepositsTab**
- [ ] **Step 2: Create WasteHouseholdsTab**
- [ ] **Step 3: Create WasteCategoriesTab**
- [ ] **Step 4: Verify TypeScript compiles**

---

### Task 3: Rewire `WasteBankPage.tsx` and Verify
**Files:**
- Modify: `frontend/src/pages/WasteBankPage.tsx`

- [ ] **Step 1: Replace inline blocks with modular tabs and modals**
- [ ] **Step 2: Run `tsc --noEmit` and `npm run build`**
- [ ] **Step 3: Run Playwright tests to verify zero regressions**
