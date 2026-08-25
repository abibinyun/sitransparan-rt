package http

import (
	"net/http"
	"path/filepath"
	"strings"
)

// Gerbang §7.4 konsep portal: semua upload dibatasi ukuran dan tipe file
// untuk melindungi object storage dari penyalahgunaan.
const (
	maxUploadBytes = 5 << 20 // 5 MB
	maxMultipartMemory = 6 << 20
)

var allowedUploadMime = map[string]bool{
	"image/jpeg":      true,
	"image/png":       true,
	"image/webp":      true,
	"application/pdf": true,
}

var allowedUploadExt = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".pdf": true,
}

// limitUploadBody membatasi total body multipart sebelum parsing.
func limitUploadBody(r *http.Request) {
	r.Body = http.MaxBytesReader(nil, r.Body, maxUploadBytes+1<<20) // +1MB overhead multipart
}

// validateUploadFile memeriksa ukuran & tipe satu file multipart.
// Mengembalikan pesan error kosong bila valid.
func validateUploadFile(filename, contentType string, size int64) string {
	if size > maxUploadBytes {
		return "file terlalu besar (maksimal 5 MB)"
	}
	if size == 0 {
		return "file kosong"
	}
	if !allowedUploadMime[contentType] {
		return "tipe file tidak diizinkan (hanya JPG, PNG, WebP, PDF)"
	}
	ext := strings.ToLower(filepath.Ext(filename))
	if !allowedUploadExt[ext] {
		return "ekstensi file tidak diizinkan (hanya .jpg, .jpeg, .png, .webp, .pdf)"
	}
	return ""
}
