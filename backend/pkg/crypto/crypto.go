package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"os"
)

var (
	ErrInvalidKeySize = errors.New("crypto: invalid key size")
	ErrCiphertextShort = errors.New("crypto: ciphertext too short")
)

// getDefaultKey returns 32-byte key from NIK_ENCRYPTION_KEY env or default fallback key
func getDefaultKey() []byte {
	keyStr := os.Getenv("NIK_ENCRYPTION_KEY")
	if len(keyStr) == 32 {
		return []byte(keyStr)
	}
	// Fallback 32-byte default key for local/testing
	return []byte("sitransparan-nik-encrypt-key-32b")
}

// getDefaultHMACSecret returns secret from NIK_HMAC_SECRET env or default fallback
func getDefaultHMACSecret() []byte {
	secretStr := os.Getenv("NIK_HMAC_SECRET")
	if secretStr != "" {
		return []byte(secretStr)
	}
	return []byte("sitransparan-nik-hmac-secret-key")
}

// EncryptAESGCM encrypts plaintext using AES-256 GCM and returns hex-encoded string (nonce + ciphertext)
func EncryptAESGCM(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	key := getDefaultKey()
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return hex.EncodeToString(ciphertext), nil
}

// DecryptAESGCM decrypts hex-encoded string (nonce + ciphertext) using AES-256 GCM
func DecryptAESGCM(hexCiphertext string) (string, error) {
	if hexCiphertext == "" {
		return "", nil
	}
	data, err := hex.DecodeString(hexCiphertext)
	if err != nil {
		// If decoding fails, it might be plaintext legacy NIK or invalid hex
		return hexCiphertext, nil
	}

	key := getDefaultKey()
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return hexCiphertext, nil
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintextBytes, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		// If decryption fails, return as-is (e.g., plaintext legacy)
		return hexCiphertext, nil
	}

	return string(plaintextBytes), nil
}

// HashHMAC generates deterministic lookup hash for search using HMAC-SHA256 hex string
func HashHMAC(plaintext string) string {
	if plaintext == "" {
		return ""
	}
	secret := getDefaultHMACSecret()
	h := hmac.New(sha256.New, secret)
	h.Write([]byte(plaintext))
	return hex.EncodeToString(h.Sum(nil))
}
