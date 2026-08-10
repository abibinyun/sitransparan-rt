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
//
// NOTE: This must NOT be used on a shared *sql.DB connection pool, because the
// setting is applied to whichever pooled connection executes the statement and
// silently leaks across requests. Repository queries are schema-qualified via
// TenantTable instead, so this helper is only intended for tests and one-off
// maintenance scripts that operate on a dedicated connection.
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
//
// Deprecated: prefer schema-qualified queries via TenantTable.
func SetSearchPathFromTenant(ctx context.Context, db *sql.DB) error {
	if tenant, ok := ctx.Value(domain.TenantContextKey).(*domain.Tenant); ok && tenant != nil && tenant.Slug != "" {
		return SetTenantSearchPath(ctx, db, tenant.Slug)
	}
	return nil
}

// TenantSchemaName returns the tenant schema name (tenant_<slug>) derived from
// the trusted tenant in the request context, or "" when no tenant is present.
func TenantSchemaName(ctx context.Context) string {
	if t, ok := ctx.Value(domain.TenantContextKey).(*domain.Tenant); ok && t != nil && t.Slug != "" {
		return "tenant_" + strings.ReplaceAll(t.Slug, "-", "_")
	}
	return ""
}

// TenantTable qualifies a tenant-scoped table with the tenant schema derived
// from the trusted request context (e.g. tenant_sitransparan_rt.residents).
// When no tenant context is present it falls back to the bare table name, which
// resolves against the public schema. This makes tenant isolation deterministic
// and immune to connection-pool search_path leakage.
func TenantTable(ctx context.Context, table string) string {
	if s := TenantSchemaName(ctx); s != "" {
		return pq.QuoteIdentifier(s) + "." + pq.QuoteIdentifier(table)
	}
	return pq.QuoteIdentifier(table)
}
