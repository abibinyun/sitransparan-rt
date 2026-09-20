# MASTER TASK — COMPLETE ROLE-BASED E2E & BUSINESS USE-CASE COVERAGE

Project: **Sitransparan RT/RW**

## OBJECTIVE

Lakukan audit dan implementasi **comprehensive end-to-end test coverage** untuk seluruh fitur yang saat ini benar-benar tersedia di project.

Tujuan utama:

> **Semua fitur existing harus dapat dibuktikan berjalan melalui real user workflow berdasarkan role, permission, tenant, dan business use case.**

Jangan hanya membuat E2E berdasarkan halaman.

Jangan hanya melakukan smoke test seperti:

```text
login → page loads → PASS
```

Yang dibutuhkan adalah:

```text
Role
 ↓
Login
 ↓
Tenant context
 ↓
Business use case
 ↓
UI interaction
 ↓
API
 ↓
Database
 ↓
Expected state
 ↓
Authorization verification
```

---

# 1. IMPORTANT PRINCIPLE

Gunakan **source code sebagai source of truth**.

Jangan membuat test berdasarkan asumsi atau dokumentasi lama.

Audit terlebih dahulu:

```text
Backend
Frontend
Routes
API
Handlers
Usecases
Repositories
Database models
Migrations
RBAC
Permissions
Tenant middleware
Forms
Actions
```

Dari sana buat **feature/use-case inventory aktual**.

Jika fitur memang sudah ada di code tetapi belum memiliki E2E:

> buat E2E.

Jika UI mengklaim fitur tersedia tetapi backend belum mendukung:

> report sebagai implementation gap.

Jika test harus melewati bug production-like:

> fix bug tersebut lalu tambahkan regression test.

---

# 2. BUILD FEATURE INVENTORY

Sebelum menulis E2E, inventaris semua fitur.

Minimal kelompokkan:

```text
Authentication
Tenant Management
User Management
Role & Permission
Resident Management
Family/Household Management
Announcements
Aspiration
Events
Finance
Payments
Reports
Dashboard
Profile
Notifications
Documents/Files
Settings
Tenant Switching
Superadmin
Admin
Resident/User
```

Gunakan nama sebenarnya dari project.

Jangan mengarang fitur yang tidak ada.

Untuk setiap feature:

```text
Feature
Route
API
Role
Permission
CRUD/action
Expected business result
Current E2E coverage
```

---

# 3. ROLE INVENTORY

Identifikasi seluruh role yang benar-benar ada.

Contoh jika memang tersedia:

```text
SUPERADMIN
ADMIN
BENDAHARA
PENGURUS
WARGA
USER
```

Gunakan role aktual dari source code.

Untuk setiap role tentukan:

```text
Can Read
Can Create
Can Update
Can Delete
Can Approve
Can Manage
Can Export
Can Switch Tenant
```

Jangan berasumsi semua role memiliki CRUD yang sama.

---

# 4. PERMISSION MATRIX

Buat matrix:

| Feature   | Role   | List | Detail | Create | Update | Delete | Approve | Other Actions |
| --------- | ------ | ---: | -----: | -----: | -----: | -----: | ------: | ------------- |
| Feature A | Role 1 |    ✓ |      ✓ |      ✓ |      ✓ |      ✗ |       ✗ | ...           |
| Feature A | Role 2 |    ✓ |      ✓ |      ✗ |      ✗ |      ✗ |       ✓ | ...           |

Gunakan authorization implementation aktual.

Matrix ini menjadi sumber test E2E.

---

# 5. TEST STRATEGY

Gunakan **business use case**, bukan hanya endpoint.

Contoh buruk:

```text
POST /api/residents → 200
```

Contoh yang diinginkan:

```text
Admin login
→ open Residents
→ click Add Resident
→ fill form
→ submit
→ resident appears in list
→ open detail
→ verify data
→ edit
→ verify updated data
→ delete
→ verify removed
```

Tetap boleh memiliki API/integration tests.

Tetapi E2E harus membuktikan:

> user dapat menyelesaikan pekerjaan sebenarnya melalui aplikasi.

---

# 6. AUTHENTICATION E2E

Cover minimal:

### Login

```text
valid credentials → success
invalid credentials → error
wrong password → error
unknown user → error
```

### Session

```text
login
→ refresh
→ session remains valid
```

### Logout

```text
login
→ logout
→ protected page denied
```

### Expired/invalid session

Jika feasible:

```text
expired token
→ protected action denied
→ user redirected appropriately
```

---

# 7. TENANT CONTEXT E2E

Minimal gunakan dua real tenants:

```text
Tenant A = rt-003
Tenant B = rt-004
```

Create distinct data in each.

Verify:

```text
login as Tenant A
→ only Tenant A data visible
```

Then:

```text
login as Tenant B
→ only Tenant B data visible
```

Test:

```text
Tenant A user
→ cannot access Tenant B data
```

Test both:

* UI
* direct URL
* API through browser where practical

---

# 8. CRUD COVERAGE

For every entity/resource that supports CRUD:

## CREATE

Test:

```text
open create page
→ fill all required fields
→ submit
→ success notification
→ record appears
→ detail page contains correct data
```

Also test validation:

```text
missing required field
invalid format
duplicate data
invalid relationship
boundary values
```

---

## READ

Test:

```text
list
→ search
→ filter
→ pagination
→ detail
```

Verify actual data.

Do not merely check:

```text
page is visible
```

Check:

```text
expected record exists
expected fields contain expected values
```

---

## UPDATE

Test:

```text
open existing record
→ edit
→ save
→ reload
→ verify persisted data
```

The test must verify persistence, not just toast notification.

---

## DELETE

Test:

```text
open record
→ delete
→ confirm
→ record disappears
→ reload
→ record remains absent
```

If deletion is soft-delete:

> verify actual expected status.

---

# 9. CRUD MUST FOLLOW ROLE PERMISSIONS

Do not test only happy-path admin CRUD.

For every protected operation:

```text
authorized role → ALLOW
unauthorized role → DENY
```

Example:

```text
ADMIN
→ create resident
→ PASS

WARGA
→ create resident
→ DENY

ADMIN
→ delete resident
→ PASS

WARGA
→ delete resident
→ DENY
```

Use actual permission rules.

---

# 10. NEGATIVE AUTHORIZATION TESTS

This is mandatory.

For every important CRUD/action:

```text
allowed role
blocked role
```

must be tested.

Do not rely on frontend hiding buttons.

Test direct navigation:

```text
navigate directly to protected URL
```

and where practical:

```text
attempt protected API operation through browser context
```

Expected:

```text
403 / redirect / appropriate denial
```

according to actual application behavior.

---

# 11. BUSINESS USE CASES

Identify real workflows.

Examples:

## Resident Management

```text
Admin login
→ residents
→ create resident
→ verify
→ edit resident
→ verify
→ search resident
→ filter resident
→ detail
→ delete/deactivate
→ verify
```

## Announcement

```text
Pengurus/Admin
→ create announcement
→ publish
→ verify visible to resident
```

Then:

```text
Resident
→ can read announcement
→ cannot create/edit/delete announcement
```

## Aspiration

If applicable:

```text
Resident
→ create aspiration
→ see own aspiration
→ verify status

Admin/Pengurus
→ view aspiration
→ update/process status
→ verify resident sees updated status
```

## Finance

If applicable:

```text
Bendahara/Admin
→ create transaction
→ verify balance/report
→ edit transaction
→ verify recalculation
→ delete/void if supported
```

Resident:

```text
Resident
→ read allowed financial information
→ cannot modify financial records
```

Use actual workflows from the project.

---

# 12. STATE TRANSITIONS

For entities with status/state, test transitions.

Example:

```text
DRAFT
 ↓
PUBLISHED
 ↓
ARCHIVED
```

or:

```text
PENDING
 ↓
APPROVED
 ↓
REJECTED
```

or whatever exists in the actual system.

Test:

```text
valid transition → PASS
invalid transition → DENY
wrong role → DENY
```

Do not assume status is just a CRUD field if the backend treats it as a workflow.

---

# 13. CROSS-FEATURE WORKFLOWS

This is important.

Features should not only work independently.

Test workflows such as:

```text
Create resident
→ resident appears in dashboard
→ resident can login
→ resident sees announcements
```

If finance affects dashboard:

```text
Create transaction
→ dashboard total changes
→ report changes
```

If aspiration changes status:

```text
Admin updates aspiration
→ resident sees new status
```

Use actual application relationships.

---

# 14. SUPERADMIN E2E

If SUPERADMIN exists:

Test:

```text
login
→ tenant management
→ create tenant
→ edit tenant
→ deactivate tenant
→ reactivate tenant
→ inspect tenant
```

If tenant provisioning is supported:

```text
create Tenant B
→ tenant becomes available
→ Tenant B admin can login
→ Tenant B data isolated
```

Test:

```text
SUPERADMIN
→ cannot accidentally bypass tenant isolation
```

according to actual intended design.

---

# 15. TENANT CRUD

If tenant CRUD exists, test full lifecycle:

```text
Create tenant
 ↓
Set slug
 ↓
Create/admin assign
 ↓
Activate
 ↓
Access tenant hostname
 ↓
Disable
 ↓
Access denied
 ↓
Re-enable
 ↓
Access restored
```

Verify persistence in database through observable application behavior.

---

# 16. FILE / UPLOAD FEATURES

If available:

```text
upload
→ verify uploaded
→ view/download
→ replace/update
→ delete
```

Then test:

```text
Tenant A
→ cannot access Tenant B file
```

Test file validation if applicable:

```text
wrong type
oversized
empty
invalid filename
```

---

# 17. SEARCH / FILTER / PAGINATION

For each major list:

Test:

```text
search exact
search partial
filter
clear filter
pagination
sort
```

Verify actual records.

Also test:

> filtering cannot expose another tenant's data.

---

# 18. FORMS & VALIDATION

Every important form should have E2E validation coverage.

At minimum:

```text
required fields
invalid input
duplicate
boundary
successful submission
server-side validation error
```

Do not test only browser validation.

Backend validation must also be exercised through real UI submission.

---

# 19. ERROR HANDLING

Test realistic failures where feasible:

```text
API 400
API 401
API 403
API 404
API 409
API 500
network failure
```

Verify UI does not silently report success.

Expected behavior:

```text
failed request
→ user sees failure
→ data is not falsely shown as saved
```

---

# 20. DATA INTEGRITY VERIFICATION

Do not trust UI state.

After important mutations:

```text
create
→ reload
→ verify

update
→ reload
→ verify

delete
→ reload
→ verify
```

If appropriate, also verify via API/read-only backend state.

The purpose:

> ensure mutation actually persisted.

---

# 21. E2E TEST DATA STRATEGY

Do not depend on manually existing production-like data.

Create deterministic test fixtures.

Example:

```text
E2E Tenant A
E2E Tenant B
E2E Admin A
E2E Admin B
E2E Resident A
E2E Resident B
```

Use unique identifiers to avoid collisions.

Example:

```text
e2e-${timestamp}
```

or project-appropriate deterministic IDs.

Tests must be repeatable.

---

# 22. TEST ISOLATION

Each E2E test should not depend unnecessarily on another test's execution order.

Prefer:

```text
setup
→ create required data
→ execute workflow
→ cleanup
```

or controlled fixtures.

Avoid:

```text
test #27 only works if test #3 ran first
```

---

# 23. E2E COVERAGE MATRIX

Produce a matrix:

| Feature   | Role     |         Use Case | Create | Read | Update | Delete | Workflow | Negative Auth | E2E |
| --------- | -------- | ---------------: | -----: | ---: | -----: | -----: | -------: | ------------: | --: |
| Residents | Admin    | Manage residents |      ✓ |    ✓ |      ✓ |      ✓ |        ✓ |             ✓ |   ✓ |
| Residents | Resident |   View residents |      — |    ✓ |      — |      — |        ✓ |             ✓ |   ✓ |
| ...       | ...      |              ... |    ... |  ... |    ... |    ... |      ... |           ... | ... |

Use actual project features and roles.

At the end there must be **no unexplained gaps**.

---

# 24. COVERAGE TARGET

Target:

> **100% of user-facing business features currently implemented must have at least one meaningful E2E workflow.**

For CRUD-capable entities:

> Create + Read + Update + Delete must be covered where those operations actually exist.

For operations that are intentionally unavailable:

> explicitly test authorization denial where valuable.

For workflows:

> test the complete user journey, not isolated pages.

---

# 25. DO NOT CREATE FAKE FEATURES

If something does not exist:

Do not create fake E2E tests for it.

Instead report:

```text
Feature:
Expected based on UI/code:
Actual:
Status:
```

Only test what the current product actually supports.

---

# 26. WHEN E2E REVEALS A BUG

Do not simply mark the E2E as skipped.

Process:

```text
E2E FAIL
 ↓
reproduce
 ↓
identify root cause
 ↓
fix implementation
 ↓
add regression test
 ↓
rerun affected E2E
 ↓
rerun broader suite
```

Examples of bugs that must be fixed:

* UI says success but API fails
* CRUD works for wrong role
* tenant data leaks
* update doesn't persist
* delete only removes UI state
* pagination returns wrong tenant
* status transition bypasses permission
* form accepts invalid data that backend rejects unexpectedly
* stale cache displays old tenant data

---

# 27. DO NOT CHEAT THE E2E

Do not:

* directly insert the final result into DB immediately before assertion
* mock the API for the main business workflow
* mock authorization
* bypass login for tests that are supposed to verify login
* disable middleware
* intercept API and return fake success
* modify production behavior just for E2E
* use internal implementation details as a substitute for UI behavior

Mocks are acceptable only where genuinely necessary and clearly separated from full E2E.

The main E2E must exercise:

```text
Browser
→ real frontend
→ real backend
→ real database
```

as much as the project's architecture permits.

---

# 28. E2E SHOULD RUN THROUGH REAL TENANT HOSTNAMES

For tenant-aware flows, do not test only:

```text
localhost
```

Use:

```text
rt-003.openrt.local
rt-004.openrt.local
```

through the actual development routing stack where possible.

This is important because tenant resolution depends on hostname.

---

# 29. MOBILE / RESPONSIVE CRITICAL FLOWS

If the application is PWA/mobile-first, at least verify critical workflows on a mobile viewport:

```text
login
resident lookup
announcement
aspiration
finance if applicable
logout
```

Do not attempt every permutation if unnecessary.

The purpose is to catch:

* inaccessible buttons
* broken forms
* modal overflow
* navigation failures
* mobile-specific rendering bugs

---

# 30. PWA E2E

If PWA is implemented:

Verify:

```text
load app
→ service worker registration
→ reload
→ app remains usable
```

If offline behavior is intentionally supported:

> test actual supported offline workflows.

Do not invent offline capabilities.

Also verify cache does not cause cross-tenant data leakage.

---

# 31. FULL TEST COMMANDS

Use the project's actual scripts.

At minimum run appropriate:

```text
go test ./...
go build ./...
go vet ./...
```

and frontend:

```text
npm run build
npm run typecheck
npm run lint
```

plus:

```text
npm run test:e2e
```

or the actual E2E command found in the project.

Do not invent commands if they do not exist.

---

# 32. FINAL REPORT

Return:

## A. Feature Inventory

All current user-facing features.

## B. Role Inventory

All actual roles.

## C. Permission Matrix

Actual authorization matrix.

## D. Use Case Inventory

Real business workflows.

## E. E2E Coverage Matrix

Show exactly what is covered.

## F. Test Results

Include:

```text
passed
failed
skipped
blocked
```

## G. Bugs Found

For every bug:

```text
Feature
Role
Use case
Steps
Expected
Actual
Root cause
Fix
Regression test
```

## H. Coverage Gaps

Explicitly list anything not covered and why.

## I. Final Assessment

Use:

```text
COMPLETE
PARTIAL
BLOCKED
```

---

# DEFINITION OF DONE

This task is complete only when:

* [ ] All actual roles identified
* [ ] All actual user-facing features identified
* [ ] All important business use cases identified
* [ ] Permission matrix created
* [ ] Authentication E2E covered
* [ ] Tenant context E2E covered
* [ ] CRUD E2E covered for every CRUD-capable feature
* [ ] Role-based authorization tested
* [ ] Negative authorization tested
* [ ] State transitions tested where applicable
* [ ] Search/filter/pagination tested where applicable
* [ ] Validation tested
* [ ] Persistence verified after reload
* [ ] Cross-feature workflows tested
* [ ] Tenant isolation exercised through real tenant hostnames
* [ ] Superadmin workflows tested
* [ ] Resident/user workflows tested
* [ ] Admin/pengurus workflows tested according to actual roles
* [ ] File/upload workflows tested where applicable
* [ ] PWA critical flows tested where applicable
* [ ] Mobile critical flows tested
* [ ] No fake/mock success for primary E2E
* [ ] All discovered bugs fixed or explicitly documented
* [ ] Regression tests added for discovered bugs
* [ ] Full relevant test suite passes
* [ ] E2E coverage matrix has no unexplained gaps
* [ ] Final report produced

---

# FINAL PRINCIPLE

Jangan bertanya:

> "Apakah semua halaman sudah punya E2E?"

Pertanyaan yang harus dijawab:

> **"Apakah setiap role dapat menyelesaikan pekerjaan yang memang menjadi tanggung jawabnya, dan apakah setiap pekerjaan yang tidak menjadi haknya benar-benar ditolak?"**

Target akhirnya:

```text
ROLE
 ↓
LOGIN
 ↓
TENANT
 ↓
USE CASE
 ↓
UI
 ↓
API
 ↓
DATABASE
 ↓
PERSISTED RESULT
 ↓
VERIFY
```

Untuk setiap fitur yang relevan.

**Semua fitur existing harus dibuktikan bekerja end-to-end, bukan hanya terlihat bekerja.**
