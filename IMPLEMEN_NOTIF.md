# PRODUCTION NOTIFICATION SYSTEM — REACT + GO RT/RW PWA

## ROLE

You are a senior full-stack engineer and software architect working inside an existing production-oriented RT/RW citizen web application.

Your task is to **inspect the existing project first**, understand its current architecture and conventions, then implement a production-grade notification system that integrates naturally with the existing application.

The application currently uses:

* Frontend: React
* Backend: Go
* Existing database and infrastructure: MUST be discovered from the repository
* Existing authentication/authorization: MUST be reused
* Existing deployment architecture: MUST be preserved unless a change is genuinely necessary

The final implementation must feel like it was designed as part of the existing application, NOT bolted onto it.

---

# 1. PRIMARY OBJECTIVE

Build a reliable notification infrastructure with:

* Web Push
* PWA Service Worker
* In-app notification center
* Persistent notification database
* Push subscription management
* Queue-based asynchronous delivery
* Retry with exponential backoff
* Failed delivery handling
* Expired subscription cleanup
* Notification preferences
* Recipient resolution
* Role/tenant/RT-aware authorization
* Notification deep linking
* Read/unread state
* Delivery status tracking
* Observability/logging
* Production-safe security

The target architecture is:

```text
                    ┌──────────────────────┐
                    │      React PWA       │
                    │                      │
                    │  Notification Center │
                    │  Push Subscription   │
                    │  Service Worker      │
                    └──────────┬───────────┘
                               │
                               │ HTTPS
                               ▼
                    ┌──────────────────────┐
                    │       Go API         │
                    │                      │
                    │ Notification Service │
                    │ Recipient Resolver   │
                    │ Authorization        │
                    └──────────┬───────────┘
                               │
                     ┌─────────┴─────────┐
                     ▼                   ▼
              ┌─────────────┐      ┌─────────────┐
              │ PostgreSQL  │      │    Redis    │
              │ / Existing  │      │ Queue       │
              │ Database    │      │             │
              └─────────────┘      └──────┬──────┘
                                           │
                                           ▼
                                   ┌──────────────┐
                                   │ Go Worker    │
                                   │              │
                                   │ Web Push     │
                                   │ Retry        │
                                   └──────┬───────┘
                                          │
                                          ▼
                                  Browser Push Service
                                          │
                                          ▼
                                       📱 User
```

IMPORTANT:

Do NOT blindly implement this exact stack if the repository already has equivalent infrastructure.

For example:

* If Redis already exists → reuse it.
* If a queue already exists → reuse it.
* If PostgreSQL already exists → reuse it.
* If another job system exists → evaluate whether it should be reused.
* If an existing notification abstraction exists → extend it.
* If authentication already exists → integrate with it.
* If PWA/service worker infrastructure already exists → extend it.
* If the project does not currently use Redis, introduce it only if justified.

The goal is **architectural consistency**, not technology replacement.

---

# 2. FIRST RULE — DO NOT CODE IMMEDIATELY

Before changing anything, perform a repository audit.

Inspect:

## Frontend

Find:

* React architecture
* routing
* state management
* API client
* authentication
* user/session handling
* component structure
* hooks
* existing PWA implementation
* existing service worker
* build tooling
* environment configuration
* UI notification/toast system
* existing notification UI if any

## Backend

Find:

* Go module
* application entrypoint
* HTTP framework
* routing
* handlers/controllers
* service layer
* repository/data-access layer
* database layer
* authentication
* authorization/RBAC
* middleware
* background workers
* queue infrastructure
* Redis usage
* logging
* configuration
* error handling

## Database

Identify:

* database engine
* migration system
* existing user table
* roles
* tenant/RT/RW relationships
* existing audit tables
* existing notification-related tables
* naming conventions
* primary key strategy
* timestamp strategy
* soft delete conventions

## Infrastructure

Inspect:

* Docker
* Docker Compose
* reverse proxy
* HTTPS
* environment variables
* CI/CD
* deployment scripts
* existing services

---

# 3. REQUIRED FIRST OUTPUT

Before implementing anything, produce an internal implementation plan based on the ACTUAL repository.

Do NOT assume architecture.

Determine:

1. Current frontend architecture
2. Current backend architecture
3. Current database
4. Current authentication model
5. Current authorization/RBAC model
6. Current RT/RW/tenant hierarchy
7. Existing background job infrastructure
8. Existing Redis usage
9. Existing PWA/service worker
10. Existing notification mechanisms
11. Best integration points
12. Files/modules that should be modified
13. New files/modules required
14. Migration requirements
15. Infrastructure changes required

Then create an implementation checklist.

Only after this audit should implementation begin.

---

# 4. CORE DESIGN PRINCIPLE

Create a reusable backend abstraction:

```go
type NotificationService interface {
    Notify(ctx context.Context, request NotificationRequest) error
}
```

The exact interface may be adapted to the project's conventions.

The rest of the application must NOT directly call Web Push.

Bad:

```text
Announcement Handler
    ↓
webpush.Send()
```

Good:

```text
Announcement Handler
    ↓
NotificationService
    ↓
Notification persistence
    ↓
Queue
    ↓
Notification Worker
    ↓
Web Push
```

This allows future channels such as:

* Web Push
* ntfy
* Email
* WhatsApp
* SMS

without coupling business logic to a delivery provider.

---

# 5. NOTIFICATION DOMAIN MODEL

Design a proper notification domain.

At minimum evaluate the following entities.

## notifications

Suggested conceptual fields:

```text
id
recipient_user_id
type
title
body
data
url
priority
read_at
created_at
updated_at
```

Adapt field names and ID strategy to the existing project.

The notification represents the **logical notification shown inside the application**.

---

## push_subscriptions

Conceptually:

```text
id
user_id
endpoint
p256dh
auth
user_agent
device_name
created_at
updated_at
last_success_at
last_failure_at
disabled_at
```

IMPORTANT:

One user may have multiple subscriptions.

Example:

```text
User 123
├── Android Chrome
├── Laptop Chrome
└── iPhone Safari
```

Do NOT enforce one subscription per user.

Create appropriate uniqueness constraints around subscription endpoints.

---

## notification_deliveries

Track individual delivery attempts.

Conceptually:

```text
id
notification_id
push_subscription_id
status
attempt_count
last_error
next_attempt_at
sent_at
created_at
updated_at
```

Possible statuses:

```text
pending
processing
sent
failed
expired
cancelled
```

Adapt to existing project conventions.

---

# 6. IMPORTANT DISTINCTION

Do NOT confuse:

### Notification

The logical event visible in the application.

with:

### Delivery

An attempt to deliver that notification to a particular device/channel.

Example:

```text
Notification #123
│
├── Device A → sent
├── Device B → sent
├── Device C → expired
└── Device D → failed/retrying
```

This separation is REQUIRED for reliability and observability.

---

# 7. IN-APP NOTIFICATION CENTER

Implement a proper notification center inside the existing React UI.

It must match the application's existing design system.

DO NOT introduce a new visual language.

Reuse:

* existing components
* existing typography
* existing spacing
* existing icons
* existing colors
* existing responsive patterns
* existing shadcn/UI components if the project already uses them

The UI should support:

* unread count
* notification list
* read/unread state
* mark as read
* mark all as read
* pagination/infinite loading according to existing patterns
* notification timestamp
* notification type
* click/deep-link behavior
* empty state
* loading state
* error state

Example:

```text
🔔 Notifikasi  (3)

┌─────────────────────────────────────┐
│ 📢 Pengumuman RT                    │
│ Kerja bakti hari Minggu...          │
│ 5 menit lalu                         │
├─────────────────────────────────────┤
│ 💰 Iuran September                  │
│ Pembayaran belum diterima           │
│ 2 jam lalu                           │
└─────────────────────────────────────┘
```

Do NOT make the notification UI look like generic AI-generated dashboard UI.

---

# 8. WEB PUSH

Implement standards-based Web Push.

Use:

* VAPID
* Push API
* Notification API
* Service Worker

Do NOT invent a custom push protocol.

The browser creates a subscription.

React sends the subscription to Go.

Go stores it securely.

---

# 9. SERVICE WORKER

If a service worker already exists:

**DO NOT create a second service worker.**

Extend the existing one.

If no service worker exists, create one according to the existing build system.

The service worker must handle:

```text
push
notificationclick
```

Push payload should contain structured data.

Conceptually:

```json
{
  "notificationId": "123",
  "type": "ANNOUNCEMENT",
  "title": "Pengumuman RT",
  "body": "Kerja bakti hari Minggu pukul 07.00",
  "url": "/pengumuman/123"
}
```

Never put unnecessary sensitive personal information into push payloads.

Prefer:

```text
"Pembayaran iuran kamu telah diperbarui."
```

rather than exposing sensitive details.

---

# 10. NOTIFICATION CLICK BEHAVIOR

When the user clicks a push notification:

```text
Push notification
       ↓
notificationclick
       ↓
Open/focus existing PWA window
       ↓
Navigate to target URL
```

Avoid opening unnecessary duplicate browser tabs/windows.

Reuse an existing client when possible.

The URL must be validated/safely constructed.

---

# 11. SUBSCRIPTION MANAGEMENT

React must provide a clean user flow:

```text
Notification Settings
        │
        ├── Enable notifications
        └── Disable notifications
```

When enabled:

1. Request browser permission.
2. Register/reuse service worker.
3. Subscribe to PushManager.
4. Send subscription to Go.
5. Persist subscription.
6. Associate it with authenticated user.

When disabled:

1. Unsubscribe browser subscription where appropriate.
2. Inform backend.
3. Disable/remove subscription safely.

Do not rely solely on frontend state.

The backend must own subscription association.

---

# 12. AUTHORIZATION

This is critical.

A user must NEVER be able to register a push subscription under another user's account.

Use the existing authenticated identity.

Do NOT accept arbitrary:

```json
{
  "user_id": "..."
}
```

from the client as the source of truth.

The backend must derive user identity from the authenticated session/token.

---

# 13. RT/RW/TENANT ISOLATION

The existing application's hierarchy MUST be respected.

Determine whether the project has:

```text
RT
RW
Kelurahan
Tenant
Organization
Role
Resident
Admin
Pengurus
```

Then design recipient resolution accordingly.

Example:

```text
Announcement created
        ↓
Determine scope
        ↓
RT 05
        ↓
Find eligible residents
        ↓
Create notifications
        ↓
Queue delivery
```

A user from RT 06 must NEVER receive an RT 05 private notification.

Authorization must be enforced server-side.

---

# 14. RECIPIENT RESOLVER

Create a reusable concept such as:

```go
RecipientResolver
```

Its job is to determine:

> Who should receive this notification?

Examples:

```text
Announcement → all residents in RT
Payment reminder → specific resident
Report update → report owner
Administrative notice → specific role
System alert → administrators
```

Business features should not manually query push subscriptions.

Instead:

```text
Feature
 ↓
NotificationService
 ↓
RecipientResolver
 ↓
Notification records
 ↓
Delivery jobs
```

---

# 15. QUEUE

Use the project's existing queue infrastructure if available.

If Redis exists but no job system exists, evaluate an appropriate Go-native queue solution.

A good candidate is:

```text
Redis + Asynq
```

But do NOT introduce Asynq blindly.

First inspect the project.

The queue must make push delivery asynchronous.

Bad:

```text
HTTP Request
 ↓
Create announcement
 ↓
Send 500 push notifications
 ↓
Return response
```

Good:

```text
HTTP Request
 ↓
Create announcement
 ↓
Create notification records
 ↓
Enqueue delivery jobs
 ↓
Return response

Worker
 ↓
Process jobs
 ↓
Send Web Push
```

---

# 16. RETRY STRATEGY

Implement bounded retry.

Use exponential backoff with jitter.

Conceptually:

```text
Attempt 1
   ↓
10 sec
Attempt 2
   ↓
30 sec
Attempt 3
   ↓
2 min
Attempt 4
   ↓
5 min
```

Exact values should be configurable.

Do NOT retry forever.

Differentiate:

### Temporary failures

Examples:

* network error
* timeout
* transient 5xx

→ retry

### Permanent failures

Examples:

* invalid/expired subscription
* HTTP 410 where applicable
* malformed subscription

→ deactivate/remove subscription

---

# 17. IDEMPOTENCY

The notification system must avoid accidental duplicate sends.

Consider:

* unique delivery identifiers
* job IDs
* database constraints
* worker retry behavior
* concurrent worker execution

A retry must not blindly generate a new logical notification.

Distinguish:

```text
same notification
+
same delivery
+
multiple attempts
```

from:

```text
multiple notifications
```

---

# 18. DATABASE TRANSACTION BOUNDARIES

Think carefully about:

```text
business transaction
notification persistence
queue publishing
```

Avoid situations where:

```text
Database says notification exists
but queue job was never created
```

or:

```text
Queue job exists
but notification transaction rolled back
```

Choose an appropriate approach for the existing architecture.

If necessary, evaluate an outbox pattern.

For a production-oriented system, an outbox architecture is strongly preferred if the existing infrastructure supports it.

Conceptually:

```text
Business Transaction
       │
       ├── Business data
       └── Outbox event
                │
                ▼
          Event Dispatcher
                │
                ▼
              Queue
                │
                ▼
             Worker
```

Do not over-engineer if the existing project is small, but explicitly evaluate this trade-off.

---

# 19. NOTIFICATION PREFERENCES

Add user-level preferences where appropriate.

Examples:

```text
Announcements
Payment reminders
Report updates
Administrative notices
System alerts
```

Users should be able to control categories where business rules allow it.

However:

**Mandatory/critical administrative notifications must not necessarily be suppressible.**

Determine which categories are mandatory based on the application's domain.

---

# 20. NOTIFICATION PRIORITY

Support conceptual priorities:

```text
low
normal
high
critical
```

Do not blindly map these to browser behavior if the platform does not support true priority semantics.

Priority should primarily influence:

* UI treatment
* queue handling
* notification policy
* future delivery channels

---

# 21. API DESIGN

Follow the project's existing API conventions.

Potential endpoints:

```text
POST   /api/push-subscriptions
DELETE /api/push-subscriptions/:id

GET    /api/notifications
GET    /api/notifications/unread-count
PATCH  /api/notifications/:id/read
POST   /api/notifications/read-all
```

But first inspect existing API conventions.

Do not introduce inconsistent REST patterns.

API responses must match the project's existing response envelope and error format.

---

# 22. FRONTEND API INTEGRATION

Create reusable hooks/services following existing conventions.

Conceptually:

```text
useNotifications()
useUnreadNotificationCount()
usePushNotifications()
```

Do NOT create a global state system solely for notifications if the project already has an appropriate state/query layer.

Reuse existing:

* React Query
* Zustand
* Redux
* Context
* custom API client

depending on what the project actually uses.

---

# 23. REAL-TIME IN-APP UPDATES

Evaluate whether the application already uses:

* WebSocket
* SSE
* polling

If an existing real-time channel exists, integrate notification updates into it.

If not, do NOT automatically add WebSocket merely for this feature.

A reasonable first implementation can use:

```text
Initial page load
+
unread count API
+
polling/refetch
+
Web Push
```

The push notification itself is already the wake-up mechanism for the user.

---

# 24. SECURITY

Treat push subscriptions as sensitive infrastructure data.

Implement:

* authentication
* authorization
* endpoint validation
* payload validation
* rate limiting where appropriate
* HTTPS requirement
* VAPID private key protection
* environment-based secrets
* no secrets in frontend
* no sensitive data in push payload
* tenant/RT isolation
* ownership validation
* subscription cleanup

VAPID private key MUST NEVER be shipped to React.

Only the public key belongs in frontend configuration.

---

# 25. ENVIRONMENT CONFIGURATION

Use the project's existing configuration pattern.

Conceptually:

```env
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:...
```

Do not hardcode secrets.

If Redis is required:

```env
REDIS_URL=
```

Adapt names to the project's existing environment conventions.

Update:

```text
.env.example
```

without exposing real secrets.

---

# 26. OBSERVABILITY

Add useful structured logging.

At minimum log:

```text
notification_created
notification_queued
notification_delivery_started
notification_delivery_success
notification_delivery_failed
push_subscription_created
push_subscription_removed
push_subscription_expired
notification_retry_scheduled
```

Do NOT log:

* VAPID private key
* push auth keys
* sensitive resident information
* full notification payload if it contains sensitive information

Use existing logging infrastructure.

---

# 27. FAILURE RESILIENCE

The system must behave sensibly when:

### Redis is unavailable

The application should fail according to the existing architecture without corrupting business data.

### Push service is unavailable

Delivery should be retried.

### Subscription is expired

Deactivate/remove it.

### User has multiple devices

Deliver independently to each valid subscription.

### User logs out

Subscription ownership remains server-controlled and must not become associated with another user.

### User logs in on another device

A new subscription can be registered.

### Browser permission is denied

Application continues working normally.

### Push is unavailable

In-app notification remains the source of truth.

---

# 28. IN-APP NOTIFICATION IS THE SOURCE OF TRUTH

This is a fundamental requirement.

The architecture must NOT treat Web Push as the notification database.

Instead:

```text
                    Notification
                         │
                ┌────────┴────────┐
                ▼                 ▼
        Database record        Delivery
                │                 │
                ▼                 ▼
          In-app UI           Web Push
```

If Web Push fails:

```text
In-app notification → still exists
```

Therefore the user can still see it after opening the application.

---

# 29. DO NOT ADD NTFY UNLESS JUSTIFIED

Do NOT add ntfy simply because it is self-hostable.

For this project:

```text
Primary:
Web Push

Source of truth:
Database

Async delivery:
Queue + Worker

Fallback:
In-app notification
```

ntfy should only be introduced if the existing product requirements explicitly need:

* self-hosted external notification channel
* infrastructure monitoring
* IoT/device alerts
* operator alerts
* independent notification clients

Do not increase infrastructure complexity without a concrete requirement.

---

# 30. PWA REQUIREMENTS

Verify:

* manifest exists
* service worker exists
* HTTPS works
* icons exist
* installability
* correct scope
* correct start_url

Do not break existing PWA functionality.

If the project is already installable, preserve it.

---

# 31. UI/UX REQUIREMENTS

The implementation must match the current application.

Before designing notification UI:

1. Inspect existing design system.
2. Inspect existing header/navbar.
3. Inspect existing dropdown/popover patterns.
4. Inspect existing mobile navigation.
5. Inspect existing empty/loading/error states.
6. Inspect existing toast system.
7. Inspect existing typography and spacing.

Then implement notifications using those conventions.

Do NOT produce:

* generic AI dashboard UI
* excessive gradients
* unnecessary cards
* oversized icons
* random colors
* decorative elements without purpose
* inconsistent shadows
* arbitrary animations

The feature should look native to the existing product.

---

# 32. ACCESSIBILITY

Ensure:

* keyboard navigation
* semantic buttons
* accessible labels
* focus management
* readable notification states
* sufficient contrast
* screen-reader-friendly notification controls

Do not rely only on color to indicate unread state.

---

# 33. TESTING

Do not stop after implementation.

Create tests according to the existing project's testing conventions.

At minimum:

## Backend unit tests

Test:

* notification creation
* recipient resolution
* authorization
* preference filtering
* subscription ownership
* retry classification
* expired subscription handling
* idempotency

## Backend integration tests

Test:

```text
Announcement
 ↓
Notification
 ↓
Delivery
 ↓
Queue
```

## Frontend tests

Test:

* notification center
* unread count
* mark read
* mark all read
* push permission flow
* subscription registration
* subscription removal
* notification click behavior

## E2E

At minimum:

### Scenario 1

```text
Login as resident
 ↓
Enable notifications
 ↓
Subscription registered
 ↓
Verify subscription exists
```

### Scenario 2

```text
Login as RT administrator
 ↓
Create announcement
 ↓
Verify notification record
 ↓
Verify delivery job
```

### Scenario 3

```text
Resident
 ↓
Open notification center
 ↓
Verify unread notification
 ↓
Click notification
 ↓
Verify correct target page
```

### Scenario 4

```text
Invalid subscription
 ↓
Worker receives delivery error
 ↓
Subscription deactivated
 ↓
No infinite retry
```

### Scenario 5

```text
User with multiple devices
 ↓
Create notification
 ↓
Verify each valid subscription gets independent delivery
```

---

# 34. MANUAL VERIFICATION

After automated tests, perform a real browser test if the environment allows it.

Verify:

1. Login.
2. Enable notifications.
3. Browser permission.
4. Subscription registration.
5. Create an announcement as administrator.
6. Verify notification appears in database.
7. Verify notification appears in notification center.
8. Verify push notification reaches a real browser/device where possible.
9. Click notification.
10. Verify deep link.
11. Mark as read.
12. Verify unread count.
13. Test logout/login.
14. Test multiple devices if available.

---

# 35. DO NOT BREAK EXISTING FEATURES

Before implementation, establish a baseline.

Run existing:

* tests
* build
* lint
* type checks
* backend tests
* frontend tests

After implementation run them again.

The final result must not introduce unrelated regressions.

If existing tests fail before your changes, document them separately.

---

# 36. MIGRATION SAFETY

Database changes must use the project's existing migration system.

Do NOT manually modify production databases.

Migration must be:

* reversible where practical
* deterministic
* compatible with existing data
* indexed appropriately

Consider indexes for:

```text
notifications(user_id, created_at)
notifications(user_id, read_at)
push_subscriptions(user_id)
notification_deliveries(notification_id)
notification_deliveries(status)
```

Adapt indexes to actual query patterns.

Do not blindly create every index.

---

# 37. PERFORMANCE

Do not create N+1 queries when generating notifications for many residents.

For example, avoid:

```text
for each user:
    query user
    query subscription
    insert notification
```

Prefer appropriate bulk operations and batched processing.

For large recipient sets:

```text
Resolve recipients
 ↓
Bulk insert notifications
 ↓
Create delivery jobs
 ↓
Worker processes delivery
```

The exact implementation should follow the project's database and queue capabilities.

---

# 38. SCALE TARGET

Design reasonably for:

```text
1 RT
100 residents

10 RT
1,000 residents

100 RT
10,000 residents
```

Do not prematurely optimize for millions of users.

But avoid architectural decisions that make moderate growth unnecessarily difficult.

---

# 39. IMPLEMENTATION ORDER

Follow this sequence:

### Phase 1 — Audit

Inspect repository.

### Phase 2 — Architecture

Produce integration plan.

### Phase 3 — Database

Add notification/subscription/delivery structures.

### Phase 4 — Backend domain

Implement:

```text
NotificationService
RecipientResolver
PushSubscriptionService
```

### Phase 5 — Queue

Integrate existing or introduce appropriate queue.

### Phase 6 — Worker

Implement Web Push delivery.

### Phase 7 — Retry

Implement retry/backoff/error classification.

### Phase 8 — React Push

Implement subscription flow.

### Phase 9 — Service Worker

Implement push + click handling.

### Phase 10 — Notification Center

Implement UI matching existing design.

### Phase 11 — Integration

Connect real application events:

* announcement
* payment/iuran
* report
* administrative events

Only integrate events that actually exist in the project.

### Phase 12 — Testing

Unit + integration + E2E.

### Phase 13 — Production verification

Build, lint, tests, Docker/deployment verification.

---

# 40. IMPORTANT — MATCH EXISTING PROJECT

This requirement overrides all examples in this document.

The examples above are architectural guidance, NOT instructions to restructure the entire project.

If the project already has:

```text
different database
different queue
different API style
different state management
different router
different service architecture
different ID strategy
different migration system
different PWA implementation
```

adapt to it.

Do NOT force the project to match this document.

The goal is:

> Add a production-grade notification capability while preserving the architectural identity of the existing project.

---

# 41. CODE QUALITY

Follow the existing code style.

Avoid:

* giant files
* duplicated logic
* unnecessary abstractions
* premature generic frameworks
* magic strings
* hardcoded configuration
* hidden side effects
* business logic inside React components
* direct database access from HTTP handlers
* direct Web Push calls from business handlers

Prefer clear separation:

```text
Handler
  ↓
Service
  ↓
Repository

Business Event
  ↓
Notification Service
  ↓
Queue
  ↓
Worker
  ↓
Push Provider
```

---

# 42. DOCUMENTATION

After implementation, create/update documentation explaining:

## Architecture

```text
Business Event
 ↓
Notification Service
 ↓
Database
 ↓
Queue
 ↓
Worker
 ↓
Web Push
 ↓
Service Worker
 ↓
User
```

## Setup

Explain:

* VAPID generation
* environment variables
* local development
* HTTPS requirements
* database migration
* Redis/queue requirements
* worker startup
* production deployment

## Developer usage

Show how a new feature sends a notification:

```go
notificationService.Notify(...)
```

The exact code must match the actual implementation.

## Troubleshooting

Document:

* permission denied
* subscription expired
* push not received
* worker failure
* Redis unavailable
* invalid VAPID configuration
* HTTPS issues
* service worker issues

---

# 43. FINAL ACCEPTANCE CRITERIA

The implementation is complete only when:

* [ ] Existing project architecture has been audited.
* [ ] Existing conventions are respected.
* [ ] React PWA can register for push notifications.
* [ ] Service Worker handles push.
* [ ] Go backend stores subscriptions.
* [ ] Subscription ownership is secure.
* [ ] Users can have multiple devices.
* [ ] Notifications persist in database.
* [ ] In-app notification center exists.
* [ ] Unread state works.
* [ ] Read state works.
* [ ] Deep linking works.
* [ ] Notification delivery is asynchronous.
* [ ] Queue is implemented/reused appropriately.
* [ ] Worker exists.
* [ ] Retry exists.
* [ ] Exponential backoff exists.
* [ ] Permanent failures are handled.
* [ ] Expired subscriptions are cleaned up.
* [ ] Duplicate delivery is controlled.
* [ ] RT/tenant authorization is enforced.
* [ ] Notification preferences are respected.
* [ ] Sensitive data is not exposed through push payloads.
* [ ] VAPID private key remains server-side.
* [ ] Existing tests still pass.
* [ ] New tests pass.
* [ ] E2E flow passes.
* [ ] Production build succeeds.
* [ ] Deployment configuration is updated.
* [ ] Documentation is updated.
* [ ] No unrelated refactoring has been introduced.

---

# 44. FINAL REPORT

At the end, provide a concise implementation report containing:

## Architecture discovered

```text
Frontend:
Backend:
Database:
Queue:
Authentication:
PWA:
Deployment:
```

## Changes made

List actual files/modules changed.

## Database changes

List migrations and tables.

## API changes

List endpoints.

## Notification flow

Explain the final actual flow.

## Queue/worker

Explain how jobs and retries work.

## Security

Explain authorization and subscription protection.

## Testing

Report:

```text
Build:
Lint:
Unit:
Integration:
E2E:
Manual:
```

## Known limitations

Be honest about anything that cannot be guaranteed, especially:

* browser support
* OS restrictions
* browser push service availability
* notification permission
* offline behavior
* platform-specific limitations

Do NOT claim "100% reliable".

The goal is **production-grade, resilient, observable notification delivery with graceful failure**, not unrealistic guarantees.

---

# FINAL DIRECTIVE

**Inspect first. Design second. Implement third. Test fourth. Verify fifth.**

Do not blindly follow examples.

Do not replace the existing architecture unnecessarily.

Do not introduce ntfy unless the actual requirements justify it.

Build the notification system so that:

```text
                    BUSINESS EVENT
                          │
                          ▼
                 Notification Service
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
        Database                    Queue
             │                         │
             │                         ▼
             │                       Worker
             │                         │
             │                         ▼
             │                     Web Push
             │                         │
             ▼                         ▼
      In-App Notification          📱 Device
```

**Database is the source of truth.**

**Web Push is a delivery channel.**

**Queue/Worker provides resilience.**

**React owns the user experience.**

**Go owns business logic, authorization, recipient resolution, persistence, and delivery orchestration.**

**The final result must look and behave as if notification infrastructure was part of the original RT/RW application architecture from day one.**
