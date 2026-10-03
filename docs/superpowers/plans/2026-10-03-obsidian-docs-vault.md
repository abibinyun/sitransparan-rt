# Obsidian Documentation Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the structured Obsidian Knowledge Vault in `docs/` according to `docs/superpowers/specs/2026-10-03-obsidian-docs-vault-design.md`, organizing and verifying all files with exact codebase synchronizations.

**Architecture:**
- Create 8 thematic folders in `docs/`: `01-architecture/`, `02-modules/`, `03-database/`, `04-api-contracts/`, `05-operations-devops/`, `06-testing-qa/`, `07-frontend-design/`, `08-roadmaps/`.
- Create centralized Map of Content `docs/00-MOC.md` linking all modules via Obsidian wikilinks.
- Move, clean up, and rewrite existing docs into verified, structured notes matching the real code.
- Clean up obsolete, redundant, or root-clutter markdown files once migrated.

**Tech Stack:** Markdown, Obsidian Wikilinks, Mermaid.js diagrams, Frontmatter YAML.

**Spec:** `docs/superpowers/specs/2026-10-03-obsidian-docs-vault-design.md`

---

### Task 1: Create 00-MOC.md & Architecture Pillar (`01-architecture/`)
**Files:**
- Create: `docs/00-MOC.md`
- Create: `docs/01-architecture/system-overview.md`
- Create: `docs/01-architecture/multi-tenancy.md`
- Create: `docs/01-architecture/authentication-and-rbac.md`
- Create: `docs/01-architecture/subdomain-and-routing.md`
- Create: `docs/01-architecture/audit-logging.md`

- [ ] **Step 1: Write `00-MOC.md`**
  - Hub navigation, system credentials table, port allocations, environment overview.
- [ ] **Step 2: Write Architecture notes**
  - Synthesize `architecture.md`, `authentication-authorization.md`, `domains-and-routing.md`, `audit-logging-spec.md`.
  - Add verified codebase paths and Go layer references.

---

### Task 2: Create Core Modules Pillar (`02-modules/`)
**Files:**
- Create: `docs/02-modules/kependudukan-and-houses.md`
- Create: `docs/02-modules/keuangan-and-dues.md`
- Create: `docs/02-modules/bank-sampah.md`
- Create: `docs/02-modules/karang-taruna-and-structure.md`
- Create: `docs/02-modules/inventaris-and-assets.md`
- Create: `docs/02-modules/notulen-and-meetings.md`
- Create: `docs/02-modules/kabar-and-documents.md`
- Create: `docs/02-modules/aspirasi-and-needs.md`
- Create: `docs/02-modules/portal-transparansi-publik.md`
- Create: `docs/02-modules/social-and-polls.md`
- Create: `docs/02-modules/notifikasi-webpush.md`

- [ ] **Step 1: Write demographic, financial, and bank sampah modules**
  - Map each to its Go delivery handler, repository methods, React modular components, and Playwright tests.
- [ ] **Step 2: Write governance, inventory, meetings, communications, and social modules**
  - Document recent refactorings and features (e.g. `payment_date`, `SearchableResidentSelect`, multi-fund).

---

### Task 3: Create Database, API, and DevOps Pillars (`03-database/`, `04-api-contracts/`, `05-operations-devops/`)
**Files:**
- Create: `docs/03-database/schema-inventory.md`
- Create: `docs/03-database/migrations-history.md`
- Create: `docs/03-database/data-integrity-rules.md`
- Create: `docs/04-api-contracts/api-inventory.md`
- Create: `docs/04-api-contracts/openapi-spec.md`
- Create: `docs/05-operations-devops/environment-and-setup.md`
- Create: `docs/05-operations-devops/docker-and-traefik.md`
- Create: `docs/05-operations-devops/sdlc-and-promotion-workflow.md`
- Create: `docs/05-operations-devops/release-checklist.md`

- [ ] **Step 1: Write Database documentation**
  - Complete inventory of tables (public + tenant schemas) and full migrations history (000001–000050).
- [ ] **Step 2: Write API contracts & DevOps documentation**
  - Verified endpoint list, Traefik v3.6 configuration, SDLC rules.

---

### Task 4: Create QA, Design, and Roadmap Pillars (`06-testing-qa/`, `07-frontend-design/`, `08-roadmaps/`) & Clean Up
**Files:**
- Create: `docs/06-testing-qa/e2e-playwright-suite.md`
- Create: `docs/06-testing-qa/backend-test-suite.md`
- Create: `docs/06-testing-qa/audit-reports-archive.md`
- Create: `docs/07-frontend-design/apple-design-system.md`
- Create: `docs/07-frontend-design/anti-ai-slop-rules.md`
- Create: `docs/07-frontend-design/bundle-and-performance.md`
- Create: `docs/08-roadmaps/community-features-roadmap.md`
- Create: `docs/08-roadmaps/auto-payment-integration.md`
- Remove: obsolete flat files in `docs/` that are migrated into the new pillars.

- [ ] **Step 1: Write Testing, Frontend Design, and Roadmaps**
- [ ] **Step 2: Remove redundant legacy files from `docs/` root**
- [ ] **Step 3: Verify all wikilinks resolve and AGENTS.md points to the new MOC**
