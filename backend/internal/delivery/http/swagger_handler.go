package http

import (
	"embed"
	"net/http"
)

//go:embed openapi.yaml
var openapiFS embed.FS

// RegisterSwaggerRoutes registers /swagger/* endpoints serving Swagger UI and openapi.yaml.
func RegisterSwaggerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /swagger/openapi.yaml", func(w http.ResponseWriter, r *http.Request) {
		data, err := openapiFS.ReadFile("openapi.yaml")
		if err != nil {
			http.Error(w, `{"error":"openapi.yaml not found"}`, http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/yaml")
		w.Write(data)
	})

	swaggerUIHTML := []byte(`<!DOCTYPE html>
<html lang="en">
<head:
  <meta charset="UTF-8">
  <title>Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/swagger/openapi.yaml",
        dom_id: '#swagger-ui',
      });
    };
  </script>
</body>
</html>`)

	swaggerHandler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(swaggerUIHTML)
	}

	mux.HandleFunc("GET /swagger/", swaggerHandler)
	mux.HandleFunc("GET /swagger", swaggerHandler)
}
