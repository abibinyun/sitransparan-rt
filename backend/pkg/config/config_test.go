package config

import (
	"strings"
	"testing"
)

// TestResolveJWTSecret_RejectsMissingOrShort is a regression test for a CRITICAL
// finding: JWT_SECRET used to fall back to a publicly-known default, letting
// anyone forge tokens for any tenant/role. The config layer must now refuse to
// accept an unset or short secret (there is deliberately no default).
func TestResolveJWTSecret_RejectsMissingOrShort(t *testing.T) {
	knownDefault := "sitransparan-secret-key-change-in-prod"
	examplePlaceholder := "change-me-to-a-long-random-value-at-least-32-chars"
	cases := []struct {
		name   string
		secret string
	}{
		{"empty", ""},
		{"whitespace only", "   \n\t "},
		{"short", "short-secret"},
		{"exactly the old public default", knownDefault},
		{"old public default padded with whitespace", "  " + knownDefault + "  "},
		{".env.example placeholder", examplePlaceholder},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := ResolveJWTSecret(tc.secret)
			if err == nil {
				t.Fatalf("ResolveJWTSecret(%q) expected error, got secret %q", tc.secret, got)
			}
			if !strings.Contains(err.Error(), "JWT_SECRET") {
				t.Errorf("error should mention JWT_SECRET, got: %v", err)
			}
		})
	}
}

func TestResolveJWTSecret_AcceptsStrongSecret(t *testing.T) {
	strong := "a-truly-random-64-byte-secret-0123456789abcdef0123456789abcdef"
	got, err := ResolveJWTSecret(strong)
	if err != nil {
		t.Fatalf("ResolveJWTSecret should accept a strong secret, got error: %v", err)
	}
	if got != strong {
		t.Fatalf("ResolveJWTSecret returned %q, want %q", got, strong)
	}
}
