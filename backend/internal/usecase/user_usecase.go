package usecase

import (
	"context"
	"errors"
	"strings"

	"backend/internal/domain"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUserNotFound = errors.New("user not found")
)

type CreateUserParam struct {
	TenantID   uuid.UUID
	Name       string
	Email      string
	Password   string
	Phone      *string
	Role       domain.RoleName
	CallerRole domain.RoleName
}

type UpdateUserParam struct {
	TenantID   uuid.UUID
	UserID     uuid.UUID
	Name       string
	Email      string
	Phone      *string
	Role       domain.RoleName
	Password   *string
	CallerRole domain.RoleName
}

type UserUsecase interface {
	CreateUser(ctx context.Context, p CreateUserParam) (*domain.UserWithRole, error)
	GetUserByID(ctx context.Context, tenantID, userID uuid.UUID) (*domain.UserWithRole, error)
	UpdateUser(ctx context.Context, p UpdateUserParam) (*domain.UserWithRole, error)
	DeleteUser(ctx context.Context, tenantID, userID uuid.UUID, callerRole domain.RoleName) error
	ListUsers(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.UserWithRole, int64, error)
	ListAllUsers(ctx context.Context, limit, offset int) ([]*domain.UserWithRole, int64, error)
}

type userUsecase struct {
	userRepo       domain.UserRepository
	tenantUserRepo domain.TenantUserRepository
	roleRepo       domain.RoleRepository
}

func NewUserUsecase(
	userRepo domain.UserRepository,
	tenantUserRepo domain.TenantUserRepository,
	roleRepo domain.RoleRepository,
) UserUsecase {
	return &userUsecase{
		userRepo:       userRepo,
		tenantUserRepo: tenantUserRepo,
		roleRepo:       roleRepo,
	}
}

// isSuperAdminCaller reports whether the caller holds the platform superadmin role.
func isSuperAdminCaller(role domain.RoleName) bool {
	r := strings.ToLower(strings.ReplaceAll(string(role), "-", "_"))
	return r == "superadmin" || r == "super_admin"
}

// onlySuperAdminCanGrant blocks non-superadmin callers from assigning or
// touching the superadmin role (role escalation prevention).
func onlySuperAdminCanGrant(callerRole, targetRole domain.RoleName) bool {
	if isSuperAdminCaller(targetRole) && !isSuperAdminCaller(callerRole) {
		return false
	}
	return true
}

func (u *userUsecase) CreateUser(ctx context.Context, p CreateUserParam) (*domain.UserWithRole, error) {
	// Role escalation guard: only the platform superadmin may create superadmin accounts.
	if !onlySuperAdminCanGrant(p.CallerRole, p.Role) {
		return nil, ErrForbidden
	}

	// A tenant-scoped caller must create users inside their own tenant.
	if !isSuperAdminCaller(p.CallerRole) && p.TenantID == uuid.Nil {
		return nil, ErrForbidden
	}

	existing, err := u.userRepo.GetByEmail(ctx, p.Email)
	if err == nil && existing != nil {
		return nil, ErrUserAlreadyExists
	}

	if p.Role == "" {
		p.Role = domain.RoleResident
	}

	roleObj, err := u.roleRepo.GetByName(ctx, p.Role)
	if err != nil {
		return nil, ErrRoleNotFound
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(p.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		ID:           uuid.New(),
		Name:         p.Name,
		Email:        p.Email,
		PasswordHash: string(hash),
		Phone:        p.Phone,
	}

	if err := u.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	tu := &domain.TenantUser{
		ID:       uuid.New(),
		TenantID: p.TenantID,
		UserID:   user.ID,
		RoleID:   roleObj.ID,
		Status:   "active",
	}

	if err := u.tenantUserRepo.Create(ctx, tu); err != nil {
		return nil, err
	}

	return &domain.UserWithRole{
		User:     *user,
		RoleName: p.Role,
		TenantID: &p.TenantID,
	}, nil
}

func (u *userUsecase) GetUserByID(ctx context.Context, tenantID, userID uuid.UUID) (*domain.UserWithRole, error) {
	// Global lookup (superadmin scope): no tenant mapping required.
	if tenantID == uuid.Nil {
		user, err := u.userRepo.GetByID(ctx, userID)
		if err != nil {
			return nil, ErrUserNotFound
		}
		roleName := domain.RoleSuperAdmin
		var tid *uuid.UUID
		if tus, err := u.tenantUserRepo.ListByUser(ctx, userID); err == nil && len(tus) > 0 {
			roleName = tus[0].RoleName
			tid = &tus[0].TenantID
		}
		return &domain.UserWithRole{
			User:     *user,
			RoleName: roleName,
			TenantID: tid,
		}, nil
	}

	tu, err := u.tenantUserRepo.GetByTenantAndUser(ctx, tenantID, userID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	user, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &domain.UserWithRole{
		User:     *user,
		RoleName: tu.RoleName,
		TenantID: &tenantID,
	}, nil
}

func (u *userUsecase) UpdateUser(ctx context.Context, p UpdateUserParam) (*domain.UserWithRole, error) {
	tu, err := u.tenantUserRepo.GetByTenantAndUser(ctx, p.TenantID, p.UserID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	// Protect superadmin accounts from tenant-scoped admins.
	if !isSuperAdminCaller(p.CallerRole) && isSuperAdminRole(tu.RoleName) {
		return nil, ErrForbidden
	}

	// Role escalation guard: assigning the superadmin role requires the caller
	// to be a superadmin.
	if p.Role != "" && !onlySuperAdminCanGrant(p.CallerRole, p.Role) {
		return nil, ErrForbidden
	}

	user, err := u.userRepo.GetByID(ctx, p.UserID)
	if err != nil {
		return nil, err
	}

	user.Name = p.Name
	user.Email = p.Email
	user.Phone = p.Phone

	if p.Password != nil && strings.TrimSpace(*p.Password) != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(*p.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		user.PasswordHash = string(hash)
	}

	if err := u.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	if p.Role != "" && p.Role != tu.RoleName {
		roleObj, err := u.roleRepo.GetByName(ctx, p.Role)
		if err != nil {
			return nil, ErrRoleNotFound
		}
		if err := u.tenantUserRepo.UpdateRole(ctx, p.TenantID, p.UserID, roleObj.ID); err != nil {
			return nil, err
		}
		tu.RoleName = p.Role
	}

	return &domain.UserWithRole{
		User:     *user,
		RoleName: tu.RoleName,
		TenantID: &p.TenantID,
	}, nil
}

func (u *userUsecase) DeleteUser(ctx context.Context, tenantID, userID uuid.UUID, callerRole domain.RoleName) error {
	// Global delete (superadmin scope): remove the account and all mappings.
	// tenant_users rows cascade via the users(id) ON DELETE CASCADE FK.
	if tenantID == uuid.Nil {
		if !isSuperAdminCaller(callerRole) {
			return ErrForbidden
		}
		return u.userRepo.Delete(ctx, userID)
	}

	tu, err := u.tenantUserRepo.GetByTenantAndUser(ctx, tenantID, userID)
	if err != nil {
		return ErrUserNotFound
	}

	// Protect superadmin accounts from tenant-scoped admins.
	if !isSuperAdminCaller(callerRole) && isSuperAdminRole(tu.RoleName) {
		return ErrForbidden
	}

	// Tenant-scoped delete only removes the tenant membership, never the shared
	// global user account (which may belong to other tenants).
	return u.tenantUserRepo.Delete(ctx, tenantID, userID)
}

func (u *userUsecase) ListUsers(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.UserWithRole, int64, error) {
	if limit <= 0 {
		limit = 10
	}
	return u.userRepo.ListByTenant(ctx, tenantID, limit, offset)
}

func (u *userUsecase) ListAllUsers(ctx context.Context, limit, offset int) ([]*domain.UserWithRole, int64, error) {
	if limit <= 0 {
		limit = 10
	}
	return u.userRepo.ListAll(ctx, limit, offset)
}
