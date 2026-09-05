package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"backend/internal/domain"
)

type inventoryUsecase struct {
	repo domain.InventoryRepository
}

func NewInventoryUsecase(repo domain.InventoryRepository) domain.InventoryUsecase {
	return &inventoryUsecase{repo: repo}
}

func (u *inventoryUsecase) CreateItem(ctx context.Context, item *domain.InventoryItem) error {
	if item.Name == "" {
		return errors.New("nama barang wajib diisi")
	}
	if item.Category == "" {
		item.Category = "Umum"
	}
	if item.Unit == "" {
		item.Unit = "Unit"
	}
	if item.Condition == "" {
		item.Condition = "good"
	}
	if item.Quantity <= 0 {
		item.Quantity = 1
	}
	item.AvailableQuantity = item.Quantity

	return u.repo.CreateItem(ctx, item)
}

func (u *inventoryUsecase) GetItemByID(ctx context.Context, id uuid.UUID) (*domain.InventoryItem, error) {
	return u.repo.GetItemByID(ctx, id)
}

func (u *inventoryUsecase) ListItems(ctx context.Context, filter domain.InventoryFilter) ([]domain.InventoryItem, int, error) {
	return u.repo.ListItems(ctx, filter)
}

func (u *inventoryUsecase) UpdateItem(ctx context.Context, item *domain.InventoryItem) error {
	existing, err := u.repo.GetItemByID(ctx, item.ID)
	if err != nil {
		return err
	}
	if item.Name == "" {
		item.Name = existing.Name
	}
	if item.Category == "" {
		item.Category = existing.Category
	}
	if item.Unit == "" {
		item.Unit = existing.Unit
	}
	if item.Condition == "" {
		item.Condition = existing.Condition
	}
	if item.Quantity <= 0 {
		item.Quantity = 1
	}

	borrowedCount := existing.Quantity - existing.AvailableQuantity
	if borrowedCount < 0 {
		borrowedCount = 0
	}
	item.AvailableQuantity = item.Quantity - borrowedCount
	if item.AvailableQuantity < 0 {
		item.AvailableQuantity = 0
	}

	return u.repo.UpdateItem(ctx, item)
}

func (u *inventoryUsecase) DeleteItem(ctx context.Context, id uuid.UUID) error {
	return u.repo.DeleteItem(ctx, id)
}

func (u *inventoryUsecase) CreateBorrowing(ctx context.Context, b *domain.InventoryBorrowing) error {
	if b.BorrowerName == "" {
		return errors.New("nama peminjam wajib diisi")
	}
	if b.Quantity <= 0 {
		b.Quantity = 1
	}

	item, err := u.repo.GetItemByID(ctx, b.ItemID)
	if err != nil {
		return fmt.Errorf("barang inventaris tidak ditemukan: %w", err)
	}

	if !item.IsBorrowable {
		return errors.New("barang ini diset tidak untuk dipinjamkan ke umum")
	}

	if item.AvailableQuantity < b.Quantity {
		return fmt.Errorf("stok barang tidak mencukupi, sisa tersedia: %d", item.AvailableQuantity)
	}

	if b.Status == "" {
		b.Status = "approved" // langsung approve jika dicatat oleh admin
	}
	if b.Status == "approved" || b.Status == "borrowed" {
		item.AvailableQuantity -= b.Quantity
		if err := u.repo.UpdateItem(ctx, item); err != nil {
			return err
		}
	}

	return u.repo.CreateBorrowing(ctx, b)
}

func (u *inventoryUsecase) GetBorrowingByID(ctx context.Context, id uuid.UUID) (*domain.InventoryBorrowing, error) {
	return u.repo.GetBorrowingByID(ctx, id)
}

func (u *inventoryUsecase) ListBorrowings(ctx context.Context, filter domain.BorrowingFilter) ([]domain.InventoryBorrowing, int, error) {
	return u.repo.ListBorrowings(ctx, filter)
}

func (u *inventoryUsecase) UpdateBorrowingStatus(ctx context.Context, id uuid.UUID, status string, conditionAfter *string, adminNotes *string, approverID *uuid.UUID) error {
	b, err := u.repo.GetBorrowingByID(ctx, id)
	if err != nil {
		return err
	}

	item, err := u.repo.GetItemByID(ctx, b.ItemID)
	if err != nil {
		return err
	}

	oldStatus := b.Status
	b.Status = status
	b.ConditionAfter = conditionAfter
	b.AdminNotes = adminNotes
	b.ApprovedBy = approverID

	// Logika perubahan stok
	if status == "returned" && oldStatus != "returned" {
		now := time.Now()
		b.ActualReturnDate = &now
		item.AvailableQuantity += b.Quantity
		if item.AvailableQuantity > item.Quantity {
			item.AvailableQuantity = item.Quantity
		}
		if conditionAfter != nil && *conditionAfter != "" && *conditionAfter != "good" {
			item.Condition = *conditionAfter
		}
		if err := u.repo.UpdateItem(ctx, item); err != nil {
			return err
		}
	} else if (status == "approved" || status == "borrowed") && (oldStatus == "pending" || oldStatus == "rejected") {
		if item.AvailableQuantity < b.Quantity {
			return fmt.Errorf("stok tidak mencukupi, sisa: %d", item.AvailableQuantity)
		}
		item.AvailableQuantity -= b.Quantity
		if err := u.repo.UpdateItem(ctx, item); err != nil {
			return err
		}
	} else if (status == "rejected" || status == "cancelled") && (oldStatus == "approved" || oldStatus == "borrowed") {
		item.AvailableQuantity += b.Quantity
		if item.AvailableQuantity > item.Quantity {
			item.AvailableQuantity = item.Quantity
		}
		if err := u.repo.UpdateItem(ctx, item); err != nil {
			return err
		}
	}

	return u.repo.UpdateBorrowing(ctx, b)
}
