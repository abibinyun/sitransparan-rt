package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSwaggerRoutes(t *testing.T) {
	mux := http.NewServeMux()
	RegisterSwaggerRoutes(mux)

	t.Run("GET /swagger/openapi.yaml", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/swagger/openapi.yaml", nil)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", rec.Code)
		}
		if !strings.Contains(rec.Body.String(), "openapi: 3.0.3") {
			t.Errorf("expected openapi content, got %s", rec.Body.String())
		}
	})

	t.Run("GET /swagger/", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/swagger/", nil)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", rec.Code)
		}
		if !strings.Contains(rec.Body.String(), "SwaggerUIBundle") {
			t.Errorf("expected Swagger UI HTML, got %s", rec.Body.String())
		}
	})
}
