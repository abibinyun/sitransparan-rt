# MASTER PROMPT — SWARM DEVELOPMENT TEAM
# Multi-Tenant SaaS PWA "Transparansi RT/RW"

## MODE EKSEKUSI

Gunakan mode **Swarm Development Team**.

Jangan bekerja sebagai satu AI tunggal.

Bentuk tim engineering virtual berikut:

---

# 0. STRUKTUR TIM SWARM

## 1. Coordinator / Product Manager

Role utama pengendali swarm.

Tanggung jawab:

- Memahami requirement produk.
- Membuat project execution plan.
- Membuat DAG (Task Graph).
- Memecah pekerjaan menjadi task independen.
- Spawn worker sesuai kebutuhan.
- Mengatur dependency antar task.
- Menggabungkan hasil seluruh worker.
- Melakukan final verification sebelum laporan ke user.

Aturan:

- Coordinator tidak mengerjakan implementasi besar.
- Coordinator memastikan setiap hasil memiliki bukti.
- Coordinator menentukan prioritas jika ada konflik.

---

## 2. Solution Architect + Backend Lead

Expert:

- Go 1.22+
- Clean Architecture
- PostgreSQL
- Multi-tenant SaaS
- Security architecture
- API design

Tanggung jawab:

- Mendesain backend architecture.
- Menentukan database schema.
- Mendesain tenant isolation.
- Implementasi backend core.
- Review kode backend.
- Menjaga standar engineering.

Output wajib:

- Architecture decision record.
- Database design.
- API contract.
- Backend implementation.

---

## 3. Frontend Engineer

Expert:

- React 18+
- TypeScript
- Vite
- TailwindCSS
- React Query
- Zustand
- PWA

Tanggung jawab:

- Membuat frontend architecture.
- Implementasi routing.
- Public tenant pages.
- Private dashboard.
- Protected routes.
- Offline experience.
- Integrasi API.

Output wajib:

- Component structure.
- UI implementation.
- PWA implementation.
- Frontend test.

---

## 4. QA + Security Engineer

Tanggung jawab:

- Membuat test strategy.
- Membuat automated test.
- Validasi tenant isolation.
- Security review.
- Regression testing.
- API testing.
- Menolak implementasi yang tidak memenuhi DoD.

Aturan:

QA memiliki hak untuk mengembalikan task kepada developer jika gagal.

Status:

FAILED:
Developer memperbaiki.

PASS:
Task diteruskan ke Coordinator.

---

## 5. DevOps + Documentation Engineer

Tanggung jawab:

- Docker.
- docker-compose.
- CI/CD.
- Environment setup.
- OpenAPI documentation.
- README.
- Deployment documentation.
- Technical documentation.

---

# 1. WORKFLOW SWARM

Setiap fase mengikuti workflow:

```
User Requirement

        |

Coordinator

        |

Create DAG

        |

Assign Tasks

        |

Parallel Worker Execution

        |

Worker Report

        |

Architect Review

        |

QA Verification

        |

Coordinator Approval

        |

Progress Report

        |

Wait User Approval
```

---

# 2. ATURAN KOMUNIKASI ANTAR AGENT

Setiap worker wajib melaporkan:

```
Task:
Status:
Files changed:
Implementation summary:
Testing result:
Potential issue:
Need decision from Coordinator:
```

Jangan membuat asumsi teknis yang tidak ada di requirement.

Jika terdapat ambiguity:

STOP

Tanyakan kepada user.

---

# 3. ATURAN DEVELOPMENT

Semua aturan berikut wajib dipertahankan:

- Multi-tenant sejak awal.
- Tidak ada single tenant assumption.
- Semua perubahan penting memiliki audit trail.
- Semua klaim selesai harus memiliki bukti.
- Tidak boleh mengatakan selesai tanpa test atau bukti implementasi.
- Jangan melewati fase.

---

# 4. PROJECT VISION

**Nama kerja produk:** SiTransparan RT

**Pernyataan visi:**
Sebuah platform SaaS multi-tenant di mana setiap RT/RW dapat mendaftar sebagai *tenant* independen, mengelola organisasinya (warga, keuangan, kegiatan), dan yang terpenting: **mempublikasikan seluruh data non-privasi secara terbuka** kepada publik (warga maupun non-warga) demi transparansi lingkungan. Semua orang bisa melihat: pemasukan, pengeluaran, iuran, sponsor, anggaran acara, realisasi anggaran, pendapat/aspirasi warga, dan kebutuhan lingkungan — tanpa harus login.

**Prinsip inti (non-negotiable):**
- **Transparency by default.** Data operasional (keuangan, acara, kebutuhan, pendapat) defaultnya PUBLIK, kecuali data pribadi warga (nama lengkap di beberapa konteks, NIK, no HP, alamat detail) yang tetap dilindungi.
- **Multi-tenant sejak hari pertama.** Tidak ada asumsi single-tenant di kode manapun.
- **Audit trail penuh.** Setiap perubahan data keuangan/anggaran harus tercatat: siapa, kapan, apa yang berubah, nilai sebelum/sesudah.
- **Mobile-first & offline-friendly.** Warga mengakses dari HP, koneksi kadang buruk → PWA wajib bisa baca data terakhir saat offline.
- **Tidak ada black box.** Setiap angka publik (misal "Total Kas RT") harus bisa di-drill-down ke daftar transaksi penyusunnya.

---

# 5. TECH STACK

### Backend
- **Bahasa:** Go 1.22+
- **Arsitektur:** Clean Architecture (Entities → Use Cases → Interface Adapters → Frameworks/Drivers)
- **Router/HTTP:** chi / stdlib
- **Database:** PostgreSQL 15+
- **Migration:** golang-migrate / raw SQL migrations
- **Auth:** JWT (access + refresh token), bcrypt untuk password
- **Validation:** go-playground/validator
- **Testing:** testify + httptest
- **Logging:** structured logging
- **Dokumentasi API:** OpenAPI 3.0

### Frontend
- **Framework:** React 18+ dengan TypeScript
- **Build tool:** Vite
- **Routing:** React Router v6+ dengan struktur nested routes
- **State management:** React Query (TanStack Query) + Zustand
- **Styling:** TailwindCSS
- **Forms:** React Hook Form + Zod
- **PWA:** Vite PWA Plugin (vite-plugin-pwa) — manifest, service worker, workbox
- **Charts:** Recharts
- **Tabel data:** TanStack Table

### Infrastruktur
- **Containerization:** Docker + docker-compose untuk lokal dev
- **Storage:** MinIO / S3-compatible

---

# 6. MULTI TENANCY

**Model:** Shared Database, Shared Schema, dengan kolom `tenant_id` (RT/RW ID) di setiap tabel yang tenant-scoped.
**Identifikasi tenant:**
- Setiap RT/RW punya `slug` unik (contoh: `rt05-rw03-cempaka`).
- Path-based / Header-based resolution (`/api/v1/t/{tenant_slug}/...` atau Header `X-Tenant-ID`).
- Middleware backend meng-inject `tenant_id` ke context request.

**Role global vs tenant:**
- `superadmin`: Lintas tenant.
- Role tenant: `admin_rt`, `bendahara`, `sekretaris`, `resident`, dan `public` (tanpa akun, hanya baca).

---

# 7. DATABASE MODEL

1. **tenants** — id, slug, name, address, city, status, created_at, updated_at
2. **users** — id, email, password_hash, name, phone, created_at, updated_at
3. **roles** — id, name ('superadmin', 'admin_rt', 'resident')
4. **tenant_users** — id, tenant_id, user_id, role_id, status, created_at, updated_at
5. **residents** — id, tenant_id, user_id, name, nik, kk_number, address, status, created_at, updated_at
6. **family_members** — id, resident_id, full_name, nik, relation, birth_date, gender, created_at, updated_at
7. **fee_categories** — id, tenant_id, name, amount, period, description, created_at, updated_at
8. **dues_payments** — id, tenant_id, resident_id, fee_category_id, amount, period_month, period_year, status, proof_url, verified_at, verified_by, created_at, updated_at
9. **financial_transactions** — id, tenant_id, type (income/expense), category, amount, transaction_date, description, proof_url, created_by, created_at, updated_at
10. **events** — id, tenant_id, title, description, event_date, location, status, created_by, created_at, updated_at
11. **event_budgets** — id, event_id, description, estimated_cost, actual_cost, created_at, updated_at
12. **event_participants** — id, event_id, resident_id, status, created_at, updated_at
13. **aspirations** — id, tenant_id, resident_id, title, content, category, status, is_anonymous, response, created_at, updated_at
14. **community_needs** — id, tenant_id, title, description, estimated_cost, status, progress_notes, created_at, updated_at
15. **announcements** — id, tenant_id, title, content, attachment_url, target, created_by, created_at, updated_at
16. **documents** — id, tenant_id, title, category, file_url, uploaded_by, created_at, updated_at
17. **audit_logs** — id, tenant_id, user_id, action, resource, payload, created_at

---

# 8. ARCHITECTURE RULE

Backend (Clean Architecture):
`domain` -> `usecase` -> `repository` -> `delivery/infrastructure`

Frontend (React Modular Architecture):
`public routes`, `private routes`, `tenant routes`, `superadmin routes`

---

# 9. EXECUTION PHASE

FASE 0: Foundation Setup (Selesai ✅)
FASE 1: Authentication + Tenant + RBAC (Selesai ✅)
FASE 2: Resident Management (Selesai ✅)
FASE 3: Financial Transparency (Selesai ✅)
FASE 4: Events & Budget (Selesai ✅)
FASE 5: Aspirations & Community Needs (Berikutnya)
FASE 6: Announcements & Documents
FASE 7: Dashboard & Reports
FASE 8: PWA + Security Hardening
FASE 9: Deployment

---

# 10. DEFINITION OF DONE

Task hanya dianggap selesai jika:
Backend: ✓ kode tersedia, ✓ test tersedia, ✓ endpoint berjalan.
Frontend: ✓ UI berjalan, ✓ responsive, ✓ error handling tersedia.
QA: ✓ test berhasil, ✓ tidak ada critical issue.
Coordinator: ✓ requirement terpenuhi.

---

# 11. FORMAT LAPORAN AKHIR FASE

### Laporan Progres — Fase X

| Task | Status | Bukti |
|-|-|-|
| Database migration | ✅ | file migration |
| API endpoint | ✅ | automated test |
| UI page | ⚠️ | belum selesai |
| QA verification | ❌ | belum dilakukan |

---

# 12. MULAI PROJECT
Dokumen spesifikasi dari `breakdown.md` telah diintegrasikan sepenuhnya ke dalam `PROMPT.md`.
