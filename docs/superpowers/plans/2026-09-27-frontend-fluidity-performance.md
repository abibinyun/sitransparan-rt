# Frontend Fluidity & App-Grade Performance Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate frontend performance, perceived latency, and smoothness to native app grade: instant hover preloading for lazy routes, smooth non-jarring Suspense/Transition wrapping, and targeted Latin-only font loading.

**Architecture:**
- **Route Preloading Utility**: Create `frontend/src/utils/routePreloader.ts` mapping route paths to their dynamic import loaders, triggering prefetch on `onMouseEnter` / `onTouchStart` in `MainLayout.tsx` and `PublicLayout.tsx`.
- **Fluid Transition Layout**: Add subtle CSS transitions (`fade-in-slide` 150ms GPU accelerated) around `<Suspense>` route views so page swaps are smooth without flickering spinners.
- **Font Subsetting & Swap**: Trim `@fontsource/plus-jakarta-sans` in `index.css` to `latin` subsets only with `font-display: swap`, avoiding 20+ unused Vietnamese/ext woff2 requests.

**Tech Stack:** React 18, React Router v6, TypeScript, Vite, TailwindCSS.

---

### Task 1: Create Route Preloader Utility
**Files:**
- Create: `frontend/src/utils/routePreloader.ts`
- Modify: `frontend/src/components/layout/MainLayout.tsx`
- Modify: `frontend/src/components/layout/PublicLayout.tsx`

- [ ] **Step 1: Write `routePreloader.ts`**
  - Export `preloadRoute(path: string)` invoking matching dynamic import.
  - Cache loaded promises so repeated hovers do zero work.
- [ ] **Step 2: Attach preloader to navigation links**
  - Wire `onMouseEnter` and `onTouchStart` to sidebar / bottom nav links in `MainLayout.tsx`.
- [ ] **Step 3: Verify TypeScript compiles without error**

---

### Task 2: Smooth Transition Wrapper & Optimized PageLoader
**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add GPU-accelerated transition keyframes in `index.css`**
  - Subtle `fade-in-slide` (opacity: 0 -> 1, translateY: 3px -> 0px, 120ms ease-out).
- [ ] **Step 2: Refactor PageLoader in `App.tsx`**
  - Use subtle top loading bar or delayed spinner (200ms debounce) instead of sudden full-page jarring spinner.
- [ ] **Step 3: Wrap Route Outlet in smooth transition container**

---

### Task 3: Font Optimization & Latin Subsetting
**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/index.html`

- [ ] **Step 1: Replace generic font imports with `latin` only in `index.css`**
  - Keep 400, 500, 600, 700 with `font-display: swap`.
- [ ] **Step 2: Add preload link tag in `index.html` for primary font weight**
- [ ] **Step 3: Run `npx tsc --noEmit` and `npm run build` to verify zero errors and check bundle size**
