package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"backend/internal/domain"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserAlreadyExists  = errors.New("user with this email already exists")
	ErrTenantAlreadyExists= errors.New("tenant slug or domain already exists")
	ErrUnauthorized       = errors.New("unauthorized action")
	ErrRoleNotFound       = errors.New("role not found")
	ErrForbidden          = errors.New("forbidden: insufficient permissions")
)

type AuthUsecase interface {
	Login(ctx context.Context, email, password string, tenantID *uuid.UUID) (string, *domain.User, domain.RoleName, error)
	Register(ctx context.Context, name, email, password string, phone *string) (*domain.User, error)
	GetUserTenants(ctx context.Context, userID uuid.UUID) ([]*domain.Tenant, error)
	// SwitchTenant re-issues a JWT scoped to a tenant the user is explicitly
	// mapped to. This is the only sanctioned way for a multi-tenant user to
	// change their active tenant; the server verifies the mapping.
	SwitchTenant(ctx context.Context, userID, tenantID uuid.UUID) (string, *domain.User, domain.RoleName, error)

	// SuperAdmin Tenant CRUD
	CreateTenant(ctx context.Context, name, slug string, domainName, logoURL *string) (*domain.Tenant, error)
	GetTenantByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error)
	GetTenantBySlug(ctx context.Context, slug string) (*domain.Tenant, error)
	UpdateTenant(ctx context.Context, id uuid.UUID, name, slug string, domainName, logoURL *string, status string) (*domain.Tenant, error)
	DeleteTenant(ctx context.Context, id uuid.UUID) error
	ListTenants(ctx context.Context, limit, offset int) ([]*domain.Tenant, int64, error)
}

type authUsecase struct {
	tenantRepo     domain.TenantRepository
	userRepo       domain.UserRepository
	tenantUserRepo domain.TenantUserRepository
	roleRepo       domain.RoleRepository
	jwtSecret      []byte
	jwtDuration    time.Duration
	// baseDomain is the configurable parent domain used to build the default
	// tenant domain (<slug>.<baseDomain>). Never hardcode a production domain.
	baseDomain string
}

func NewAuthUsecase(
	tenantRepo domain.TenantRepository,
	userRepo domain.UserRepository,
	tenantUserRepo domain.TenantUserRepository,
	roleRepo domain.RoleRepository,
	jwtSecret string,
	jwtDuration time.Duration,
	baseDomain string,
) AuthUsecase {
	if jwtDuration == 0 {
		jwtDuration = 24 * time.Hour
	}
	if baseDomain == "" {
		baseDomain = "openrt.local"
	}
	return &authUsecase{
		tenantRepo:     tenantRepo,
		userRepo:       userRepo,
		tenantUserRepo: tenantUserRepo,
		roleRepo:       roleRepo,
		jwtSecret:      []byte(jwtSecret),
		jwtDuration:    jwtDuration,
		baseDomain:     baseDomain,
	}
}

func (u *authUsecase) Register(ctx context.Context, name, email, password string, phone *string) (*domain.User, error) {
	existing, err := u.userRepo.GetByEmail(ctx, email)
	if err == nil && existing != nil {
		return nil, ErrUserAlreadyExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		ID:           uuid.New(),
		Name:         name,
		Email:        email,
		PasswordHash: string(hash),
		Phone:        phone,
	}

	if err := u.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

// isSuperAdminRole reports whether a role name is the platform superadmin role.
func isSuperAdminRole(role domain.RoleName) bool {
	r := strings.ToLower(strings.ReplaceAll(string(role), "-", "_"))
	return r == "superadmin" || r == "super_admin"
}

// activeTenantUsers filters to mappings whose status is 'active'. Deactivated
// mappings must never grant a session role or tenant scope.
func activeTenantUsers(tus []*domain.TenantUser) []*domain.TenantUser {
	if len(tus) == 0 {
		return tus
	}
	active := make([]*domain.TenantUser, 0, len(tus))
	for _, tu := range tus {
		if strings.EqualFold(tu.Status, "active") || tu.Status == "" {
			active = append(active, tu)
		}
	}
	return active
}

// selectLoginTenantUser picks the tenant-user mapping used for the session:
// 1. an explicit superadmin mapping,
// 2. the mapping matching the requested tenant_id (if provided),
// 3. otherwise the first mapping.
func selectLoginTenantUser(tus []*domain.TenantUser, tenantID *uuid.UUID) *domain.TenantUser {
	if len(tus) == 0 {
		return nil
	}
	for _, tu := range tus {
		if isSuperAdminRole(tu.RoleName) {
			return tu
		}
	}
	if tenantID != nil {
		for _, tu := range tus {
			if tu.TenantID == *tenantID {
				return tu
			}
		}
	}
	return tus[0]
}

func (u *authUsecase) Login(ctx context.Context, email, password string, tenantID *uuid.UUID) (string, *domain.User, domain.RoleName, error) {
	user, err := u.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return "", nil, "", ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", nil, "", ErrInvalidCredentials
	}

	var role domain.RoleName
	var tid uuid.UUID

	// Role and tenant scope come exclusively from the database mapping
	// (tenant_users JOIN roles). No role is ever derived from the email address
	// or from client input. Only active mappings grant a role/tenant scope.
	tus, err := u.tenantUserRepo.ListByUser(ctx, user.ID)
	if err == nil && len(tus) > 0 {
		selected := selectLoginTenantUser(activeTenantUsers(tus), tenantID)
		if selected != nil {
			role = selected.RoleName
			tid = selected.TenantID
		}
	}

	// Users without any tenant mapping get the lowest-privilege role with no
	// tenant scope. They can authenticate but cannot access tenant data until an
	// admin assigns them to a tenant.
	if role == "" {
		role = domain.RoleResident
	}

	claims := domain.JWTClaims{
		UserID:   user.ID,
		TenantID: tid,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(u.jwtDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(u.jwtSecret)
	if err != nil {
		return "", nil, "", err
	}

	return tokenString, user, role, nil
}

func (u *authUsecase) SwitchTenant(ctx context.Context, userID, tenantID uuid.UUID) (string, *domain.User, domain.RoleName, error) {
	if userID == uuid.Nil || tenantID == uuid.Nil {
		return "", nil, "", ErrUnauthorized
	}

	tus, err := u.tenantUserRepo.ListByUser(ctx, userID)
	if err != nil || len(tus) == 0 {
		return "", nil, "", ErrUnauthorized
	}
	tus = activeTenantUsers(tus)
	if len(tus) == 0 {
		return "", nil, "", ErrUnauthorized
	}

	var selected *domain.TenantUser
	for _, tu := range tus {
		if tu.TenantID == tenantID {
			selected = tu
			break
		}
	}
	if selected == nil {
		// The user is not mapped to the requested tenant.
		return "", nil, "", ErrUnauthorized
	}

	// Ensure the tenant still exists and is active. Disabled tenants must not be
	// switchable even though their hostname may still resolve.
	tenant, err := u.tenantRepo.GetByID(ctx, tenantID)
	if err != nil || tenant == nil || !tenant.IsActive() {
		return "", nil, "", ErrUnauthorized
	}

	user, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", nil, "", ErrUnauthorized
	}

	claims := domain.JWTClaims{
		UserID:   user.ID,
		TenantID: tenantID,
		Role:     selected.RoleName,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(u.jwtDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(u.jwtSecret)
	if err != nil {
		return "", nil, "", err
	}

	return tokenString, user, selected.RoleName, nil
}

func (u *authUsecase) GetUserTenants(ctx context.Context, userID uuid.UUID) ([]*domain.Tenant, error) {
	tenants, err := u.tenantUserRepo.ListTenantsByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	// Only tenants with an active mapping are switchable/selectable.
	if len(tenants) == 0 {
		return tenants, nil
	}
	tus, err := u.tenantUserRepo.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	active := activeTenantUsers(tus)
	activeTenantIDs := make(map[uuid.UUID]bool, len(active))
	for _, tu := range active {
		activeTenantIDs[tu.TenantID] = true
	}
	filtered := tenants[:0]
	for _, t := range tenants {
		if activeTenantIDs[t.ID] && t.IsActive() {
			filtered = append(filtered, t)
		}
	}
	return filtered, nil
}

func (u *authUsecase) CreateTenant(ctx context.Context, name, slug string, domainName, logoURL *string) (*domain.Tenant, error) {
	existing, err := u.tenantRepo.GetBySlug(ctx, slug)
	if err == nil && existing != nil {
		return nil, ErrTenantAlreadyExists
	}

	if domainName == nil || strings.TrimSpace(*domainName) == "" {
		defaultDomain := fmt.Sprintf("%s.%s", strings.TrimSpace(slug), u.baseDomain)
		domainName = &defaultDomain
	}

	tenant := &domain.Tenant{
		ID:      uuid.New(),
		Name:    name,
		Slug:    slug,
		Domain:  domainName,
		LogoURL: logoURL,
		Status:  "active",
	}

	if err := u.tenantRepo.Create(ctx, tenant); err != nil {
		return nil, err
	}

	return tenant, nil
}

func (u *authUsecase) GetTenantByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	return u.tenantRepo.GetByID(ctx, id)
}

func (u *authUsecase) GetTenantBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	return u.tenantRepo.GetBySlug(ctx, slug)
}

func (u *authUsecase) UpdateTenant(ctx context.Context, id uuid.UUID, name, slug string, domainName, logoURL *string, status string) (*domain.Tenant, error) {
	tenant, err := u.tenantRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if domainName == nil || strings.TrimSpace(*domainName) == "" {
		defaultDomain := fmt.Sprintf("%s.%s", strings.TrimSpace(slug), u.baseDomain)
		domainName = &defaultDomain
	}

	tenant.Name = name
	tenant.Slug = slug
	tenant.Domain = domainName
	tenant.LogoURL = logoURL
	if status != "" {
		tenant.Status = status
	}

	if err := u.tenantRepo.Update(ctx, tenant); err != nil {
		return nil, err
	}

	return tenant, nil
}

func (u *authUsecase) DeleteTenant(ctx context.Context, id uuid.UUID) error {
	return u.tenantRepo.Delete(ctx, id)
}

func (u *authUsecase) ListTenants(ctx context.Context, limit, offset int) ([]*domain.Tenant, int64, error) {
	if limit <= 0 {
		// Platform tenant directory: the superadmin tenant picker needs the
		// full list so users can be assigned to older tenants too. A small
		// default (e.g. 10) silently hides older tenants from the UI.
		limit = 500
	}
	return u.tenantRepo.List(ctx, limit, offset)
}
