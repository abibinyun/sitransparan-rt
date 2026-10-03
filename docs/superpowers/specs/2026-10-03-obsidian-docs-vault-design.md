# Obsidian Documentation Vault Design — SiTransparan RT/RW

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans after this design is reviewed. This document acts as the comprehensive specification for structuring the `docs/` folder into an Obsidian-native knowledge vault synchronized with the actual codebase.

**Goal:** Transform the flat, unstructured `docs/` directory (40+ markdown files) into a fully organized, deeply cross-referenced Obsidian Vault with bidirectional wikilinks, structured directories, verified code mapping, and a centralized Map of Content (`00-MOC.md`).

**Architecture:**
- **Central Index:** `docs/00-MOC.md` with hierarchical links to 8 operational pillars.
- **8 Domain Directories:**
  1. `01-architecture/`: Clean architecture, schema-per-tenant, auth & RBAC, subdomain routing.
  2. `02-modules/`: Verified end-to-end documentation for all 11 core feature areas (handlers, repos, UI components, tests).
  3. `03-database/`: Schema dictionary (public + tenant schemas), complete migration ledger (000001–000050), data integrity rules.
  4. `04-api-contracts/`: Verified API endpoint inventory, headers, openapi mapping.
  5. `05-operations-devops/`: Multi-environment setup (dev/staging/prod), Docker, Traefik v3.6, strict SDLC rules.
  6. `06-testing-qa/`: Playwright E2E suite, backend tests, security audit history.
  7. `07-frontend-design/`: Apple-style design tokens, anti-ai-slop rules, performance & bundle architecture.
  8. `08-roadmaps/`: Community features roadmap, auto-payment integration.

---

## 1. Directory Structure

```text
docs/
├── 00-MOC.md
├── 01-architecture/
│   ├── system-overview.md
│   ├── multi-tenancy.md
│   ├── authentication-and-rbac.md
│   ├── subdomain-and-routing.md
│   └── audit-logging.md
├── 02-modules/
│   ├── kependudukan-and-houses.md
│   ├── keuangan-and-dues.md
│   ├── bank-sampah.md
│   ├── karang-taruna-and-structure.md
│   ├── inventaris-and-assets.md
│   ├── notulen-and-meetings.md
│   ├── kabar-and-documents.md
│   ├── aspirasi-and-needs.md
│   ├── portal-transparansi-publik.md
│   ├── social-and-polls.md
│   └── notifikasi-webpush.md
├── 03-database/
│   ├── schema-inventory.md
│   ├── migrations-history.md
│   └── data-integrity-rules.md
├── 04-api-contracts/
│   ├── api-inventory.md
│   └── openapi-spec.md
├── 05-operations-devops/
│   ├── environment-and-setup.md
│   ├── docker-and-traefik.md
│   ├── sdlc-and-promotion-workflow.md
│   └── release-checklist.md
├── 06-testing-qa/
│   ├── e2e-playwright-suite.md
│   ├── backend-test-suite.md
│   └── audit-reports-archive.md
├── 07-frontend-design/
│   ├── apple-design-system.md
│   ├── anti-ai-slop-rules.md
│   └── bundle-and-performance.md
├── 08-roadmaps/
│   ├── community-features-roadmap.md
│   └── auto-payment-integration.md
└── superpowers/
    ├── plans/
    └── specs/
```

---

## 2. Codebase Reality Checklist (Strict Verification)

Each module document MUST map accurately to the real codebase paths:
1. **Clean Architecture Backend Layers**:
   - `backend/cmd/server/main.go`
   - `backend/internal/delivery/http/` (Handlers & Middleware)
   - `backend/internal/usecase/` (Business Logic)
   - `backend/internal/repository/` (PostgreSQL Queries with `TenantTable(ctx, table)`)
   - `backend/internal/domain/` (Entities & Interfaces)
2. **Modular Frontend Layers**:
   - `frontend/src/pages/`
   - `frontend/src/components/` (decomposed components: financial, karang-taruna, meetings, inventory, waste-bank)
   - `frontend/src/services/` (axios client & TanStack Query hooks)
   - `frontend/src/store/useAuthStore.ts` (Zustand state & active tenant)
3. **Database Ledger**:
   - Total 50 migrations in `backend/migrations/` (`000001` through `000050_add_payment_date_to_dues_payments`).
4. **DevOps & Infrastructure**:
   - `infrastructure/docker-compose.{dev,staging,prod}.yml`
   - Traefik v3.6 HostRegexp rules, MinIO `sitransparan-files` bucket, PostgreSQL 16.

---

## 3. Obsidian Vault Features
- **Wikilinks**: All related docs link each other using wikilinks syntax.
- **Tags**: Frontmatter tags (`tags: [architecture, backend, finance]`) for graph view filtering.
- **Code Block Previews**: Direct snippets of Go structs, SQL definitions, and TypeScript interfaces.
