# Community Ecosystem, Safety Center & In-App Notification Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Transform SiTransparan RT/RW into an active neighborhood ecosystem by implementing an in-app Notification Center (inbox & push sync), Safety Center (1-tap Panic Button, confidential house vacancy reports, patrol schedules), and a Community Social & Marketplace Feed (threaded comments, mentions, WhatsApp orders).

**Architecture:**
- Clean Architecture (Go 1.25): 3 new domains (`notification`, `safety`, `community`) with schema-per-tenant isolation (`tenant_<slug>`), strict confidentiality checks, and dual notification dispatch (PostgreSQL + VAPID Web Push).
- Frontend (React 18 + Vite + TS): Modular components under `src/components/notifications/`, `src/components/safety/`, and `src/components/community/` adopting Radix UI primitives, Vitest unit testing, and TanStack Query caching.
- PostgreSQL 16: Migrations 000052 (notifications), 000053 (safety center), and 000054 (community posts, comments, reactions).

**Tech Stack:** Go 1.25, PostgreSQL 16, React 18, TypeScript, TailwindCSS, Radix UI, TanStack Query v5, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-03-community-ecosystem-and-notification-center.md`

## Global Constraints
- Strictly follow Clean Architecture (`delivery -> usecase -> repository -> domain`).
- All queries must be schema-qualified using `TenantTable(ctx, "...")` without runtime `SET search_path`.
- House vacancy reports are strictly confidential: non-admins attempting direct access must receive HTTP 403 Forbidden.
- Strict UI component rule: No raw HTML primitive form tags (`<select>`, raw unstyled `<button>`, etc.). Use `@/components/ui/` primitives (Radix UI / Shadcn).
- All tests must pass before completing any task: `go test ./...` and `npm test`.
- All docs in `docs/` must remain in sync and pass `./scripts/validate-docs.py`.

## Review Focus
1. **Confidentiality Leak**: Ensure `house_vacancies` cannot be queried or viewed by non-admin residents under any endpoint or filter.
2. **Panic Button Abuse / Spam**: Ensure rate limits prevent flooding emergency sirens, and panic events trigger broadcast notifications only within the sender's tenant.
3. **Threaded Comment Isolation**: Deleting a post or parent comment must cascade safely or soft-delete without leaving orphaned child replies.
4. **WhatsApp Template URL Encoding**: Ensure special characters (Rupiah formatting, phone numbers, quotes) in WhatsApp order URLs are safely percent-encoded.
5. **Notification Unread Count Race**: Ensure marking notifications as read is atomic and optimistic cache updates stay coherent.

---

### Task 1: Migration 000052 & Notification Center Backend Domain & Repository

**Files:**
- Create: `backend/migrations/000052_create_notifications.up.sql`
- Create: `backend/migrations/000052_create_notifications.down.sql`
- Create: `backend/internal/domain/notification.go`
- Create: `backend/internal/repository/notification_repository.go`
- Test: `backend/internal/repository/notification_repository_test.go`

**Interfaces:**
- Produces:
  ```go
  type Notification struct {
      ID        uuid.UUID  `json:"id"`
      UserID    *uuid.UUID `json:"user_id,omitempty"` // nil = broadcast all tenant
      Title     string     `json:"title"`
      Body      string     `json:"body"`
      Category  string     `json:"category"`
      ActionURL string     `json:"action_url"`
      IsRead    bool       `json:"is_read"`
      ReadAt    *time.Time `json:"read_at,omitempty"`
      Metadata  []byte     `json:"metadata,omitempty"`
      CreatedAt time.Time  `json:"created_at"`
  }
  type NotificationRepository interface {
      Create(ctx context.Context, n *Notification) error
      ListByUser(ctx context.Context, userID uuid.UUID, unreadOnly bool, limit, offset int) ([]*Notification, int64, error)
      MarkAsRead(ctx context.Context, id, userID uuid.UUID) error
      MarkAllAsRead(ctx context.Context, userID uuid.UUID) error
      GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error)
  }
  ```

- [x] **Step 1: Write migration SQL for notifications table**
- [x] **Step 2: Apply migration 000052 to local dev PostgreSQL**
- [x] **Step 3: Define `domain.Notification` and `NotificationRepository` interface**
- [x] **Step 4: Write failing unit test in `notification_repository_test.go`**
- [x] **Step 5: Implement `notification_repository.go`**
- [x] **Step 6: Run tests and verify they pass**
  Run: `cd backend && go test -v ./internal/repository -run TestNotification`
- [x] **Step 7: Commit**
  Run: `git add backend/ && git commit -m "feat(notification): add notification table migration and repository"`

---

### Task 2: Notification Center Backend Usecase, Delivery & Dispatcher

**Files:**
- Create: `backend/internal/usecase/notification_usecase.go`
- Create: `backend/internal/usecase/notification_usecase_test.go`
- Create: `backend/internal/delivery/http/notification_handler.go`
- Modify: `backend/cmd/server/main.go`

**Interfaces:**
- Produces:
  ```go
  type NotificationUsecase interface {
      Dispatch(ctx context.Context, tenantID uuid.UUID, userID *uuid.UUID, title, body, category, actionURL string, metadata map[string]interface{}) error
      ListNotifications(ctx context.Context, userID uuid.UUID, unreadOnly bool, limit, offset int) ([]*domain.Notification, int64, error)
      MarkAsRead(ctx context.Context, id, userID uuid.UUID) error
      MarkAllAsRead(ctx context.Context, userID uuid.UUID) error
      GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error)
  }
  ```

- [x] **Step 1: Write failing unit test in `notification_usecase_test.go`**
- [x] **Step 2: Implement `notification_usecase.go` with dual dispatch (DB + Web Push via `PushUsecase`)**
- [x] **Step 3: Run usecase tests to verify PASS**
- [x] **Step 4: Implement `notification_handler.go` (`GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `GET /notifications/unread-count`)**
- [x] **Step 5: Register routes in `main.go`**
- [x] **Step 6: Verify go vet & tests**
  Run: `cd backend && go vet ./... && go test -v ./internal/delivery/http`
- [x] **Step 7: Commit**
  Run: `git add backend/ && git commit -m "feat(notification): add notification usecase and HTTP delivery handlers"`

---

### Task 3: Frontend In-App Notification Center UI (Bell & Modal)

**Files:**
- Create: `frontend/src/services/notification.ts`
- Create: `frontend/src/components/notifications/NotificationBell.tsx`
- Create: `frontend/src/components/notifications/NotificationInboxModal.tsx`
- Create: `frontend/src/services/__tests__/notification.test.ts`
- Modify: `frontend/src/components/MainLayout.tsx`

- [x] **Step 1: Write unit test in `notification.test.ts` for unread filtering and date formatting**
- [x] **Step 2: Implement `notification.ts` service with TanStack Query hooks**
- [x] **Step 3: Build `NotificationInboxModal.tsx` and `NotificationBell.tsx` using Radix Dialog & Badge**
- [x] **Step 4: Mount `NotificationBell` in `MainLayout.tsx` header**
- [x] **Step 5: Run frontend test and build**
  Run: `cd frontend && npm test && npm run build`
- [x] **Step 6: Commit**
  Run: `git add frontend/ && git commit -m "feat(frontend): implement in-app notification bell and inbox modal"`

---

### Task 4: Migration 000053 & Safety Center Backend (Panic Button & House Vacancies)

**Files:**
- Create: `backend/migrations/000053_create_safety_center.up.sql`
- Create: `backend/migrations/000053_create_safety_center.down.sql`
- Create: `backend/internal/domain/safety.go`
- Create: `backend/internal/repository/safety_repository.go`
- Create: `backend/internal/usecase/safety_usecase.go`
- Create: `backend/internal/usecase/safety_usecase_test.go`
- Create: `backend/internal/delivery/http/safety_handler.go`
- Modify: `backend/cmd/server/main.go`

**Interfaces:**
- Produces:
  ```go
  type EmergencyAlert struct { ... }
  type HouseVacancy struct { ... }
  type SafetyUsecase interface {
      TriggerPanic(ctx context.Context, tenantID, userID uuid.UUID, houseID *uuid.UUID, alertType, description string) (*EmergencyAlert, error)
      ResolveEmergency(ctx context.Context, tenantID, alertID, adminUserID uuid.UUID) error
      ListActiveEmergencies(ctx context.Context, tenantID uuid.UUID) ([]*EmergencyAlert, error)
      ReportHouseVacancy(ctx context.Context, tenantID, userID uuid.UUID, houseID uuid.UUID, startDate, endDate time.Time, contact, notes string) (*HouseVacancy, error)
      ListHouseVacancies(ctx context.Context, tenantID, requestingUserID uuid.UUID, requestingRole domain.RoleName) ([]*HouseVacancy, error)
  }
  ```

- [x] **Step 1: Write migration SQL for `emergency_alerts` and `house_vacancies`**
- [x] **Step 2: Apply migration 000053 to dev DB**
- [x] **Step 3: Define `domain.safety.go` and implement `safety_repository.go`**
- [x] **Step 4: Write failing unit test in `safety_usecase_test.go` verifying confidentiality enforcement**
- [x] **Step 5: Implement `safety_usecase.go` with trigger panic dispatching emergency notification to all**
- [x] **Step 6: Implement `safety_handler.go` and register routes in `main.go`**
- [x] **Step 7: Run backend test suite**
  Run: `cd backend && go test -v ./internal/usecase -run TestSafety`
- [x] **Step 8: Commit**
  Run: `git add backend/ && git commit -m "feat(safety): add panic button and confidential house vacancy backend"`

---

### Task 5: Frontend Safety Center (Panic Button Widget & House Vacancy Modal)

**Files:**
- Create: `frontend/src/services/safety.ts`
- Create: `frontend/src/components/safety/PanicButtonWidget.tsx`
- Create: `frontend/src/components/safety/HouseVacancyModal.tsx`
- Create: `frontend/src/components/safety/__tests__/safety.test.ts`
- Modify: `frontend/src/pages/DashboardPage.tsx`
- Modify: `frontend/src/pages/ResidentDashboardView.tsx`

- [x] **Step 1: Write unit test in `safety.test.ts` for emergency alert validation**
- [x] **Step 2: Implement `safety.ts` service with TanStack Query hooks**
- [x] **Step 3: Build `PanicButtonWidget.tsx` with confirmation modal and audio alarm trigger**
- [x] **Step 4: Build `HouseVacancyModal.tsx` using Radix Dialog & Form controls**
- [x] **Step 5: Integrate PanicButton and HouseVacancy widgets into Resident and Admin Dashboards**
- [x] **Step 6: Run frontend tests & build**
  Run: `cd frontend && npm test && npm run build`
- [x] **Step 7: Commit**
  Run: `git add frontend/ && git commit -m "feat(frontend): implement panic button widget and house vacancy reporting"`

---

### Task 6: Migration 000054 & Community Feed & Marketplace Backend

**Files:**
- Create: `backend/migrations/000054_create_community_posts_comments_reactions.up.sql`
- Create: `backend/migrations/000054_create_community_posts_comments_reactions.down.sql`
- Create: `backend/internal/domain/community.go`
- Create: `backend/internal/repository/community_repository.go`
- Create: `backend/internal/usecase/community_usecase.go`
- Create: `backend/internal/usecase/community_usecase_test.go`
- Create: `backend/internal/delivery/http/community_handler.go`
- Modify: `backend/cmd/server/main.go`

**Interfaces:**
- Produces:
  ```go
  type CommunityPost struct { ... }
  type CommunityComment struct { ... }
  type CommunityReaction struct { ... }
  type CommunityUsecase interface {
      CreatePost(ctx context.Context, tenantID, userID uuid.UUID, p *CommunityPost) (*CommunityPost, error)
      ListPosts(ctx context.Context, tenantID uuid.UUID, postType, category string, limit, offset int) ([]*CommunityPost, int64, error)
      MarkPostSolved(ctx context.Context, tenantID, postID, ownerUserID, helperUserID uuid.UUID) error
      AddComment(ctx context.Context, tenantID, postID, userID uuid.UUID, parentCommentID *uuid.UUID, content string) (*CommunityComment, error)
      ListComments(ctx context.Context, tenantID, postID uuid.UUID) ([]*CommunityComment, error)
      ToggleReaction(ctx context.Context, tenantID, postID, userID uuid.UUID, reactionType string) error
  }
  ```

- [x] **Step 1: Write migration SQL for posts, comments, reactions**
- [x] **Step 2: Apply migration 000054 to dev DB**
- [x] **Step 3: Define `domain.community.go` and implement `community_repository.go`**
- [x] **Step 4: Write failing unit test in `community_usecase_test.go` (mention notifications, solved status)**
- [x] **Step 5: Implement `community_usecase.go` with auto-dispatching comment reply and mention notifications**
- [x] **Step 6: Implement `community_handler.go` and register routes in `main.go`**
- [x] **Step 7: Run backend test suite**
  Run: `cd backend && go test -v ./internal/usecase -run TestCommunity`
- [x] **Step 8: Commit**
  Run: `git add backend/ && git commit -m "feat(community): add community posts, threaded comments, and reactions backend"`

---

### Task 7: Frontend Community Feed & Marketplace (Ruang Warga & Lapak)

**Files:**
- Create: `frontend/src/services/community.ts`
- Create: `frontend/src/pages/CommunityPage.tsx`
- Create: `frontend/src/components/community/PostCard.tsx`
- Create: `frontend/src/components/community/MarketplaceCard.tsx`
- Create: `frontend/src/components/community/CommentThreadModal.tsx`
- Create: `frontend/src/components/community/CreatePostModal.tsx`
- Create: `frontend/src/utils/whatsapp.ts`
- Create: `frontend/src/utils/__tests__/whatsapp.test.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/MainLayout.tsx`

- [x] **Step 1: Write unit test in `whatsapp.test.ts` for template message generator**
- [x] **Step 2: Implement `whatsapp.ts` helper**
- [x] **Step 3: Implement `community.ts` TanStack Query service**
- [x] **Step 4: Build `PostCard.tsx`, `MarketplaceCard.tsx`, `CommentThreadModal.tsx`, `CreatePostModal.tsx`**
- [x] **Step 5: Create `CommunityPage.tsx` with filter pills (`Semua`, `Lapak Jualan`, `Tanya Tetangga`, `Info RT`)**
- [x] **Step 6: Register `/admin/community` route in `App.tsx` and add sidebar navigation item in `MainLayout.tsx`**
- [x] **Step 7: Run frontend tests and build**
  Run: `cd frontend && npm test && npm run build`
- [x] **Step 8: Commit**
  Run: `git add frontend/ && git commit -m "feat(frontend): implement CommunityPage, marketplace cards, and threaded comments"`

---

### Task 8: Documentation Sync, Canvas Update, and Full E2E Verification

**Files:**
- Create: `docs/02-modules/ruang-warga-and-marketplace.md`
- Create: `docs/02-modules/pusat-keamanan-warga.md`
- Create: `docs/02-modules/pusat-notifikasi-inbox.md`
- Modify: `docs/00-MOC.md`
- Modify: `docs/03-database/migrations-history.md`
- Modify: `docs/03-database/schema-inventory.md`
- Modify: `docs/04-api-contracts/api-inventory.md`
- Modify: `docs/Architecture-Map.canvas`
- Create: `tests/e2e/community/community.spec.ts`
- Run: `./scripts/validate-docs.py`

- [x] **Step 1: Write detailed module specs in `docs/02-modules/` for the 3 new feature areas**
- [x] **Step 2: Update migrations history (000052, 000053, 000054) and schema inventory**
- [x] **Step 3: Update `docs/04-api-contracts/api-inventory.md` with new REST endpoints**
- [x] **Step 4: Link all new docs in `docs/00-MOC.md` and add nodes/edges in `docs/Architecture-Map.canvas`**
- [x] **Step 5: Write Playwright E2E test in `tests/e2e/community/community.spec.ts` (create post, comment, panic button, inbox check)**
- [x] **Step 6: Run docs validation script (`./scripts/validate-docs.py`) ensuring 0 broken links**
- [x] **Step 7: Run entire test suites (backend + frontend vitest)**
- [x] **Step 8: Commit**
  Run: `git add . && git commit -m "docs: document community, safety center, and notification inbox with updated canvas and E2E test"`
