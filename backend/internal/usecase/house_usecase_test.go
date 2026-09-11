package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"backend/internal/domain"
	"backend/internal/usecase"
)

type houseMockHouseRepo struct {
	houses map[uuid.UUID]*domain.House
	tokens map[string]*domain.House
}

func newHouseMockHouseRepo() *houseMockHouseRepo {
	return &houseMockHouseRepo{
		houses: make(map[uuid.UUID]*domain.House),
		tokens: make(map[string]*domain.House),
	}
}

func (m *houseMockHouseRepo) Create(ctx context.Context, tenantID uuid.UUID, house *domain.House) error {
	if house.ID == uuid.Nil {
		house.ID = uuid.New()
	}
	m.houses[house.ID] = house
	m.tokens[house.AccessToken] = house
	return nil
}

func (m *houseMockHouseRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.House, error) {
	return m.houses[id], nil
}

func (m *houseMockHouseRepo) GetByToken(ctx context.Context, tenantID uuid.UUID, token string) (*domain.House, error) {
	return m.tokens[token], nil
}

func (m *houseMockHouseRepo) GetByUserID(ctx context.Context, tenantID, userID uuid.UUID) (*domain.House, error) {
	for _, h := range m.houses {
		if h.UserID != nil && *h.UserID == userID {
			return h, nil
		}
	}
	return nil, nil
}

func (m *houseMockHouseRepo) List(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.House, int, error) {
	var list []domain.House
	for _, h := range m.houses {
		list = append(list, *h)
	}
	return list, len(list), nil
}

func (m *houseMockHouseRepo) Update(ctx context.Context, tenantID uuid.UUID, house *domain.House) error {
	m.houses[house.ID] = house
	m.tokens[house.AccessToken] = house
	return nil
}

func (m *houseMockHouseRepo) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	delete(m.houses, id)
	return nil
}

func (m *houseMockHouseRepo) RevokeAndRegenerateToken(ctx context.Context, tenantID, id uuid.UUID, newToken, newPin string) error {
	if h, ok := m.houses[id]; ok {
		delete(m.tokens, h.AccessToken)
		h.AccessToken = newToken
		h.PinCode = newPin
		m.tokens[newToken] = h
	}
	return nil
}

func (m *houseMockHouseRepo) ResetPin(ctx context.Context, tenantID, id uuid.UUID, newPin string) error {
	if h, ok := m.houses[id]; ok {
		h.PinCode = newPin
	}
	return nil
}

func TestHouseAutoProvisionRealUser(t *testing.T) {
	houseRepo := newHouseMockHouseRepo()
	userRepo := &mockUserRepo{users: make(map[string]*domain.User)}
	tuRepo := newMockTenantUserRepo()

	tenantID := uuid.New()
	tenant := &domain.Tenant{
		ID:   tenantID,
		Name: "RT 05",
		Slug: "rt-05",
	}
	tenantRepo := &mockTenantRepo{
		tenants: map[string]*domain.Tenant{"rt-05": tenant},
	}

	residentRepo := newMockResidentRepo()
	roleRepo := &mockRoleRepo{}

	jwtSecret := "supersecretjwt12345"
	uc := usecase.NewHouseUsecase(houseRepo, tenantRepo, residentRepo, userRepo, tuRepo, roleRepo, jwtSecret, time.Hour)

	ctx := context.Background()

	// 1. Test CreateHouse: auto-creates user
	house := &domain.House{
		BlockNumber: "A1/05",
		PinCode:     "5678",
	}
	createdHouse, err := uc.CreateHouse(ctx, tenantID, house)
	if err != nil {
		t.Fatalf("CreateHouse failed: %v", err)
	}
	if createdHouse.UserID == nil {
		t.Fatal("expected house to have UserID after CreateHouse")
	}

	// Verify User account
	user, err := userRepo.GetByID(ctx, *createdHouse.UserID)
	if err != nil || user == nil {
		t.Fatalf("expected real User in repo: %v", err)
	}
	if user.Email != "rumah-rt-05-a1-05@warga.local" {
		t.Errorf("unexpected user email: %s", user.Email)
	}

	// Verify TenantUser mapping
	tu, err := tuRepo.GetByTenantAndUser(ctx, tenantID, user.ID)
	if err != nil || tu == nil {
		t.Fatal("expected tenant_user mapping for auto-provisioned user")
	}

	// 2. Test ClaimAccessToken: returns real User and sets user_id as JWT sub
	claimRes, err := uc.ClaimAccessToken(ctx, "rt-05", createdHouse.AccessToken)
	if err != nil {
		t.Fatalf("ClaimAccessToken failed: %v", err)
	}
	if claimRes.User == nil {
		t.Fatal("expected claim response to include User")
	}
	if claimRes.User.ID != user.ID {
		t.Errorf("claim User.ID (%s) != expected User.ID (%s)", claimRes.User.ID, user.ID)
	}

	// Parse JWT and verify claims
	parsedToken, err := jwt.Parse(claimRes.Token, func(tok *jwt.Token) (interface{}, error) {
		return []byte(jwtSecret), nil
	})
	if err != nil || !parsedToken.Valid {
		t.Fatalf("failed to parse generated JWT: %v", err)
	}
	claims, ok := parsedToken.Claims.(jwt.MapClaims)
	if !ok {
		t.Fatal("invalid claims format")
	}
	if claims["user_id"] != user.ID.String() {
		t.Errorf("JWT user_id (%v) != real user ID (%s)", claims["user_id"], user.ID)
	}
	if claims["sub"] != user.ID.String() {
		t.Errorf("JWT sub (%v) != real user ID (%s)", claims["sub"], user.ID)
	}
	if claims["house_id"] != createdHouse.ID.String() {
		t.Errorf("JWT house_id (%v) != house ID (%s)", claims["house_id"], createdHouse.ID)
	}

	// 3. Test Edge Cases & Failure Modes in ClaimAccessToken
	// 3a. Invalid tenant slug
	if _, err := uc.ClaimAccessToken(ctx, "nonexistent-slug", createdHouse.AccessToken); err == nil {
		t.Fatal("expected error for invalid tenant slug")
	}

	// 3b. Invalid or expired house token
	if _, err := uc.ClaimAccessToken(ctx, "rt-05", "invalid_token_12345"); err == nil {
		t.Fatal("expected error for invalid house access token")
	}

	// 4. Test GetMyHouse: successfully retrieves house and resident
	myHouse, headRes, err := uc.GetMyHouse(ctx, tenantID, user.ID)
	if err != nil {
		t.Fatalf("GetMyHouse failed: %v", err)
	}
	if myHouse.ID != createdHouse.ID {
		t.Errorf("expected house ID %s, got %s", createdHouse.ID, myHouse.ID)
	}
	if headRes != nil {
		t.Errorf("expected nil head resident since none was assigned")
	}

	// 4b. Failure mode: non-existent user
	if _, _, err := uc.GetMyHouse(ctx, tenantID, uuid.New()); err == nil {
		t.Fatal("expected error when user has no linked house")
	}

	// 5. Test RegenerateToken: old token rejected, new token works
	oldToken := createdHouse.AccessToken
	newHouseData, err := uc.RegenerateToken(ctx, tenantID, createdHouse.ID)
	if err != nil {
		t.Fatalf("RegenerateToken failed: %v", err)
	}
	if newHouseData.AccessToken == oldToken {
		t.Fatal("expected token to change after regeneration")
	}

	// Old token should fail
	if _, err := uc.ClaimAccessToken(ctx, "rt-05", oldToken); err == nil {
		t.Fatal("expected claim with revoked old token to fail")
	}

	// New token should succeed
	newClaim, err := uc.ClaimAccessToken(ctx, "rt-05", newHouseData.AccessToken)
	if err != nil {
		t.Fatalf("claim with new token failed: %v", err)
	}
	if newClaim.User.ID != user.ID {
		t.Errorf("expected same User ID retained after token regen, got %s vs %s", newClaim.User.ID, user.ID)
	}
}
