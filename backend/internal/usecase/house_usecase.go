package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"backend/internal/domain"
)

type houseUsecase struct {
	houseRepo    domain.HouseRepository
	tenantRepo   domain.TenantRepository
	residentRepo domain.ResidentRepository
	jwtSecret    string
	jwtDuration  time.Duration
}

func NewHouseUsecase(
	houseRepo domain.HouseRepository,
	tenantRepo domain.TenantRepository,
	residentRepo domain.ResidentRepository,
	jwtSecret string,
	jwtDuration time.Duration,
) domain.HouseUsecase {
	if jwtDuration == 0 {
		jwtDuration = 30 * 24 * time.Hour // 30 hari untuk kemudahan warga
	}
	return &houseUsecase{
		houseRepo:    houseRepo,
		tenantRepo:   tenantRepo,
		residentRepo: residentRepo,
		jwtSecret:    jwtSecret,
		jwtDuration:  jwtDuration,
	}
}

func generateRandomToken() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "hsk_" + hex.EncodeToString(bytes), nil
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

	// Generate JWT scoped to house and tenant
	claims := jwt.MapClaims{
		"user_id":   house.ID.String(),
		"tenant_id": tenant.ID.String(),
		"house_id":  house.ID.String(),
		"role":      "resident",
		"sub":       house.ID.String(),
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
	}, nil
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

	if err := u.houseRepo.RevokeAndRegenerateToken(ctx, tenantID, houseID, newToken); err != nil {
		return nil, err
	}

	return u.houseRepo.GetByID(ctx, tenantID, houseID)
}
