package http

import (
	"io"
	"net/http"
	"strconv"
	"strings"

	"backend/pkg/storage/minio"
)

type StorageFileHandler struct {
	storageClient *minio.Client
}

func NewStorageFileHandler(storageClient *minio.Client) *StorageFileHandler {
	return &StorageFileHandler{storageClient: storageClient}
}

// ServeFile melayani file media dari MinIO lewat API backend (/api/v1/files/{path...})
// sehingga tidak terkena pemblokiran CORS browser (loopback address space localhost:9000).
func (h *StorageFileHandler) ServeFile(w http.ResponseWriter, r *http.Request) {
	if h.storageClient == nil {
		http.Error(w, `{"error":"storage not configured"}`, http.StatusNotFound)
		return
	}

	// Path parameter: misal /api/v1/files/rt-003/ktp/uuid_name.jpg
	// r.URL.Path setelah /api/v1/files/
	prefix := "/api/v1/files/"
	idx := strings.Index(r.URL.Path, prefix)
	if idx == -1 {
		http.Error(w, `{"error":"invalid file path"}`, http.StatusBadRequest)
		return
	}
	objectKey := r.URL.Path[idx+len(prefix):]
	if objectKey == "" {
		http.Error(w, `{"error":"missing file key"}`, http.StatusBadRequest)
		return
	}

	obj, contentType, size, err := h.storageClient.GetObject(r.Context(), objectKey)
	if err != nil {
		http.Error(w, `{"error":"file not found"}`, http.StatusNotFound)
		return
	}
	defer obj.Close()

	if contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
	if size > 0 {
		w.Header().Set("Content-Length", strconv.FormatInt(size, 10))
	}
	// Cache control untuk file media statis
	w.Header().Set("Cache-Control", "public, max-age=86400")

	_, _ = io.Copy(w, obj)
}
