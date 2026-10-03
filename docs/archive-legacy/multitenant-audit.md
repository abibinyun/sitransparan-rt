AI Audit — User Management & Multi-Tenancy SaaS RT

Tujuan

Audit project SaaS multi-tenant ini untuk menentukan apakah implementasi user management, tenant isolation, role, permission, authentication, authorization, dan data ownership sudah benar, aman, dan sesuai kebutuhan aplikasi RT.

Penting: Jangan langsung mengubah kode. Lakukan audit terlebih dahulu dan berikan temuan beserta bukti dari codebase.

1. Konteks Produk

Produk ini adalah SaaS multi-tenant untuk administrasi RT.

Satu tenant = satu RT.

Satu user dapat berpotensi memiliki membership pada satu atau beberapa tenant.

Tidak semua warga harus memiliki akun login.

Data User/Account dan data Resident/Warga idealnya tidak dianggap sebagai hal yang sama.

Tenant harus benar-benar terisolasi.

Role dan permission harus menentukan apa yang boleh dilakukan user.

Akses platform-level seperti Super Admin harus terpisah dari akses tenant-level.

Jangan mengubah arsitektur hanya karena berbeda dari asumsi di atas. Pertama-tama pahami implementasi yang sudah ada, lalu nilai apakah implementasi tersebut valid atau memiliki risiko.

2. Aturan Audit

Jangan melakukan perubahan kode

Pada tahap audit:

Jangan refactor.

Jangan menghapus kode.

Jangan mengubah database schema.

Jangan mengubah permission.

Jangan memperbaiki bug secara langsung.

Jangan membuat migration.

Jangan melakukan commit.

Jika menemukan masalah, laporkan terlebih dahulu.

Jika ada ambiguitas, cari evidence di codebase sebelum menyimpulkan.

3. Pahami Arsitektur Terlebih Dahulu

Sebelum menilai benar/salah, cari dan pahami:

authentication mechanism

user/account model

tenant model

resident/warga model

membership model

role model

permission model

session/token/JWT

middleware

guards

policies

authorization helpers

API routes

server actions

database repositories/services

frontend route guards

admin panels

invitation/onboarding flow

user activation/deactivation

tenant switching jika tersedia

Cari implementasi aktual, jangan hanya membaca dokumentasi.

Buat ringkasan arsitektur berdasarkan codebase.

4. Audit Model User

Periksa apakah konsep berikut dipisahkan dengan benar:

User / Account
    ↓
Membership
    ↓
Tenant / RT
    ↓
Role / Permission

Resident / Warga
    ↓
(optional) linked User / Account

Periksa:

Apakah User merepresentasikan identitas login?

Apakah Resident merepresentasikan data kependudukan?

Apakah warga dapat ada tanpa memiliki akun?

Apakah satu User dapat dikaitkan dengan Resident?

Apakah satu User dapat memiliki membership di beberapa tenant?

Apakah role disimpan pada User global atau pada Membership?

Apakah perubahan role pada satu RT dapat mempengaruhi RT lain?

Risiko yang dicari

Contoh masalah:

users.tenant_id
users.role

yang menyebabkan satu User hanya dapat memiliki satu tenant/role secara global, padahal sistem membutuhkan membership per tenant.

Tetapi jangan menganggap struktur tersebut otomatis salah. Nilai berdasarkan requirement dan implementasi aktual.

5. Audit Multi-Tenancy

Ini adalah bagian paling penting.

Pastikan setiap request yang mengakses data tenant memiliki konteks tenant yang valid.

Contoh konsep yang diharapkan:

Authenticated User
        +
Current Tenant
        +
Authorization
        ↓
Tenant-scoped data access

Periksa apakah data query selalu dibatasi berdasarkan tenant.

Cari pola berbahaya seperti:

SELECT * FROM residents WHERE id = ?

jika seharusnya:

SELECT *
FROM residents
WHERE id = ?
AND tenant_id = ?

Periksa seluruh layer:

controller

route handler

service

repository

ORM

raw SQL

server actions

background jobs

cron jobs

exports

reports

file storage

document access

6. Cross-Tenant Access Test

Secara konseptual uji skenario berikut:

Tenant A = RT 01
Tenant B = RT 02

User A hanya memiliki akses RT 01.

Periksa apakah User A bisa:

membaca resident RT 02

membaca payment RT 02

membaca dues RT 02

membaca announcement RT 02

mengubah resident RT 02

menghapus data RT 02

mengakses file RT 02

melihat dashboard RT 02

memanggil endpoint RT 02 secara langsung

mengganti tenant_id pada request

mengganti resource ID menjadi resource milik RT 02

Prioritaskan pencarian terhadap IDOR/BOLA dan cross-tenant data leakage.

7. Audit Tenant Context

Cari bagaimana aplikasi menentukan:

currentTenant
tenantId
organizationId
workspaceId

Periksa apakah tenant context berasal dari:

JWT/session

URL

subdomain

database membership

request header

frontend state

localStorage

kombinasi beberapa mekanisme

Pastikan tenant context dari client tidak dipercaya begitu saja.

Contoh yang berisiko:

{
  "tenant_id": "tenant-b"
}

Jika server langsung mempercayai nilai tersebut tanpa memeriksa membership user.

Server harus memverifikasi:

user memiliki membership pada tenant tersebut

dan kemudian:

user memiliki permission yang dibutuhkan

8. Audit Membership

Jika terdapat konsep membership, periksa:

Membership
- user_id
- tenant_id
- role_id
- status

Periksa:

Apakah membership unique?

Apakah user dapat memiliki lebih dari satu membership?

Apakah status membership diperiksa?

Apakah membership inactive masih bisa login/mengakses tenant?

Apakah role melekat pada membership?

Apakah user dapat mengubah membership dirinya sendiri?

Apakah user dapat memberikan dirinya role lebih tinggi?

Apakah user dapat membuat membership pada tenant lain?

Apakah tenant admin dapat mengelola membership tenant lain?

9. Audit Role

Identifikasi role aktual yang digunakan project.

Contoh:

Platform:
- super_admin

Tenant:
- tenant_admin
- secretary
- treasurer
- staff
- resident

Jangan membuat role baru hanya untuk audit.

Periksa:

Role disimpan di mana?

Apakah role tenant-specific?

Apakah role global?

Apakah role dapat berubah tanpa authorization?

Apakah role hierarchy aman?

Apakah tenant admin dapat membuat user menjadi super_admin?

Apakah user dapat mengubah role dirinya sendiri?

Apakah role hanya dipakai untuk frontend visibility atau benar-benar dicek backend?

10. Audit Permission

Jika menggunakan permission, identifikasi permission aktual.

Contoh:

resident.view
resident.create
resident.update
resident.delete

finance.view
finance.create
finance.update
finance.delete

settings.manage
membership.manage

Periksa:

Apakah permission diverifikasi di backend?

Apakah frontend hanya digunakan sebagai UX?

Apakah endpoint sensitif memiliki authorization check?

Apakah permission dapat di-bypass dengan direct API request?

Apakah permission konsisten antara UI dan API?

Apakah permission inheritance/hierarchy aman?

Frontend hiding bukan authorization.

Contoh:

Button "Delete" disembunyikan

tidak cukup jika:

DELETE /api/residents/:id

masih dapat dipanggil oleh user tanpa permission.

11. Audit Platform Admin vs Tenant Admin

Pastikan:

Platform Admin
    ≠
Tenant Admin

Platform Admin dapat memiliki akses lintas tenant sesuai kebutuhan operasional SaaS.

Tenant Admin hanya boleh mengelola tenant tempat dia memiliki membership.

Cari kemungkinan privilege escalation:

tenant_admin
    ↓
ubah role sendiri
    ↓
super_admin

atau:

tenant_admin
    ↓
ubah tenant_id
    ↓
akses tenant lain

12. Audit Authentication

Periksa:

password hashing

session handling

JWT validation

refresh token

token expiration

logout

account activation

email verification jika ada

password reset

invite flow

OAuth/social login jika ada

session invalidation setelah account disabled

session invalidation setelah membership dicabut

Jangan memberikan penilaian berdasarkan library saja. Periksa bagaimana library tersebut digunakan.

13. Audit User Lifecycle

Periksa skenario:

User baru

Invite
→ create account
→ assign membership
→ assign role
→ activate

User keluar dari RT

membership.status = inactive

Pastikan user tidak lagi dapat mengakses tenant tersebut.

User dihapus

Pastikan tidak terjadi:

orphaned data

kehilangan audit history

akses masih aktif

foreign key bermasalah

Pertimbangkan apakah soft delete lebih tepat daripada hard delete.

14. Audit Resident Lifecycle

Periksa apakah sistem membedakan:

Resident exists

dengan:

Resident has login account

Contoh yang valid:

Resident: Andi
Account: null

Kemudian:

Resident: Andi
Account: user_123

Periksa apakah linking account ↔ resident aman dan tidak memungkinkan user mengklaim resident milik orang lain.

15. Audit Database

Identifikasi semua tabel yang berhubungan dengan tenant.

Contoh:

users
tenants
memberships
roles
permissions
residents
households
dues
payments
announcements
documents

Untuk setiap tabel tenant-owned, periksa:

Apakah memiliki tenant identifier?

Apakah tenant identifier dapat dipercaya dari client?

Apakah foreign key konsisten?

Apakah query selalu tenant scoped?

Apakah unique constraint sudah mempertimbangkan tenant?

Contoh:

UNIQUE(email)

vs:

UNIQUE(tenant_id, code)

Tentukan mana yang benar berdasarkan business rule.

16. Audit API / Server Actions

Inventaris semua endpoint/action yang berkaitan dengan:

users

residents

memberships

roles

permissions

tenants

finance

documents

Untuk setiap endpoint penting, catat:

Endpoint
Authentication
Tenant check
Membership check
Permission check
Resource ownership check
Result

Cari endpoint yang:

hanya mengecek login

tidak mengecek tenant

tidak mengecek permission

menerima tenant_id dari client tanpa validasi

menerima resource ID tanpa memastikan resource berada pada tenant user

17. Audit Frontend

Periksa route/page seperti:

/admin
/users
/residents
/finance
/settings

Pastikan frontend guard tidak dianggap sebagai security boundary.

Periksa juga:

tenant switching

menu visibility

role visibility

unauthorized page

stale tenant state

cached data antar tenant

query cache key yang tidak memasukkan tenant identifier jika diperlukan

Contoh risiko:

queryKey = ["residents"]

padahal data berbeda berdasarkan tenant.

Mungkin seharusnya:

queryKey = ["residents", tenantId]

Nilai berdasarkan framework/cache yang digunakan.

18. Audit File & Document Access

Jika aplikasi memiliki upload file/dokumen, periksa:

apakah file memiliki tenant ownership

apakah URL file dapat ditebak

apakah signed URL digunakan dengan benar

apakah user tenant A dapat membuka file tenant B

apakah authorization dilakukan sebelum file diberikan

Jangan menganggap storage bucket private otomatis menyelesaikan authorization.

19. Audit Background Job

Periksa:

cron

queue

worker

scheduled task

notification

email

WhatsApp integration jika ada

report generation

Pastikan job yang bekerja atas data tenant tidak kehilangan tenant context.

20. Audit Logging

Periksa apakah operasi sensitif memiliki audit trail.

Minimal pertimbangkan:

actor_user_id
tenant_id
action
resource_type
resource_id
timestamp
metadata

Contoh:

Budi
RT 01
CHANGE_ROLE
user_123
resident → treasurer
2026-08-25 20:10

Periksa juga apakah audit log sendiri tenant-scoped dan tidak bisa dimanipulasi oleh tenant user biasa.

21. Security Scenarios yang Wajib Dicek

Coba jawab apakah setiap skenario berikut aman:

Scenario A — Cross Tenant Read

User RT 01
GET resident milik RT 02

Expected:

403 / 404

Scenario B — Cross Tenant Update

User RT 01
PUT resident RT 02

Expected:

403 / 404

Scenario C — Tenant ID Manipulation

POST /residents

tenant_id = RT 02

sementara user hanya anggota RT 01.

Expected:

rejected

Scenario D — Role Escalation

resident
→ ubah role sendiri menjadi tenant_admin

Expected:

rejected

Scenario E — Membership Escalation

User RT 01
→ membuat dirinya menjadi member RT 02

Expected:

rejected

Scenario F — Disabled Membership

membership RT 01 = inactive

User mencoba mengakses RT 01.

Expected:

rejected

Scenario G — Direct API Access

User biasa mencoba endpoint admin secara langsung tanpa UI.

Expected:

rejected

22. Cari Security Smells

Secara khusus cari:

tenant_id dari request langsung dipercaya
role dari request langsung dipercaya
is_admin dari client
is_super_admin dari client
user_id dari body digunakan sebagai actor
resource ID tanpa tenant check
frontend-only authorization
global mutable tenant state
hardcoded tenant ID
hardcoded admin email
bypass berdasarkan environment

Juga cari pola seperti:

if (user)

yang seharusnya:

if (user && membership && permission)

Tetapi jangan menandai setiap pengecekan sederhana sebagai bug tanpa memahami call chain.

23. Output yang Wajib Diberikan

Setelah audit selesai, buat laporan dengan struktur berikut.

A. Executive Summary

Jawab:

Apakah user management saat ini sudah benar?
Apakah multi-tenancy aman?
Apakah ada risiko cross-tenant?
Apakah role/permission sudah benar?

Berikan rating:

Architecture: X/10
Multi-tenancy: X/10
Authorization: X/10
Authentication: X/10
User Management: X/10
Security: X/10
Overall: X/10

B. Current Architecture

Gambarkan implementasi aktual:

User
 ↓
?
 ↓
?

Gunakan codebase sebagai sumber kebenaran.

C. Findings

Gunakan format:

[CRITICAL]

Title:
Cross-tenant resident access possible

Evidence:
path/to/file.ts:123

Why:
...

Impact:
...

Expected:
...

Recommended fix:
...

Severity:

CRITICAL
HIGH
MEDIUM
LOW
INFO

D. Things That Are Already Correct

Jangan hanya mencari bug.

Tuliskan bagian yang sudah benar:

✓ Tenant isolation pada repository
✓ Role disimpan pada membership
✓ Backend authorization
✓ Resident dan User terpisah

Sertakan evidence file/path jika memungkinkan.

E. Attack Scenarios

Buat tabel:

Scenario

Expected

Actual

Status

RT01 → read RT02

Denied

...

PASS/FAIL

RT01 → update RT02

Denied

...

PASS/FAIL

Resident → admin endpoint

Denied

...

PASS/FAIL

User → self role escalation

Denied

...

PASS/FAIL

F. Recommended Changes

Urutkan:

P0 — harus diperbaiki sebelum production
P1 — sangat disarankan
P2 — improvement
P3 — nice to have

Jangan memberikan rekomendasi refactor besar jika tidak diperlukan.

24. Prinsip Penilaian

Gunakan prinsip berikut:

Authentication ≠ Authorization

Login berhasil bukan berarti user boleh mengakses resource.

Role ≠ Permission

Role adalah kumpulan permission.

User ≠ Resident

User adalah identity/account.

Resident adalah data warga.

Tenant ≠ User

Tenant adalah organisasi/RT.

Frontend guard ≠ Security

Semua authorization penting harus ditegakkan server-side.

tenant_id dari client ≠ trusted tenant

Tenant harus diverifikasi terhadap authenticated user's membership.

25. Jangan Over-Engineer

Jangan menyimpulkan sistem salah hanya karena tidak menggunakan:

RBAC tertentu

ABAC

policy engine

microservices

event sourcing

complicated permission framework

Sistem sederhana dapat benar jika:

Authentication
+
Tenant isolation
+
Membership
+
Authorization
+
Resource ownership

sudah diterapkan dengan aman.

Fokus pada correctness, security, maintainability, dan business requirement.

26. Final Verdict

Pada akhir audit, berikan keputusan yang jelas:

VERDICT:

[ ] READY
[ ] READY WITH FIXES
[ ] NOT READY

Kemudian jelaskan maksimal 10 alasan terpenting.

Jika ada masalah critical/high, jelaskan apakah masalah tersebut:

security vulnerability
data isolation issue
authorization bug
data model issue
business logic issue
maintainability issue

27. Jika Ada Ketidakpastian

Jangan mengarang.

Gunakan:

UNKNOWN

dan jelaskan:

Evidence yang ditemukan:
...

Evidence yang belum ditemukan:
...

Yang perlu diverifikasi:
...

Jika perlu, minta file/code tertentu untuk melanjutkan audit.

28. Prioritas Audit

Urutan prioritas:

1. Cross-tenant data access
2. Authorization bypass
3. Privilege escalation
4. Tenant context validation
5. Membership validation
6. Role/permission correctness
7. Authentication/session security
8. User/Resident model
9. Database constraints
10. Frontend behavior
11. Logging
12. Maintainability

Mulai audit sekarang dengan membaca codebase dan memahami arsitektur aktual. Jangan mengubah kode sebelum laporan audit selesai.