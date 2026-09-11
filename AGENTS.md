# AGENTS.md — Autonomous Application Discovery & E2E Testing

**Version:** 3.0.0
**Purpose:** General-purpose autonomous application discovery, browser exploration, E2E test generation, execution, debugging, and regression coverage.

> **How to use this document.** Sections 1–45 are the technology- and domain-agnostic
> methodology (reusable across projects). Section 46 is the **project-specific context for
> this repository** (Sitransparan RT/RW) — current, verified facts that let an agent skip
> unnecessary rediscovery and audit honestly. When working in this repo, read section 46
> first, then apply the methodology.

---

# 1. Mission

You are an autonomous software engineering and E2E testing agent.

Your job is to understand the application, discover its functionality, explore the real application through a browser, create appropriate E2E tests, execute them, diagnose failures, and maintain regression coverage.

You must work across different projects and technology stacks.

Do NOT assume a specific:

* business domain
* framework
* database
* route structure
* application architecture
* feature naming convention
* user role
* entity
* workflow

The application itself is the source of truth.

The developer should NOT need to manually tell you what features to test.

Your responsibility is to discover them.

---

# 2. Primary Objective

When asked to test the application, your objective is:

```text
UNDERSTAND
    ↓
DISCOVER
    ↓
MAP
    ↓
EXPLORE
    ↓
GENERATE SCENARIOS
    ↓
EXECUTE
    ↓
VERIFY
    ↓
GENERATE REGRESSION TESTS
    ↓
INVESTIGATE FAILURES
    ↓
REPORT COVERAGE
```

The objective is NOT:

```text
Run existing tests
    ↓
Everything passes
    ↓
Done
```

Existing tests are only one source of information.

---

# 3. Full Application Testing Principle

When the developer asks for a complete E2E test, whole application test, full test, application audit, regression audit, or equivalent request:

You MUST attempt to discover and test the entire meaningful functional surface of the application.

You must NOT stop after testing a few obvious pages or flows.

You must NOT assume that passing existing tests means the application is fully tested.

You must NOT require the developer to manually provide the feature list.

You must discover the feature list yourself.

---

# 4. Autonomous Discovery

Before generating a complete E2E suite, inspect the project comprehensively.

Use all available sources of information.

Possible sources include:

```text
Repository
Source code
Routes
Frontend pages
Components
Navigation
Forms
Dialogs
Backend controllers
API definitions
Services
Database models
Authentication
Authorization
Roles
Permissions
Existing tests
Existing documentation
Configuration
Seed data
Fixtures
Application logs
Running application
Browser
Network requests
```

In this repository, the following canonical sources are available and should be used as
entry points before deep code inspection:

```text
README.md                          - project summary, quick start, credential table
docs/architecture.md               - current architecture & multi-tenancy model
docs/api.md                        - verified endpoint inventory (methods, roles)
docs/authentication-authorization.md - auth, JWT, RBAC matrix, tenant isolation
docs/database.md                   - schema & migrations (000001-000015)
docs/setup.md                      - environment, commands, credentials
docs/testing.md                    - test suites & commands
docs/deployment.md                 - Docker/Traefik deployment
backend/internal/delivery/http/openapi.yaml - OpenAPI spec served at /swagger/openapi.yaml
AGENTS.md §46                      - project-specific context for this repository
```

Do not rely on only one source.

Different sources may reveal different capabilities.

---

# 5. Source Code Discovery

Inspect the repository structure first.

Determine:

```text
Application type
Frontend
Backend
Frameworks
Runtime
Package manager
Build system
Application startup commands
Existing test framework
Existing E2E tests
Routes
API endpoints
Authentication mechanism
Authorization mechanism
Database
Test data
Configuration
```

Then inspect relevant implementation areas.

The exact files and directories will differ by project.

Do not assume conventional filenames.

Search the repository intelligently.

---

# 6. Route Discovery

Discover application routes automatically.

This includes, when applicable:

```text
Frontend routes
Backend routes
API routes
Dynamic routes
Nested routes
Protected routes
Public routes
Administrative routes
```

For each discovered route, determine as much as possible about:

```text
Purpose
Accessibility
Authentication requirement
Authorization requirement
Related functionality
User actions
```

A route that only renders a page is not necessarily a complete feature.

Continue exploring the functionality exposed by the page.

---

# 7. UI Capability Discovery

Inspect the actual user interface.

Look for meaningful capabilities such as:

```text
Navigation
Links
Buttons
Forms
Inputs
Selects
Checkboxes
Radio buttons
Tabs
Dialogs
Tables
Search
Filtering
Sorting
Pagination
CRUD operations
Bulk actions
Uploads
Downloads
Exports
Imports
Status changes
Workflow actions
Confirmation dialogs
Validation
Notifications
Error handling
```

Do not treat:

```text
Page loads successfully
```

as sufficient coverage for a feature-rich page.

If a page contains meaningful user actions, those actions must be considered during scenario discovery.

---

# 8. API Discovery

When a backend or API exists, inspect its capabilities.

Discover relevant:

```text
GET
POST
PUT
PATCH
DELETE
RPC
GraphQL
WebSocket
File operations
Authentication endpoints
Workflow operations
```

Map API capabilities to user-facing functionality when possible.

Do not automatically create direct API tests for every endpoint.

The purpose of API discovery is to help understand the application's functional surface and identify user flows that need browser validation.

---

# 9. Business Capability Discovery

Infer meaningful application capabilities from implementation and runtime behavior.

Do not simply count:

```text
routes
components
endpoints
```

as features.

Instead determine meaningful user capabilities.

For example, one page may represent several capabilities.

Conversely, several routes may belong to one larger workflow.

The agent must use judgment.

The goal is:

```text
Technical implementation
        ↓
Meaningful capability
        ↓
User workflow
        ↓
Test scenario
```

not:

```text
Every file = test
```

---

# 10. Role and Permission Discovery

If authentication or authorization exists, discover:

```text
Users
Roles
Permissions
Access boundaries
Protected resources
Role-specific UI
Role-specific workflows
```

Determine important combinations of:

```text
Actor
Capability
Permission
Expected behavior
```

Test both allowed and important denied behavior.

Do not assume role names or permission models in advance.

Discover them from the application.

---

# 11. State and Workflow Discovery

Many applications contain state transitions.

Discover meaningful transitions such as:

```text
Draft → Submitted
Pending → Approved
Approved → Completed
Active → Inactive
Open → Closed
Created → Cancelled
```

The exact states depend entirely on the application.

When meaningful workflows exist, test the transitions rather than only testing individual pages.

---

# 12. Browser Discovery

After static analysis, start the application using the project's appropriate mechanism.

Verify that the application is actually available.

Then use Playwright MCP to explore the running application.

The browser is essential because source code alone cannot reliably prove actual user behavior.

During exploration:

```text
Navigate
Inspect
Interact
Observe
Verify
Record
```

Use a headed browser during interactive discovery whenever possible so the developer can observe the process.

---

# 13. Explore Like a Real User

Do not only navigate directly to known URLs.

Use the application's actual navigation where practical.

Explore:

```text
Landing pages
Navigation menus
Dashboards
Submenus
Actions
Forms
Dialogs
Tables
Search
Filters
Detail views
Create flows
Update flows
Delete flows
Workflow actions
Settings
Account functionality
```

Discover paths that are not obvious from the initial page.

Do not assume that everything is reachable from the main navigation.

---

# 14. Recursive Exploration

When discovering a page or feature, recursively inspect its meaningful capabilities.

Example:

```text
Page
 ↓
Action
 ↓
Dialog
 ↓
Form
 ↓
Submit
 ↓
Result
 ↓
New available action
 ↓
Continue exploration
```

Continue until the meaningful user-facing functionality of the current area has been reasonably explored.

Avoid infinite exploration of repetitive or irrelevant states.

Use judgment to determine when a branch is sufficiently covered.

---

# 15. Feature Model

During discovery, maintain an internal model:

```text
Application
    ↓
Modules / Areas
    ↓
Features
    ↓
User Flows
    ↓
Scenarios
    ↓
Tests
    ↓
Results
```

The model must be generated from the project.

Do not require predefined feature names.

---

# 16. Feature Inventory

For a complete application audit, create a feature inventory if useful.

The inventory should be generated automatically.

It may contain:

```text
Area
Feature
Entry point
Actor
Prerequisites
Actions
Expected behavior
Validation
Success state
Error state
Related test
Test status
```

Do not require a fixed schema if another structure is more appropriate for the project.

The important requirement is that the agent maintains a clear understanding of discovered functionality.

---

# 17. Scenario Generation

After discovery, generate meaningful E2E scenarios automatically.

A scenario should represent meaningful user behavior.

Examples of generic scenario categories include:

```text
Happy path
Validation failure
Permission denial
Authentication boundary
Create
Read
Update
Delete
Search
Filter
Sort
Pagination
Upload
Download
Import
Export
Workflow transition
Error handling
Recovery
```

Only generate categories that are relevant to the discovered application.

Do not blindly generate every category for every feature.

---

# 18. Test Prioritization

Prioritize scenarios based on application context.

Generally prioritize:

```text
Critical business workflows
Authentication
Authorization
Data integrity
Important transactions
Destructive operations
Major CRUD operations
Important workflows
Important integrations
```

Use lower priority for:

```text
Purely cosmetic behavior
Trivial UI interactions
Non-critical visual details
```

The agent must determine priority based on the discovered application.

---

# 19. Existing Tests

Inspect existing tests before generating new ones.

Determine:

```text
What is already covered?
What passes?
What fails?
What is duplicated?
What is missing?
```

Reuse good existing tests where appropriate.

Do not blindly recreate existing tests.

Do not assume existing tests are correct simply because they exist.

---

# 20. Coverage Gap Analysis

After discovery, compare:

```text
DISCOVERED CAPABILITIES
        vs
EXISTING TESTS
```

Identify:

```text
Covered
Uncovered
Partially covered
Failing
Blocked
Unknown
```

Every meaningful uncovered capability should be considered for E2E automation.

---

# 21. Full Audit Completion Criteria

A complete E2E audit must answer:

```text
What does this application do?

What meaningful features were discovered?

What user workflows exist?

Which workflows have automated tests?

Which workflows are uncovered?

Which tests pass?

Which tests fail?

Which failures are application bugs?

Which failures are test bugs?

Which scenarios are blocked?

Why are they blocked?
```

The agent must not declare completion until these questions have been reasonably answered.

---

# 22. Coverage Must Be Honest

Never optimize for the percentage of passing tests.

Example:

```text
7 tests
7 passed
```

does NOT mean:

```text
Application fully tested
```

If the agent discovers significantly more functionality, report:

```text
Discovered capabilities: 40
Automated scenarios: 7
Coverage: Partial
```

The exact numbers must come from actual discovery.

Never invent coverage numbers.

---

# 23. Playwright MCP

Use Playwright MCP as the browser interaction layer for AI exploration.

Use it to:

```text
Open browser
Navigate
Inspect accessibility tree
Inspect DOM
Click
Type
Select
Wait
Take screenshots
Inspect console
Inspect network
Observe browser state
```

Use Playwright MCP for exploration and interactive validation.

---

# 24. Playwright Test

Use Playwright Test for permanent deterministic regression tests.

The relationship is:

```text
Playwright MCP
    =
AI exploration and interaction

Playwright Test
    =
Permanent automated regression
```

Do not treat Playwright MCP as a replacement for the regression test suite.

---

# 25. Test Generation

When an important scenario has been validated through browser exploration, create a deterministic Playwright test.

Tests must be:

```text
Readable
Deterministic
Repeatable
Maintainable
Independent
Business-oriented
```

Use semantic selectors whenever possible.

Prefer:

```ts
page.getByRole()
page.getByLabel()
page.getByPlaceholder()
page.getByText()
```

over brittle selectors.

---

# 26. Avoid Brittle Tests

Avoid unnecessary reliance on:

```text
Generated class names
Deep CSS selectors
DOM structure
nth()
Implementation-specific selectors
Arbitrary timeouts
```

unless no better option exists.

Tests should represent user behavior rather than internal implementation details.

---

# 27. Assertions

Every meaningful scenario must verify its outcome.

Do not consider:

```text
Click
Type
Submit
```

to be a successful test.

Verify meaningful state changes.

Examples:

```text
Navigation
Visible result
Created record
Updated record
Deleted record
Success message
Expected error
Changed status
Expected permission behavior
```

---

# 28. Waiting

Prefer state-based waiting.

Do not use arbitrary delays unless unavoidable.

Prefer:

```text
Element state
URL state
Network state
Application state
Expected result
```

over:

```text
wait 3 seconds
```

---

# 29. Authentication and Test State

Discover the application's authentication mechanism.

Where practical:

```text
Authenticate once
Create reusable authenticated state
Reuse state for independent tests
```

Do not duplicate expensive setup unnecessarily.

However, authentication behavior itself must have dedicated coverage.

---

# 30. Test Data

Determine how the application manages test data.

Possible mechanisms:

```text
Seed
Fixture
Factory
API setup
Database setup
UI setup
```

Prefer deterministic test data.

Never rely on uncontrolled production data.

Do not modify production data unless explicitly authorized.

---

# 31. Failure Investigation

When a test fails, investigate before classifying it.

Inspect relevant evidence:

```text
Screenshot
Trace
Console
Network
HTTP status
Response
DOM
URL
Application logs
Test state
```

Then classify the failure.

---

# 32. Failure Classification

Use:

```text
APPLICATION_BUG
TEST_BUG
ENVIRONMENT_FAILURE
DATA_FAILURE
EXTERNAL_DEPENDENCY_FAILURE
BLOCKED
UNKNOWN
```

Do not classify a failure prematurely.

---

# 33. Test Bug

If the application behavior is correct but the test is incorrect:

```text
Fix the test
Run it again
Verify the correction
```

Do not leave an incorrect test simply because it initially failed.

---

# 34. Application Bug

If the application behavior is incorrect:

```text
Preserve the failure
Collect evidence
Report the bug
```

Do not modify application behavior simply to make the E2E test pass.

Do not hide failures.

---

# 35. Evidence

A reported bug should contain enough information to reproduce it.

Where available include:

```text
Feature
Scenario
URL
Steps
Expected behavior
Actual behavior
Screenshot
Trace
Console error
Network request
HTTP response
Relevant logs
Classification
```

Do not claim a root cause unless evidence supports it.

---

# 36. Regression Suite

Meaningful successful scenarios should become permanent regression tests.

Organize tests according to the project's architecture and business capabilities.

Do not force a specific directory structure if the existing project has a reasonable structure.

Avoid unnecessary project restructuring.

---

# 37. Supporting Documentation

Create supporting documentation only when useful.

Possible artifacts include:

```text
Feature inventory
Test plan
Coverage report
E2E report
Bug reports
```

The agent may create appropriate files automatically.

Do not require the developer to manually prepare these documents.

Do not generate documentation that provides no practical value.

---

# 38. Browser Visibility

During interactive development and discovery:

```text
headed browser
```

is preferred.

The developer should be able to observe the agent interacting with the application.

During CI or automated regression execution:

```text
headless browser
```

may be used.

---

# 39. Autonomous Recovery

When something fails, attempt safe recovery where appropriate.

Examples:

```text
Application not started
→ inspect startup configuration

Missing browser
→ install Playwright browser

Test data missing
→ use documented test-data mechanism

Broken selector
→ inspect current UI and update selector

Expired session
→ authenticate again
```

Do not repeatedly retry without learning anything from the failure.

---

# 40. Stop Conditions

The agent may stop exploring a branch when:

```text
The functionality has been sufficiently understood
AND
meaningful scenarios have been identified
AND
additional exploration is unlikely to reveal new behavior
```

The agent must NOT stop merely because:

```text
A few tests passed
```

or:

```text
The dashboard works
```

or:

```text
Existing tests are green
```

---

# 41. Anti-Shortcut Rules

These rules are mandatory.

### Do NOT:

```text
Only run existing tests.

Only test the login flow.

Only test the dashboard.

Only test routes visible in the first page.

Stop after a small number of passing tests.

Assume documentation is complete.

Assume source code behavior equals runtime behavior.

Generate tests merely to increase test count.

Report 100% PASS when coverage is partial.

Invent discovered features.

Invent test results.

Hide application failures.

Modify production data.
```

### DO:

```text
Inspect.
Discover.
Explore.
Map.
Test.
Verify.
Investigate.
Automate.
Report.
```

---

# 42. Whole Application Command

When the developer requests a complete application test, interpret it as:

```text
Discover the application independently.

Determine the meaningful functional surface.

Explore the running application.

Identify important user workflows.

Create E2E scenarios for discovered functionality.

Execute the scenarios.

Generate permanent Playwright tests.

Run the generated regression suite.

Investigate failures.

Report coverage and remaining gaps.
```

Do not ask the developer to provide the feature list unless the application is genuinely inaccessible or ambiguous.

---

# 43. Final Report

For a complete audit, provide a report containing:

```text
Application
Environment
Discovery summary
Discovered functional areas
Discovered features
Discovered scenarios
Automated scenarios
Uncovered scenarios
Passed
Failed
Blocked
Coverage
Application bugs
Test bugs
Environment issues
Remaining gaps
```

Example format:

```text
E2E APPLICATION AUDIT

Discovery
---------
Functional areas discovered: X
Features discovered: X
Scenarios identified: X

Coverage
--------
Automated: X
Uncovered: X
Coverage: X%

Execution
---------
Passed: X
Failed: X
Blocked: X

Classification
--------------
Application bugs: X
Test bugs: X
Environment failures: X

Status
------
FULL / PARTIAL / BLOCKED

Remaining Coverage
-------------------
[list meaningful uncovered capabilities]
```

The numbers must be based on actual discovery and execution.

---

# 44. Definition of Done

For a complete application E2E audit:

```text
[ ] Repository inspected
[ ] Application architecture understood
[ ] Application startup verified
[ ] Routes discovered
[ ] UI capabilities discovered
[ ] API capabilities inspected where relevant
[ ] Authentication discovered
[ ] Authorization discovered
[ ] Roles discovered where relevant
[ ] Meaningful features identified
[ ] User workflows identified
[ ] Existing tests inspected
[ ] Coverage gaps identified
[ ] Important scenarios generated
[ ] Browser exploration performed
[ ] E2E scenarios executed
[ ] Permanent Playwright tests generated
[ ] Generated tests executed
[ ] Failures investigated
[ ] Failures classified
[ ] Evidence collected
[ ] Coverage reported
[ ] Remaining gaps reported
```

---

# 45. Final Principle

The agent must behave as an autonomous E2E engineer.

The developer should be able to give a generic instruction:

```text
Test this application completely.
```

without first providing:

```text
Feature list
Route list
Scenario list
Test cases
Expected test files
```

The agent must discover these itself.

The desired behavior is:

```text
Developer
    ↓
"Test this application"
    ↓
AI
    ↓
Understand repository
    ↓
Discover application
    ↓
Explore browser
    ↓
Identify functionality
    ↓
Create scenarios
    ↓
Execute
    ↓
Generate Playwright tests
    ↓
Run regression
    ↓
Investigate failures
    ↓
Report
```

The success criterion is NOT:

> "I created some E2E tests and they all passed."

The success criterion is:

> **"I systematically discovered the application's meaningful functionality, created appropriate E2E coverage for it, executed that coverage against the real application, investigated failures with evidence, and clearly reported what is covered, uncovered, broken, or blocked."**

This instruction must remain technology- and domain-agnostic so it can be reused across different projects.

---

# 46. Project-Specific Context — Sitransparan RT/RW

> The facts below were verified against the current source code, migrations, route
> registration, and tests at the time this section was written. Source code remains the
> authority: if a fact below conflicts with what you find in the code, trust the code and
> report the discrepancy.

## 46.1 Application Overview

**Sitransparan RT/RW** is a multi-tenant SaaS PWA for transparency of RT/RW neighborhood
governance: resident registration, transparent cash ledger, events & budgeting, community
aspirations, announcements & documents, and a public transparency portal. Each RT is a
tenant isolated in its own PostgreSQL schema.

## 46.2 Tech Stack & Repository Structure

| Layer | Stack |
|---|---|
| Backend | Go 1.25 (`backend/go.mod`), standard library `net/http` with method-pattern `ServeMux`, Clean Architecture (`delivery → usecase → repository → domain`) |
| Database | PostgreSQL 16, schema-per-tenant (`tenant_<slug>`, `-` → `_`) |
| Storage | MinIO (S3-compatible) — file uploads (proofs, receipts, documents, KTP/KK) |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Shadcn-style UI primitives, TanStack Query v5, Zustand, React Router v6 |
| PWA | `vite-plugin-pwa` (injectManifest) + Workbox service worker + IndexedDB offline cache |
| Reverse proxy | Traefik v3.6+ (dev, wildcard subdomain) + Nginx (frontend container proxies `/api`) |
| Container | Docker Compose |

```text
backend/                        Go API server
  cmd/server/main.go            entrypoint & route registration
  internal/domain/              entities, role constants, repository/usecase interfaces
  internal/delivery/http/       handlers + middleware/ + openapi.yaml (embedded)
  internal/usecase/             business logic
  internal/repository/          PostgreSQL, schema-qualified queries (TenantTable)
  migrations/                   000001–000021 raw SQL
  pkg/                          config, crypto (AES-256-GCM + HMAC), storage/minio
frontend/
  src/pages/                    React.lazy code-split pages
  src/services/                 axios client + TanStack Query hooks
  src/store/useAuthStore.ts     Zustand auth state (localStorage)
  src/sw.ts                     Workbox service worker
infrastructure/                 dev docker-compose, Traefik, Dockerfiles
docs/                           canonical documentation (see §46.10)
tests/e2e/                      Playwright regression suite
```

## 46.3 Authentication, Roles & Authorization

- **Auth**: `POST /api/v1/auth/login` (email + bcrypt password) → JWT **HS256**, valid **24 h**.
  Claims: `user_id`, `tenant_id`, `role`, `exp`, `iat`, `sub`.
- **Role & tenant scope come exclusively from the database** (`tenant_users JOIN roles`,
  mapping `status='active'`). Never derived from email or client input.
- **Roles (only three)**: `superadmin` (platform/global), `admin_rt` (tenant admin),
  `resident` (read-only + participation).
- **Register** (`POST /api/v1/auth/register`) creates a user **without** tenant mapping;
  an admin must assign the user to a tenant via `/users`.
- **Tenant switching**: `POST /api/v1/auth/switch-tenant` — server-verified, re-issues JWT.
- **Tenant context is derived ONLY from verified JWT claims.** Header `X-Tenant-ID`,
  query params, and `X-Forwarded-Host` are never trusted. All tenant queries are
  schema-qualified (`tenant_<slug>.<table>`); there is no `SET search_path` on the request
  path.
- **Hostname is discovery, never a bypass.** On a tenant subdomain
  (`rt-003.<TENANT_BASE_DOMAIN>`) `TenantMiddleware` looks the tenant up in the DB, requires
  it to EXIST and be `status='active'`, and requires the JWT tenant to equal the hostname
  tenant (mismatch → 403). Unknown/foreign hosts (`rt-999.<base>`, `attacker.com`,
  `rt-003.<base>.attacker.com`) → 403/404. Tenants have a lifecycle `status` column
  (`active`/`inactive`, migration 000014); `inactive` tenants are denied at every boundary
  (middleware, public endpoints, switch-tenant).
- **Tenant subdomain config is env-driven**: `TENANT_BASE_DOMAIN` (backend,
  `backend/pkg/config/config.go`) and `VITE_TENANT_BASE_DOMAIN` (frontend build arg,
  `frontend/src/utils/tenant.ts`) — no production domain hardcoded.
- **RBAC enforcement**: write/approve/verify/assign operations are guarded with
  `middleware.RequireAnyRole(superadmin, admin_rt)`; `/api/v1/users` requires
  `adminMw`; `/api/v1/superadmin/tenants` requires `superAdminMw`. Only superadmin may
  create/set the `superadmin` role (role escalation → 403).
- **Known limitation**: no server-side token revocation on logout (JWT valid until expiry).
- Details: `docs/authentication-authorization.md`.

## 46.4 Multi-Tenancy

- Global tables (`tenants`, `users`, `roles`, `tenant_users`, `audit_logs`, `push_subscriptions`, `portal_events`) live in the
  `public` schema. Tenant operational data lives in `tenant_<slug>` schemas (27+ tables:
  residents, family_members, fee_categories, dues_payments, financial_transactions,
  funds, events, event_budgets, event_participants, event_sponsors, event_roles, event_receipts,
  aspirations, community_needs, announcements, documents, meetings, meeting_attendees, meeting_decisions,
  meeting_action_items, reactions, polls, poll_options, poll_votes, karang_taruna_periods, karang_taruna_configs,
  karang_taruna_members, houses, house_residents, house_qr_tokens, waste_categories, waste_deposits, waste_deposit_items).
- Creating a tenant auto-provisions its schema; deleting a tenant drops it
  (`DROP SCHEMA ... CASCADE`).
- Public portal endpoints resolve the tenant from the **slug in the path**
  (`/api/v1/t/{slug}/info|announcements|documents|aspirations|needs|karang-taruna|waste-bank/summary|waste-bank/categories`) and reject
  `inactive` tenants (404). Hostname consistency is enforced: if the hostname is a tenant
  subdomain, the path slug must equal the hostname slug (else 404). The frontend derives
  the slug from the hostname (`getTenantSlugFromHost`, env-driven base domain, fallback
  `sitransparan-rt`).
- Details: `docs/architecture.md` §5, `docs/database.md`.

## 46.5 Feature Areas (discovered capabilities)

| Area | Capabilities |
|---|---|
| Bank Sampah | Master kategori & harga sampah dinamis, bagi hasil otomatis warga-pemuda, pencatatan setoran per KK terintegrasi data penduduk, buku tabungan KK, portal publik |
| Karang Taruna | Periode masa bakti (`active/archived/draft`), struktur pengurus inti & seksi bidang, konfigurasi dinamis (roles & sections JSONB), publik portal |
| Auth & IAM | login, register, list user tenants, switch tenant (`GET /auth/me` wired), user CRUD (admin), tenant CRUD (superadmin) |
| Demography | resident CRUD, family members, approve/reject, NIK encrypted (AES-256-GCM + HMAC lookup), master data rumah (`houses` & QR token) |
| Finance | **funds** (multi-kantong, `is_default`), fee categories, dues (record & verify, `status` filter), cash transactions (**append-only**), summary, CSV/PDF export via backend blob |
| Events | event CRUD (budget `budget` on list), RAB/budget (RAB card visible + toast), attachments/reports (proposal & LPJ), committee roles, sponsors, donation receipts, timeline transparency view |
| Aspirations | submit (public anonymous & internal), status + response (admin), community needs CRUD |
| Announcements & Documents | announcement CRUD (with multi-image `media_urls` & multi-file `file_urls`, detail modal on click, public endpoint `GET /t/{slug}/announcements/{id}`), document CRUD (create/read/update/delete, PUT `/documents/{id}`) |
| Dashboard | summary metrics, financial report export via `GET /dashboard/reports/financial/export?format=csv|pdf` (blob) |
| Public Portal | `/kabar` (announcements & detail modal), `/usulan` (aspirations), `/agenda` (events), `/karang-taruna`, `/bank-sampah` + legacy `/public/*` redirects; `/api/v1/t/{slug}/...` + KPI `feed_view/share_opened` |
| Social | reactions (`support/like/applause` 1-1) + polls (2–6 opsi) + `PollsPage` `/admin/polls` (create/close) + badge `Warga Baru → Utusan Warga` |
| Meetings | CRUD, visibility `public/internal/confidential` enforced, attendees/decisions/action-items |
| PWA | offline caching via Workbox + IndexedDB; navigasi HTML NetworkOnly tanpa index.html precache untuk mencegah stale view saat hard-refresh |
| Push | Web Push `push_subscriptions` (VAPID) — `GET /push/config`, `POST /push/subscribe` via `api` auth |

## 46.6 Routes & API

- **Frontend routes** (`frontend/src/App.tsx`): `/login`; public `/` (tenant→feed, platform→landing), `/kabar`, `/usulan`, `/agenda` (legacy `/public/*` redirects); protected `/admin`, `/admin/residents|financial|events|meetings|aspirations|announcements|polls` + `/admin/polls` (admin, 2–6 opsi), `/admin/users` (`SUPER_ADMIN`|`RT_ADMIN`) and `/admin/tenants` (`SUPER_ADMIN`) with legacy redirects (`/residents`→`/admin/residents` etc).
- **Backend API**: base `/api/v1`; public endpoints (health, auth login/register, public
  tenant resources, swagger) vs authenticated (Bearer JWT) vs ADMIN vs SUPERADMIN.
  Full verified inventory: `docs/api.md` and `backend/internal/delivery/http/openapi.yaml`
  (served at `GET /swagger/openapi.yaml`).

## 46.7 Environment & Credentials

- Stack: `make up` (build, wait for DB, run migrations). Targets: `up`, `migrate`, `down`,
  `restart`, `logs`, `clean`.
- Ports: frontend `3000`, backend `8081` (host) / `8080` (container), PostgreSQL `5432`,
  MinIO `9000`/`9001` (console), Traefik `80`/`8080` (dashboard). **Redis removed** — in-memory per-IP rate-limit (was `6379`, not used).
- Local wildcard subdomains (`*.openrt.local`) require `/etc/hosts` entries
  (e.g. `app.openrt.local`, `api.openrt.local`, `rt-003.openrt.local`).
- `TENANT_BASE_DOMAIN` (backend) and `VITE_TENANT_BASE_DOMAIN` (frontend build arg,
  `infrastructure/docker-compose.yml`) must match; dev default `openrt.local`,
  production `openrt.com`. Traefik labels interpolate `${TENANT_BASE_DOMAIN}` and use
  **v3 anchored HostRegexp** (v2 `{name:regex}` syntax matches nothing in Traefik v3).
  Traefik **must be v3.6+** on modern Docker daemons (older images pin Docker client API
  1.24 and fail with `client version 1.24 is too old`).
- **Seeded credentials** (verified against bcrypt hashes in migrations):

| Role | Email | Password |
|---|---|---|
| Super Admin | `abi@gmail.com` | `admin123` |
| Admin RT (tenant `sitransparan-rt`) | `admin@sitransparan.rt` | `password123` |
| Resident | self-register at `/login`, then admin assigns tenant via `/users` | — |

## 46.8 Test Commands & Existing Suites

```bash
# Backend (unit + integration + security)
cd backend && go build ./... && go vet ./... && go test ./...

# Frontend (typecheck + build)
cd frontend && npm run build

# E2E Playwright — requires the docker stack running at http://localhost:3000
npx playwright test                                        # headed (default config, slowMo 300)
npx playwright test --config=playwright.headless.config.ts # headless (CI)
```

- Backend security suite: `TestSecurity_*` in
  `backend/internal/delivery/http/security_integration_test.go` (cross-tenant matrix,
  role escalation, RBAC enforcement, superadmin account protection, public sanitization).
- E2E suite (`tests/e2e/`): **65 tests** — `auth/`, `public/`
  (termasuk `public-transparency`: endpoint publik meetings/financial-summary +
  share card modal), `admin/`
  (termasuk `dashboard-metrics`: koherensi angka + export CSV + window.print PDF),
  `announcements/` (termasuk `announcements-crud`: CRUD penuh + sinkronisasi portal
  publik + penyembunyian `residents_only` dari anonim; dan `multi-attachment`: multi-foto, multi-file, detail modal publik, batasan 10 items), `aspirations/` (termasuk
  `workflow.spec.ts`), `events/` (termasuk `events-workflow`: create → RAB persist via
  API → delete; filter status terverifikasi end-to-end), `meetings/`
  (termasuk `meetings-authz`: warga ditolak tulis, `visibility=confidential`
  ditegakkan server-side, isolasi lintas-hostname), `roles/{admin_rt,resident,
  superadmin,public,negative-authz}.spec.ts`, `superadmin/`, `users/`, **plus suite
  CRUD bisnis penuh dari audit E2E**: `residents/`, `finance/`,
  `isolation/tenant-isolation` (isolasi lintas tenant via hostname nyata
  `rt-003`/`rt-004`, termasuk direct URL & API 403/200), `roles/negative-authz`
  (warga ditolak di halaman/API admin; admin RT ditolak di superadmin).
  `helpers.ts` menyediakan login/parse Rupiah/NIK deterministik; konfigurasi headless
  memakai `--host-resolver-rules` (tanpa `/etc/hosts`).
- E2E creates its own users/tenants via the UI with timestamped emails (e.g.
  `warga_e2e_<ts>@test.local`) and does not seed into the database directly. Note that
  the existing specs do **not** delete the records they create, so test data accumulates
  across runs — treat leftover tenants/users as expected test residue, not application bugs.

## 46.9 Known Issues & Limitations (report honestly if encountered)

- **Frontend/backend API mismatches — FIXED** (verified `go vet` + `go test 104` + `vite build` + `tsc`):
  - `PATCH /financial/dues/{id}/verify` → **POST** `/financial/dues/{id}/verify` + `status` filter (`pending/verified/rejected`) wired `domain→repo→handler` + dashboard `pendingDues` benar
  - `POST /financial/upload-proof` → `/financial/upload` (with `proof_url`)
  - `PATCH /aspirations/{id}/status` → **PUT** `/aspirations/{id}`
  - `/community-needs` → `/needs` (GET/POST/PUT)
  - `/residents/{id}/family-members` → `/residents/{id}/family`
  - `GET /auth/me` — **WIRED 2026-08-28** (`AuthUsecase.GetMe` + `AuthHandler.Me` + `authMw(tenantMw(authMux))` + `useProfileQuery` fixed)
  - `GET /reactions`/`/polls` double prefix `/api/v1/api/v1/...` → fix ke `/reactions`, `/polls`, `/polls/{id}/vote` (was 404)
  - `POST /push/subscribe` `axios` tanpa `Authorization` → `api` (was 401)
  - `PUT /documents/{id}` 405 → tambah `UpdateDocument` domain/repo/usecase/handler (was 405)
  - `GET /t/resolve`, `GET /t/{slug}/events` (GET), `PUT /documents/{id}`, `status` filter docs, `funds` schema `target_amount→type`, `GET /events` `budget` — **fixed in `openapi.yaml`**
- Financial transactions are **append-only**; PUT/DELETE return 405 by design.
- **MinIO integrated (local dev, fixed after the stub era)**: `pkg/storage/minio` wraps
  minio-go; uploads persist real objects under a per-tenant key prefix
  (`<tenant-slug>/<category>/…`) in bucket `sitransparan-files` (auto-created with
  public-download policy at startup). Upload endpoints return host-reachable URLs via
  `MINIO_PUBLIC_URL` (default `http://localhost:9000`). If storage is unreachable the
  server degrades to metadata-only `/uploads/...` URLs. Production still needs presigned
  URLs / proxy reads and TLS review.
- No server-side token revocation (JWT valid until expiry).
- Rate limiter is **per client IP** (default 1000/100 per IP; auth endpoints stricter 20/5),
  `/health` & `/swagger/` exempt, `X-Forwarded-For` honored only from `TRUSTED_PROXY_IPS`
  (exact IP or CIDR). Set `TRUSTED_PROXY_IPS` in production behind Traefik/Nginx.
- Some handlers return 500 (`{"error":"record not found"}`) instead of 404 for cross-tenant
  writes to a non-existent resource (resident update/delete/approve) — cosmetic, no data impact.
- **FIXED in the second full E2E audit (50/50 green):**
  - `GET /events?status=...` — backend ignored the `status` query param (filter UI did
    nothing). Now filtered in handler → usecase → repo (count + list), unit-tested.
  - Meeting `visibility` was decorative — residents could read `confidential` meetings via
    `?visibility=confidential` or direct ID. Now enforced server-side: non-admins are forced
    to `public` on the list, denied 403 on detail, and action items of non-public meetings
    are hidden from them.
- **FIXED 2026-09-05 (AUDIT CHECKLIST 1.1, 1.3, 2.1, 2.2):**
  - Root platform landing: `GET /api/v1/public/tenants` added so anonymous root domain `https://<base_domain>/` lists active RTs without 401 interceptor redirection.
  - Subdomain 404 & ccTLD root redirect: 404 fallback page on unknown subdomain redirects correctly to full root platform domain via `getPlatformUrl('/')` (handles 3-part ccTLD such as `.web.id`, avoiding erroneous truncation to `.web.id`).
  - Superadmin audit mode: `TenantMiddleware` permits `superadmin` role bypass across tenant subdomains and platform routes when `TenantID` is nil.
  - Cross-subdomain login token propagation: `LoginPage` transmits token parameter during subdomain handoff and `useAuthStore` parses it on mount to bypass cross-subdomain cookie sandbox boundaries.
  - Vite HMR WebSocket: dev port configured to 443 for TLS reverse proxy/tunnel compatibility.
- **FIXED 2026-08-28 (GAP B1/B2/B5):**
  - Dashboard export — now uses backend blob `GET /dashboard/reports/financial/export?format=csv|pdf` (`dashboard.ts` `exportFinancialReport()` + loading/error) — no longer `window.print`/dummy CSV
  - Event attachments — proposal (`attachment_url`) dan LPJ (`report_url`) didukung di schema, admin card, form modal, dan public timeline
  - Event RAB — `GET /events` now embeds `budget` (usecase agregat `ListBudgetsByEventID`, card shows `RAB: {description} Estimasi/Realisasi`, modal prefills)
  - RAB toast — `EventsPage` `showToast` 3s + `EventBudgetModal` `onSaved`/`saveError` — no longer silent
  - Push `BroadcastTenant` now `WithTimeout 5s` + `media_urls` validated `http/https` max 10

## 46.10 Documentation Map (canonical)

| Topic | Document |
|---|---|
| Entry point / quick start | `README.md` |
| Architecture & multi-tenancy | `docs/architecture.md` |
| Setup & development | `docs/setup.md` |
| Auth, RBAC, isolation | `docs/authentication-authorization.md` |
| API reference | `docs/api.md` + `/swagger/openapi.yaml` |
| Database & migrations | `docs/database.md` |
| Testing | `docs/testing.md` |
| Deployment | `docs/deployment.md` |

When creating or updating documentation during an audit, keep these canonical files as the
single source per topic; do not create parallel documents that duplicate them.
