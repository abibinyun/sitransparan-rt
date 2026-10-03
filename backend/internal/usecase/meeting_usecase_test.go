package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"backend/internal/domain"
	"backend/internal/usecase"
)

type mockMeetingRepo struct {
	meetings map[uuid.UUID]*domain.Meeting
}

func newMockMeetingRepo() *mockMeetingRepo {
	return &mockMeetingRepo{meetings: make(map[uuid.UUID]*domain.Meeting)}
}

func (m *mockMeetingRepo) Create(ctx context.Context, meeting *domain.Meeting) error {
	m.meetings[meeting.ID] = meeting
	return nil
}

func (m *mockMeetingRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Meeting, error) {
	meeting, ok := m.meetings[id]
	if !ok {
		return nil, nil
	}
	return meeting, nil
}

func (m *mockMeetingRepo) List(ctx context.Context, visibility string) ([]domain.Meeting, error) {
	var list []domain.Meeting
	for _, mt := range m.meetings {
		if visibility != "" && mt.Visibility != visibility {
			continue
		}
		list = append(list, *mt)
	}
	return list, nil
}

func (m *mockMeetingRepo) Update(ctx context.Context, meeting *domain.Meeting) error {
	m.meetings[meeting.ID] = meeting
	return nil
}

func (m *mockMeetingRepo) Delete(ctx context.Context, id uuid.UUID) error {
	delete(m.meetings, id)
	return nil
}

func (m *mockMeetingRepo) AddAttendee(ctx context.Context, a *domain.MeetingAttendee) error {
	return nil
}
func (m *mockMeetingRepo) DeleteAttendee(ctx context.Context, id uuid.UUID) error {
	return nil
}
func (m *mockMeetingRepo) AddDecision(ctx context.Context, d *domain.MeetingDecision) error {
	return nil
}
func (m *mockMeetingRepo) DeleteDecision(ctx context.Context, id uuid.UUID) error {
	return nil
}
func (m *mockMeetingRepo) CreateActionItem(ctx context.Context, item *domain.MeetingActionItem) error {
	return nil
}
func (m *mockMeetingRepo) UpdateActionItem(ctx context.Context, item *domain.MeetingActionItem) error {
	return nil
}
func (m *mockMeetingRepo) DeleteActionItem(ctx context.Context, id uuid.UUID) error {
	return nil
}
func (m *mockMeetingRepo) ListActionItems(ctx context.Context, status string, onlyPublic bool) ([]domain.MeetingActionItem, error) {
	return nil, nil
}

func TestMeetingUsecase_ValidationAndCRUD(t *testing.T) {
	repo := newMockMeetingRepo()
	uc := usecase.NewMeetingUsecase(repo)
	ctx := context.Background()

	// 1. Validasi: title wajib diisi
	_, err := uc.CreateMeeting(ctx, &domain.Meeting{
		Agenda:      "Agenda",
		MeetingDate: time.Now(),
	})
	if err == nil {
		t.Fatal("expected error when title is missing")
	}

	// 2. Berhasil buat meeting
	created, err := uc.CreateMeeting(ctx, &domain.Meeting{
		ID:          uuid.New(),
		Title:       "Musyawarah Warga RT",
		Agenda:      "Pembahasan Iuran & Kebersihan",
		MeetingDate: time.Now(),
		Visibility:  "public",
	})
	if err != nil {
		t.Fatalf("CreateMeeting failed: %v", err)
	}
	if created.Title != "Musyawarah Warga RT" {
		t.Errorf("expected title to match, got %s", created.Title)
	}

	// 3. List meetings
	list, err := uc.ListMeetings(ctx, "public")
	if err != nil || len(list) != 1 {
		t.Fatalf("expected 1 meeting, got %d", len(list))
	}
}
