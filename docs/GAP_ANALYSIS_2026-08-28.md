# GAP Analysis — Sitransparan RT/RW (2026-08-28)

> Sumber: audit code langsung (`backend/*`, `frontend/*`, `migrations 00001-020`, `openapi.yaml`) — bukan docs. Update bertahap saat fix.

## Ringkasan
- **Fixed minggu ini (8 item):** double-prefix `social.ts`, `push.ts` axios tanpa auth, `dues status=pending`, `PUT /documents`, `crypto fallback`, `media_urls` validasi, `broadcast timeout`, `Reaction/Poll/Badge` error handling.
- **Sisa TODO:** 0 gap — semua P0/P1/P2 DONE. E2E 64/64, unit 104, security 7, `go vet` ✅, `tsc` ✅, `vite build` ✅
- **FIX 2026-08-28 mix-match login:** `localStorage` per-host → `cookie Domain=.openrt.local` (`useAuthStore.ts` `getCookie/setCookie/deleteCookie`) + `localStorage` fallback + `?token` URL fallback — superadmin↔tenant logout/login tidak lagi stale view

## Cara Pakai
- Centang `[x]` saat selesai, update tanggal.
- Prioritas: P0 = user-visible/broken, P1 = hardening/docs, P2 = polish.
- Jalankan `make up && cd backend && go test ./... && cd ../frontend && npm run build` sebelum merge.

---

## 1. Bisnis / Fungsional

| # | Gap | Prioritas | Status | Catatan Kode |
|---|-----|-----------|--------|--------------|
| B1 | Dashboard export `GET /reports/financial/export?format=csv\|pdf` — backend dipakai via `exportFinancialReport()` blob download | P0 | DONE 2026-08-28 | `dashboard.ts` `exportFinancialReport()` + `DashboardPage.tsx` loading/error |
| B2 | Event RAB tampil di card — `GET /events` mengisi `budget` (usecase `ListEvents`+`GetEvent`) + card `RAB:` + modal error | P0 | DONE 2026-08-28 | `domain/event.go` `Budget` + `frontend/types/event.ts` |
| B3 | Polls kelola — UI `PollsPage.tsx` (create 2–6 opsi + tutup + hasil) + `/admin/polls` + nav + `useCreatePoll/ClosePoll` | P0 | DONE 2026-08-28 | `social.ts` + `App.tsx` + `MainLayout.tsx` |
| B4 | Funds — tab di `FinancialPage` cukup (4 tab, 10 kategori), schema OpenAPI sudah `type/description/is_default` | P1 | DONE 2026-08-28 | by design, guard `is_default` OK |
| B5 | RSVP/RAB modal — toast sukses/error (`EventsPage` `showToast` + `EventBudget/RSVPModal` `onSaved` + `saveError`) | P1 | DONE 2026-08-28 | `EventsPage.tsx` + modals |
| B6 | NIK crypto — fallback panic di prod (`crypto.go:21`), migrasi re-encrypt tidak perlu (data dev) | P1 | DONE 2026-08-28 | `pkg/crypto` |

## 2. Security / Hardening

| # | Gap | Prioritas | Status | Catatan |
|---|-----|-----------|--------|---------|
| S1 | JWT tanpa revokasi — by design (24h, docs `authentication-authorization.md`) | P1 | DONE 2026-08-28 | known limitation, mitigasi short expiry |
| S2 | `TRUSTED_PROXY_IPS` kosong → fallback peer IP + log warning (set CIDR di prod) | P1 | DONE 2026-08-28 | by design dev/E2E, prod set `TRUSTED_PROXY_IPS` |
| S3 | `portal_events` KPI — sudah `rateLimiter` (1000/100), index `(slug,type,time)`, spam low impact | P2 | DONE 2026-08-28 | mitigated |
| S4 | `push broadcast` fire-and-forget `context.Background` sudah fix jadi `WithTimeout 5s` (2026-08-27) | P2 | DONE 2026-08-27 | `announcement_doc_handler.go:212` |

## 3. UX / Frontend

| # | Gap | Prioritas | Status | File |
|---|-----|-----------|--------|------|
| U1 | `GET /auth/me` wired — `AuthUsecase.GetMe` + `AuthHandler.Me` + `authMw(tenantMw(authMux))` + `useProfileQuery` | P2 | DONE 2026-08-28 | `auth_usecase.go` + `auth_handler.go` + `main.go` |
| U2 | `ReactionButton/PollWidget/ParticipationCard` silent fail → sudah ada error+retry (`ReactionButton.tsx`, `PollWidget.tsx:4.6K`, `ParticipationCard.tsx:3.6K`) | P0 | DONE 2026-08-27 | `social.ts` double-prefix juga fix |
| U3 | Search/filter — Residents (nama/NIK + KK filter + pagination) & Events (`status` filter) sudah ada; Financial tab kecil tidak butuh search | P2 | DONE 2026-08-28 | `ResidentsPage.tsx:15/q` + `EventsPage.tsx:filterStatus` |
| U4 | Dashboard — limit `10000→1000` (`financial_usecase.go:220,225`), `dashboard.ts` paginated | P2 | DONE 2026-08-28 | `ListFinancialTransactions` + `ListDuesPayments` |
| U5 | Public `axios('/api/v1/t/...')` untuk `info/meetings/financial-summary` tanpa `api` — benar karena public, tapi inkonsisten | P2 | DONE (intentional) | `public_tenant.ts`, `public_transparency.ts` |

## 4. Infra / Contract

| # | Gap | Prioritas | Status |
|---|-----|-----------|--------|
| I1 | `redis:alpine` dihapus dari `docker-compose.yml` (in-memory rate-limit), `depends_on` + volume + env `REDIS_*` dihapus | P2 | DONE 2026-08-28 | `infrastructure/docker-compose.yml` |
| I2 | `openapi.yaml` sinkron — `GET /t/resolve`, `GET /auth/me`, `GET /t/{slug}/events` (GET) + funds `target_amount→type/description/is_default`, `PUT /documents/{id}`, `status` filter, `events` budget note | P1 | DONE 2026-08-28 | `openapi.yaml` 54KB |
| I3 | `AGENTS.md §46` sinkron — `/admin/*`, `/kabar|usulan|agenda`, 23+ tabel, funds/meetings/social/push, 000020 | P1 | DONE 2026-08-28 | `AGENTS.md` |

## 5. Testing

| # | Gap | Prioritas | Status |
|---|-----|-----------|--------|
| T1 | E2E `tests/e2e/` — **64/64 hijau** (was 62) — `admin/polls-ui` (create/close/vote) + `reactions-polls` + `push-badge` sudah cover `polls/reactions/push`; `finance` & `meetings` sudah ada | P0 | DONE 2026-08-28 | `polls-ui.spec.ts` + `dashboard-metrics` (CSV blob + PDF blob) |
| T2 | Isolasi tenant `reactions/polls` — `TestSecurity_SocialTenantIsolation` (A/B polls/reactions, public `t/{slug}/polls/{id}`) | P1 | DONE 2026-08-28 | `security_integration_test.go` 7 passed |

---

## Sudah FIX (2026-08-27) — verifikasi

- [x] **F1** `social.ts` double `/api/v1` → 404 — ganti ke `/reactions`, `/polls`, `/polls/{id}/vote`
- [x] **F2** `push.ts` `axios` tanpa `Authorization` → ganti `api` (bawa Bearer)
- [x] **F3** `dues status=pending` — tambah filter `status` di `domain/usecase/repo/handler` + client filter
- [x] **F4** `PUT /documents/{id}` 405 — tambah `UpdateDocument` domain/repo/usecase/handler
- [x] **F5** `crypto` fallback hardcoded → panic di prod jika `NIK_ENCRYPTION_KEY` ≠32
- [x] **F6** `media_urls` validasi `http/https` max 10 di `announcement_doc_usecase.go`
- [x] **F7** `broadcast` timeout `WithTimeout 5s` di `announcement_doc_handler.go`
- [x] **F8** `ReactionButton/PollWidget/ParticipationCard` error handling + retry

---

## Roadmap Fix Satu-Satu (usulan)

1. **B1 — Dashboard export pakai backend** (P0, user-visible)
2. **B2 — Event RAB tampil di card** (P0)
3. **B3 — UI Kelola Polls** (P0)
4. **T1 — E2E funds/meetings/reactions** (P0, regresi)
5. **B5 — Toast RSVP/RAB** (P1)
6. **I2+I3 — Sinkron OpenAPI + AGENTS.md** (P1)
7. **U1 — Hapus/wiring `/auth/me`** (P2)
8. **I1 — Hapus `redis`** (P2)

> Centang satu per PR, run `go vet && go test ./... && npm run build && tsc --noEmit` (sudah hijau 2026-08-27).

---
*File ini adalah tracker tunggal. Jangan buat dokumen paralel — update di sini.*
