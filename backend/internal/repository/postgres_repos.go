package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"backend/internal/domain"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

var (
	ErrNotFound = errors.New("record not found")
)

type tenantRepository struct {
	db *sql.DB
}

func NewTenantRepository(db *sql.DB) domain.TenantRepository {
	return &tenantRepository{db: db}
}

func (r *tenantRepository) Create(ctx context.Context, tenant *domain.Tenant) error {
	if tenant.ID == uuid.Nil {
		tenant.ID = uuid.New()
	}
	if tenant.Status == "" {
		tenant.Status = "active"
	}

	query := `
		INSERT INTO tenants (id, name, slug, domain, logo_url, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	if err := r.db.QueryRowContext(ctx, query, tenant.ID, tenant.Name, tenant.Slug, tenant.Domain, tenant.LogoURL, tenant.Status).
		Scan(&tenant.CreatedAt, &tenant.UpdatedAt); err != nil {
		return err
	}

	return CreateTenantSchema(ctx, r.db, tenant.Slug)
}

// CreateTenantSchema dynamically creates schema tenant_<slug> and operational tables
func CreateTenantSchema(ctx context.Context, db *sql.DB, slug string) error {
	schemaName := "tenant_" + strings.ReplaceAll(slug, "-", "_")
	
	// Create schema if not exists
	_, err := db.ExecContext(ctx, "CREATE SCHEMA IF NOT EXISTS "+pq.QuoteIdentifier(schemaName))
	if err != nil {
		return err
	}

	// Create operational tables within tenant schema
	tablesDDL := []string{
		`CREATE TABLE IF NOT EXISTS ` + pq.QuoteIdentifier(schemaName) + `.residents (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
			nik TEXT,
			nik_hash VARCHAR(64),
			kk_number VARCHAR(16),
			full_name VARCHAR(255),
			gender VARCHAR(50),
			birth_place VARCHAR(255),
			birth_date DATE,
			address TEXT,
			rt_rw VARCHAR(50),
			phone VARCHAR(50),
			is_head_of_family BOOLEAN DEFAULT FALSE,
			status VARCHAR(50) NOT NULL DEFAULT 'pending',
			ktp_url TEXT,
			kk_url TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS ` + pq.QuoteIdentifier(schemaName) + `.family_members (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			resident_id UUID NOT NULL REFERENCES ` + pq.QuoteIdentifier(schemaName) + `.residents(id) ON DELETE CASCADE,
			full_name VARCHAR(255),
			nik VARCHAR(16),
			relation VARCHAR(100),
			birth_date DATE,
			gender VARCHAR(50),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS ` + pq.QuoteIdentifier(schemaName) + `.fee_categories (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
			period VARCHAR(50) NOT NULL CHECK (period IN ('monthly', 'one_time')),
			description TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS ` + pq.QuoteIdentifier(schemaName) + `.dues_payments (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
			resident_id UUID NOT NULL REFERENCES ` + pq.QuoteIdentifier(schemaName) + `.residents(id) ON DELETE CASCADE,
			fee_category_id UUID NOT NULL REFERENCES ` + pq.QuoteIdentifier(schemaName) + `.fee_categories(id) ON DELETE RESTRICT,
			amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
			period_month INT NOT NULL,
			period_year INT NOT NULL,
			status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
			proof_url TEXT,
			verified_at TIMESTAMPTZ,
			verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS ` + pq.QuoteIdentifier(schemaName) + `.financial_transactions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
			type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
			category VARCHAR(255) NOT NULL,
			amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
			transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
			description TEXT,
			proof_url TEXT,
			created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS ` + pq.QuoteIdentifier(schemaName) + `.events (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
			title VARCHAR(255) NOT NULL,
			description TEXT,
			event_date TIMESTAMPTZ,
			location VARCHAR(255),
			status VARCHAR(50) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')),
			created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS ` + pq.QuoteIdentifier(schemaName) + `.event_budgets (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			event_id UUID NOT NULL REFERENCES ` + pq.QuoteIdentifier(schemaName) + `.events(id) ON DELETE CASCADE,
			item VARCHAR(255),
			category VARCHAR(100),
			description VARCHAR(255) NOT NULL,
			planned_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
			actual_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
			estimated_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
			actual_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS ` + pq.QuoteIdentifier(schemaName) + `.event_participants (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			event_id UUID NOT NULL REFERENCES ` + pq.QuoteIdentifier(schemaName) + `.events(id) ON DELETE CASCADE,
			resident_id UUID NOT NULL REFERENCES ` + pq.QuoteIdentifier(schemaName) + `.residents(id) ON DELETE CASCADE,
			status VARCHAR(50) NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'absent', 'maybe')),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (event_id, resident_id)
		);`,
		`CREATE TABLE IF NOT EXISTS ` + pq.QuoteIdentifier(schemaName) + `.event_sponsors (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			event_id UUID NOT NULL REFERENCES ` + pq.QuoteIdentifier(schemaName) + `.events(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
			type VARCHAR(50) NOT NULL CHECK (type IN ('cash', 'goods', 'service')),
			notes TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS ` + pq.QuoteIdentifier(schemaName) + `.event_roles (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			event_id UUID NOT NULL REFERENCES ` + pq.QuoteIdentifier(schemaName) + `.events(id) ON DELETE CASCADE,
			resident_id UUID NOT NULL REFERENCES ` + pq.QuoteIdentifier(schemaName) + `.residents(id) ON DELETE CASCADE,
			role VARCHAR(100) NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (event_id, resident_id, role)
		);`,
		`CREATE TABLE IF NOT EXISTS ` + pq.QuoteIdentifier(schemaName) + `.event_receipts (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			event_id UUID NOT NULL REFERENCES ` + pq.QuoteIdentifier(schemaName) + `.events(id) ON DELETE CASCADE,
			resident_id UUID REFERENCES ` + pq.QuoteIdentifier(schemaName) + `.residents(id) ON DELETE SET NULL,
			receipt_url TEXT NOT NULL,
			amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
			description TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS ` + pq.QuoteIdentifier(schemaName) + `.aspirations (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
			resident_id UUID REFERENCES ` + pq.QuoteIdentifier(schemaName) + `.residents(id) ON DELETE SET NULL,
			title VARCHAR(255) NOT NULL,
			content TEXT NOT NULL,
			category VARCHAR(50) NOT NULL CHECK (category IN ('suggestion', 'complaint', 'question')),
			status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'resolved', 'rejected')),
			is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
			response TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS ` + pq.QuoteIdentifier(schemaName) + `.community_needs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
			title VARCHAR(255) NOT NULL,
			description TEXT,
			estimated_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
			status VARCHAR(50) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'in_progress', 'completed')),
			progress_notes TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS ` + pq.QuoteIdentifier(schemaName) + `.announcements (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
			title VARCHAR(255) NOT NULL,
			content TEXT NOT NULL,
			attachment_url TEXT,
			target VARCHAR(50) NOT NULL CHECK (target IN ('all', 'residents_only')),
			created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS ` + pq.QuoteIdentifier(schemaName) + `.documents (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
			title VARCHAR(255) NOT NULL,
			category VARCHAR(50) NOT NULL CHECK (category IN ('financial_report', 'minutes', 'letter', 'other')),
			file_url TEXT NOT NULL,
			uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
	}

	for _, ddl := range tablesDDL {
		if _, err := db.ExecContext(ctx, ddl); err != nil {
			return err
		}
	}
	return nil
}

func (r *tenantRepository) SetSearchPath(ctx context.Context, slug string) error {
	return SetTenantSearchPath(ctx, r.db, slug)
}

func (r *tenantRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	query := `SELECT id, name, slug, domain, logo_url, status, created_at, updated_at FROM tenants WHERE id = $1`
	var t domain.Tenant
	err := r.db.QueryRowContext(ctx, query, id).Scan(&t.ID, &t.Name, &t.Slug, &t.Domain, &t.LogoURL, &t.Status, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &t, err
}

func (r *tenantRepository) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	query := `SELECT id, name, slug, domain, logo_url, status, created_at, updated_at FROM tenants WHERE slug = $1`
	var t domain.Tenant
	err := r.db.QueryRowContext(ctx, query, slug).Scan(&t.ID, &t.Name, &t.Slug, &t.Domain, &t.LogoURL, &t.Status, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &t, err
}

func (r *tenantRepository) GetByDomain(ctx context.Context, domainName string) (*domain.Tenant, error) {
	query := `SELECT id, name, slug, domain, logo_url, status, created_at, updated_at FROM tenants WHERE domain = $1`
	var t domain.Tenant
	err := r.db.QueryRowContext(ctx, query, domainName).Scan(&t.ID, &t.Name, &t.Slug, &t.Domain, &t.LogoURL, &t.Status, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &t, err
}

func (r *tenantRepository) Update(ctx context.Context, tenant *domain.Tenant) error {
	if tenant.Status == "" {
		tenant.Status = "active"
	}
	query := `
		UPDATE tenants
		SET name = $1, slug = $2, domain = $3, logo_url = $4, status = $5, updated_at = NOW()
		WHERE id = $6
		RETURNING updated_at
	`
	res := r.db.QueryRowContext(ctx, query, tenant.Name, tenant.Slug, tenant.Domain, tenant.LogoURL, tenant.Status, tenant.ID)
	return res.Scan(&tenant.UpdatedAt)
}

func (r *tenantRepository) Delete(ctx context.Context, id uuid.UUID) error {
	// Fetch the slug first so the tenant schema can be dropped alongside the
	// tenant row (schema-per-tenant isolation must not leak orphan schemas).
	tenant, err := r.GetByID(ctx, id)
	if err != nil {
		return ErrNotFound
	}

	query := `DELETE FROM tenants WHERE id = $1`
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}

	if tenant.Slug != "" {
		schemaName := "tenant_" + strings.ReplaceAll(tenant.Slug, "-", "_")
		if _, err := r.db.ExecContext(ctx, "DROP SCHEMA IF EXISTS "+pq.QuoteIdentifier(schemaName)+" CASCADE"); err != nil {
			return err
		}
	}
	return nil
}

func (r *tenantRepository) List(ctx context.Context, limit, offset int) ([]*domain.Tenant, int64, error) {
	var count int64
	countQuery := `SELECT COUNT(*) FROM tenants`
	if err := r.db.QueryRowContext(ctx, countQuery).Scan(&count); err != nil {
		return nil, 0, err
	}

	query := `SELECT id, name, slug, domain, logo_url, status, created_at, updated_at FROM tenants ORDER BY created_at DESC LIMIT $1 OFFSET $2`
	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tenants []*domain.Tenant
	for rows.Next() {
		var t domain.Tenant
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Domain, &t.LogoURL, &t.Status, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, 0, err
		}
		tenants = append(tenants, &t)
	}
	return tenants, count, rows.Err()
}

type userRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) domain.UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) error {
	query := `
		INSERT INTO users (id, email, password_hash, name, phone, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	return r.db.QueryRowContext(ctx, query, user.ID, user.Email, user.PasswordHash, user.Name, user.Phone).
		Scan(&user.CreatedAt, &user.UpdatedAt)
}

func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	query := `SELECT id, email, password_hash, name, phone, created_at, updated_at FROM users WHERE id = $1`
	var u domain.User
	err := r.db.QueryRowContext(ctx, query, id).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Phone, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `SELECT id, email, password_hash, name, phone, created_at, updated_at FROM users WHERE email = $1`
	var u domain.User
	err := r.db.QueryRowContext(ctx, query, email).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Phone, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (r *userRepository) Update(ctx context.Context, user *domain.User) error {
	query := `
		UPDATE users
		SET name = $1, phone = $2, password_hash = $3, updated_at = NOW()
		WHERE id = $4
		RETURNING updated_at
	`
	return r.db.QueryRowContext(ctx, query, user.Name, user.Phone, user.PasswordHash, user.ID).Scan(&user.UpdatedAt)
}

func (r *userRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *userRepository) ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.UserWithRole, int64, error) {
	countQuery := `
		SELECT COUNT(*)
		FROM users u
		JOIN tenant_users tu ON u.id = tu.user_id
		WHERE tu.tenant_id = $1
	`
	var count int64
	if err := r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&count); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT u.id, u.email, u.name, u.phone, u.created_at, u.updated_at, r.name as role_name, tu.tenant_id, COALESCE(t.name, '') as tenant_name
		FROM users u
		JOIN tenant_users tu ON u.id = tu.user_id
		JOIN roles r ON tu.role_id = r.id
		LEFT JOIN tenants t ON tu.tenant_id = t.id
		WHERE tu.tenant_id = $1
		ORDER BY u.created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.QueryContext(ctx, query, tenantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []*domain.UserWithRole
	for rows.Next() {
		var u domain.UserWithRole
		var tid uuid.UUID
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Phone, &u.CreatedAt, &u.UpdatedAt, &u.RoleName, &tid, &u.TenantName); err != nil {
			return nil, 0, err
		}
		u.TenantID = &tid
		list = append(list, &u)
	}
	return list, count, rows.Err()
}

func (r *userRepository) ListAll(ctx context.Context, limit, offset int) ([]*domain.UserWithRole, int64, error) {
	countQuery := `
		SELECT COUNT(*)
		FROM users u
		LEFT JOIN tenant_users tu ON u.id = tu.user_id
	`
	var count int64
	if err := r.db.QueryRowContext(ctx, countQuery).Scan(&count); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT u.id, u.email, u.name, u.phone, u.created_at, u.updated_at, COALESCE(r.name, 'superadmin') as role_name, tu.tenant_id, COALESCE(t.name, '') as tenant_name
		FROM users u
		LEFT JOIN tenant_users tu ON u.id = tu.user_id
		LEFT JOIN roles r ON tu.role_id = r.id
		LEFT JOIN tenants t ON tu.tenant_id = t.id
		ORDER BY u.created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []*domain.UserWithRole
	for rows.Next() {
		var u domain.UserWithRole
		var tid *uuid.UUID
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Phone, &u.CreatedAt, &u.UpdatedAt, &u.RoleName, &tid, &u.TenantName); err != nil {
			return nil, 0, err
		}
		u.TenantID = tid
		list = append(list, &u)
	}
	return list, count, rows.Err()
}

type tenantUserRepository struct {
	db *sql.DB
}

func NewTenantUserRepository(db *sql.DB) domain.TenantUserRepository {
	return &tenantUserRepository{db: db}
}

func (r *tenantUserRepository) Create(ctx context.Context, tu *domain.TenantUser) error {
	query := `
		INSERT INTO tenant_users (id, tenant_id, user_id, role_id, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	if tu.ID == uuid.Nil {
		tu.ID = uuid.New()
	}
	if tu.Status == "" {
		tu.Status = "active"
	}
	return r.db.QueryRowContext(ctx, query, tu.ID, tu.TenantID, tu.UserID, tu.RoleID, tu.Status).
		Scan(&tu.CreatedAt, &tu.UpdatedAt)
}

func (r *tenantUserRepository) GetByTenantAndUser(ctx context.Context, tenantID, userID uuid.UUID) (*domain.TenantUser, error) {
	query := `
		SELECT tu.id, tu.tenant_id, tu.user_id, tu.role_id, r.name, tu.status, tu.created_at, tu.updated_at
		FROM tenant_users tu
		JOIN roles r ON tu.role_id = r.id
		WHERE tu.tenant_id = $1 AND tu.user_id = $2
	`
	var tu domain.TenantUser
	err := r.db.QueryRowContext(ctx, query, tenantID, userID).
		Scan(&tu.ID, &tu.TenantID, &tu.UserID, &tu.RoleID, &tu.RoleName, &tu.Status, &tu.CreatedAt, &tu.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &tu, err
}

func (r *tenantUserRepository) UpdateRole(ctx context.Context, tenantID, userID, roleID uuid.UUID) error {
	query := `
		UPDATE tenant_users
		SET role_id = $1, updated_at = NOW()
		WHERE tenant_id = $2 AND user_id = $3
	`
	res, err := r.db.ExecContext(ctx, query, roleID, tenantID, userID)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *tenantUserRepository) Delete(ctx context.Context, tenantID, userID uuid.UUID) error {
	query := `DELETE FROM tenant_users WHERE tenant_id = $1 AND user_id = $2`
	res, err := r.db.ExecContext(ctx, query, tenantID, userID)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *tenantUserRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]*domain.TenantUser, error) {
	query := `
		SELECT tu.id, tu.tenant_id, tu.user_id, tu.role_id, r.name, tu.status, tu.created_at, tu.updated_at
		FROM tenant_users tu
		JOIN roles r ON tu.role_id = r.id
		WHERE tu.user_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.TenantUser
	for rows.Next() {
		var tu domain.TenantUser
		if err := rows.Scan(&tu.ID, &tu.TenantID, &tu.UserID, &tu.RoleID, &tu.RoleName, &tu.Status, &tu.CreatedAt, &tu.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &tu)
	}
	return list, rows.Err()
}

func (r *tenantUserRepository) ListTenantsByUserID(ctx context.Context, userID uuid.UUID) ([]*domain.Tenant, error) {
	query := `
		SELECT t.id, t.name, t.slug, t.domain, t.logo_url, t.created_at, t.updated_at
		FROM tenants t
		JOIN tenant_users tu ON t.id = tu.tenant_id
		WHERE tu.user_id = $1
		ORDER BY t.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.Tenant
	for rows.Next() {
		var t domain.Tenant
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Domain, &t.LogoURL, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &t)
	}
	return list, rows.Err()
}

type roleRepository struct {
	db *sql.DB
}

func NewRoleRepository(db *sql.DB) domain.RoleRepository {
	return &roleRepository{db: db}
}

func (r *roleRepository) GetByName(ctx context.Context, name domain.RoleName) (*domain.Role, error) {
	query := `SELECT id, name FROM roles WHERE name = $1`
	var role domain.Role
	err := r.db.QueryRowContext(ctx, query, name).Scan(&role.ID, &role.Name)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &role, err
}
