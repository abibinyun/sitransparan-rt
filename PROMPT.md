# MASTER TASK — FULLY VALIDATE & IMPLEMENT TENANT SUBDOMAIN ROUTING, WILDCARD HOST ISOLATION, DOCKER & DEV/PRODUCTION SUPPORT

Project: **Sitransparan RT/RW**

Project ini adalah SaaS multi-tenant untuk banyak RT.

Target deployment architecture:

```text
rt-003.openrt.com  → Tenant RT 003
rt-004.openrt.com  → Tenant RT 004
rt-005.openrt.com  → Tenant RT 005
...
```

Domain utama:

```text
openrt.com
```

Wildcard DNS kemungkinan akan digunakan:

```text
*.openrt.com
```

Deployment akan menggunakan Docker dan reverse proxy seperti Traefik atau architecture equivalent yang memang sesuai dengan project.

## PRIMARY OBJECTIVE

Audit dan pastikan project benar-benar mendukung **tenant-aware subdomain routing** untuk development dan production.

Jangan hanya mengecek apakah Traefik dapat menerima wildcard hostname.

Yang harus dibuktikan adalah:

> **Hostname → tenant resolution → tenant existence → authenticated identity → tenant authorization → database schema → application response**

seluruh chain harus aman.

Target akhirnya:

```text
rt-003.openrt.com
       ↓
resolve tenant slug = rt-003
       ↓
tenant rt-003 harus EXIST dan ACTIVE
       ↓
request mendapatkan tenant context
       ↓
authenticated user harus berwenang terhadap tenant tersebut
       ↓
database scope = tenant rt-003
       ↓
response hanya boleh berasal dari tenant rt-003
```

Jika:

```text
rt-does-not-exist.openrt.com
```

tenant tidak ada:

> REQUEST MUST BE DENIED.

Jangan sampai wildcard DNS + reverse proxy menyebabkan tenant fiktif otomatis dapat diakses.

---

# 1. AUDIT DULU — JANGAN LANGSUNG REWRITE

Sebelum melakukan perubahan, inspect seluruh implementation terkait:

* tenant model
* tenant ID
* tenant slug
* tenant status
* tenant creation
* tenant lookup
* tenant resolution
* hostname parsing
* subdomain parsing
* HTTP Host header
* forwarded host
* X-Forwarded-Host
* X-Forwarded-Proto
* X-Forwarded-For
* trusted proxy configuration
* middleware
* authentication
* JWT
* tenant claims
* tenant switching
* route registration
* API client
* frontend routing
* Docker
* Docker Compose
* Traefik
* Nginx/Caddy jika ada
* DNS configuration/documentation
* environment variables
* `.env.example`
* deployment configuration
* development configuration
* production configuration
* tests
* E2E tests

Cari semua penggunaan:

```text
tenant_id
tenantID
tenantId
tenant_slug
tenantSlug
slug
hostname
host
subdomain
domain
origin
X-Tenant-ID
X-Forwarded-Host
X-Forwarded-Proto
X-Forwarded-For
```

Jangan percaya dokumentasi lama.

Source code dan actual runtime behavior adalah source of truth.

---

# 2. DETERMINE CURRENT TENANT MODEL

Tentukan bagaimana tenant saat ini direpresentasikan.

Minimal jawab:

```text
Tenant identity:
Tenant primary key:
Tenant slug:
Tenant status:
Tenant domain:
Tenant schema:
Tenant-user relationship:
```

Jika tenant saat ini hanya memiliki:

```text
id
name
slug
```

jangan otomatis menambahkan domain field jika belum diperlukan.

Tetapi jika architecture membutuhkan configurable hostname mapping, tentukan desain yang paling tepat berdasarkan implementation.

---

# 3. TENANT SLUG MUST BE AUTHORITATIVE

Hostname harus digunakan hanya untuk **tenant discovery**, bukan sebagai authorization bypass.

Contoh:

```text
Host: rt-003.openrt.com
```

dapat menghasilkan:

```text
requestedTenantSlug = rt-003
```

Tetapi server HARUS melakukan:

```text
lookup tenant by slug
```

Kemudian:

```text
tenant exists?
tenant active?
tenant allowed for this environment?
```

baru request mendapatkan tenant context.

Jangan melakukan:

```text
tenant := Tenant{
    Slug: subdomain,
}
```

tanpa lookup database.

---

# 4. UNKNOWN TENANT MUST BE DENIED

Ini adalah security invariant utama.

Jika:

```text
rt-003.openrt.com
```

dan tenant `rt-003` ada:

```text
ALLOW
```

Jika:

```text
rt-999.openrt.com
```

dan tenant `rt-999` tidak ada:

```text
DENY
```

Jika:

```text
random.openrt.com
```

dan tenant `random` tidak ada:

```text
DENY
```

Jika:

```text
foo.openrt.com
```

tenant tidak ada:

```text
DENY
```

Jangan membuat tenant otomatis hanya karena hostname valid.

---

# 5. WILDCARD DNS IS NOT TENANT AUTHORIZATION

Pastikan architecture tidak melakukan kesalahan konsep:

```text
*.openrt.com
```

berarti:

> DNS menerima hostname.

Bukan:

> Semua hostname adalah tenant valid.

Reverse proxy hanya melakukan routing.

Tenant existence dan authorization tetap dilakukan application/backend.

Architecture yang diharapkan:

```text
DNS wildcard
    ↓
Traefik
    ↓
Application
    ↓
Tenant Resolver
    ↓
Database tenant lookup
    ↓
Tenant Authorization
    ↓
Tenant Database Schema
```

---

# 6. TRAEFIK / REVERSE PROXY AUDIT

Jika project menggunakan Traefik:

Audit:

* Docker labels
* routers
* services
* entrypoints
* Host rules
* TLS
* wildcard certificate
* Docker network
* exposed ports
* forwarded headers
* trusted proxy
* middleware
* production config
* development config

Pastikan architecture tidak bergantung pada hardcoded:

```text
Host(`rt-003.openrt.com`)
```

atau:

```text
Host(`rt-004.openrt.com`)
```

karena tenant harus dynamic.

Gunakan pattern yang configurable dan sesuai dengan reverse proxy.

---

# 7. BASE DOMAIN MUST BE CONFIGURABLE

DILARANG hardcode:

```text
openrt.com
```

di source code.

Gunakan configuration/environment variable, misalnya konsep:

```text
TENANT_BASE_DOMAIN
```

atau nama configuration yang mengikuti convention project.

Contoh:

Development:

```text
TENANT_BASE_DOMAIN=localhost
```

atau architecture yang sesuai seperti:

```text
TENANT_BASE_DOMAIN=localhost.test
```

Production:

```text
TENANT_BASE_DOMAIN=openrt.com
```

Nama variable tidak harus persis seperti contoh di atas.

Gunakan configuration architecture yang sudah digunakan project.

---

# 8. DEVELOPMENT MUST SUPPORT SUBDOMAIN TENANTS

Development tidak boleh hanya support:

```text
http://localhost
```

jika production akan menggunakan:

```text
https://rt-003.openrt.com
```

Development harus memungkinkan testing tenant hostname.

Contoh:

```text
http://rt-003.localhost
http://rt-004.localhost
```

atau domain development yang equivalent.

Jika `.localhost` subdomain behavior tidak reliable untuk architecture tertentu, gunakan configurable local development domain seperti:

```text
rt-003.localhost.test
rt-004.localhost.test
```

atau solusi yang paling sesuai dengan Docker/Traefik.

Yang penting:

> developer dapat benar-benar menjalankan dan menguji tenant subdomain isolation secara lokal.

Dokumentasikan setup tersebut.

---

# 9. DEVELOPMENT TRAEFIK

Jika Traefik diperlukan untuk production-like local development, pastikan tersedia configuration seperti:

```text
docker-compose.dev.yml
```

atau architecture existing yang equivalent.

Target:

```text
Browser
 ↓
rt-003.<dev-domain>
 ↓
Traefik
 ↓
frontend/backend
 ↓
tenant resolver
```

Jangan membuat developer harus mengedit source code setiap kali ingin menambahkan tenant.

Tenant baru harus dapat dibuat melalui normal tenant management / seed / database fixture.

---

# 10. PRODUCTION ARCHITECTURE

Pastikan production mendukung:

```text
*.openrt.com
```

dengan:

```text
DNS wildcard
+
TLS wildcard certificate
+
Traefik
+
application tenant resolver
```

atau equivalent architecture.

Jangan mengasumsikan wildcard TLS otomatis tersedia.

Dokumentasikan:

* DNS requirement
* wildcard DNS
* TLS
* reverse proxy
* Docker network
* application configuration
* tenant registration
* tenant activation

Jika deployment menggunakan Let's Encrypt, pastikan wildcard certificate mechanism benar-benar compatible dengan chosen configuration.

---

# 11. HOSTNAME PARSING SECURITY

Audit parsing hostname secara serius.

Jangan melakukan parsing naïf seperti:

```text
strings.Split(host, ".")[0]
```

tanpa validasi environment/domain.

Pertimbangkan:

* port
* uppercase/lowercase
* trailing dot
* malformed hostname
* localhost
* IP address
* arbitrary domain
* nested subdomains
* base domain mismatch
* spoofed forwarded host

Contoh attack:

```text
rt-003.openrt.com.attacker.com
```

tidak boleh dianggap:

```text
rt-003
```

Contoh:

```text
rt-003.attacker.com
```

tidak boleh dianggap tenant `rt-003`.

Contoh:

```text
attacker.com
```

tidak boleh resolve ke tenant.

---

# 12. TRUSTED PROXY HEADERS

Audit penggunaan:

```text
Host
X-Forwarded-Host
X-Forwarded-Proto
X-Forwarded-For
```

Jangan mempercayai client-supplied forwarding headers secara sembarangan.

Jika application berjalan di belakang Traefik:

```text
browser
 ↓
Traefik
 ↓
application
```

tentukan secara eksplisit:

* header mana yang dipercaya
* siapa trusted proxy
* bagaimana Host diteruskan
* bagaimana application mendapatkan original hostname

User tidak boleh dapat melakukan:

```text
X-Forwarded-Host: rt-003.openrt.com
```

dari luar dan menggunakannya untuk memanipulasi tenant resolution jika request sebenarnya berasal dari domain lain.

---

# 13. HOSTNAME TENANT VS JWT TENANT

Ini sangat penting.

Audit bagaimana hubungan:

```text
requested tenant from hostname
```

dengan:

```text
authenticated tenant from JWT
```

Jangan membuat:

```text
JWT says tenant A
Host says tenant B
→ silently switch to B
```

tanpa authorization.

Expected security model:

```text
Host tenant = A
JWT tenant = A
→ ALLOW
```

Jika:

```text
Host tenant = B
JWT tenant = A
```

maka request harus:

```text
DENY
```

kecuali user memang memiliki explicit authorized tenant switching flow.

Tetapi tenant switching harus dilakukan melalui server-authorized mechanism, bukan hanya mengganti hostname.

---

# 14. SUPERADMIN

Audit behavior SUPERADMIN secara khusus.

Jika SUPERADMIN memang boleh mengakses banyak tenant:

```text
SUPERADMIN
    ↓
explicit tenant selection
    ↓
authorized tenant
```

tetap harus melalui valid tenant lookup.

Jangan membuat:

```text
superadmin → arbitrary hostname → arbitrary schema
```

Tanpa tenant existence validation.

SUPERADMIN tidak boleh menjadi alasan untuk:

```text
tenant-not-found → create implicit tenant context
```

---

# 15. AUTHENTICATION FLOW

Audit:

```text
GET /login
POST /login
GET /auth/me
GET /auth/tenants
POST /auth/switch-tenant
```

atau endpoint aktual project.

Tentukan bagaimana login bekerja ketika hostname tenant diketahui.

Contoh:

```text
rt-003.openrt.com
login
 ↓
tenant = rt-003
 ↓
user credentials
 ↓
verify user belongs to rt-003
 ↓
JWT tenant = rt-003
```

Jika user tidak memiliki membership tenant tersebut:

```text
DENY
```

Jangan biarkan user login ke tenant hanya karena mengetahui hostname.

---

# 16. TENANT SWITCHING

Audit existing tenant switch implementation.

Pastikan:

```text
user has membership in tenant B
```

baru:

```text
switch to tenant B
```

JWT/context harus berubah secara server-side.

Jangan menerima:

```json
{
  "tenant_id": "tenant-B"
}
```

sebagai authority.

Tenant ID/slug dari client hanya merupakan request intent.

Server harus memverifikasi membership/authorization.

---

# 17. DATABASE ISOLATION

Hostname resolution tidak boleh langsung menghasilkan schema string dari user input.

JANGAN:

```text
schema = "tenant_" + hostname
```

tanpa database lookup/validation.

Expected:

```text
hostname
 ↓
validated tenant slug
 ↓
tenant record
 ↓
trusted tenant ID/slug
 ↓
trusted schema name
 ↓
database
```

Pastikan schema name tidak berasal langsung dari arbitrary Host header.

Audit juga:

* SQL injection
* schema injection
* invalid slug
* special characters
* uppercase
* whitespace
* quotes
* dots
* hyphens
* underscore

---

# 18. TENANT SLUG VALIDATION

Tentukan aturan slug berdasarkan project.

Contoh valid:

```text
rt-003
rt-004
rt-125
```

Contoh invalid:

```text
../../
tenant.foo
rt 003
RT 003
rt@003
```

Jika business rule membutuhkan slug tertentu, ikuti implementation/business model.

Jangan membuat arbitrary slug policy tanpa dasar.

---

# 19. TENANT REGISTRATION

Audit bagaimana tenant baru dibuat.

Expected:

```text
SUPERADMIN creates tenant
 ↓
tenant record created
 ↓
tenant schema created
 ↓
tenant status active
 ↓
tenant becomes routable
```

Tenant baru seharusnya **tidak perlu source-code change**.

Jangan:

```text
if slug == "rt-003" ...
if slug == "rt-004" ...
```

DILARANG hardcode tenant.

---

# 20. TENANT DELETION / DISABLE

Audit behavior:

```text
active
inactive
deleted
```

Jika tenant dinonaktifkan:

```text
rt-003.openrt.com
```

harus:

```text
DENY
```

Tenant tidak boleh tetap dapat diakses hanya karena wildcard DNS masih aktif.

---

# 21. UNKNOWN SUBDOMAIN TESTS

WAJIB membuat automated tests:

```text
rt-003.openrt.com
→ existing active tenant
→ ALLOW
```

```text
rt-004.openrt.com
→ existing active tenant
→ ALLOW
```

```text
rt-999.openrt.com
→ tenant does not exist
→ DENY
```

```text
foo.openrt.com
→ tenant does not exist
→ DENY
```

```text
attacker.openrt.com
→ tenant does not exist
→ DENY
```

```text
rt-003.attacker.com
→ DENY
```

```text
rt-003.openrt.com.attacker.com
→ DENY
```

---

# 22. CROSS-TENANT HOST ATTACK

WAJIB test:

User A:

```text
JWT tenant = A
```

request:

```text
Host: rt-b.openrt.com
```

Expected:

```text
DENY
```

User B:

```text
JWT tenant = B
```

request:

```text
Host: rt-a.openrt.com
```

Expected:

```text
DENY
```

Test harus membuktikan:

* read
* create
* update
* delete
* approve
* resource-by-ID

sesuai operation yang tersedia.

---

# 23. HOST HEADER MANIPULATION

Test:

```text
Host: rt-b.openrt.com
X-Tenant-ID: tenant-A
```

dan:

```text
Host: rt-a.openrt.com
X-Tenant-ID: tenant-B
```

dan kombinasi lainnya.

Backend harus memiliki satu authoritative tenant context.

Jangan sampai header berbeda menyebabkan ambiguity.

---

# 24. CACHE ISOLATION

Frontend harus diuji:

```text
rt-003.openrt.com
login tenant A
load data A
logout
```

kemudian:

```text
rt-004.openrt.com
login tenant B
```

Pastikan tidak ada:

```text
tenant A cached data
```

yang muncul di tenant B.

Audit:

* TanStack Query
* query keys
* auth store
* localStorage
* sessionStorage
* service worker
* PWA cache
* browser cache
* persisted state

Tenant harus menjadi bagian dari cache isolation strategy jika diperlukan.

---

# 25. PWA / SERVICE WORKER

Karena aplikasi adalah PWA:

Audit:

* service worker
* Cache API
* Workbox jika ada
* precache
* runtime cache
* API caching
* hostname isolation

Pastikan:

```text
rt-003.openrt.com
```

tidak mendapatkan cached private API response dari:

```text
rt-004.openrt.com
```

Ini sangat penting.

---

# 26. CORS / ORIGIN

Audit:

* CORS
* allowed origins
* frontend API URL
* websocket origin jika ada
* CSRF jika applicable
* cookies
* SameSite
* secure cookie

Jangan hardcode hanya:

```text
https://rt-003.openrt.com
```

jika tenant dynamic.

Gunakan configurable base domain/origin strategy.

---

# 27. DOCKER

Audit seluruh Docker setup:

* Dockerfile
* docker-compose
* networks
* ports
* volumes
* environment
* healthchecks
* Traefik
* labels
* secrets
* production config
* development config

Pastikan architecture mendukung dynamic tenant hostname.

Jangan membuat container baru per tenant kecuali memang architecture project mengharuskannya.

Idealnya:

```text
Wildcard domains
        ↓
Traefik
        ↓
same application
        ↓
dynamic tenant resolution
```

---

# 28. DEV / STAGING / PRODUCTION CONFIGURATION

Pastikan tenant domain configuration tidak hardcoded.

Minimal support:

```text
development
staging (jika ada)
production
```

Contoh concept:

```text
TENANT_BASE_DOMAIN
TENANT_DOMAIN_SCHEME
TRUSTED_PROXY
```

Gunakan configuration naming sesuai architecture project.

Jangan menulis:

```go
const baseDomain = "openrt.com"
```

atau:

```ts
const tenantDomain = ".openrt.com"
```

atau equivalent.

---

# 29. FRONTEND URL GENERATION

Audit semua tempat yang membangun URL tenant.

Cari:

```text
window.location
hostname
origin
baseURL
tenant URL
subdomain
```

Jika frontend perlu menghasilkan:

```text
https://rt-003.openrt.com
```

gunakan configurable domain configuration.

Jangan hardcode production domain.

---

# 30. LOCAL TEST TENANTS

Buat fixture/seed test yang memungkinkan:

```text
rt-003
rt-004
```

atau equivalent tenant fixtures.

Automated tests harus benar-benar menggunakan hostname berbeda.

Jangan hanya mengubah tenant ID di body.

---

# 31. SECURITY TEST MATRIX

Minimal test matrix:

| Scenario                         | Expected                       |
| -------------------------------- | ------------------------------ |
| Existing tenant A + correct user | ALLOW                          |
| Existing tenant B + correct user | ALLOW                          |
| Unknown tenant                   | DENY                           |
| Inactive tenant                  | DENY                           |
| User A → Host A                  | ALLOW                          |
| User A → Host B                  | DENY                           |
| User B → Host B                  | ALLOW                          |
| User B → Host A                  | DENY                           |
| Missing Host                     | DENY/appropriate handling      |
| Wrong base domain                | DENY                           |
| Spoofed X-Forwarded-Host         | DENY                           |
| Spoofed X-Tenant-ID              | DENY                           |
| Arbitrary tenant slug            | DENY                           |
| Invalid tenant slug              | DENY                           |
| Deleted tenant                   | DENY                           |
| Disabled tenant                  | DENY                           |
| JWT tenant A + Host B            | DENY                           |
| JWT tenant B + Host A            | DENY                           |
| SUPERADMIN → valid tenant        | ALLOW only according to policy |
| SUPERADMIN → nonexistent tenant  | DENY                           |

---

# 32. DNS / TRAEFIK TEST

Jika environment memungkinkan, benar-benar test:

```text
rt-003.<dev-domain>
rt-004.<dev-domain>
unknown.<dev-domain>
```

melalui actual HTTP request.

Jangan hanya unit-test string parsing.

Test actual chain:

```text
DNS/hosts
→ Traefik
→ application
→ tenant resolver
→ database
```

Jika production infrastructure tidak tersedia:

> mark production infrastructure test as `UNTESTED` or `BLOCKED`.

Jangan mengklaim production verified.

---

# 33. NO HARD-CODE

Cari seluruh repository untuk kemungkinan hardcode:

```text
openrt.com
rt-003
rt-004
tenant-003
tenant-004
localhost
```

Bedakan antara:

### Acceptable

Test fixture:

```text
rt-003
```

Seed/test data yang memang sengaja digunakan untuk testing.

### Not acceptable

Production logic:

```text
if hostname == "rt-003.openrt.com"
```

atau:

```text
const baseDomain = "openrt.com"
```

atau:

```text
if tenantSlug == "rt-003"
```

Jika production behavior membutuhkan domain:

> configurable.

---

# 34. DOCUMENTATION

Setelah implementation verified, update documentation yang relevan.

Dokumentasikan:

## Development

Cara menjalankan:

```text
rt-003.<dev-domain>
rt-004.<dev-domain>
```

## Production

Architecture:

```text
*.openrt.com
        ↓
Traefik
        ↓
Application
        ↓
Tenant Resolver
```

## Tenant Lifecycle

```text
create tenant
→ activate
→ routable
→ disable/delete
→ no longer routable
```

## Security

Jelaskan:

* wildcard DNS bukan authorization
* unknown tenant denied
* hostname tenant harus match authorized tenant context
* database schema isolation
* proxy header handling

Dokumentasi harus sesuai dengan implementation aktual.

---

# 35. FINAL VALIDATION

Setelah perubahan:

Run:

* backend tests
* security tests
* tenant resolver tests
* hostname tests
* integration tests
* E2E tests
* frontend tests
* build
* typecheck
* lint
* Docker build
* Docker Compose validation
* Traefik configuration validation jika tersedia

Jangan hanya membuat test.

**RUN THEM.**

---

# 36. DEFINITION OF DONE

Task hanya dianggap selesai jika:

* [ ] Current tenant architecture audited
* [ ] Current hostname behavior verified
* [ ] Subdomain tenant routing verified
* [ ] Development supports tenant subdomains
* [ ] Production architecture supports wildcard tenant subdomains
* [ ] Traefik/reverse proxy audited
* [ ] Unknown tenant denied
* [ ] Inactive tenant denied
* [ ] Deleted tenant denied
* [ ] Cross-tenant hostname attack denied
* [ ] Host header manipulation denied
* [ ] Forwarded-host manipulation denied
* [ ] X-Tenant-ID manipulation denied
* [ ] JWT tenant vs hostname mismatch denied
* [ ] SUPERADMIN behavior verified
* [ ] Tenant membership verified
* [ ] Tenant schema cannot be selected from arbitrary hostname
* [ ] PostgreSQL isolation verified
* [ ] Frontend cache isolation verified
* [ ] PWA/service-worker isolation verified if applicable
* [ ] CORS/origin behavior verified
* [ ] Docker configuration verified
* [ ] Traefik configuration verified
* [ ] Development configuration verified
* [ ] Production configuration verified statically or operationally
* [ ] Base domain configurable
* [ ] No production tenant/domain hardcode
* [ ] Tenant creation does not require source-code modification
* [ ] Tenant deletion/disable behavior verified
* [ ] Automated security tests added/fixed
* [ ] Tests actually executed
* [ ] Documentation updated
* [ ] Remaining limitations reported

---

# 37. FINAL REPORT

Berikan:

## Architecture

Jelaskan architecture aktual:

```text
DNS
→ Traefik
→ Application
→ Tenant Resolver
→ Authentication
→ Tenant Authorization
→ Database
```

## Current Support

```text
Development: VERIFIED / PARTIAL / BLOCKED
Production: VERIFIED / PARTIAL / BLOCKED
Traefik: VERIFIED / PARTIAL / BLOCKED
Wildcard DNS: VERIFIED / PARTIAL / BLOCKED
Tenant isolation: VERIFIED / PARTIAL / BROKEN
```

## Configuration

Tampilkan environment/configuration yang diperlukan tanpa membocorkan secret.

## Security Findings

Untuk setiap issue:

```text
Issue
Root Cause
Fix
Test
Result
```

## Hardcoded Values

Tampilkan hardcoded tenant/domain values yang ditemukan.

Kelompokkan:

```text
SAFE TEST FIXTURE
CONFIGURABLE
UNSAFE PRODUCTION HARDCODE
```

Semua `UNSAFE PRODUCTION HARDCODE` harus diperbaiki.

## Tests

Tampilkan test penting beserta hasil aktual.

## Docker / Traefik

Tampilkan configuration files yang digunakan dan hasil validation.

## Remaining Issues

Gunakan:

```text
CRITICAL
HIGH
MEDIUM
LOW
UNTESTED
BLOCKED
```

Jangan menyembunyikan limitation.

---

# FINAL INSTRUCTION

Jangan menganggap:

```text
*.openrt.com
```

berarti tenant otomatis valid.

**Wildcard DNS hanya routing capability.**

Tenant harus selalu melalui:

```text
HOSTNAME
→ VALIDATE DOMAIN
→ EXTRACT SLUG
→ LOOKUP TENANT
→ VERIFY TENANT EXISTS
→ VERIFY TENANT ACTIVE
→ VERIFY USER AUTHORIZATION
→ ESTABLISH TRUSTED TENANT CONTEXT
→ DATABASE ISOLATION
```

Dan:

```text
JWT tenant ≠ Host tenant
```

harus **DENY**, kecuali explicit authorized tenant-switching flow.

Jangan hardcode tenant.

Jangan hardcode production domain.

Jangan membuat special case untuk RT tertentu.

Jangan membuat wildcard hostname menjadi authorization bypass.

Jangan membuat tenant context langsung dari arbitrary Host header.

Jangan menganggap Traefik telah menyelesaikan tenant security.

Backend tetap menjadi security boundary.

Target akhir:

> **Setiap RT mendapatkan subdomain unik secara dynamic, development dan production mendukung model tersebut, tenant yang tidak terdaftar tidak dapat diakses walaupun wildcard DNS aktif, authenticated user tidak dapat menggunakan hostname untuk menembus tenant lain, database isolation tetap terjaga, dan seluruh domain/tenant configuration dapat diubah melalui configuration tanpa source-code hardcode.**

**AUDIT → DESIGN VALIDATION → FIX → SECURITY TEST → DOCKER/TRAefik TEST → E2E → DOCUMENT → FINAL REPORT**
