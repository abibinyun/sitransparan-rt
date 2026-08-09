package crypto

import (
	"testing"
)

func TestEncryptDecryptAESGCM(t *testing.T) {
	nik := "3171012345670001"

	encrypted, err := EncryptAESGCM(nik)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	if encrypted == nik {
		t.Fatalf("Encrypted NIK should not match plaintext")
	}

	decrypted, err := DecryptAESGCM(encrypted)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}

	if decrypted != nik {
		t.Errorf("Expected decrypted NIK %s, got %s", nik, decrypted)
	}
}

func TestHashHMAC(t *testing.T) {
	nik := "3171012345670001"

	h1 := HashHMAC(nik)
	h2 := HashHMAC(nik)

	if h1 == "" || h1 == nik {
		t.Fatalf("Invalid hash")
	}

	if h1 != h2 {
		t.Errorf("HMAC should be deterministic: %s != %s", h1, h2)
	}
}
