package usecase

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type financialUsecase struct {
	repo domain.FinancialRepository
}

func NewFinancialUsecase(repo domain.FinancialRepository) domain.FinancialUsecase {
	return &financialUsecase{repo: repo}
}

// Funds CRUD
func (u *financialUsecase) CreateFund(ctx context.Context, tenantID uuid.UUID, fund *domain.Fund) error {
	if fund == nil || fund.Name == "" {
		return ErrInvalidInput
	}
	fund.TenantID = tenantID
	return u.repo.CreateFund(ctx, fund)
}

func (u *financialUsecase) GetFundByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Fund, error) {
	return u.repo.GetFundByID(ctx, tenantID, id)
}

func (u *financialUsecase) UpdateFund(ctx context.Context, tenantID uuid.UUID, fund *domain.Fund) error {
	if fund == nil || fund.Name == "" {
		return ErrInvalidInput
	}
	fund.TenantID = tenantID
	return u.repo.UpdateFund(ctx, fund)
}

func (u *financialUsecase) DeleteFund(ctx context.Context, tenantID, id uuid.UUID) error {
	return u.repo.DeleteFund(ctx, tenantID, id)
}

func (u *financialUsecase) ListFunds(ctx context.Context, tenantID uuid.UUID) ([]*domain.Fund, error) {
	funds, err := u.repo.ListFunds(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	// Calculate balance per fund strictly from transactions assigned to the fund
	txs, _, err := u.repo.ListFinancialTransactions(ctx, tenantID, "", 1000, 0)
	if err == nil {
		fundBalanceMap := make(map[uuid.UUID]float64)
		for _, tx := range txs {
			if tx.FundID != nil {
				if tx.Type == "income" {
					fundBalanceMap[*tx.FundID] += tx.Amount
				} else if tx.Type == "expense" {
					fundBalanceMap[*tx.FundID] -= tx.Amount
				}
			}
		}

		for _, f := range funds {
			f.Balance = fundBalanceMap[f.ID]
		}
	}
	return funds, nil
}

// FeeCategory CRUD
func (u *financialUsecase) CreateFeeCategory(ctx context.Context, tenantID uuid.UUID, category *domain.FeeCategory) error {
	if category == nil || category.Name == "" || category.Amount < 0 {
		return ErrInvalidInput
	}
	if category.Period != "monthly" && category.Period != "one_time" {
		return ErrInvalidInput
	}
	category.TenantID = tenantID
	return u.repo.CreateFeeCategory(ctx, category)
}

func (u *financialUsecase) GetFeeCategoryByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.FeeCategory, error) {
	return u.repo.GetFeeCategoryByID(ctx, tenantID, id)
}

func (u *financialUsecase) UpdateFeeCategory(ctx context.Context, tenantID uuid.UUID, category *domain.FeeCategory) error {
	if category == nil || category.Name == "" || category.Amount < 0 {
		return ErrInvalidInput
	}
	if category.Period != "monthly" && category.Period != "one_time" {
		return ErrInvalidInput
	}
	category.TenantID = tenantID
	return u.repo.UpdateFeeCategory(ctx, category)
}

func (u *financialUsecase) DeleteFeeCategory(ctx context.Context, tenantID, id uuid.UUID) error {
	return u.repo.DeleteFeeCategory(ctx, tenantID, id)
}

func (u *financialUsecase) ListFeeCategories(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.FeeCategory, int64, error) {
	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	return u.repo.ListFeeCategories(ctx, tenantID, limit, offset)
}

// DuesPayment
func (u *financialUsecase) RecordDuesPayment(ctx context.Context, tenantID uuid.UUID, payment *domain.DuesPayment) error {
	if payment == nil || payment.ResidentID == uuid.Nil || payment.FeeCategoryID == uuid.Nil || payment.Amount <= 0 {
		return ErrInvalidInput
	}
	if payment.PeriodMonth < 1 || payment.PeriodMonth > 12 || payment.PeriodYear < 2000 {
		return ErrInvalidInput
	}
	payment.TenantID = tenantID
	payment.Status = "pending"
	return u.repo.CreateDuesPayment(ctx, payment)
}

func (u *financialUsecase) GetDuesPaymentByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.DuesPayment, error) {
	return u.repo.GetDuesPaymentByID(ctx, tenantID, id)
}

func (u *financialUsecase) VerifyDuesPayment(ctx context.Context, tenantID, id uuid.UUID, status string, verifierID uuid.UUID) (*domain.DuesPayment, error) {
	if status != "verified" && status != "rejected" {
		return nil, ErrInvalidInput
	}

	payment, err := u.repo.GetDuesPaymentByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	payment.Status = status
	payment.VerifiedAt = &now
	payment.VerifiedBy = &verifierID

	if err := u.repo.UpdateDuesPayment(ctx, payment); err != nil {
		return nil, err
	}

	return payment, nil
}

func (u *financialUsecase) ListDuesPayments(ctx context.Context, tenantID uuid.UUID, residentID *uuid.UUID, status string, limit, offset int) ([]*domain.DuesPayment, int64, error) {
	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	if status != "" && status != "pending" && status != "verified" && status != "rejected" {
		status = ""
	}
	return u.repo.ListDuesPayments(ctx, tenantID, residentID, status, limit, offset)
}

// Income/Expense Transaction CRUD
func (u *financialUsecase) CreateFinancialTransaction(ctx context.Context, tenantID uuid.UUID, tx *domain.FinancialTransaction, createdBy uuid.UUID) error {
	if tx == nil || tx.Category == "" || tx.Amount <= 0 {
		return ErrInvalidInput
	}
	if tx.Type != "income" && tx.Type != "expense" {
		return ErrInvalidInput
	}
	tx.TenantID = tenantID
	tx.CreatedBy = &createdBy

	// Pastikan fund_id terisi. Jika nil, auto-assign ke default fund (Kas RT Utama)
	funds, err := u.repo.ListFunds(ctx, tenantID)
	if err == nil && len(funds) > 0 {
		if tx.FundID == nil || *tx.FundID == uuid.Nil {
			var defaultFund *domain.Fund
			for _, f := range funds {
				if f.IsDefault {
					defaultFund = f
					break
				}
			}
			if defaultFund == nil && len(funds) > 0 {
				defaultFund = funds[0]
			}
			if defaultFund != nil {
				tx.FundID = &defaultFund.ID
			}
		}
	}

	// Validasi kecukupan saldo: jangan biarkan pengeluaran melebihi saldo tersedia
	if tx.Type == "expense" && tx.FundID != nil && *tx.FundID != uuid.Nil {
		// Hitung saldo kantong kas bersangkutan
		txs, _, listErr := u.repo.ListFinancialTransactions(ctx, tenantID, "", 5000, 0)
		if listErr == nil {
			var currentFundBalance float64
			for _, t := range txs {
				if t.FundID != nil && *t.FundID == *tx.FundID {
					if t.Type == "income" {
						currentFundBalance += t.Amount
					} else if t.Type == "expense" {
						currentFundBalance -= t.Amount
					}
				}
			}
			if tx.Amount > currentFundBalance {
				return fmt.Errorf("saldo kantong kas tidak mencukupi (tersedia: Rp %.0f, dibutuhkan: Rp %.0f)", currentFundBalance, tx.Amount)
			}
		}
	}

	// Validasi jika pengeluaran atau transfer bersumber dari pos iuran (IURAN_KELUAR / IURAN_PINDAH_KAS)
	if strings.HasPrefix(tx.Category, "IURAN_KELUAR: ") || strings.HasPrefix(tx.Category, "IURAN_PINDAH_KAS: ") {
		catName := ""
		if strings.HasPrefix(tx.Category, "IURAN_KELUAR: ") {
			catName = strings.TrimPrefix(tx.Category, "IURAN_KELUAR: ")
		} else {
			catName = strings.TrimPrefix(tx.Category, "IURAN_PINDAH_KAS: ")
		}
		catName = strings.TrimSpace(catName)

		if catName != "" {
			feeCats, _, catErr := u.repo.ListFeeCategories(ctx, tenantID, 100, 0)
			if catErr == nil {
				var targetCatID *uuid.UUID
				for _, fc := range feeCats {
					if fc.Name == catName {
						targetCatID = &fc.ID
						break
					}
				}
				if targetCatID != nil {
					// Hitung total penerimaan iuran yang terverifikasi untuk kategori ini
					dues, _, duesErr := u.repo.ListDuesPayments(ctx, tenantID, nil, "verified", 5000, 0)
					var collected float64
					if duesErr == nil {
						for _, d := range dues {
							if d.FeeCategoryID == *targetCatID {
								collected += d.Amount
							}
						}
					}
					// Hitung total pengeluaran dan penyaluran yang sudah pernah dilakukan dari pos iuran ini
					allTxs, _, txsErr := u.repo.ListFinancialTransactions(ctx, tenantID, "", 5000, 0)
					var spent float64
					if txsErr == nil {
						keluarPrefix := "IURAN_KELUAR: " + catName
						transferPrefix := "IURAN_PINDAH_KAS: " + catName
						for _, t := range allTxs {
							if (t.Type == "expense" && (t.Category == keluarPrefix || t.Category == catName || t.Category == "IURAN: "+catName)) ||
								(t.Type == "income" && t.Category == transferPrefix) {
								spent += t.Amount
							}
						}
					}
					availableDues := collected - spent
					if tx.Amount > availableDues {
						return fmt.Errorf("saldo pos iuran %s tidak mencukupi (tersedia: Rp %.0f, dibutuhkan: Rp %.0f)", catName, availableDues, tx.Amount)
					}
				}
			}
		}
	}

	return u.repo.CreateFinancialTransaction(ctx, tx)
}

func (u *financialUsecase) GetFinancialTransactionByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.FinancialTransaction, error) {
	return u.repo.GetFinancialTransactionByID(ctx, tenantID, id)
}

func (u *financialUsecase) ReverseFinancialTransaction(ctx context.Context, tenantID, id uuid.UUID, reason string, createdBy uuid.UUID) (*domain.FinancialTransaction, error) {
	orig, err := u.repo.GetFinancialTransactionByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	revType := "expense"
	if orig.Type == "expense" {
		revType = "income"
	}

	desc := "Reversal of " + orig.ID.String()
	if reason != "" {
		desc += ": " + reason
	}

	revTx := &domain.FinancialTransaction{
		ID:              uuid.New(),
		TenantID:        tenantID,
		Type:            revType,
		Category:        orig.Category,
		Amount:          orig.Amount,
		TransactionDate: time.Now(),
		Description:     &desc,
		CreatedBy:       &createdBy,
	}

	if err := u.repo.CreateFinancialTransaction(ctx, revTx); err != nil {
		return nil, err
	}
	return revTx, nil
}

func (u *financialUsecase) ListFinancialTransactions(ctx context.Context, tenantID uuid.UUID, txType string, limit, offset int) ([]*domain.FinancialTransaction, int64, error) {
	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	return u.repo.ListFinancialTransactions(ctx, tenantID, txType, limit, offset)
}

func (u *financialUsecase) GetFinancialSummary(ctx context.Context, tenantID uuid.UUID) (*domain.FinancialSummary, error) {
	txs, _, err := u.repo.ListFinancialTransactions(ctx, tenantID, "", 1000, 0)
	if err != nil {
		return nil, err
	}

	dues, _, err := u.repo.ListDuesPayments(ctx, tenantID, nil, "", 1000, 0)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	currentMonth := now.Month()
	currentYear := now.Year()

	var totalIncome, totalExpense float64
	var monthlyIncome, monthlyExpense float64
	spendingMap := make(map[string]float64)

	for _, tx := range txs {
		// Abaikan transfer internal iuran -> kas dari total penghitungan income baru,
		// karena dananya sudah terhitung saat iuran warga masuk.
		isInternalTransfer := strings.HasPrefix(tx.Category, "IURAN_PINDAH_KAS")
		if tx.Type == "income" {
			if !isInternalTransfer {
				totalIncome += tx.Amount
				if tx.TransactionDate.Year() == currentYear && tx.TransactionDate.Month() == currentMonth {
					monthlyIncome += tx.Amount
				}
			}
		} else if tx.Type == "expense" {
			totalExpense += tx.Amount
			spendingMap[tx.Category] += tx.Amount
			if tx.TransactionDate.Year() == currentYear && tx.TransactionDate.Month() == currentMonth {
				monthlyExpense += tx.Amount
			}
		}
	}

	for _, d := range dues {
		if d.Status == "verified" {
			totalIncome += d.Amount
			if d.PeriodYear == currentYear && time.Month(d.PeriodMonth) == currentMonth {
				monthlyIncome += d.Amount
			}
		}
	}

	breakdown := make([]domain.CategoryBreakdown, 0, len(spendingMap))
	for cat, amt := range spendingMap {
		breakdown = append(breakdown, domain.CategoryBreakdown{
			Category: cat,
			Amount:   amt,
		})
	}

	funds, _ := u.ListFunds(ctx, tenantID)

	return &domain.FinancialSummary{
		CurrentBalance:    totalIncome - totalExpense,
		MonthlyIncome:     monthlyIncome,
		MonthlyExpense:    monthlyExpense,
		SpendingBreakdown: breakdown,
		Funds:             funds,
	}, nil
}

// Upload Proof
func (u *financialUsecase) UploadProof(ctx context.Context, filename string, content io.Reader, contentType string) (string, error) {
	if filename == "" || content == nil {
		return "", ErrInvalidInput
	}
	return u.repo.UploadProof(ctx, filename, content, contentType)
}

// Reset Financial Data
func (u *financialUsecase) ResetFinancialData(ctx context.Context, tenantID uuid.UUID) error {
	return u.repo.ResetFinancialData(ctx, tenantID)
}
