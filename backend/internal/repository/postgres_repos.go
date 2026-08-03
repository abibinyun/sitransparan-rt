package repository

import (
	"context"
	"database/sql"
	"errors"

	"backend/internal/domain"
	"github.com/google/uuid"
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
	query := `
		INSERT INTO tenants (id, name, slug, domain, logo_url, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	if tenant.ID == uuid.Nil {
		tenant.ID = uuid.New()
	}
	return r.db.QueryRowContext(ctx, query, tenant.ID, tenant.Name, tenant.Slug, tenant.Domain, tenant.LogoURL).
		Scan(&tenant.CreatedAt, &tenant.UpdatedAt)
}

func (r *tenantRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	query := `SELECT id, name, slug, domain, logo_url, created_at, updated_at FROM tenants WHERE id = $1`
	var t domain.Tenant
	err := r.db.QueryRowContext(ctx, query, id).Scan(&t.ID, &t.Name, &t.Slug, &t.Domain, &t.LogoURL, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &t, err
}

func (r *tenantRepository) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	query := `SELECT id, name, slug, domain, logo_url, created_at, updated_at FROM tenants WHERE slug = $1`
	var t domain.Tenant
	err := r.db.QueryRowContext(ctx, query, slug).Scan(&t.ID, &t.Name, &t.Slug, &t.Domain, &t.LogoURL, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &t, err
}

func (r *tenantRepository) GetByDomain(ctx context.Context, domainName string) (*domain.Tenant, error) {
	query := `SELECT id, name, slug, domain, logo_url, created_at, updated_at FROM tenants WHERE domain = $1`
	var t domain.Tenant
	err := r.db.QueryRowContext(ctx, query, domainName).Scan(&t.ID, &t.Name, &t.Slug, &t.Domain, &t.LogoURL, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &t, err
}

func (r *tenantRepository) Update(ctx context.Context, tenant *domain.Tenant) error {
	query := `
		UPDATE tenants
		SET name = $1, slug = $2, domain = $3, logo_url = $4, updated_at = NOW()
		WHERE id = $5
		RETURNING updated_at
	`
	res := r.db.QueryRowContext(ctx, query, tenant.Name, tenant.Slug, tenant.Domain, tenant.LogoURL, tenant.ID)
	return res.Scan(&tenant.UpdatedAt)
}

func (r *tenantRepository) Delete(ctx context.Context, id uuid.UUID) error {
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
	return nil
}

func (r *tenantRepository) List(ctx context.Context, limit, offset int) ([]*domain.Tenant, int64, error) {
	var count int64
	countQuery := `SELECT COUNT(*) FROM tenants`
	if err := r.db.QueryRowContext(ctx, countQuery).Scan(&count); err != nil {
		return nil, 0, err
	}

	query := `SELECT id, name, slug, domain, logo_url, created_at, updated_at FROM tenants ORDER BY created_at DESC LIMIT $1 OFFSET $2`
	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tenants []*domain.Tenant
	for rows.Next() {
		var t domain.Tenant
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Domain, &t.LogoURL, &t.CreatedAt, &t.UpdatedAt); err != nil {
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
