MASTER BLUEPRINT: OpenRT SaaS Platform

Version: 1.2.0
Edition: Self-Hosted / Home Server
Architecture: Cloud-Native, API-First, Multi-Tenant
Stack: Golang (Backend), React PWA (Frontend), 100% OSS Dockerized

---

[AI_AGENT_DIRECTIVE]

«To the AI Agent executing this document:

This file is your ultimate source of truth. Execute the project scaffolding, coding, and deployment step-by-step based on this blueprint.»

The AI Agent MUST:

1. Read the Architecture & Stack carefully.
2. Setup the precise Directory Structure.
3. Build the "docker-compose.yml" for local/home-server deployment.
4. Implement the features according to the Epics & User Stories.
5. Strictly follow the Engineering Standards.

---

1. ARCHITECTURE & OPEN SOURCE TECH STACK

Because this runs on a Home Server but requires enterprise-grade scalability, proprietary cloud services are replaced with self-hosted Dockerized OSS alternatives.

Component| Enterprise OSS Choice| Role in Home Server
Reverse Proxy / API Gateway| Traefik| Handles SSL (Let's Encrypt), domain routing, load balancing, and rate limiting.
Backend Core APIs| Golang (Fiber/Gin)| High-performance, low-memory REST/gRPC microservices.
Frontend Web/PWA| React (Vite) + Tailwind| Fast build with "manifest.json" and service workers for PWA.
Primary Database| PostgreSQL| Relational DB using Schema-per-tenant for data isolation.
Caching & Pub/Sub| Redis| JWT session storage, caching, and lightweight event bus. Replaces Kafka for the home-server MVP.
Object Storage (S3 alternative)| MinIO| Self-hosted S3-compatible storage for KTP, KK, and event receipt images.
Container Orchestration| Docker Compose| Initial deployment, scalable to K3s/Docker Swarm later.

---

2. DIRECTORY STRUCTURE (MONOREPO)

The AI Agent MUST initialize the following folder structure to maintain clear separation of concerns.

openrt-monorepo/
├── .github/                  # CI/CD workflows
│
├── backend/                  # Golang Backend
│   ├── cmd/
│   │   └── api/              # Main application entry point
│   │
│   ├── internal/             # Private application code
│   │   ├── config/           # Environment and DB configuration
│   │   ├── handlers/         # HTTP controllers
│   │   ├── models/           # DB schemas & structs
│   │   ├── repository/       # Database & MinIO interactions
│   │   ├── services/         # Core business logic
│   │   └── middleware/       # JWT Auth & Tenant ID extraction
│   │
│   ├── pkg/                  # Public shared utilities
│   ├── go.mod
│   └── Dockerfile
│
├── frontend/                 # React PWA (Vite)
│   ├── public/               # manifest.json, icons
│   ├── src/
│   │   ├── assets/
│   │   ├── components/       # Reusable UI
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Page layouts
│   │   ├── services/         # API clients
│   │   └── store/            # State management
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── infrastructure/           # Home Server Deployment Configs
│   ├── traefik/              # Routing rules & SSL configs
│   ├── postgres/             # PostgreSQL initialization
│   ├── minio/                # Object storage provisioning
│   └── docker-compose.yml    # Master orchestrator
│
├── docs/                     # API Docs & Architecture diagrams
│
├── README.md
└── MASTER_BLUEPRINT.md       # This file

---

3. MULTI-TENANCY STRATEGY (CRITICAL)

«Rule for AI Agent: Data leakage between RTs is a fatal error.»

The system MUST enforce tenant isolation at the database and application level.

3.1 Database-Level Isolation

Use Schema-per-tenant.

Public Schema

The "public" schema stores global data such as:

- Users
- Tenants
- Global configuration
- Tenant metadata

Tenant Schemas

Each RT receives its own PostgreSQL schema:

tenant_rt01
tenant_rt02
tenant_rt03
...

Tenant-specific data MUST remain inside its corresponding schema, including:

- Citizens
- Families
- Financial Transactions
- Events
- Event Budgets
- Other tenant operational data

---

3.2 API Request Flow

Every authenticated API request MUST follow this flow:

Client
  │
  │ JWT
  ▼
Go API
  │
  ▼
JWT Middleware
  │
  ├── user_id
  ├── role
  └── tenant_id
  │
  ▼
Tenant Context
  │
  ▼
PostgreSQL
  │
  └── SET search_path TO tenant_rtXX

The application MUST ensure that tenant context cannot be overridden by arbitrary client input.

---

4. PRODUCT EPICS & USER STORIES

EPIC 1: IAM & Multi-Tenancy

STORY 1.1 — Tenant Creation

Build a Superadmin API to create new Tenants (RTs).

The operation MUST:

1. Create the tenant record in the public schema.
2. Generate a unique tenant identifier.
3. Automatically create the corresponding PostgreSQL schema.
4. Initialize the required tenant tables.

---

STORY 1.2 — Authentication

Implement stateless Login using Golang JWT.

The JWT payload MUST include:

user_id
role
tenant_id

The authentication layer MUST validate:

- Token signature
- Token expiration
- User identity
- Tenant identity
- Required permissions

---

STORY 1.3 — Reverse Proxy Routing

Configure Traefik routing:

api.openrt.local
        │
        ▼
Go Backend


app.openrt.local
        │
        ▼
React PWA

---

EPIC 2: CORE DEMOGRAPHY

Data Kependudukan

STORY 2.1 — Families & Citizens

Create CRUD APIs for:

- Families
- Citizens

Sensitive identifiers such as NIK MUST NOT be stored as plaintext.

Use appropriate encryption/hashing strategies depending on the required use case.

«If NIK must be searched or matched, a deterministic lookup strategy should be used rather than relying solely on one-way hashing.»

---

STORY 2.2 — Document Upload

Build a frontend PWA page allowing residents to upload:

- KTP photos
- KK photos

Files MUST be stored in MinIO.

PostgreSQL stores the corresponding object reference/metadata rather than the binary file itself.

---

STORY 2.3 — Resident Approval

Build an Admin Dashboard allowing the RT Head to:

- Review resident registrations
- Approve registrations
- Reject registrations
- View relevant submitted documents

---

EPIC 3: OPEN LEDGER

Buku Kas Transparan

STORY 3.1 — Financial Transactions

Create a "financial_transactions" model/table.

The ledger MUST be append-only.

Existing financial transactions MUST NOT be:

- Updated
- Deleted

Corrections MUST be performed using reversing entries.

Example:

Original:
+ Rp500.000

Correction:
- Rp500.000

Replacement:
+ Rp450.000

This preserves financial history and auditability.

---

STORY 3.2 — Financial Reporting

Build APIs to calculate:

- Current balance
- Monthly income
- Monthly spending
- Spending breakdown
- Transaction history

---

STORY 3.3 — Resident Dashboard

Build a resident-facing PWA dashboard that allows residents to view:

- Current RT cash balance
- Monthly financial activity
- Spending breakdown
- Personal monthly dues status

Financial information is read-only for residents.

---

EPIC 4: EVENT & BUDGETING

Acara Tahunan

STORY 4.1 — Events & Budgets

Create models for:

Events
Event_Budgets

Event budgets should support RAB-style planning.

---

STORY 4.2 — Dynamic Role Assignment

Build an API allowing the RT Head to assign temporary event roles to residents.

Examples:

Ketua Panitia
Bendahara
Sekretaris
Seksi Konsumsi
Seksi Dokumentasi

Role assignments MUST be scoped to the specific event.

---

STORY 4.3 — Event Transparency

Build a PWA view allowing residents to see:

- Event timeline
- Event status
- Funding progress
- Budget information
- Donation information

Residents can also upload donation/payment receipts.

Receipt files MUST be stored in MinIO.

---

5. ENGINEERING & EXECUTION STANDARDS

The AI Agent MUST follow the following engineering standards.

5.1 Golang

Use Clean Architecture principles.

Recommended layers:

Handler
   ↓
Service / Use Case
   ↓
Repository
   ↓
Database

Use:

- "database/sql"
- "pgx" PostgreSQL driver

GORM may be used only if multi-schema behavior is properly controlled and understood.

All business logic inside "/services" MUST have unit tests.

Example:

services/
├── tenant_service.go
├── tenant_service_test.go
├── citizen_service.go
├── citizen_service_test.go
└── ledger_service.go

---

5.2 React PWA

The frontend MUST use:

- React
- TypeScript
- Vite
- Tailwind CSS
- "vite-plugin-pwa"

Use ".tsx" for React components.

The PWA should support:

- Service worker
- Offline caching where appropriate
- Installable application
- Responsive mobile-first UI

Recommended structure:

src/
├── components/
├── hooks/
├── pages/
├── services/
├── store/
├── assets/
└── ...

---

5.3 Docker

All Dockerfiles MUST use multi-stage builds.

Backend Example Strategy

Build Stage
    │
    └── golang:alpine
            │
            ▼
       Compile Binary
            │
            ▼
Runtime Stage
    │
    └── Minimal Runtime Image

Final images MUST be kept as small and secure as reasonably possible.

The master "docker-compose.yml" MUST include health checks for:

- PostgreSQL
- Redis
- MinIO

The Go backend MUST only start after required infrastructure dependencies are healthy.

---

5.4 Git

Use Conventional Commits.

Examples:

feat: add tenant creation
feat: add resident registration
feat: add financial ledger
fix: resolve jwt tenant middleware
fix: prevent cross tenant access
refactor: simplify tenant repository
test: add ledger service tests
docs: update architecture

---

6. SECURITY REQUIREMENTS

Because the system manages sensitive resident and financial information, security is a core architectural requirement.

The AI Agent MUST:

1. Never trust "tenant_id" supplied directly by the client.
2. Derive tenant context from authenticated identity.
3. Prevent cross-tenant database access.
4. Never expose database credentials to the frontend.
5. Never store sensitive documents directly inside PostgreSQL.
6. Store object references and metadata for MinIO objects.
7. Validate uploaded file types and sizes.
8. Protect administrative endpoints with role-based authorization.
9. Use secure password hashing.
10. Never log passwords, JWT secrets, NIK values, or sensitive documents.
11. Validate all user input at API boundaries.
12. Use parameterized SQL queries.
13. Apply rate limiting to authentication endpoints.
14. Maintain audit logs for sensitive administrative actions.

---

7. DATA & AUDIT PRINCIPLES

The system should prioritize traceability.

Important operations should generate audit records.

Examples:

Resident Created
Resident Approved
Resident Rejected
Document Uploaded
Transaction Created
Transaction Reversed
Event Created
Budget Updated
Role Assigned

Financial records MUST remain immutable.

Administrative actions SHOULD be auditable.

---

8. AI AGENT EXECUTION RULES

The AI Agent MUST NOT blindly generate the entire system in one step.

Implementation should follow incremental phases.

Phase 1 — Foundation

Implement:

Repository structure
Docker Compose
PostgreSQL
Redis
MinIO
Traefik
Go API
React PWA
Health checks
Environment configuration

---

Phase 2 — IAM & Multi-Tenancy

Implement:

Tenant creation
Tenant schema provisioning
User model
Authentication
JWT
RBAC
Tenant middleware
Tenant context

This phase MUST pass cross-tenant isolation tests before continuing.

---

Phase 3 — Demography

Implement:

Families
Citizens
Resident registration
Document upload
MinIO integration
Resident approval

---

Phase 4 — Financial Ledger

Implement:

Financial transactions
Append-only enforcement
Reversing entries
Balance calculation
Monthly reports
Resident dashboard
Dues status

---

Phase 5 — Events & Budgeting

Implement:

Events
Event budgets
Event roles
Funding progress
Donation receipts
Event dashboard

---

Phase 6 — Hardening

Implement:

Security review
Tenant isolation tests
Unit tests
Integration tests
API documentation
Logging
Audit trail
Health checks
Backup strategy
Deployment documentation

---

9. DEFINITION OF DONE

A feature is NOT considered complete merely because the code compiles.

Each feature MUST satisfy:

[ ] Requirements implemented
[ ] API implemented
[ ] Validation implemented
[ ] Authorization implemented
[ ] Tenant isolation verified
[ ] Database migration implemented
[ ] Unit tests implemented
[ ] Integration tests where required
[ ] Error handling implemented
[ ] Logging implemented where appropriate
[ ] API documentation updated
[ ] Frontend integrated where applicable
[ ] Docker environment tested
[ ] No known cross-tenant data leakage

---

10. AI AGENT WORKING PROTOCOL

For every task, the AI Agent MUST follow this sequence:

1. READ
   ↓
2. UNDERSTAND
   ↓
3. INSPECT EXISTING CODE
   ↓
4. PLAN
   ↓
5. IMPLEMENT
   ↓
6. TEST
   ↓
7. REVIEW
   ↓
8. REPORT

The AI Agent MUST inspect the existing repository before creating or modifying files.

The AI Agent MUST NOT unnecessarily rewrite working code.

The AI Agent MUST prefer small, isolated changes over large uncontrolled modifications.

If a requirement conflicts with the existing architecture, the AI Agent MUST identify the conflict before implementing it.

---

[AI_AGENT_START_SEQUENCE]

Immediate Task Sequence

The AI Agent should begin with the following tasks:

Task 1 — Initialize Monorepo

Generate:

openrt-monorepo/
├── backend/
├── frontend/
├── infrastructure/
├── docs/
└── MASTER_BLUEPRINT.md

---

Task 2 — Infrastructure

Create:

infrastructure/docker-compose.yml

It MUST include:

Traefik
PostgreSQL
Redis
MinIO
Backend
Frontend

Configure:

- Networks
- Volumes
- Environment variables
- Health checks
- Dependency conditions
- Persistent storage

---

Task 3 — Backend

Initialize the Go module:

/backend

Configure:

- HTTP Router
- Configuration loader
- PostgreSQL connection
- Redis connection
- MinIO client
- Structured logging
- Health check endpoint

Example:

GET /health

Expected response:

{
  "status": "ok"
}

---

Task 4 — Frontend

Initialize:

React
+
Vite
+
TypeScript
+
Tailwind CSS
+
vite-plugin-pwa

Configure:

- PWA manifest
- Service worker
- API client
- Environment configuration
- Basic application shell

---

Task 5 — Verification

Before proceeding to IAM implementation, verify:

[ ] docker compose up works
[ ] PostgreSQL is healthy
[ ] Redis is healthy
[ ] MinIO is healthy
[ ] Traefik is running
[ ] Backend is reachable
[ ] Frontend is reachable
[ ] /health returns 200
[ ] Persistent volumes work

Only after the foundation is verified should the AI Agent proceed to EPIC 1 — IAM & Multi-Tenancy.

---

FINAL DIRECTIVE

«This blueprint is the architectural source of truth for the OpenRT SaaS Platform.

The AI Agent must prioritize correctness, security, tenant isolation, maintainability, and incremental implementation over speed.

Never sacrifice data isolation or financial integrity for implementation convenience.

When uncertain, inspect the existing code, identify the architectural impact, and explain the trade-off before making a destructive or irreversible change.»
