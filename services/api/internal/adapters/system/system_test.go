package system

import "testing"

func TestIDGeneratorProducesUUIDv4(t *testing.T) {
	g := NewIDGenerator()
	a, b := g.New(), g.New()
	if len(a) != 36 || a[14] != '4' || a == b {
		t.Fatalf("unexpected IDs: %q %q", a, b)
	}
}
