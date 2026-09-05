package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type InventoryItem struct {
	ID                uuid.UUID  `json:"id"`
	ItemCode          *string    `json:"item_code"`
	Name              string     `json:"name"`
	Category          string     `json:"category"` // Tenda, Kursi, Sound System, Kebersihan, Keamanan, Olahraga, Elektronik, Fasilitas, Umum
	Description       *string    `json:"description"`
	Quantity          int        `json:"quantity"`
	AvailableQuantity int        `json:"available_quantity"`
	Unit              string     `json:"unit"` // Unit, Pcs, Set, Buah, Lembar
	Condition         string     `json:"condition"` // good, fair, damaged, lost
	Location          *string    `json:"location"` // Balai RT, Pos Ronda, Gudang, dll
	SourceFund        *string    `json:"source_fund"` // Kas RT, Donasi, Bantuan Pemda, Swadaya
	PurchaseDate      *time.Time `json:"purchase_date"`
	PurchasePrice     float64    `json:"purchase_price"`
	PhotoURL          *string    `json:"photo_url"`
	IsBorrowable      bool       `json:"is_borrowable"`
	Notes             *string    `json:"notes"`
	CreatedBy         *uuid.UUID `json:"created_by"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type InventoryBorrowing struct {
	ID                 uuid.UUID  `json:"id"`
	ItemID             uuid.UUID  `json:"item_id"`
	ItemName           string     `json:"item_name,omitempty"`
	BorrowerName       string     `json:"borrower_name"`
	BorrowerPhone      *string    `json:"borrower_phone"`
	BorrowerResidentID *uuid.UUID `json:"borrower_resident_id"`
	BorrowerHouseID    *uuid.UUID `json:"borrower_house_id"`
	Quantity           int        `json:"quantity"`
	Purpose            *string    `json:"purpose"`
	BorrowDate         time.Time  `json:"borrow_date"`
	ExpectedReturnDate *time.Time `json:"expected_return_date"`
	ActualReturnDate   *time.Time `json:"actual_return_date"`
	Status             string     `json:"status"` // pending, approved, borrowed, returned, rejected, overdue
	ConditionBefore    *string    `json:"condition_before"`
	ConditionAfter     *string    `json:"condition_after"`
	AdminNotes         *string    `json:"admin_notes"`
	ApprovedBy         *uuid.UUID `json:"approved_by"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type InventoryFilter struct {
	Category string
	Condition string
	Search   string
	IsBorrowable *bool
	Limit    int
	Offset   int
}

type BorrowingFilter struct {
	ItemID   *uuid.UUID
	Status   string
	Search   string
	Limit    int
	Offset   int
}

type InventoryRepository interface {
	CreateItem(ctx context.Context, item *InventoryItem) error
	GetItemByID(ctx context.Context, id uuid.UUID) (*InventoryItem, error)
	ListItems(ctx context.Context, filter InventoryFilter) ([]InventoryItem, int, error)
	UpdateItem(ctx context.Context, item *InventoryItem) error
	DeleteItem(ctx context.Context, id uuid.UUID) error

	CreateBorrowing(ctx context.Context, b *InventoryBorrowing) error
	GetBorrowingByID(ctx context.Context, id uuid.UUID) (*InventoryBorrowing, error)
	ListBorrowings(ctx context.Context, filter BorrowingFilter) ([]InventoryBorrowing, int, error)
	UpdateBorrowing(ctx context.Context, b *InventoryBorrowing) error
}

type InventoryUsecase interface {
	CreateItem(ctx context.Context, item *InventoryItem) error
	GetItemByID(ctx context.Context, id uuid.UUID) (*InventoryItem, error)
	ListItems(ctx context.Context, filter InventoryFilter) ([]InventoryItem, int, error)
	UpdateItem(ctx context.Context, item *InventoryItem) error
	DeleteItem(ctx context.Context, id uuid.UUID) error

	CreateBorrowing(ctx context.Context, b *InventoryBorrowing) error
	GetBorrowingByID(ctx context.Context, id uuid.UUID) (*InventoryBorrowing, error)
	ListBorrowings(ctx context.Context, filter BorrowingFilter) ([]InventoryBorrowing, int, error)
	UpdateBorrowingStatus(ctx context.Context, id uuid.UUID, status string, conditionAfter *string, adminNotes *string, approverID *uuid.UUID) error
}
