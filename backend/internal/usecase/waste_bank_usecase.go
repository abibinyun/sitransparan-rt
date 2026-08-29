package usecase

import (
	"context"
	"errors"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type wasteBankUsecase struct {
	repo       domain.WasteBankRepository
	auditRepo  domain.AuditLogRepository
}

func NewWasteBankUsecase(repo domain.WasteBankRepository, auditRepo domain.AuditLogRepository) domain.WasteBankUsecase {
	return &wasteBankUsecase{
		repo:      repo,
		auditRepo: auditRepo,
	}
}

// Categories
func (u *wasteBankUsecase) ListCategories(ctx context.Context, tenantID uuid.UUID, activeOnly bool) ([]*domain.WasteCategory, error) {
	return u.repo.ListCategories(ctx, tenantID, activeOnly)
}

func (u *wasteBankUsecase) GetCategoryByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.WasteCategory, error) {
	return u.repo.GetCategoryByID(ctx, tenantID, id)
}

func (u *wasteBankUsecase) CreateCategory(ctx context.Context, c *domain.WasteCategory) error {
	if c.Name == "" || c.PricePerUnit < 0 {
		return errors.New("nama kategori dan harga satuan valid wajib diisi")
	}
	if c.ResidentSharePct+c.KarangTarunaSharePct != 100.0 {
		// default fallback: 80% warga, 20% karang taruna jika belum diset
		if c.ResidentSharePct == 0 && c.KarangTarunaSharePct == 0 {
			c.ResidentSharePct = 80.0
			c.KarangTarunaSharePct = 20.0
		} else if c.ResidentSharePct+c.KarangTarunaSharePct != 100.0 {
			return errors.New("total persentase warga dan karang taruna harus 100%")
		}
	}
	return u.repo.CreateCategory(ctx, c)
}

func (u *wasteBankUsecase) UpdateCategory(ctx context.Context, c *domain.WasteCategory) error {
	if c.Name == "" || c.PricePerUnit < 0 {
		return errors.New("nama kategori dan harga satuan valid wajib diisi")
	}
	if c.ResidentSharePct+c.KarangTarunaSharePct != 100.0 {
		return errors.New("total persentase warga dan karang taruna harus 100%")
	}
	return u.repo.UpdateCategory(ctx, c)
}

func (u *wasteBankUsecase) DeleteCategory(ctx context.Context, tenantID, id uuid.UUID) error {
	return u.repo.DeleteCategory(ctx, tenantID, id)
}

// Deposits
func (u *wasteBankUsecase) CreateDeposit(ctx context.Context, d *domain.WasteDeposit) error {
	if d.FamilyHeadName == "" {
		return errors.New("nama kepala keluarga / nama penyetor wajib diisi")
	}
	if len(d.Items) == 0 {
		return errors.New("minimal satu jenis sampah harus dimasukkan")
	}

	var totalWeight, totalGross, totalRes, totalKT float64

	categories, err := u.repo.ListCategories(ctx, d.TenantID, false)
	if err != nil {
		return err
	}
	catMap := make(map[uuid.UUID]*domain.WasteCategory)
	for _, c := range categories {
		catMap[c.ID] = c
	}

	for _, item := range d.Items {
		cat, exists := catMap[item.CategoryID]
		if !exists {
			return errors.New("kategori sampah tidak valid atau tidak ditemukan")
		}
		if item.Quantity <= 0 {
			return errors.New("jumlah/berat setoran sampah harus lebih dari 0")
		}

		item.UnitPrice = cat.PricePerUnit
		item.GrossAmount = item.Quantity * item.UnitPrice
		item.ResidentAmount = item.GrossAmount * (cat.ResidentSharePct / 100.0)
		item.KarangTarunaAmount = item.GrossAmount * (cat.KarangTarunaSharePct / 100.0)

		totalWeight += item.Quantity
		totalGross += item.GrossAmount
		totalRes += item.ResidentAmount
		totalKT += item.KarangTarunaAmount
	}

	d.TotalWeight = totalWeight
	d.TotalGrossAmount = totalGross
	d.ResidentAmount = totalRes
	d.KarangTarunaAmount = totalKT
	d.Status = "verified"

	return u.repo.CreateDeposit(ctx, d)
}

func (u *wasteBankUsecase) GetDepositByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.WasteDeposit, error) {
	return u.repo.GetDepositByID(ctx, tenantID, id)
}

func (u *wasteBankUsecase) ListDeposits(ctx context.Context, tenantID uuid.UUID, search, status string, limit, offset int) ([]*domain.WasteDeposit, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	return u.repo.ListDeposits(ctx, tenantID, search, status, limit, offset)
}

func (u *wasteBankUsecase) UpdateDepositStatus(ctx context.Context, tenantID, id uuid.UUID, status string) error {
	if status != "pending" && status != "verified" && status != "paid_out" && status != "cancelled" {
		return errors.New("status setoran sampah tidak valid")
	}
	return u.repo.UpdateDepositStatus(ctx, tenantID, id, status)
}

// Summary & Accumulations
func (u *wasteBankUsecase) GetSummary(ctx context.Context, tenantID uuid.UUID) (*domain.WasteBankSummary, error) {
	return u.repo.GetSummary(ctx, tenantID)
}

func (u *wasteBankUsecase) ListHouseholdAccumulations(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.HouseholdWasteAccumulation, int64, error) {
	if limit <= 0 {
		limit = 50
	}
	return u.repo.ListHouseholdAccumulations(ctx, tenantID, limit, offset)
}
