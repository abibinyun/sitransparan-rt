package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"backend/internal/domain"
)

type houseUsecase struct {
	houseRepo      domain.HouseRepository
	tenantRepo     domain.TenantRepository
	residentRepo   domain.ResidentRepository
	userRepo       domain.UserRepository
	tenantUserRepo domain.TenantUserRepository
	roleRepo       domain.RoleRepository
	jwtSecret      string
	jwtDuration    time.Duration
}

func NewHouseUsecase(
	houseRepo domain.HouseRepository,
	tenantRepo domain.TenantRepository,
	residentRepo domain.ResidentRepository,
	userRepo domain.UserRepository,
	tenantUserRepo domain.TenantUserRepository,
	roleRepo domain.RoleRepository,
	jwtSecret string,
	jwtDuration time.Duration,
) domain.HouseUsecase {
	if jwtDuration == 0 {
		jwtDuration = 30 * 24 * time.Hour // 30 hari untuk kemudahan warga
	}
	return &houseUsecase{
		houseRepo:      houseRepo,
		tenantRepo:     tenantRepo,
		residentRepo:   residentRepo,
		userRepo:       userRepo,
		tenantUserRepo: tenantUserRepo,
		roleRepo:       roleRepo,
		jwtSecret:      jwtSecret,
		jwtDuration:    jwtDuration,
	}
}

func generateRandomToken() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "hsk_" + hex.EncodeToString(bytes), nil
}

func generateRandomPin() string {
	b := make([]byte, 2)
	rand.Read(b)
	num := (int(b[0])<<8 | int(b[1])) % 9000 + 1000
	return fmt.Sprintf("%04d", num)
}

func sanitizeEmailPart(s string) string {
	reg := regexp.MustCompile(`[^a-zA-Z0-9]+`)
	clean := strings.ToLower(reg.ReplaceAllString(s, "-"))
	clean = strings.Trim(clean, "-")
	if clean == "" {
		return "rumah"
	}
	return clean
}

func (u *houseUsecase) ensureHouseUser(ctx context.Context, tenant *domain.Tenant, house *domain.House) (*domain.User, error) {
	var headResident *domain.Resident
	if house.HeadResidentID != nil {
		hr, err := u.residentRepo.GetByID(ctx, tenant.ID, *house.HeadResidentID)
		if err == nil && hr != nil {
			headResident = hr
		}
	}

	userName := fmt.Sprintf("Warga %s", house.BlockNumber)
	if headResident != nil && headResident.FullName != nil && *headResident.FullName != "" {
		userName = *headResident.FullName
	}

	// Cek apakah user sudah ada
	if house.UserID != nil {
		existingUser, err := u.userRepo.GetByID(ctx, *house.UserID)
		if err == nil && existingUser != nil {
			// Sinkronisasi nama jika perlu
			if existingUser.Name != userName {
				existingUser.Name = userName
				_ = u.userRepo.Update(ctx, existingUser)
			}
			return existingUser, nil
		}
	}

	// Buat atau cari user berdasarkan format email rumah
	blockSlug := sanitizeEmailPart(house.BlockNumber)
	tenantSlug := sanitizeEmailPart(tenant.Slug)
	houseEmail := fmt.Sprintf("rumah-%s-%s@warga.local", tenantSlug, blockSlug)

	existingUser, err := u.userRepo.GetByEmail(ctx, houseEmail)
	if err == nil && existingUser != nil {
		house.UserID = &existingUser.ID
		if existingUser.Name != userName {
			existingUser.Name = userName
			_ = u.userRepo.Update(ctx, existingUser)
		}
		// Pastikan mapping tenant_user ada
		tu, _ := u.tenantUserRepo.GetByTenantAndUser(ctx, tenant.ID, existingUser.ID)
		if tu == nil {
			roleResident, _ := u.roleRepo.GetByName(ctx, domain.RoleResident)
			if roleResident != nil {
				_ = u.tenantUserRepo.Create(ctx, &domain.TenantUser{
					ID:       uuid.New(),
					TenantID: tenant.ID,
					UserID:   existingUser.ID,
					RoleID:   roleResident.ID,
					Status:   "active",
				})
			}
		}
		return existingUser, nil
	}

	// User belum ada: auto-provision
	pin := house.PinCode
	if pin == "" {
		pin = "1234"
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(pin), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	newUser := &domain.User{
		ID:           uuid.New(),
		Name:         userName,
		Email:        houseEmail,
		PasswordHash: string(hashedPassword),
	}
	if err := u.userRepo.Create(ctx, newUser); err != nil {
		return nil, err
	}

	roleResident, err := u.roleRepo.GetByName(ctx, domain.RoleResident)
	if err == nil && roleResident != nil {
		_ = u.tenantUserRepo.Create(ctx, &domain.TenantUser{
			ID:       uuid.New(),
			TenantID: tenant.ID,
			UserID:   newUser.ID,
			RoleID:   roleResident.ID,
			Status:   "active",
		})
	}

	house.UserID = &newUser.ID
	return newUser, nil
}

func (u *houseUsecase) ClaimAccessToken(ctx context.Context, tenantSlug, token string) (*domain.HouseAccessClaimResponse, error) {
	tenant, err := u.tenantRepo.GetBySlug(ctx, tenantSlug)
	if err != nil || tenant == nil {
		return nil, errors.New("rt tidak ditemukan")
	}

	house, err := u.houseRepo.GetByToken(ctx, tenant.ID, token)
	if err != nil || house == nil {
		return nil, errors.New("token akses rumah tidak valid atau sudah kadaluarsa")
	}

	var headResident *domain.Resident
	if house.HeadResidentID != nil {
		hr, err := u.residentRepo.GetByID(ctx, tenant.ID, *house.HeadResidentID)
		if err == nil && hr != nil {
			headResident = hr
		}
	}

	// Auto-provision atau sinkronisasi real User account
	realUser, err := u.ensureHouseUser(ctx, tenant, house)
	if err != nil {
		return nil, fmt.Errorf("gagal menyiapkan akun warga: %w", err)
	}

	// Update user_id pada data rumah jika sebelumnya belum tersimpan
	if house.UserID != nil {
		_ = u.houseRepo.Update(ctx, tenant.ID, house)
	}

	// Generate JWT dengan real User ID dan house_id
	claims := jwt.MapClaims{
		"user_id":   realUser.ID.String(),
		"tenant_id": tenant.ID.String(),
		"house_id":  house.ID.String(),
		"role":      "resident",
		"sub":       realUser.ID.String(),
		"exp":       time.Now().Add(u.jwtDuration).Unix(),
		"iat":       time.Now().Unix(),
	}

	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := jwtToken.SignedString([]byte(u.jwtSecret))
	if err != nil {
		return nil, err
	}

	return &domain.HouseAccessClaimResponse{
		Token:        tokenStr,
		House:        *house,
		TenantSlug:   tenant.Slug,
		TenantName:   tenant.Name,
		HeadResident: headResident,
		User:         realUser,
	}, nil
}

func (u *houseUsecase) GetMyHouse(ctx context.Context, tenantID, userID uuid.UUID) (*domain.House, *domain.Resident, error) {
	house, err := u.houseRepo.GetByUserID(ctx, tenantID, userID)
	if err != nil || house == nil {
		return nil, nil, errors.New("rumah tidak ditemukan untuk akun ini")
	}

	var headResident *domain.Resident
	if house.HeadResidentID != nil {
		hr, err := u.residentRepo.GetByID(ctx, tenantID, *house.HeadResidentID)
		if err == nil && hr != nil {
			headResident = hr
			house.HeadResident = hr
		}
	}

	return house, headResident, nil
}

func (u *houseUsecase) ListHouses(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.House, int, error) {
	houses, total, err := u.houseRepo.List(ctx, tenantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	// Enrich head resident details
	for i := range houses {
		if houses[i].HeadResidentID != nil {
			if hr, err := u.residentRepo.GetByID(ctx, tenantID, *houses[i].HeadResidentID); err == nil && hr != nil {
				houses[i].HeadResident = hr
			}
		}
	}

	return houses, total, nil
}

func (u *houseUsecase) CreateHouse(ctx context.Context, tenantID uuid.UUID, house *domain.House) (*domain.House, error) {
	if house.BlockNumber == "" {
		return nil, errors.New("nomor blok / rumah wajib diisi")
	}
	if house.AccessToken == "" {
		tok, err := generateRandomToken()
		if err != nil {
			return nil, err
		}
		house.AccessToken = tok
	}
	if house.PinCode == "" {
		house.PinCode = generateRandomPin()
	}
	if house.TokenVersion == 0 {
		house.TokenVersion = 1
	}

	tenant, err := u.tenantRepo.GetByID(ctx, tenantID)
	if err == nil && tenant != nil {
		user, err := u.ensureHouseUser(ctx, tenant, house)
		if err == nil && user != nil {
			house.UserID = &user.ID
		}
	}

	if err := u.houseRepo.Create(ctx, tenantID, house); err != nil {
		return nil, err
	}
	return house, nil
}

func (u *houseUsecase) UpdateHouse(ctx context.Context, tenantID uuid.UUID, house *domain.House) (*domain.House, error) {
	if house.BlockNumber == "" {
		return nil, errors.New("nomor blok / rumah wajib diisi")
	}
	existing, err := u.houseRepo.GetByID(ctx, tenantID, house.ID)
	if err != nil || existing == nil {
		return nil, errors.New("data rumah tidak ditemukan")
	}
	if house.AccessToken == "" {
		house.AccessToken = existing.AccessToken
	}
	if house.TokenStatus == "" {
		house.TokenStatus = existing.TokenStatus
	}
	if house.PinCode == "" {
		house.PinCode = existing.PinCode
	}
	if house.UserID == nil && existing.UserID != nil {
		house.UserID = existing.UserID
	}

	tenant, err := u.tenantRepo.GetByID(ctx, tenantID)
	if err == nil && tenant != nil {
		user, err := u.ensureHouseUser(ctx, tenant, house)
		if err == nil && user != nil {
			house.UserID = &user.ID
		}
	}

	if err := u.houseRepo.Update(ctx, tenantID, house); err != nil {
		return nil, err
	}
	return house, nil
}

func (u *houseUsecase) DeleteHouse(ctx context.Context, tenantID, houseID uuid.UUID) error {
	existing, err := u.houseRepo.GetByID(ctx, tenantID, houseID)
	if err != nil || existing == nil {
		return errors.New("data rumah tidak ditemukan")
	}
	return u.houseRepo.Delete(ctx, tenantID, houseID)
}

func (u *houseUsecase) RegenerateToken(ctx context.Context, tenantID, houseID uuid.UUID) (*domain.House, error) {
	newToken, err := generateRandomToken()
	if err != nil {
		return nil, err
	}
	newPin := generateRandomPin()

	if err := u.houseRepo.RevokeAndRegenerateToken(ctx, tenantID, houseID, newToken, newPin); err != nil {
		return nil, err
	}

	// Sinkronkan password User dengan PIN baru
	h, err := u.houseRepo.GetByID(ctx, tenantID, houseID)
	if err == nil && h != nil && h.UserID != nil {
		hashed, err := bcrypt.GenerateFromPassword([]byte(newPin), bcrypt.DefaultCost)
		if err == nil {
			uObj, err := u.userRepo.GetByID(ctx, *h.UserID)
			if err == nil && uObj != nil {
				uObj.PasswordHash = string(hashed)
				_ = u.userRepo.Update(ctx, uObj)
			}
		}
	}

	return h, nil
}

func (u *houseUsecase) ResetPin(ctx context.Context, tenantID, houseID uuid.UUID) (*domain.House, error) {
	newPin := generateRandomPin()
	if err := u.houseRepo.ResetPin(ctx, tenantID, houseID, newPin); err != nil {
		return nil, err
	}

	// Sinkronkan password User dengan PIN baru
	h, err := u.houseRepo.GetByID(ctx, tenantID, houseID)
	if err == nil && h != nil && h.UserID != nil {
		hashed, err := bcrypt.GenerateFromPassword([]byte(newPin), bcrypt.DefaultCost)
		if err == nil {
			uObj, err := u.userRepo.GetByID(ctx, *h.UserID)
			if err == nil && uObj != nil {
				uObj.PasswordHash = string(hashed)
				_ = u.userRepo.Update(ctx, uObj)
			}
		}
	}

	return h, nil
}

func (u *houseUsecase) VerifyPin(ctx context.Context, tenantID, houseID uuid.UUID, inputPin string) (bool, error) {
	house, err := u.houseRepo.GetByID(ctx, tenantID, houseID)
	if err != nil || house == nil {
		return false, errors.New("data rumah tidak ditemukan")
	}

	// 1. Cek langsung kecocokan PinCode acak stiker
	if house.PinCode != "" && house.PinCode == inputPin {
		return true, nil
	}

	// 2. Fallback: Cek 4 digit terakhir NIK Kepala Keluarga jika ada
	if house.HeadResidentID != nil {
		head, err := u.residentRepo.GetByID(ctx, tenantID, *house.HeadResidentID)
		if err == nil && head != nil && head.NIK != nil && len(*head.NIK) >= 4 {
			nikStr := *head.NIK
			last4NIK := nikStr[len(nikStr)-4:]
			if last4NIK == inputPin {
				return true, nil
			}
		}
	}

	return false, nil
}
