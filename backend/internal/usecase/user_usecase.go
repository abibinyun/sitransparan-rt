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
	TenantID uuid.UUID
	Name     string
	Email    string
	Password string
	Phone    *string
	Role     domain.RoleName
}

type UpdateUserParam struct {
	TenantID uuid.UUID
	UserID   uuid.UUID
	Name     string
	Email    string
	Phone    *string
	Role     domain.RoleName
	Password *string
}

type UserUsecase interface {
	CreateUser(ctx context.Context, p CreateUserParam) (*domain.UserWithRole, error)
	GetUserByID(ctx context.Context, tenantID, userID uuid.UUID) (*domain.UserWithRole, error)
	UpdateUser(ctx context.Context, p UpdateUserParam) (*domain.UserWithRole, error)
	DeleteUser(ctx context.Context, tenantID, userID uuid.UUID) error
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

func (u *userUsecase) CreateUser(ctx context.Context, p CreateUserParam) (*domain.UserWithRole, error) {
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

func (u *userUsecase) DeleteUser(ctx context.Context, tenantID, userID uuid.UUID) error {
	if tenantID != uuid.Nil {
		_ = u.tenantUserRepo.Delete(ctx, tenantID, userID)
	}
	// Delete base user account
	return u.userRepo.Delete(ctx, userID)
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
