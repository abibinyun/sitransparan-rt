package http_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	delivery "backend/internal/delivery/http"
	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
)

type mockMeetingUsecase struct {
	mock.Mock
}

func (m *mockMeetingUsecase) CreateMeeting(ctx context.Context, meeting *domain.Meeting) (*domain.Meeting, error) {
	args := m.Called(ctx, meeting)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Meeting), args.Error(1)
}

func (m *mockMeetingUsecase) GetMeetingByID(ctx context.Context, id uuid.UUID) (*domain.Meeting, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Meeting), args.Error(1)
}

func (m *mockMeetingUsecase) ListMeetings(ctx context.Context, visibility string) ([]domain.Meeting, error) {
	args := m.Called(ctx, visibility)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]domain.Meeting), args.Error(1)
}

func (m *mockMeetingUsecase) UpdateMeeting(ctx context.Context, meeting *domain.Meeting) (*domain.Meeting, error) {
	args := m.Called(ctx, meeting)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Meeting), args.Error(1)
}

func (m *mockMeetingUsecase) DeleteMeeting(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *mockMeetingUsecase) AddAttendee(ctx context.Context, a *domain.MeetingAttendee) (*domain.MeetingAttendee, error) {
	args := m.Called(ctx, a)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.MeetingAttendee), args.Error(1)
}

func (m *mockMeetingUsecase) DeleteAttendee(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *mockMeetingUsecase) AddDecision(ctx context.Context, d *domain.MeetingDecision) (*domain.MeetingDecision, error) {
	args := m.Called(ctx, d)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.MeetingDecision), args.Error(1)
}

func (m *mockMeetingUsecase) DeleteDecision(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *mockMeetingUsecase) CreateActionItem(ctx context.Context, item *domain.MeetingActionItem) (*domain.MeetingActionItem, error) {
	args := m.Called(ctx, item)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.MeetingActionItem), args.Error(1)
}

func (m *mockMeetingUsecase) UpdateActionItem(ctx context.Context, item *domain.MeetingActionItem) (*domain.MeetingActionItem, error) {
	args := m.Called(ctx, item)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.MeetingActionItem), args.Error(1)
}

func (m *mockMeetingUsecase) DeleteActionItem(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *mockMeetingUsecase) ListActionItems(ctx context.Context, status string, onlyPublic bool) ([]domain.MeetingActionItem, error) {
	args := m.Called(ctx, status, onlyPublic)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]domain.MeetingActionItem), args.Error(1)
}

func TestMeetingHandler_ListMeetings(t *testing.T) {
	mockUC := new(mockMeetingUsecase)
	handler := delivery.NewMeetingHandler(mockUC)

	now := time.Now()
	mockUC.On("ListMeetings", mock.Anything, "public").Return([]domain.Meeting{
		{
			ID:          uuid.New(),
			Title:       "Rapat Bulanan RT",
			Agenda:      "Evaluasi Keamanan",
			MeetingDate: now,
			Location:    "Balai Warga",
			Status:      "scheduled",
		},
	}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/meetings", nil)
	rr := httptest.NewRecorder()

	handler.HandleMeetings(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp map[string][]domain.Meeting
	err := json.NewDecoder(rr.Body).Decode(&resp)
	assert.NoError(t, err)
	assert.Len(t, resp["data"], 1)
	assert.Equal(t, "Rapat Bulanan RT", resp["data"][0].Title)
}

// A resident (or any non-admin role in the context) must not be able to
// widen the visibility filter via the query string.
func TestMeetingHandler_ListMeetings_ResidentForcedPublic(t *testing.T) {
	mockUC := new(mockMeetingUsecase)
	handler := delivery.NewMeetingHandler(mockUC)

	mockUC.On("ListMeetings", mock.Anything, "public").Return([]domain.Meeting{}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/meetings?visibility=confidential", nil)
	ctx := context.WithValue(req.Context(), middleware.RoleContextKey, domain.RoleResident)
	handler.HandleMeetings(httptest.NewRecorder(), req.WithContext(ctx))

	mockUC.AssertCalled(t, "ListMeetings", mock.Anything, "public")
}

// An admin may query any visibility filter, including confidential.
func TestMeetingHandler_ListMeetings_AdminAnyVisibility(t *testing.T) {
	mockUC := new(mockMeetingUsecase)
	handler := delivery.NewMeetingHandler(mockUC)

	mockUC.On("ListMeetings", mock.Anything, "confidential").Return([]domain.Meeting{}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/meetings?visibility=confidential", nil)
	ctx := context.WithValue(req.Context(), middleware.RoleContextKey, domain.RoleAdminRT)
	handler.HandleMeetings(httptest.NewRecorder(), req.WithContext(ctx))

	mockUC.AssertCalled(t, "ListMeetings", mock.Anything, "confidential")
}

// A resident requesting a confidential meeting by ID must get 403.
func TestMeetingHandler_GetConfidentialMeeting_ResidentDenied(t *testing.T) {
	mockUC := new(mockMeetingUsecase)
	handler := delivery.NewMeetingHandler(mockUC)

	id := uuid.New()
	confidential := &domain.Meeting{ID: id, Title: "Rapat Rahasia", Visibility: "confidential"}
	mockUC.On("GetMeetingByID", mock.Anything, id).Return(confidential, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/meetings/"+id.String(), nil)
	ctx := context.WithValue(req.Context(), middleware.RoleContextKey, domain.RoleResident)
	rr := httptest.NewRecorder()

	handler.HandleMeetingByID(rr, req.WithContext(ctx))

	assert.Equal(t, http.StatusForbidden, rr.Code)
}
