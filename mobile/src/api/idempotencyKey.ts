let counter = 0

// Generates a sufficiently unique key for the Idempotency-Key header
// (8-128 chars per openapi.yaml). Not a cryptographic UUID — Hermes has no
// built-in Web Crypto API and this project has no expo-crypto/
// react-native-get-random-values dependency — but uniqueness (not
// unguessability) is all the idempotency contract requires, since keys are
// scoped to the authenticated user's own requests.
export function generateIdempotencyKey(): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER
  const random = Math.random().toString(36).slice(2)
  return `${Date.now().toString(36)}-${counter.toString(36)}-${random}`
}
