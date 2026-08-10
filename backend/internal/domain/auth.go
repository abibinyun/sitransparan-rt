package domain

import (
	"context"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type RoleName string

const (
	RoleSuperAdmin RoleName = "superadmin"
	RoleAdminRT    RoleName = "admin_rt"
	RoleResident   RoleName = "resident"
)

type Tenant struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Domain    *string   `json:"domain,omitempty"`
	LogoURL   *string   `json:"logo_url,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	Phone        *string   `json:"phone,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Role struct {
	ID   uuid.UUID `json:"id"`
	Name RoleName  `json:"name"`
}

type TenantUser struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenant_id"`
	UserID    uuid.UUID `json:"user_id"`
	RoleID    uuid.UUID `json:"role_id"`
	RoleName  RoleName  `json:"role_name,omitempty"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type JWTClaims struct {
	UserID   uuid.UUID `json:"user_id"`
	TenantID uuid.UUID `json:"tenant_id,omitempty"`
	Role     RoleName  `json:"role,omitempty"`
	jwt.RegisteredClaims
}

type ContextKey string

const (
	TenantContextKey ContextKey = "tenant"
)

type TenantRepository interface {
	Create(ctx context.Context, tenant *Tenant) error
	GetByID(ctx context.Context, id uuid.UUID) (*Tenant, error)
	GetBySlug(ctx context.Context, slug string) (*Tenant, error)
	GetByDomain(ctx context.Context, domain string) (*Tenant, error)
	Update(ctx context.Context, tenant *Tenant) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, limit, offset int) ([]*Tenant, int64, error)
	SetSearchPath(ctx context.Context, slug string) error
}

type UserWithRole struct {
	User
	RoleName   RoleName   `json:"role_name"`
	TenantID   *uuid.UUID `json:"tenant_id,omitempty"`
	TenantName string     `json:"tenant_name,omitempty"`
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id uuid.UUID) error
	ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*UserWithRole, int64, error)
	ListAll(ctx context.Context, limit, offset int) ([]*UserWithRole, int64, error)
}

type TenantUserRepository interface {
	Create(ctx context.Context, tu *TenantUser) error
	GetByTenantAndUser(ctx context.Context, tenantID, userID uuid.UUID) (*TenantUser, error)
	UpdateRole(ctx context.Context, tenantID, userID, roleID uuid.UUID) error
	Delete(ctx context.Context, tenantID, userID uuid.UUID) error
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*TenantUser, error)
	ListTenantsByUserID(ctx context.Context, userID uuid.UUID) ([]*Tenant, error)
}

type RoleRepository interface {
	GetByName(ctx context.Context, name RoleName) (*Role, error)
}
