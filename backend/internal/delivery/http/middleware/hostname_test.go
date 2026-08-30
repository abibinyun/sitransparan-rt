package middleware_test

import (
	"testing"

	"backend/internal/delivery/http/middleware"
)

func TestHostnameSlug_MultiDomainAndCCTLD(t *testing.T) {
	tests := []struct {
		name       string
		host       string
		baseDomain string
		wantSlug   string
		wantMatch  bool
	}{
		// Standard single base domain (openrt.local)
		{"Standard subdomain", "rt-003.openrt.local", "openrt.local", "rt-003", true},
		{"Platform host exact", "openrt.local", "openrt.local", "", false},
		{"Reserved subdomain app", "app.openrt.local", "openrt.local", "", false},
		{"Reserved subdomain api", "api.openrt.local", "openrt.local", "", false},
		{"Localhost", "localhost", "openrt.local", "", false},
		{"IP address", "127.0.0.1", "openrt.local", "", false},

		// Multi base domain (comma-separated: openrt.local, iscube.web.id)
		{"Multi domain - first match", "rt-003.openrt.local", "openrt.local, iscube.web.id", "rt-003", true},
		{"Multi domain - second match", "rt-003.iscube.web.id", "openrt.local, iscube.web.id", "rt-003", true},
		{"Multi domain - platform root second", "iscube.web.id", "openrt.local, iscube.web.id", "", false},
		{"Multi domain - app second", "app.iscube.web.id", "openrt.local, iscube.web.id", "", false},

		// Dynamic ccTLD resolution (baseDomain is openrt.local, request arrives as rt-003.iscube.web.id)
		{"Dynamic ccTLD tunnel subdomain", "rt-003.iscube.web.id", "openrt.local", "rt-003", true},
		{"Dynamic ccTLD tunnel platform root", "iscube.web.id", "openrt.local", "", false},
		{"Dynamic ccTLD reserved sub", "api.iscube.web.id", "openrt.local", "", false},

		// Hyphenated tenant slug
		{"Hyphenated slug", "rt-rw-05.iscube.web.id", "openrt.local", "rt-rw-05", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotSlug, gotMatch := middleware.HostnameSlug(tt.host, tt.baseDomain)
			if gotMatch != tt.wantMatch {
				t.Fatalf("HostnameSlug(%q, %q) match = %v, want %v", tt.host, tt.baseDomain, gotMatch, tt.wantMatch)
			}
			if gotSlug != tt.wantSlug {
				t.Fatalf("HostnameSlug(%q, %q) slug = %q, want %q", tt.host, tt.baseDomain, gotSlug, tt.wantSlug)
			}
		})
	}
}

func TestIsPlatformHost_MultiDomainAndCCTLD(t *testing.T) {
	tests := []struct {
		name       string
		host       string
		baseDomain string
		want       bool
	}{
		{"localhost", "localhost", "openrt.local", true},
		{"127.0.0.1", "127.0.0.1", "openrt.local", true},
		{"openrt.local", "openrt.local", "openrt.local", true},
		{"app.openrt.local", "app.openrt.local", "openrt.local", true},
		{"api.openrt.local", "api.openrt.local", "openrt.local", true},
		{"rt-003.openrt.local", "rt-003.openrt.local", "openrt.local", false},

		{"iscube.web.id with multi base", "iscube.web.id", "openrt.local, iscube.web.id", true},
		{"app.iscube.web.id with multi base", "app.iscube.web.id", "openrt.local, iscube.web.id", true},
		{"rt-003.iscube.web.id with multi base", "rt-003.iscube.web.id", "openrt.local, iscube.web.id", false},

		{"iscube.web.id dynamic ccTLD", "iscube.web.id", "openrt.local", true},
		{"app.iscube.web.id dynamic ccTLD", "app.iscube.web.id", "openrt.local", true},
		{"rt-003.iscube.web.id dynamic ccTLD", "rt-003.iscube.web.id", "openrt.local", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := middleware.IsPlatformHost(tt.host, tt.baseDomain)
			if got != tt.want {
				t.Fatalf("IsPlatformHost(%q, %q) = %v, want %v", tt.host, tt.baseDomain, got, tt.want)
			}
		})
	}
}
