# MASTER TASK — ADVERSARIAL MULTI-TENANT SECURITY & ISOLATION VERIFICATION

Project: **Sitransparan RT/RW**

Context:

Project ini adalah SaaS multi-tenant untuk banyak RT.

Current intended architecture:

```text
*.openrt.com
      ↓
   Traefik
      ↓
Frontend / Nginx
      ↓
Backend
      ↓
Authentication
      ↓
Tenant Resolution
      ↓
Tenant Authorization
      ↓
PostgreSQL tenant schema
```

Development menggunakan domain equivalent seperti:

```text
rt-003.openrt.local
rt-004.openrt.local
```

Production direncanakan menggunakan:

```text
rt-003.openrt.com
rt-004.openrt.com
```

Current implementation sebelumnya telah mengklaim:

* tenant hostname resolution
* tenant existence validation
* active/inactive tenant handling
* JWT tenant ↔ hostname consistency
* cross-tenant host protection
* X-Tenant-ID spoof protection
* X-Forwarded-Host spoof protection
* Traefik wildcard routing
* PostgreSQL schema isolation
* Docker development support

Namun task ini **tidak boleh mempercayai klaim tersebut**.

---

# PRIMARY OBJECTIVE

Lakukan **adversarial security verification** terhadap implementasi multi-tenant saat ini.

Bertindak sebagai security engineer/attacker yang mencoba membuktikan bahwa:

> **Tenant A tidak pernah dapat membaca, membuat, mengubah, menghapus, menyetujui, atau memperoleh private state milik Tenant B melalui hostname, JWT, headers, API, browser cache, PWA, proxy, database, atau kombinasi attack vector lainnya.**

Jangan menganggap implementation aman hanya karena unit/integration test sudah PASS.

Tujuan task:

```text
ATTACK
  ↓
OBSERVE
  ↓
IDENTIFY BYPASS
  ↓
REPRODUCE
  ↓
FIX SOURCE CODE ONLY IF NEEDED
  ↓
ADD REGRESSION TEST
  ↓
RUN ACTUAL TEST
  ↓
RE-ATTACK
  ↓
VERIFY
```

Jika tidak menemukan vulnerability:

> buktikan dengan attack matrix dan evidence.

Jika menemukan vulnerability:

> jangan hanya melaporkan — perbaiki source code dan tambahkan regression test.

---

# 1. RULES

## Rule 1 — Source code is truth

Jangan mempercayai:

* README
* security report
* previous audit
* previous test report
* agent claims
* documentation

Gunakan implementation aktual.

---

## Rule 2 — Do not weaken security

DILARANG:

* disable middleware
* bypass authorization
* hardcode tenant
* hardcode user
* hardcode role untuk membuat test pass
* skip failing tests
* mengubah expected result agar test PASS
* menghapus security test
* membuat test-only bypass yang dapat masuk production

---

## Rule 3 — Backend is security boundary

Frontend tidak boleh dianggap sebagai security control.

Jika frontend mencegah sesuatu tetapi backend mengizinkannya:

> SECURITY BUG.

---

# 2. BUILD CURRENT SECURITY MODEL

Sebelum menyerang, reconstruct actual security model.

Identifikasi:

```text
Tenant identity
Tenant slug
Tenant domain
Tenant status
Tenant membership
User identity
JWT claims
Roles
Permissions
Hostname resolver
Tenant middleware
Authorization middleware
Database schema resolution
```

Tampilkan actual flow:

```text
Request
 ↓
Host
 ↓
Proxy
 ↓
Auth
 ↓
Tenant resolution
 ↓
Authorization
 ↓
Database
```

Jangan membuat assumptions.

---

# 3. ATTACK MATRIX

Buat attack matrix untuk minimal:

```text
Tenant A
Tenant B
Unknown tenant
Inactive tenant
Deleted/nonexistent tenant
SUPERADMIN
ADMIN
normal resident/user
unauthorized user
unauthenticated user
```

Gunakan setidaknya dua real test tenants.

Contoh:

```text
rt-003
rt-004
```

Pastikan data kedua tenant berbeda sehingga leakage mudah dikenali.

---

# 4. HOST ↔ JWT ATTACKS

Test:

### Case A

```text
Host: rt-003
JWT tenant: rt-003
```

Expected:

```text
ALLOW
```

### Case B

```text
Host: rt-004
JWT tenant: rt-003
```

Expected:

```text
DENY
```

### Case C

```text
Host: rt-003
JWT tenant: rt-004
```

Expected:

```text
DENY
```

### Case D

```text
Host: unknown
JWT tenant: rt-003
```

Expected:

```text
DENY
```

### Case E

```text
Host: rt-003
JWT has no tenant
```

Expected according to actual security model:

```text
DENY
```

unless explicit public endpoint policy applies.

---

# 5. JWT MANIPULATION

Attempt:

* modified tenant claim
* modified user ID
* modified role
* modified subject
* modified expiration
* invalid signature
* empty signature
* malformed JWT
* expired JWT
* missing JWT
* wrong algorithm
* algorithm confusion if applicable

Expected:

> DENY.

Do not only test parser behavior.

Test through actual protected endpoints.

---

# 6. HOST HEADER ATTACKS

Attempt:

```text
Host: rt-003.openrt.com
```

then variations:

```text
RT-003.openrt.com
rt-003.openrt.com.
rt-003.openrt.com:80
rt-003.openrt.com:443
rt-003..openrt.com
rt--003.openrt.com
rt_003.openrt.com
rt 003.openrt.com
```

Test according to actual hostname policy.

The critical invariant:

> hostname normalization must never transform an attacker-controlled invalid hostname into another valid tenant accidentally.

---

# 7. DOMAIN CONFUSION ATTACKS

Test:

```text
rt-003.openrt.com.attacker.com
```

```text
attacker.com
```

```text
openrt.com.attacker.com
```

```text
attacker.openrt.com
```

```text
rt-003.attacker.com
```

```text
rt-003.openrt.com.evil
```

Expected:

> DENY.

Never resolve tenant based on naïve `strings.Split()` or suffix matching.

---

# 8. FORWARDED HEADER ATTACKS

Attempt:

```text
X-Forwarded-Host: rt-004.openrt.com
```

while actual host is:

```text
rt-003.openrt.com
```

Also test:

```text
X-Original-Host
X-Forwarded-Proto
Forwarded
X-Tenant-ID
X-Tenant-Slug
X-Original-URL
```

if application/proxy stack supports them.

Expected:

> attacker cannot choose tenant through an untrusted header.

Document exactly which headers are trusted and why.

---

# 9. TRAEFIK ATTACKS

Verify actual Traefik behavior.

Test:

```text
valid tenant hostname
unknown tenant hostname
malformed hostname
attacker hostname
wrong base domain
```

Verify:

* router matches only intended domain
* unknown tenant reaches application only if expected
* application still denies unknown tenant
* no router accidentally routes arbitrary hostname to tenant
* no router bypasses authentication
* no special router exposes admin/private endpoints

Do not confuse:

```text
Traefik routing
```

with:

```text
tenant authorization
```

Both must be verified independently.

---

# 10. NGINX / FRONTEND PROXY ATTACKS

Audit:

```text
Frontend/Nginx
    ↓
/api proxy
```

Verify:

* Host preserved correctly
* forwarded headers controlled
* arbitrary client headers cannot change tenant context
* API requests cannot bypass frontend security assumptions
* direct backend access does not bypass tenant authorization if backend is exposed

If backend is supposed to be internal-only:

> verify Docker networking/ports enforce this.

---

# 11. TENANT EXISTENCE ATTACKS

Test:

```text
rt-003 → exists
rt-004 → exists
rt-999 → does not exist
foo → does not exist
```

Unknown tenant must never result in:

```text
schema created automatically
tenant context created automatically
fallback tenant
default tenant
first tenant
public tenant
SUPERADMIN tenant
```

Especially investigate fallback behavior.

Dangerous examples:

```text
tenant not found → default tenant
tenant not found → public tenant
tenant not found → nil tenant
tenant not found → SUPERADMIN context
```

All must be evaluated.

---

# 12. TENANT STATUS ATTACKS

Test:

```text
active
inactive
disabled
deleted
```

Expected for private tenant:

```text
inactive → DENY
deleted → DENY
```

Test all relevant boundaries:

* login
* `/me`
* tenant listing
* tenant switching
* CRUD
* public endpoints
* file/document endpoints
* financial endpoints
* event endpoints
* aspiration endpoints

Do not assume middleware coverage means all flows are protected.

---

# 13. TENANT SWITCHING ATTACKS

Audit tenant switch endpoint.

Attempt:

```text
user A
→ switch to tenant B
```

where user A has no membership in B.

Expected:

> DENY.

Attempt:

```text
user A
→ manually modify tenant ID in request
```

Expected:

> DENY.

Attempt:

```text
SUPERADMIN
→ switch to nonexistent tenant
```

Expected:

> DENY.

Attempt:

```text
user with tenant A
→ Host tenant B
→ switch endpoint
```

Expected:

> authorization must remain consistent.

---

# 14. RESOURCE-LEVEL CROSS-TENANT ATTACKS

This is mandatory.

Create known resources:

```text
Tenant A:
resident A1
finance A1
event A1
announcement A1
aspiration A1
etc.
```

Tenant B:

```text
resident B1
finance B1
event B1
announcement B1
aspiration B1
etc.
```

Then attempt:

```text
Tenant A user
→ GET resource B
```

```text
Tenant A user
→ UPDATE resource B
```

```text
Tenant A user
→ DELETE resource B
```

```text
Tenant A user
→ APPROVE resource B
```

according to actual available operations.

Test:

* by ID
* list endpoints
* search
* filters
* pagination
* aggregation
* reports
* exports
* downloads

A user must not obtain Tenant B data by guessing IDs.

---

# 15. IDOR / RESOURCE ID ATTACKS

Test:

```text
/resource/A-ID
```

then:

```text
/resource/B-ID
```

with Tenant A credentials.

Expected:

```text
DENY
```

Do not rely on random UUIDs as authorization.

The database/query must enforce tenant ownership.

---

# 16. LIST / SEARCH / FILTER LEAKAGE

Cross-tenant leakage can occur even when by-ID access is secure.

Test:

```text
GET /residents
GET /finance
GET /events
GET /announcements
GET /aspirations
```

and:

```text
?tenant_id=B
?tenant=B
?schema=B
?search=...
?filter=...
```

Expected:

> server-side tenant scope remains authoritative.

Test pagination carefully:

```text
page 1
page 2
page N
```

A hidden cross-tenant record must never appear on another page.

---

# 17. AGGREGATION / REPORT ATTACKS

Audit endpoints such as:

* dashboard
* balance
* financial summary
* statistics
* reports
* charts
* counts
* exports

These are frequently missed.

Test:

```text
Tenant A
→ dashboard
```

must contain only:

```text
Tenant A data
```

No aggregate may accidentally query all tenants.

---

# 18. FILE / DOCUMENT ISOLATION

If project supports:

* uploads
* receipts
* documents
* images
* attachments
* public/private files

test cross-tenant access.

Attempt:

```text
Tenant A
→ request Tenant B file ID/path/key
```

Expected:

> DENY.

Audit object storage keys.

Never trust:

```text
bucket/path/file ID
```

as authorization.

---

# 19. DATABASE SCHEMA ESCAPE

Audit schema resolution.

Try to determine whether user-controlled input can influence:

```text
schema name
table name
search_path
database connection
```

Dangerous:

```text
tenantSlug → raw SQL identifier
```

without trusted tenant lookup.

Verify:

```text
Host
 ↓
tenant lookup
 ↓
trusted tenant metadata
 ↓
trusted schema
```

Never:

```text
Host
 ↓
"tenant_" + arbitrary user input
```

---

# 20. PostgreSQL CONNECTION POOL ATTACK

Audit whether tenant context leaks between pooled connections.

If application uses:

```text
database/sql
```

or equivalent pooling:

Test:

```text
Tenant A request
→ connection
→ Tenant B request
→ potentially same connection
```

Verify no tenant-specific state remains in connection/session.

Especially inspect:

```text
SET search_path
SET ROLE
session variables
temporary tables
prepared statements
connection-local state
```

If schema-qualified queries are used, verify all tenant-scoped queries actually use them.

---

# 21. CACHE / TANSTACK QUERY

Test browser transition:

```text
Tenant A
→ login
→ load private data
→ logout
```

then:

```text
Tenant B
→ login
→ load same screen
```

Verify no Tenant A data appears.

Inspect:

* query keys
* query invalidation
* queryClient.clear()
* persisted query cache
* localStorage
* sessionStorage
* Zustand or other state stores

Tenant context must be included where necessary.

---

# 22. PWA / SERVICE WORKER ATTACK

Inspect:

* service worker
* Cache API
* Workbox
* precache
* runtime cache
* API response caching

Test:

```text
rt-003
→ private response cached
```

then:

```text
rt-004
→ same URL/path
```

Ensure cached Tenant A private data cannot be returned to Tenant B.

Pay special attention to:

```text
/api/*
```

cache rules.

Private API responses should not be blindly cached across tenant origins.

---

# 23. BROWSER STORAGE

Search for:

```text
localStorage
sessionStorage
IndexedDB
cookies
persisted state
```

Determine whether:

* tenant ID
* user data
* permissions
* cached API response
* JWT

can survive tenant transition incorrectly.

Attempt:

```text
Tenant A
→ logout
→ Tenant B
```

Expected:

> no private Tenant A state is reused.

---

# 24. CORS / ORIGIN

Test:

```text
Origin: https://rt-003.openrt.com
```

versus:

```text
Origin: https://attacker.com
```

and other tenant origins.

Verify:

* CORS does not grant attacker origin
* credentials are handled correctly
* cookies are scoped correctly
* SameSite behavior is appropriate
* wildcard `*` is not combined incorrectly with credentials

---

# 25. COOKIE / SESSION ISOLATION

If cookies are used:

Audit:

```text
Domain
Path
Secure
HttpOnly
SameSite
```

Determine whether:

```text
Domain=.openrt.com
```

is intentional.

If wildcard domain cookies are used, verify one tenant cannot exploit them to impersonate another tenant.

If JWT Authorization headers are used instead, verify token handling remains secure.

---

# 26. SUPERADMIN ADVERSARIAL TEST

SUPERADMIN is the highest-risk role.

Verify:

### Allowed

```text
SUPERADMIN
→ explicit authorized tenant
```

### Denied

```text
SUPERADMIN
→ nonexistent tenant
```

### Denied unless explicitly supported

```text
SUPERADMIN JWT tenant=A
Host=B
```

Do not allow hostname alone to switch SUPERADMIN context.

---

# 27. PUBLIC ROUTES

Identify every public endpoint.

For each:

```text
public endpoint
→ tenant context required?
→ tenant resolved how?
→ inactive tenant behavior?
→ unknown tenant behavior?
```

Public does not automatically mean:

> all tenant data.

For example:

```text
rt-003.openrt.com/public/announcements
```

must return only data belonging to the correct tenant if the endpoint is tenant-scoped.

---

# 28. ERROR RESPONSE ANALYSIS

Check whether errors leak:

* tenant existence
* database schema
* internal IDs
* SQL errors
* user existence
* authorization details
* filesystem/object storage paths

Compare:

```text
unknown tenant
inactive tenant
unauthorized tenant
```

Ensure response differences do not unnecessarily expose sensitive information.

Do not blindly require identical status codes if application semantics legitimately distinguish them.

---

# 29. RATE LIMITING / ABUSE

If rate limiting exists, verify whether it is tenant/user aware.

If not implemented:

> report as finding, do not invent implementation unless clearly within scope.

At minimum consider:

* tenant enumeration
* login brute force
* tenant slug enumeration

Do not claim protection that does not exist.

---

# 30. CONFIGURATION / HARDCODE AUDIT

Search entire repository for:

```text
openrt.com
openrt.local
rt-003
rt-004
tenant-003
tenant-004
```

Classify:

```text
SAFE TEST FIXTURE
DOCUMENTATION EXAMPLE
CONFIGURATION DEFAULT
PRODUCTION HARDCODE
```

Production logic must not depend on a specific RT.

---

# 31. TEST REALISTIC ATTACK FLOW

Do not rely only on isolated middleware tests.

At least one complete attack must traverse:

```text
curl/browser
 ↓
Traefik
 ↓
Nginx
 ↓
Backend
 ↓
Auth
 ↓
Tenant middleware
 ↓
Repository
 ↓
PostgreSQL
```

Example:

```text
JWT Tenant A
+
Host Tenant B
+
real resource ID from Tenant B
```

Expected:

```text
DENY
```

This must be verified against the actual running stack.

---

# 32. REGRESSION TESTS

For every vulnerability discovered:

1. reproduce it
2. capture failing behavior
3. fix source code
4. add automated regression test
5. run test
6. run broader test suite
7. reproduce original attack
8. verify it is now blocked

Never delete the test after fixing.

---

# 33. TEST RESULT FORMAT

For every important attack:

```text
ATTACK:
AUTH:
HOST:
REQUEST:
TARGET:
EXPECTED:
ACTUAL:
HTTP STATUS:
TENANT CONTEXT:
DB SCHEMA:
RESULT:
```

Example:

```text
ATTACK:
Cross-tenant resource access

AUTH:
Tenant A user

HOST:
rt-003.openrt.local

REQUEST:
GET /api/residents/<tenant-B-id>

EXPECTED:
DENY

ACTUAL:
403

TENANT CONTEXT:
tenant A

DB SCHEMA:
tenant_a

RESULT:
PASS
```

If DB schema cannot safely be exposed in logs:

> report the verification method without leaking secrets.

---

# 34. SECURITY INVARIANTS

At the end, explicitly prove these invariants:

### Invariant 1

```text
Unknown hostname
→ no tenant context
→ no tenant data
```

### Invariant 2

```text
Tenant A user
→ cannot access Tenant B resources
```

### Invariant 3

```text
Tenant A JWT
+ Host B
→ DENY
```

### Invariant 4

```text
Client-controlled tenant ID
→ never authoritative
```

### Invariant 5

```text
Client-controlled forwarded headers
→ never tenant authority
```

### Invariant 6

```text
Hostname
→ tenant lookup
→ never direct schema selection
```

### Invariant 7

```text
Tenant A cache
→ never reused for Tenant B
```

### Invariant 8

```text
Inactive tenant
→ no private access
```

### Invariant 9

```text
Tenant creation
→ does not require source-code change
```

### Invariant 10

```text
No production tenant/domain hardcode
```

---

# 35. DO NOT STOP AT FINDINGS

If a vulnerability is discovered, do not finish with:

> "Found vulnerability."

Continue:

```text
FIND
→ ROOT CAUSE
→ FIX
→ REGRESSION TEST
→ RUN
→ RE-ATTACK
→ VERIFY
```

The task is not complete until the fixed behavior has been re-tested.

---

# 36. FINAL VALIDATION

Run relevant:

```text
go test ./...
go build ./...
go vet ./...
```

Frontend:

```text
npm test
npm run build
npm run typecheck
npm run lint
```

Use actual project commands.

Also run:

```text
Docker compose validation
Traefik validation
Integration tests
Security tests
E2E tests
```

if available.

Do not invent commands.

---

# 37. FINAL REPORT

Provide:

## Executive Summary

```text
Overall:
VERIFIED / PARTIAL / BROKEN / BLOCKED
```

## Attack Matrix

Show every major attack and result.

## Vulnerabilities Found

For each:

```text
Severity
Attack
Root Cause
Impact
Fix
Regression Test
Final Result
```

## Tenant Isolation

Explicitly state:

```text
Unknown tenant:
Cross-tenant:
Host manipulation:
JWT manipulation:
Resource ID:
List/search:
Reports:
Files:
Cache:
PWA:
Database:
```

## Infrastructure

```text
Traefik:
Nginx:
Docker:
Development:
Production:
```

## Configuration

List relevant configuration variables and confirm no unsafe hardcodes.

## Tests

Show actual commands and results.

## Remaining Issues

Separate:

```text
CRITICAL
HIGH
MEDIUM
LOW
UNTESTED
BLOCKED
```

Do not hide limitations.

---

# 38. FINAL STATUS RULE

Use:

### VERIFIED

Only if attack was actually executed and expected deny/allow behavior was observed.

### PARTIAL

If implementation appears correct but an important attack path could not be executed.

### BROKEN

If tenant isolation can be bypassed.

### BLOCKED

If environment prevents meaningful verification.

Never use:

> VERIFIED

merely because code inspection suggests it should work.

---

# DEFINITION OF DONE

* [ ] Current tenant security model reconstructed
* [ ] Host ↔ JWT consistency attacked
* [ ] JWT manipulation attacked
* [ ] Host header manipulation attacked
* [ ] Forwarded header spoof attacked
* [ ] Unknown tenant attacked
* [ ] Inactive tenant attacked
* [ ] Deleted/nonexistent tenant attacked
* [ ] Tenant switching attacked
* [ ] Cross-tenant CRUD attacked
* [ ] IDOR attacked
* [ ] List/search/filter leakage tested
* [ ] Aggregation/report leakage tested
* [ ] File/document isolation tested if applicable
* [ ] Database schema isolation tested
* [ ] Connection-pool leakage considered/tested
* [ ] Traefik routing tested
* [ ] Nginx proxy tested
* [ ] CORS tested
* [ ] Cookie/session isolation tested if applicable
* [ ] Browser cache tested
* [ ] TanStack Query/cache tested
* [ ] PWA/service-worker tested
* [ ] localStorage/sessionStorage/persisted state audited
* [ ] SUPERADMIN attack scenarios tested
* [ ] Public routes audited
* [ ] Error leakage reviewed
* [ ] Production hardcodes searched
* [ ] At least one full attack traversed the real Docker/Traefik/application/database chain
* [ ] Every discovered vulnerability fixed
* [ ] Regression tests added
* [ ] Original attacks re-run after fixes
* [ ] Full relevant test suite passed
* [ ] Remaining limitations explicitly reported

---

# FINAL INSTRUCTION

**Assume the tenant isolation is vulnerable until you prove otherwise.**

Do not perform a documentation review.

Do not perform a superficial code review.

Do not simply repeat the previous audit result.

This is an **adversarial verification task**.

Your job is to actively attempt:

```text
Tenant A
    ↓
access Tenant B
```

through every realistic path:

```text
hostname
JWT
headers
tenant switching
API
resource IDs
search
filters
reports
files
database
connection pooling
browser cache
PWA
cookies
proxy
Traefik
configuration
```

If the attack succeeds:

> fix it.

If the attack fails:

> provide evidence.

The final goal is:

> **Prove that a malicious or compromised user from Tenant A cannot cross the Tenant B security boundary, even when manipulating hostname, JWT, headers, API parameters, resource IDs, browser state, or proxy-related inputs.**

**ATTACK → REPRODUCE → FIX → TEST → RE-ATTACK → PROVE**
