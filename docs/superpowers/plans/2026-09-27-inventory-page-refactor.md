# Inventory Page Modular Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose monolithic `frontend/src/pages/InventoryPage.tsx` (909 lines) into modular single-responsibility tabs and modals in `frontend/src/components/inventory/`, reducing `InventoryPage.tsx` under ~300 lines while preserving all business functionality, photo uploads, and UI library consistency.

**Architecture:**
- Create `frontend/src/components/inventory/`:
  - `InventoryItemsTab.tsx`: Asset items catalog and stock management.
  - `InventoryBorrowingsTab.tsx`: Citizen borrowing records and return workflow.
  - `InventoryItemModal.tsx`: Create / edit inventory item with photo upload and category.
  - `InventoryBorrowModal.tsx`: Create citizen borrow record with resident selector and dates.
  - `InventoryReturnModal.tsx`: Process item return, condition assessment, and fines.
- Keep all dropdowns and form controls strictly using UI library components (`Select` from `ui/select`, `Input` from `ui/input`, `Textarea` from `ui/textarea`, `Dialog` from `ui/dialog`).

**Tech Stack:** React 18, TypeScript, TailwindCSS, TanStack Query v5, Lucide React, Shadcn/Radix UI.

---

### Task 1: Create Inventory Modals
**Files:**
- Create: `frontend/src/components/inventory/InventoryItemModal.tsx`
- Create: `frontend/src/components/inventory/InventoryBorrowModal.tsx`
- Create: `frontend/src/components/inventory/InventoryReturnModal.tsx`

- [ ] **Step 1: Create InventoryItemModal**
- [ ] **Step 2: Create InventoryBorrowModal**
- [ ] **Step 3: Create InventoryReturnModal**
- [ ] **Step 4: Verify TypeScript compiles**

---

### Task 2: Create Inventory Tab Components
**Files:**
- Create: `frontend/src/components/inventory/InventoryItemsTab.tsx`
- Create: `frontend/src/components/inventory/InventoryBorrowingsTab.tsx`

- [ ] **Step 1: Create InventoryItemsTab**
- [ ] **Step 2: Create InventoryBorrowingsTab**
- [ ] **Step 3: Verify TypeScript compiles**

---

### Task 3: Rewire `InventoryPage.tsx` and Verify
**Files:**
- Modify: `frontend/src/pages/InventoryPage.tsx`

- [ ] **Step 1: Replace inline blocks with modular tabs and modals**
- [ ] **Step 2: Run `tsc --noEmit` and `npm run build`**
- [ ] **Step 3: Run Playwright tests to verify zero regressions**
