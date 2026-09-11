package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"backend/internal/domain"
	"backend/internal/usecase"
)

type mockInventoryRepo struct {
	items      map[uuid.UUID]*domain.InventoryItem
	borrowings map[uuid.UUID]*domain.InventoryBorrowing
}

func newMockInventoryRepo() *mockInventoryRepo {
	return &mockInventoryRepo{
		items:      make(map[uuid.UUID]*domain.InventoryItem),
		borrowings: make(map[uuid.UUID]*domain.InventoryBorrowing),
	}
}

func (m *mockInventoryRepo) CreateItem(ctx context.Context, item *domain.InventoryItem) error {
	if item.ID == uuid.Nil {
		item.ID = uuid.New()
	}
	m.items[item.ID] = item
	return nil
}

func (m *mockInventoryRepo) GetItemByID(ctx context.Context, id uuid.UUID) (*domain.InventoryItem, error) {
	item, ok := m.items[id]
	if !ok {
		return nil, errors.New("barang tidak ditemukan")
	}
	// return a copy so mutations behave like DB
	itemCopy := *item
	return &itemCopy, nil
}

func (m *mockInventoryRepo) ListItems(ctx context.Context, filter domain.InventoryFilter) ([]domain.InventoryItem, int, error) {
	var res []domain.InventoryItem
	for _, it := range m.items {
		if filter.Search != "" && it.Name != filter.Search {
			continue
		}
		res = append(res, *it)
	}
	return res, len(res), nil
}

func (m *mockInventoryRepo) UpdateItem(ctx context.Context, item *domain.InventoryItem) error {
	m.items[item.ID] = item
	return nil
}

func (m *mockInventoryRepo) DeleteItem(ctx context.Context, id uuid.UUID) error {
	delete(m.items, id)
	return nil
}

func (m *mockInventoryRepo) CreateBorrowing(ctx context.Context, b *domain.InventoryBorrowing) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	m.borrowings[b.ID] = b
	return nil
}

func (m *mockInventoryRepo) GetBorrowingByID(ctx context.Context, id uuid.UUID) (*domain.InventoryBorrowing, error) {
	b, ok := m.borrowings[id]
	if !ok {
		return nil, errors.New("peminjaman tidak ditemukan")
	}
	bCopy := *b
	return &bCopy, nil
}

func (m *mockInventoryRepo) ListBorrowings(ctx context.Context, filter domain.BorrowingFilter) ([]domain.InventoryBorrowing, int, error) {
	var res []domain.InventoryBorrowing
	for _, b := range m.borrowings {
		res = append(res, *b)
	}
	return res, len(res), nil
}

func (m *mockInventoryRepo) UpdateBorrowing(ctx context.Context, b *domain.InventoryBorrowing) error {
	m.borrowings[b.ID] = b
	return nil
}

func TestInventoryUsecase_ItemCRUDAndValidation(t *testing.T) {
	repo := newMockInventoryRepo()
	uc := usecase.NewInventoryUsecase(repo)
	ctx := context.Background()

	// 1. Validation: Name required
	invalidItem := &domain.InventoryItem{Name: "", Quantity: 5}
	if err := uc.CreateItem(ctx, invalidItem); err == nil {
		t.Fatal("expected error when item name is empty")
	}

	// 2. Create item with defaults
	item := &domain.InventoryItem{
		Name:         "Tenda Pleton 4x6",
		Quantity:     3,
		IsBorrowable: true,
	}
	if err := uc.CreateItem(ctx, item); err != nil {
		t.Fatalf("CreateItem failed: %v", err)
	}
	if item.Category != "Umum" || item.Unit != "Unit" || item.Condition != "good" {
		t.Errorf("expected defaults applied, got cat=%s unit=%s cond=%s", item.Category, item.Unit, item.Condition)
	}
	if item.AvailableQuantity != 3 {
		t.Errorf("expected available=3, got %d", item.AvailableQuantity)
	}

	// 3. Get item
	fetched, err := uc.GetItemByID(ctx, item.ID)
	if err != nil || fetched == nil {
		t.Fatalf("GetItemByID failed: %v", err)
	}
	if fetched.Name != "Tenda Pleton 4x6" {
		t.Errorf("expected name 'Tenda Pleton 4x6', got %s", fetched.Name)
	}

	// 4. Update item
	fetched.Quantity = 5
	if err := uc.UpdateItem(ctx, fetched); err != nil {
		t.Fatalf("UpdateItem failed: %v", err)
	}
	updated, _ := uc.GetItemByID(ctx, item.ID)
	if updated.AvailableQuantity != 5 {
		t.Errorf("expected available=5 after quantity increase, got %d", updated.AvailableQuantity)
	}

	// 5. Delete item
	if err := uc.DeleteItem(ctx, item.ID); err != nil {
		t.Fatalf("DeleteItem failed: %v", err)
	}
	if _, err := uc.GetItemByID(ctx, item.ID); err == nil {
		t.Fatal("expected error after delete")
	}
}

func TestInventoryUsecase_BorrowingLifecycleAndStock(t *testing.T) {
	repo := newMockInventoryRepo()
	uc := usecase.NewInventoryUsecase(repo)
	ctx := context.Background()

	// Setup borrowable item
	item := &domain.InventoryItem{
		Name:         "Genset 2500W",
		Quantity:     2,
		IsBorrowable: true,
	}
	_ = uc.CreateItem(ctx, item)

	// Setup unborrowable item
	lockedItem := &domain.InventoryItem{
		Name:         "Stempel Resmi RT",
		Quantity:     1,
		IsBorrowable: false,
	}
	_ = uc.CreateItem(ctx, lockedItem)

	// 1. Edge Case: Borrow unborrowable item -> error
	err := uc.CreateBorrowing(ctx, &domain.InventoryBorrowing{
		ItemID:       lockedItem.ID,
		BorrowerName: "Warga A",
		Quantity:     1,
	})
	if err == nil {
		t.Fatal("expected error when borrowing unborrowable item")
	}

	// 2. Edge Case: Borrow more than available -> error
	err = uc.CreateBorrowing(ctx, &domain.InventoryBorrowing{
		ItemID:       item.ID,
		BorrowerName: "Warga B",
		Quantity:     5,
	})
	if err == nil {
		t.Fatal("expected error when quantity exceeds available stock")
	}

	// 3. Happy Path: Borrow 1 unit (status approved) -> stock decrements
	borrowing := &domain.InventoryBorrowing{
		ItemID:       item.ID,
		BorrowerName: "Budi Santoso",
		Quantity:     1,
		Status:       "approved",
	}
	if err := uc.CreateBorrowing(ctx, borrowing); err != nil {
		t.Fatalf("CreateBorrowing failed: %v", err)
	}

	afterBorrow, _ := uc.GetItemByID(ctx, item.ID)
	if afterBorrow.AvailableQuantity != 1 {
		t.Errorf("expected available=1 after borrow, got %d", afterBorrow.AvailableQuantity)
	}

	// 4. Return item with damaged condition
	cond := "damaged"
	notes := "Kabel busi copot"
	if err := uc.UpdateBorrowingStatus(ctx, borrowing.ID, "returned", &cond, &notes, nil); err != nil {
		t.Fatalf("UpdateBorrowingStatus returned failed: %v", err)
	}

	afterReturn, _ := uc.GetItemByID(ctx, item.ID)
	if afterReturn.AvailableQuantity != 2 {
		t.Errorf("expected available=2 after return, got %d", afterReturn.AvailableQuantity)
	}
	if afterReturn.Condition != "damaged" {
		t.Errorf("expected item condition updated to 'damaged', got %s", afterReturn.Condition)
	}

	// 5. Verify borrowing record
	bRecord, _ := uc.GetBorrowingByID(ctx, borrowing.ID)
	if bRecord.Status != "returned" || bRecord.ActualReturnDate == nil {
		t.Fatal("expected borrowing status returned and actual return date set")
	}
}

func TestInventoryUsecase_BorrowingCancellationAndRejection(t *testing.T) {
	repo := newMockInventoryRepo()
	uc := usecase.NewInventoryUsecase(repo)
	ctx := context.Background()

	item := &domain.InventoryItem{
		Name:         "Sound System Portable",
		Quantity:     1,
		IsBorrowable: true,
	}
	_ = uc.CreateItem(ctx, item)

	borrowing := &domain.InventoryBorrowing{
		ItemID:       item.ID,
		BorrowerName: "Warga C",
		Quantity:     1,
		Status:       "borrowed",
	}
	_ = uc.CreateBorrowing(ctx, borrowing)

	checked, _ := uc.GetItemByID(ctx, item.ID)
	if checked.AvailableQuantity != 0 {
		t.Fatalf("expected available=0, got %d", checked.AvailableQuantity)
	}

	// Cancel / reject restores available quantity
	reason := "Batal acara karena hujan"
	if err := uc.UpdateBorrowingStatus(ctx, borrowing.ID, "cancelled", nil, &reason, nil); err != nil {
		t.Fatalf("UpdateBorrowingStatus cancelled failed: %v", err)
	}

	restored, _ := uc.GetItemByID(ctx, item.ID)
	if restored.AvailableQuantity != 1 {
		t.Errorf("expected available=1 after cancellation, got %d", restored.AvailableQuantity)
	}
}
