package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"backend/internal/domain"
	"github.com/lib/pq"
)

// SetTenantSearchPath sets search_path to tenant_<slug>, public for the given DB connection/tx.
func SetTenantSearchPath(ctx context.Context, db *sql.DB, slug string) error {
	if slug == "" {
		return nil
	}
	schemaName := "tenant_" + strings.ReplaceAll(slug, "-", "_")
	query := fmt.Sprintf("SET search_path TO %s, public", pq.QuoteIdentifier(schemaName))
	_, err := db.ExecContext(ctx, query)
	return err
}

// SetSearchPathFromTenant sets search_path for db using tenant from context if available.
func SetSearchPathFromTenant(ctx context.Context, db *sql.DB) error {
	if tenant, ok := ctx.Value(domain.TenantContextKey).(*domain.Tenant); ok && tenant != nil && tenant.Slug != "" {
		return SetTenantSearchPath(ctx, db, tenant.Slug)
	}
	return nil
}
