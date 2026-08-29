package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"backend/internal/domain"
)

type auditLogRepository struct {
	db *sql.DB
}

func NewAuditLogRepository(db *sql.DB) domain.AuditLogRepository {
	return &auditLogRepository{db: db}
}

func (r *auditLogRepository) Create(ctx context.Context, l *domain.AuditLog) error {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	if l.CreatedAt.IsZero() {
		l.CreatedAt = time.Now()
	}
	if l.Status == "" {
		l.Status = "SUCCESS"
	}

	var payloadJSON []byte
	var err error
	if l.Payload != nil {
		payloadJSON, err = json.Marshal(l.Payload)
		if err != nil {
			payloadJSON = []byte("{}")
		}
	} else {
		payloadJSON = []byte("{}")
	}

	query := `
		INSERT INTO audit_logs (
			id, tenant_id, user_id, house_id, action, resource, payload, ip_address, user_agent, status, error_message, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err = r.db.ExecContext(
		ctx, query,
		l.ID, l.TenantID, l.UserID, l.HouseID, l.Action, l.Resource,
		payloadJSON, l.IPAddress, l.UserAgent, l.Status, l.ErrorMessage, l.CreatedAt,
	)
	return err
}

func (r *auditLogRepository) List(ctx context.Context, filter domain.AuditLogFilter) ([]domain.AuditLog, int, error) {
	var whereClauses []string
	var args []interface{}
	argIdx := 1

	if filter.TenantID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("tenant_id = $%d", argIdx))
		args = append(args, *filter.TenantID)
		argIdx++
	}
	if filter.UserID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("user_id = $%d", argIdx))
		args = append(args, *filter.UserID)
		argIdx++
	}
	if filter.Action != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("action ILIKE $%d", argIdx))
		args = append(args, "%"+filter.Action+"%")
		argIdx++
	}
	if filter.Resource != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("resource = $%d", argIdx))
		args = append(args, filter.Resource)
		argIdx++
	}
	if filter.StartDate != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("created_at >= $%d", argIdx))
		args = append(args, *filter.StartDate)
		argIdx++
	}
	if filter.EndDate != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("created_at <= $%d", argIdx))
		args = append(args, *filter.EndDate)
		argIdx++
	}

	whereSQL := ""
	if len(whereClauses) > 0 {
		whereSQL = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM audit_logs %s", whereSQL)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	listQuery := fmt.Sprintf(`
		SELECT id, tenant_id, user_id, house_id, action, resource, payload, ip_address, user_agent, status, error_message, created_at
		FROM audit_logs
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []domain.AuditLog
	for rows.Next() {
		var l domain.AuditLog
		var payloadRaw []byte
		var tenantID, userID, houseID sql.NullString
		var ipAddr, userAgent, errMsg sql.NullString

		err := rows.Scan(
			&l.ID, &tenantID, &userID, &houseID, &l.Action, &l.Resource,
			&payloadRaw, &ipAddr, &userAgent, &l.Status, &errMsg, &l.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}

		if tenantID.Valid {
			tUUID, _ := uuid.Parse(tenantID.String)
			l.TenantID = &tUUID
		}
		if userID.Valid {
			uUUID, _ := uuid.Parse(userID.String)
			l.UserID = &uUUID
		}
		if houseID.Valid {
			hUUID, _ := uuid.Parse(houseID.String)
			l.HouseID = &hUUID
		}
		if ipAddr.Valid {
			l.IPAddress = ipAddr.String
		}
		if userAgent.Valid {
			l.UserAgent = userAgent.String
		}
		if errMsg.Valid {
			l.ErrorMessage = errMsg.String
		}
		if len(payloadRaw) > 0 {
			_ = json.Unmarshal(payloadRaw, &l.Payload)
		}

		logs = append(logs, l)
	}

	return logs, total, nil
}
