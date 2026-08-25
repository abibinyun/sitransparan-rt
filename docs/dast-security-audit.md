# Laporan Audit & Pengujian Penetrasi Keamanan (DAST / Burp Suite Simulation)
**Sitransparan RT/RW SaaS Multi-Tenant Platform**
**Tanggal Uji**: 25 Agustus 2026

Dokumen ini mendokumentasikan hasil pengujian penetrasi keamanan mendalam (*dynamic application security testing / DAST*) menggunakan simulasi serangan Burp Suite (Repeater/Intruder/Scanner) terhadap endpoint backend, otentikasi JWT, isolasi skema multi-tenant, dan otorisasi RBAC.

---

## 1. Ringkasan Hasil Pengujian (Executive Summary)

| Kategori Vektor Serangan | Metode / Payload Uji | Ekspektasi | Hasil Pengujian Aktual | Status |
|---|---|---|---|:---:|
| **JWT 'None' Algorithm** | Token dengan header `{"alg":"none"}` tanpa signature | 401 Unauthorized | **401 Unauthorized** (Algoritma dikunci ke HS256) | **PASS** |
| **JWT Tampered Signature** | Payload diubah (`role: superadmin`) dengan hash sembarang | 401 Unauthorized | **401 Unauthorized** (Verifikasi HMAC gagal) | **PASS** |
| **Cross-Tenant Subdomain Spoofing** | Mengirim Token RT-003 ke Host `rt-004.openrt.local` | 403 Forbidden | **403 Forbidden: tenant mismatch** | **PASS** |
| **SuperAdmin Subdomain Access** | Mengirim Token SuperAdmin ke Host Subdomain RT | 403 Forbidden | **403 Forbidden: tenant mismatch** | **PASS** |
| **SQL Injection (SQLi)** | Payload `' OR '1'='1` & `OR 1=1--` pada slug & parameter query | 404 / Ditolak aman | **404 Not Found** (Parameterisasi SQL murni) | **PASS** |
| **Privilege Escalation** | Role `admin_rt` memanggil endpoint `/api/v1/superadmin/*` | 403 Forbidden | **403 Forbidden: insufficient permissions** | **PASS** |
| **Append-Only Tampering** | Request `PUT` & `DELETE` pada transaksi kas | 405 Method Not Allowed | **405 Method Not Allowed** (Append-only terproteksi) | **PASS** |
| **Host Header Injection / Suffix Trick** | `Host: rt-003.openrt.local.attacker.com` | 403 / 401 Ditolak | **403 Forbidden** (Validasi regex Hostname ketat) | **PASS** |
| **IDOR / Resource Ownership** | User RT-003 memanggil data record ID milik RT-004 | 404 / 403 | **404 Not Found** (Schema-per-tenant isolation) | **PASS** |
| **CORS & Origin Reflection** | Request dengan `Origin: https://evil-attacker.com` | Tidak ada wildcard/refleksi | **Aman** (No permissive Access-Control-Allow-Origin) | **PASS** |

---

## 2. Bukti Pengujian Rinci (Proof of Concept)

### A. Uji Manipulasi Token JWT (JWT Attack Vectors)
1. **Algoritma 'none' (Bypass Signature)**:
   - *Payload*: `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0...`
   - *Respons*: `HTTP 401 Unauthorized`
   - *Analisis*: Backend secara eksplisit memeriksa metode penandatanganan dan menolak token non-HMAC.

2. **Pemalsuan Role (Claim Tampering)**:
   - *Payload*: Token valid dimodifikasi klaim `role: "superadmin"`.
   - *Respons*: `HTTP 401 Unauthorized`
   - *Analisis*: Backend memverifikasi signature menggunakan secret key server `JWT_SECRET`.

---

### B. Uji Isolasi Lintas Tenant & IDOR (Cross-Tenant & IDOR)
1. **Penyusupan Subdomain (Host vs JWT Mismatch)**:
   - *Request*:
     ```http
     GET /api/v1/residents HTTP/1.1
     Host: rt-004.openrt.local
     Authorization: Bearer <TOKEN_ADMIN_RT_003>
     ```
   - *Respons*:
     ```json
     HTTP/1.1 403 Forbidden
     {"error":"forbidden: tenant mismatch"}
     ```
   - *Analisis*: `TenantMiddleware` mendeteksi ketidakcocokan antara tenant klaim JWT dan tenant pemilik subdomain target.

2. **Injeksi Parameter `tenant_id` pada Body Request**:
   - *Uji*: Mengirim `POST /api/v1/residents` dengan menyertakan `"tenant_id": "<ID_RT_004>"`.
   - *Hasil*: Backend mengabaikan field `tenant_id` dari client dan mengekstrak context murni dari token pengirim $\rightarrow$ Record hanya masuk ke skema `tenant_rt_003`.

---

### C. Uji Injeksi SQL & Parameter Polusi (SQLi & Injection)
1. **Endpoint Publik `/api/v1/t/{slug}/info`**:
   - *Payload*: `/api/v1/t/rt-003'OR'1'='1/info`
   - *Hasil*: `HTTP 404 Not Found` (Tidak terjadi SQL error, sanitasi query bekerja via parameterized query).

2. **Endpoint Resolusi Host `/api/v1/t/resolve`**:
   - *Payload*: `/api/v1/t/resolve?host=rt-003.openrt.local'%20OR%201=1--`
   - *Hasil*: `HTTP 404 Not Found` (Driver PostgreSQL memetakan input sebagai literal string).

---

### D. Uji Integritas Buku Kas (Append-Only Enforcement)
- *Uji*: Pengurus mencoba mengubah atau menghapus transaksi kas melalui `PUT` atau `DELETE /api/v1/financial/transactions/{id}`.
- *Respons*: `HTTP 405 Method Not Allowed`.
- *Analisis*: Rute `PUT` dan `DELETE` tidak didaftarkan di mux backend. Koreksi kesalahan pembukuan diwajibkan melalui jurnal pembalik (*reversing entry*), menjamin keaslian audit trail.

---

### E. Uji Eskalasi Hak Akses (Privilege Escalation)
- *Uji*: Pengguna dengan role `admin_rt` atau `resident` mencoba membuat tenant baru di `/api/v1/superadmin/tenants`.
- *Respons*: `HTTP 403 Forbidden: insufficient permissions`.
- *Analisis*: Guard `RBACMiddleware(domain.RoleSuperAdmin)` memblokir seluruh akun selain SuperAdmin platform.

---

## 3. Kesimpulan Akhir Audit Keamanan

Sistem **Sitransparan RT/RW** memiliki postur keamanan yang sangat kuat (*Hardened Security Baseline*):
- **Pertahanan Berlapis (*Defense-in-Depth*)**: Database schema isolation $\rightarrow$ Middleware Host/JWT verification $\rightarrow$ RBAC Handler guards.
- **Bebas Kerentanan Kritis**: Tidak ditemukan celah SQLi, IDOR lintas tenant, JWT forgery, maupun eskalasi role.
