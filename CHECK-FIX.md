MASTER TASK — FIX & FULLY VALIDATE AUTHENTICATION, RBAC, MULTI-TENANT ISOLATION & AUTHORIZATION

Anda bekerja pada project Sitransparan RT/RW, sebuah SaaS PWA multi-tenant.

PRIMARY OBJECTIVE

Tujuan utama Anda adalah memperbaiki source code project, bukan hanya melakukan audit atau memberikan rekomendasi.

Sistem memiliki banyak tenant/RT dan beberapa role, minimal:

SUPERADMIN
ADMIN_RT
WARGA
role lain yang benar-benar ditemukan di source code

Project harus memastikan:

Setiap user hanya dapat melakukan operation yang memang diizinkan oleh role-nya dan hanya terhadap tenant/resource yang berada dalam scope kewenangannya.

Target utama:

Authentication benar
JWT/session benar
RBAC benar
Tenant isolation benar
Resource-level authorization benar
Cross-tenant access mustahil
Role escalation mustahil
Tenant escalation mustahil
Backend menjadi security boundary
Frontend konsisten dengan backend
PostgreSQL schema isolation aman
Seluruh behavior dibuktikan dengan automated/integration/security tests

Jangan percaya dokumentasi atau klaim bahwa feature sudah "100% implemented". Buktikan dari source code dan test.

ATURAN UTAMA

1. AUDIT DAHULU, TETAPI JANGAN BERHENTI DI AUDIT

Sebelum melakukan perubahan besar, inspect:

authentication
JWT/session
user model
role definitions
tenant model
tenant creation
tenant resolution
auth middleware
RBAC middleware/policy
route registration
handlers
usecases/services
repositories
database migrations
PostgreSQL schema-per-tenant implementation
connection pooling
transaction handling
frontend auth store
frontend route guards
API client/interceptors
TanStack Query cache behavior
protected/public routes

Tujuan audit adalah menemukan root cause, kemudian langsung memperbaikinya.

JANGAN hanya memberikan daftar issue.

JANGAN hanya menjelaskan rekomendasi.

JANGAN berhenti setelah menemukan bug.

Untuk setiap issue yang ditemukan:

FIND
→ ROOT CAUSE
→ FIX SOURCE CODE
→ ADD/FIX TEST
→ RUN TEST
→ FIX REGRESSION
→ RE-TEST

2. JANGAN MEMBUAT ASUMSI BUSINESS RULE

Cari role dan permission yang benar-benar ada dari:

source code
database/migrations
existing tests
BLUEPRINT.md
domain/usecase
existing authorization policy

Jika ada aturan yang ambigu, tandai:

BLOCKED / REQUIRES BUSINESS DECISION

Jangan diam-diam membuat permission baru.

3. MODEL AUTHORIZATION

Pisahkan dengan jelas:

Authentication

"Siapa user ini?"

Harus memvalidasi:

token/session valid
signature valid
expiration
user existence/status
token tampering
malformed token
refresh token jika ada
logout/session invalidation jika ada
RBAC

"Apa yang boleh dilakukan role ini?"

Tenant Authorization

"Tenant mana yang boleh diakses user ini?"

Resource Authorization

"Resource tertentu ini berada dalam scope user atau tidak?"

Authorization harus mempertimbangkan:

authenticated identity

- role
- tenant scope
- target resource
- requested operation

Jangan hanya:

role == ADMIN_RT

4. TENANT MODEL

Project menggunakan multi-tenant PostgreSQL schema-per-tenant:

tenant\_<slug>

Contoh:

tenant_rt_a
tenant_rt_b
tenant_rt_c

Pastikan tenant context berasal dari trusted server-side identity/context.

Jangan mempercayai tenant_id dari client sebagai authority jika bertentangan dengan authenticated identity.

Audit seluruh penggunaan:

tenant_id
tenantID
tenantId
tenant_slug
schema
search_path

Cari dan perbaiki pola berbahaya seperti:

tenantID := request.TenantID

yang kemudian langsung menentukan authorization/database scope tanpa validasi.

5. DEFINISI TENANT ISOLATION

Gunakan invariant berikut:

ADMIN_RT_A
→ boleh mengakses tenant A
→ TIDAK boleh mengakses tenant B/C

ADMIN_RT_B
→ boleh mengakses tenant B
→ TIDAK boleh mengakses tenant A/C

WARGA_A
→ hanya sesuai policy tenant A
→ TIDAK boleh mengakses tenant B/C

WARGA_B
→ hanya sesuai policy tenant B
→ TIDAK boleh mengakses tenant A/C

Untuk SUPERADMIN:

SUPERADMIN
→ global/platform scope
→ hanya operation yang memang didefinisikan sebagai superadmin operation

Jangan otomatis memberikan semua akses kepada SUPERADMIN jika business policy tidak mengizinkannya.

6. CROSS-TENANT SECURITY HARUS DIBUKTIKAN

Buat minimal dua tenant:

tenant_A
tenant_B

Dengan user:

admin_A
admin_B
citizen_A
citizen_B

Test minimal:

admin_A → tenant_A ALLOW sesuai RBAC
admin_A → tenant_B DENY

admin_B → tenant_B ALLOW sesuai RBAC
admin_B → tenant_A DENY

citizen_A → tenant_A ALLOW sesuai RBAC
citizen_A → tenant_B DENY

citizen_B → tenant_B ALLOW sesuai RBAC
citizen_B → tenant_A DENY

Test ini harus berlaku untuk semua resource yang tenant-scoped.

7. CROSS-TENANT RESOURCE ATTACK

Jangan hanya test tenant listing.

Buat test ketika user tenant A mengetahui ID resource tenant B.

Contoh:

GET /api/v1/residents/{resident-from-tenant-B}

dengan authenticated user tenant A.

Expected:

DENY

Boleh menggunakan 403 atau 404 sesuai security policy project, tetapi:

data tidak boleh dikembalikan
metadata sensitif tidak boleh bocor
existence resource tidak boleh dibocorkan jika policy memilih 404

Test juga:

GET
POST
PUT
PATCH
DELETE
APPROVE

sesuai operation yang tersedia.

8. TENANT MANIPULATION TEST

User tenant A harus tetap ditolak jika mencoba:

{
"tenant_id": "tenant_B"
}

atau:

?tenant_id=tenant_B

atau:

/tenants/tenant_B/...

atau header tenant yang dimanipulasi.

Jika SUPERADMIN memang boleh memilih tenant tertentu, implementasikan sebagai explicit authorized global operation, bukan sebagai bypass umum.

9. JWT SECURITY

Audit dan perbaiki:

signing algorithm
signing key
signature validation
expiration
issuer/audience jika digunakan
user_id
role
tenant_id
refresh token
token invalidation

Pastikan user tidak dapat memanipulasi:

role
tenant_id
user_id

dengan mengubah JWT.

Test:

valid token → PASS
expired token → DENY
invalid signature → DENY
malformed token → DENY
tampered role → DENY
tampered tenant → DENY
tampered user_id → DENY
missing token → DENY

Jangan menerima role/tenant dari client sebagai authority jika tidak berasal dari trusted authentication context.

10. ROUTE COVERAGE

Inventaris SEMUA backend route.

Untuk setiap endpoint tentukan:

PUBLIC
AUTHENTICATED
ROLE-RESTRICTED
TENANT-RESTRICTED
RESOURCE-RESTRICTED

Cari route yang lupa diberi middleware.

Periksa SEMUA HTTP method.

Jangan hanya mengaudit:

GET /residents

tetapi juga:

POST /residents
GET /residents/:id
PUT /residents/:id
PATCH /residents/:id
DELETE /residents/:id

jika tersedia.

11. BACKEND HARUS MENJADI SECURITY BOUNDARY

Frontend bukan security boundary.

Jangan menganggap aman karena tombol disembunyikan.

User harus tetap ditolak jika memanggil API secara langsung menggunakan:

curl
Postman
browser devtools
script
custom HTTP client

Backend harus melakukan authorization secara authoritative.

12. FRONTEND AUTHORIZATION

Audit:

Zustand auth state
token handling
route guards
protected routes
role-based navigation
API client
Axios/fetch interceptor
logout
401 handling
403 handling
tenant context
TanStack Query cache

Pastikan user tidak mendapatkan stale data tenant sebelumnya setelah:

logout
login sebagai tenant lain
token expiration
account switching
401

Periksa kemungkinan:

Tenant A data
↓
logout
↓
login Tenant B
↓
Tenant A cached data muncul

Jika terjadi, perbaiki cache invalidation/clearing.

13. POSTGRESQL SCHEMA ISOLATION

Audit:

tenant\_<slug>
search_path
schema selection
database context
repository
transaction
connection pool

Sangat penting untuk memeriksa connection pooling.

Cari kemungkinan:

Request A
tenant = A
search_path = tenant_A

connection returned to pool

Request B
tenant = B
same connection reused

search_path accidentally remains tenant_A

atau variasi lainnya.

Pastikan tenant context tidak bocor antar request.

Jika menggunakan SET search_path, pastikan lifecycle connection/transaction aman.

Jangan menganggap schema-per-tenant aman hanya karena nama schema berbeda.

14. RESOURCE OWNERSHIP

Untuk setiap resource tenant-scoped, pastikan resource tersebut diverifikasi terhadap tenant actor.

Contoh:

ADMIN_A

- # resident_id = resident_B
  DENY

Bukan hanya:

# role == ADMIN_RT

ALLOW

Authorization harus dilakukan sebelum data sensitif/resource diberikan atau dimutasi.

15. ROLE MATRIX

Buat matrix actual berdasarkan role yang ditemukan:

Role Tenant Resource Read Create Update Delete Approve

Isi berdasarkan business rules actual project.

Minimal evaluasi:

SUPERADMIN
ADMIN_RT
WARGA
OTHER ROLES

Jika role tambahan ditemukan, masukkan juga.

16. ROLE ESCALATION

Pastikan user tidak dapat mengubah privilege sendiri melalui:

request body
query
headers
profile update
registration
JWT manipulation
API parameter

Contoh attack:

{
"role": "SUPERADMIN"
}

Expected:

role TIDAK berubah

Jika role management memang hanya boleh dilakukan SUPERADMIN, pastikan endpoint tersebut benar-benar protected.

Test:

WARGA → promote self → DENY
ADMIN_RT → promote self → DENY
ADMIN_RT → promote another user → sesuai policy
SUPERADMIN → permitted operation → sesuai policy

17. TENANT ESCALATION

Pastikan user tidak dapat:

memindahkan dirinya ke tenant lain
mengganti tenant_id
membuat user di tenant lain
mengubah ownership tenant
membaca tenant lain
membuat resource di tenant lain
mengubah resource tenant lain

kecuali operation tersebut memang secara eksplisit merupakan kewenangan SUPERADMIN.

18. PUBLIC ENDPOINTS

Audit endpoint public.

Public endpoint boleh diakses tanpa login hanya jika memang dimaksudkan public.

Pastikan public endpoint tidak dapat digunakan untuk:

membaca private resident data
membaca private financial data
membaca private documents
bypass tenant authorization
mendapatkan internal identifiers/sensitive metadata 19. DOMAIN USE CASE VALIDATION

Setelah security foundation diperbaiki, validasi seluruh use case yang benar-benar ada di project.

Minimal audit:

IAM / Multi-Tenancy
login
logout
user management
tenant management
role management
Demography
warga
keluarga
approval
KTP/KK/document access
Ledger
pemasukan
pengeluaran
reversing entry
saldo
laporan
Event / Budget
event
RAB
committee
RSVP
receipt/document
Public Portal
announcements
aspirations
events
public documents jika ada

Jangan menganggap use case aman hanya karena endpoint-nya ada.

20. NEGATIVE TESTS ADALAH PRIORITAS

Positive test:

Admin A bisa membaca data A

tidak cukup.

Wajib membuktikan:

Admin A TIDAK bisa membaca B
Admin A TIDAK bisa mengubah B
Admin A TIDAK bisa menghapus B
Admin A TIDAK bisa approve B

Warga A TIDAK bisa menjalankan admin operation

Warga A TIDAK bisa mengakses data tenant B

Admin A TIDAK bisa mengambil alih role

Admin A TIDAK bisa mengganti tenant

21. JANGAN MEMBUAT BYPASS

DILARANG memperbaiki bug dengan:

hardcode email
hardcode tenant
hardcode special user
bypass middleware
skip authorization
mematikan test
menghapus endpoint
mengubah expected result agar test pass
menyembunyikan error di frontend

Jangan membuat:

if user.Email == "admin@example.com" {
bypassAuthorization()
}

atau pola setara.

22. JANGAN MASSIVE REWRITE

Pertahankan architecture existing jika architecture tersebut masih valid.

Gunakan:

middleware
policy/service
usecase
repository
domain layer

sesuai struktur project.

Jangan memindahkan semua authorization ke satu tempat secara sembarangan.

Namun jika ditemukan architectural flaw yang menyebabkan security vulnerability, perbaiki akar masalahnya secara benar meskipun membutuhkan perubahan beberapa file.

Prioritas:

Security
Correctness
Tenant isolation
Authorization
Testability
Maintainability

23. AUTOMATED SECURITY TESTS

Tambahkan/perbaiki tests yang benar-benar menjalankan authorization.

Minimal test fixture:

tenant_A
tenant_B

superadmin
admin_A
admin_B
citizen_A
citizen_B

Test:

Authentication
valid login
invalid login
expired token
invalid token
malformed token
missing token

RBAC
allowed role operation
forbidden role operation

Tenant isolation
A → A
A → B
B → A
B → B

Resource isolation
resource A → user A
resource B → user A
resource A → user B
resource B → user B

Manipulation
tenant_id manipulation
role manipulation
resource ID manipulation
JWT manipulation
header manipulation
query manipulation
body manipulation

Regression

Jalankan test suite existing dan test baru.

24. TEST HARUS DIJALANKAN, BUKAN HANYA DIBUAT

Jangan membuat test lalu mengklaim aman.

WAJIB menjalankan:

backend unit tests
integration tests
security tests
frontend tests jika tersedia
build
lint/typecheck jika tersedia

Jika Docker environment diperlukan, gunakan environment tersebut.

Jika test gagal:

debug
→ fix
→ rerun

Jangan mengubah test hanya agar implementation yang salah terlihat pass.

25. JIKA ADA BLOCKER

Jika tidak dapat menjalankan test karena dependency/environment/credential/infrastructure:

JANGAN mengklaim test PASS.

Gunakan:

UNTESTED / BLOCKED

Jelaskan:

BLOCKER
CAUSE
WHAT WAS VERIFIED STATICALLY
WHAT STILL NEEDS TO BE EXECUTED

26. JANGAN MENYATAKAN "100% AMAN" TANPA BUKTI

Jangan mengatakan:

100% fixed
100% secure
production ready

hanya karena:

compile berhasil
login berhasil
satu endpoint berhasil
unit test berhasil
frontend terlihat benar.

Gunakan status:

VERIFIED
PARTIAL
BROKEN
UNTESTED
BLOCKED

27. DEFINITION OF DONE

Task ini hanya dianggap selesai jika:

[ ] Authentication verified
[ ] JWT/session verified
[ ] RBAC verified
[ ] SUPERADMIN permissions verified
[ ] ADMIN_RT permissions verified
[ ] WARGA permissions verified
[ ] Other roles verified
[ ] Tenant isolation verified
[ ] Cross-tenant read denied
[ ] Cross-tenant create denied
[ ] Cross-tenant update denied
[ ] Cross-tenant delete denied
[ ] Cross-tenant approve denied
[ ] Resource-level authorization verified
[ ] Role escalation denied
[ ] Tenant escalation denied
[ ] JWT manipulation denied
[ ] Tenant parameter manipulation denied
[ ] Protected route coverage verified
[ ] Backend enforcement verified
[ ] Frontend guards verified
[ ] Frontend cache isolation verified
[ ] PostgreSQL schema isolation verified
[ ] Connection pool tenant leakage checked
[ ] Public endpoint boundaries verified
[ ] Existing regression tests pass
[ ] New security tests pass
[ ] Build passes
[ ] Typecheck/lint passes where applicable

Jika ada critical item yang gagal, jangan menyatakan task selesai.

28. FINAL REPORT

Setelah semua perubahan, berikan laporan ringkas tetapi konkret.

Format:

Changes Made

Daftar file/area yang benar-benar diubah dan alasan perubahan.

Security Findings
CRITICAL
HIGH
MEDIUM
LOW

Untuk setiap finding:

Issue
Root cause
Fix
Test
Result

Authentication
PASS / FAIL / PARTIAL / BLOCKED

RBAC
SUPERADMIN PASS/FAIL
ADMIN_RT PASS/FAIL
WARGA PASS/FAIL
OTHER PASS/FAIL

Tenant Isolation
A → A PASS/FAIL
A → B PASS/FAIL
B → A PASS/FAIL
B → B PASS/FAIL

Security Tests

Tampilkan test penting yang dijalankan dan hasilnya.

Regression Tests

Tampilkan hasil existing test suite.

Remaining Issues

Jangan sembunyikan issue yang tersisa.

Gunakan:

CRITICAL
HIGH
MEDIUM
LOW
UNTESTED
BLOCKED

FINAL INSTRUCTION

Jangan berhenti pada audit.

Anda ditugaskan untuk:

AUDIT
→ FIND
→ UNDERSTAND ROOT CAUSE
→ FIX SOURCE CODE
→ ADD/FIX TESTS
→ RUN TESTS
→ FIX REGRESSIONS
→ RE-TEST
→ FINAL REPORT

Jangan mengarang hasil test.

Jangan mengklaim aman tanpa bukti.

Jangan mengubah business rules tanpa dasar.

Jangan membuat bypass.

Jangan hanya memperbaiki frontend.

Backend harus menjadi security authority.

Prioritas tertinggi adalah:

Tidak boleh ada cross-tenant data leakage dan tidak boleh ada role/privilege escalation.

Setelah itu pastikan seluruh role dan use case bekerja sesuai authorization policy masing-masing.

Jika Anda menemukan bug, perbaiki langsung pada source code dan buktikan perbaikannya dengan test.

Jika tidak menemukan bug pada suatu area, tandai sebagai VERIFIED hanya jika benar-benar telah dibuktikan melalui inspection dan test yang relevan.

Ini yang saya sarankan Anda pakai sebagai prompt utama. Jangan tambahkan prompt-prompt sebelumnya lagi; yang ini sudah menggabungkannya.
