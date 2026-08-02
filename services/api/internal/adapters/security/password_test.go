package security

import "testing"

func TestArgon2Hasher(t *testing.T) {
	h := NewArgon2Hasher(DefaultArgon2Config())
	encoded, err := h.Hash("very-long-password")
	if err != nil {
		t.Fatal(err)
	}
	if encoded == "very-long-password" {
		t.Fatal("password must not be stored as plain text")
	}
	if err := h.Verify(encoded, "very-long-password"); err != nil {
		t.Fatalf("verify: %v", err)
	}
	if err := h.Verify(encoded, "wrong-password"); err == nil {
		t.Fatal("expected mismatch")
	}
}
