# Mobile Scaffold + Auth Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing AUTH-001 consent fields to the Go API, then stand up the SakuPlan mobile app (Expo + TypeScript + Tamagui) from scratch with a working Register → Login → Home → Logout flow against the real backend.

**Architecture:** Task 1 is a small, self-contained `api` change (two new required registration fields, migration, tests). Tasks 2–9 build `mobile` from an empty directory: project scaffold and custom Tamagui theme, generated OpenAPI client, Zustand auth store with secure token storage and a 401 refresh interceptor, Expo Router auth gate, then the three screens with hardcoded Bahasa Indonesia copy. Each task produces something independently runnable/testable — no task leaves the tree in a broken state for the next task to silently repair.

**Tech Stack:** Go 1.26 / Fiber v3 / pgx / Goose (Task 1, existing stack). Expo SDK (TypeScript template) / Expo Router / Tamagui / TanStack Query / Zustand / `openapi-typescript` + `openapi-fetch` / `expo-secure-store` / Jest (`jest-expo` preset) + React Native Testing Library (Tasks 2–9). No i18n library — per the 2026-08-03 spec revision, all screen copy is hardcoded Bahasa Indonesia string literals; `react-i18next`/`expo-localization` are deferred until a second locale is actually scheduled.

## Global Constraints

- Design source of truth: `docs/superpowers/specs/2026-08-02-mobile-scaffold-auth-design.md` — read it before starting; every color hex, font role, and copy string below is taken from it verbatim.
- `docs/PRD.md` AUTH-005: refresh tokens MUST live only in secure device storage, never `AsyncStorage`.
- `docs/PRD.md` AUTH-002: invalid-credential errors MUST NOT reveal whether the email exists — the mobile Login screen must show one generic message for both cases.
- Money is never displayed on these screens (no dashboard data yet) — `IBM Plex Mono` is wired as a font role but not used by any screen in this plan.
- All screen copy is Bahasa Indonesia, "kamu" register — no English strings in `app/` or `src/`.
- Backend hard rules from `api/CLAUDE.md` apply to Task 1: TDD, `int64` minor units n/a here, domain/application packages stay framework-free, tests at unit/handler/repository level, `task verify` / `task lint` / `govulncheck` before considering Task 1 done.
- Package manager for `mobile`: npm.

---

## Task 1: Backend — AUTH-001 terms/privacy consent fields

**Files:**
- Modify: `api/internal/domain/entities.go:22-36` (`User` struct)
- Create: `api/db/migrations/00002_users_registration_consent.sql`
- Modify: `api/internal/adapters/postgres/store.go:71-79` (`CreateUser`, `scanUser`)
- Modify: `api/internal/application/auth.go:31-33,47-72` (`RegisterInput`, `Register`)
- Modify: `api/internal/application/auth_test.go:24-33,46-50`
- Modify: `api/internal/adapters/httpapi/auth_handlers.go:11-34` (`registerRequest`, `register`)
- Modify: `api/internal/adapters/httpapi/server_test.go` (3 register call sites)
- Modify: `api/internal/adapters/httpapi/reporting_handlers_test.go:8-24` (`registerTestUser`)
- Modify: `api/openapi/openapi.yaml:566-572` (`RegisterRequest` schema)

**Interfaces:**
- Produces: `domain.User.AcceptedTermsVersion string`, `domain.User.AcceptedPrivacyVersion string` (immutable after creation — not touched by `UpdateUserProfile`, not part of `userResponse`/`User` OpenAPI schema).
- Produces: `application.RegisterInput` gains `AcceptedTermsVersion string`, `AcceptedPrivacyVersion string` — both required, validated non-empty, max 32 characters (a version tag like `"2026-08-02"` or `"v1"`, not free text).
- Consumed by: the mobile Register screen (Task 9) will send `accepted_terms_version`/`accepted_privacy_version` as fixed string constants in the request body.

- [ ] **Step 1: Write the failing application test**

Add two new fixtures and update the two existing ones in
`api/internal/application/auth_test.go`. Replace the body of
`TestRegisterCreatesUserAndTokens` and `TestRefreshRotatesSessionAndRejectsReuse`'s
register call, and add a new test:

```go
func TestRegisterCreatesUserAndTokens(t *testing.T) {
	svc, users, _, _, _ := authFixture()
	pair, err := svc.Register(context.Background(), application.RegisterInput{
		Email: "Rian@example.com", Password: "strong-password", DisplayName: "Rian",
		AcceptedTermsVersion: "2026-08-02", AcceptedPrivacyVersion: "2026-08-02",
	})
	if err != nil {
		t.Fatal(err)
	}
	if pair.AccessToken == "" || pair.RefreshToken == "" {
		t.Fatal("expected token pair")
	}
	if len(users.ByID) != 1 {
		t.Fatalf("expected one user, got %d", len(users.ByID))
	}
	stored := users.ByID[pair.User.ID]
	if stored.AcceptedTermsVersion != "2026-08-02" || stored.AcceptedPrivacyVersion != "2026-08-02" {
		t.Fatalf("expected consent versions to be persisted, got %+v", stored)
	}
}

func TestRegisterRejectsMissingConsent(t *testing.T) {
	svc, _, _, _, _ := authFixture()
	_, err := svc.Register(context.Background(), application.RegisterInput{
		Email: "missing-consent@example.com", Password: "strong-password", DisplayName: "No Consent",
	})
	var validation domain.ValidationError
	if !errors.As(err, &validation) {
		t.Fatalf("expected validation error, got %v", err)
	}
}
```

In `TestRefreshRotatesSessionAndRejectsReuse`, update the existing
`svc.Register(...)` call to also pass
`AcceptedTermsVersion: "2026-08-02", AcceptedPrivacyVersion: "2026-08-02"`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd api && go test ./internal/application/... -run 'TestRegister'`
Expected: `TestRegisterCreatesUserAndTokens` and `TestRefreshRotatesSessionAndRejectsReuse`
FAIL (validation error, since `RegisterInput` doesn't have the new fields
yet — this won't even compile). `TestRegisterRejectsMissingConsent` doesn't
exist to fail meaningfully until compilation succeeds; that's expected —
move to Step 3 immediately.

- [ ] **Step 3: Add the domain fields**

In `api/internal/domain/entities.go`, add two fields to `User`
(after `AIConsent`, before `CreatedAt`):

```go
type User struct {
	ID            string
	Email         string
	DisplayName   string
	PasswordHash  string
	Status        UserStatus
	Role          UserRole
	Currency      string
	Timezone      string
	Payday        int
	MinimumBuffer Money
	AIConsent     bool

	AcceptedTermsVersion   string
	AcceptedPrivacyVersion string

	CreatedAt time.Time
	UpdatedAt time.Time
}
```

- [ ] **Step 4: Write the migration**

Create `api/db/migrations/00002_users_registration_consent.sql`:

```sql
-- +goose Up
ALTER TABLE users
    ADD COLUMN accepted_terms_version text NOT NULL DEFAULT '',
    ADD COLUMN accepted_privacy_version text NOT NULL DEFAULT '';
ALTER TABLE users ALTER COLUMN accepted_terms_version DROP DEFAULT;
ALTER TABLE users ALTER COLUMN accepted_privacy_version DROP DEFAULT;

-- +goose Down
ALTER TABLE users
    DROP COLUMN accepted_terms_version,
    DROP COLUMN accepted_privacy_version;
```

(The `DEFAULT ''` is added only to satisfy `NOT NULL` for the `ALTER
TABLE ADD COLUMN` against a table that already exists in dev databases,
then dropped immediately — new rows must supply a real value going
forward since application-layer validation requires it.)

- [ ] **Step 5: Update the Postgres store**

In `api/internal/adapters/postgres/store.go`, update `CreateUser`
and `scanUser`:

```go
func (s *Store) CreateUser(ctx context.Context, u domain.User) (domain.User, error) {
	_, err := s.db(ctx).Exec(ctx, `INSERT INTO users(id,email,display_name,password_hash,status,role,currency,timezone,payday,minimum_buffer,ai_consent,accepted_terms_version,accepted_privacy_version,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, u.ID, u.Email, u.DisplayName, u.PasswordHash, u.Status, u.Role, u.Currency, u.Timezone, u.Payday, u.MinimumBuffer, u.AIConsent, u.AcceptedTermsVersion, u.AcceptedPrivacyVersion, u.CreatedAt, u.UpdatedAt)
	return u, mapError(err)
}
func scanUser(row pgx.Row) (domain.User, error) {
	var u domain.User
	err := row.Scan(&u.ID, &u.Email, &u.DisplayName, &u.PasswordHash, &u.Status, &u.Role, &u.Currency, &u.Timezone, &u.Payday, &u.MinimumBuffer, &u.AIConsent, &u.AcceptedTermsVersion, &u.AcceptedPrivacyVersion, &u.CreatedAt, &u.UpdatedAt)
	return u, mapError(err)
}
```

Update the two `SELECT` statements in `GetUserByID` and `GetUserByEmail`
(same function, lines ~80-85) to include the two new columns in the same
position, immediately after `ai_consent`:

```go
func (s *Store) GetUserByID(ctx context.Context, id string) (domain.User, error) {
	return scanUser(s.db(ctx).QueryRow(ctx, `SELECT id,email,display_name,password_hash,status,role,currency,timezone,payday,minimum_buffer,ai_consent,accepted_terms_version,accepted_privacy_version,created_at,updated_at FROM users WHERE id=$1`, id))
}
func (s *Store) GetUserByEmail(ctx context.Context, email string) (domain.User, error) {
	return scanUser(s.db(ctx).QueryRow(ctx, `SELECT id,email,display_name,password_hash,status,role,currency,timezone,payday,minimum_buffer,ai_consent,accepted_terms_version,accepted_privacy_version,created_at,updated_at FROM users WHERE email=$1`, email))
}
```

`UpdateUserProfile` is unchanged — these fields are immutable after
registration.

- [ ] **Step 6: Update the application layer**

In `api/internal/application/auth.go`:

```go
type RegisterInput struct {
	Email, Password, DisplayName, UserAgent, IPAddress string
	AcceptedTermsVersion, AcceptedPrivacyVersion        string
}
```

```go
func (s *AuthService) Register(ctx context.Context, in RegisterInput) (TokenPair, error) {
	in.Email = domain.NormalizeEmail(in.Email)
	in.DisplayName = strings.TrimSpace(in.DisplayName)
	in.AcceptedTermsVersion = strings.TrimSpace(in.AcceptedTermsVersion)
	in.AcceptedPrivacyVersion = strings.TrimSpace(in.AcceptedPrivacyVersion)
	if in.Email == "" || len(in.Email) > 254 || !strings.Contains(in.Email, "@") || len(in.Password) < 12 || len(in.Password) > 128 || in.DisplayName == "" || len(in.DisplayName) > 100 {
		return TokenPair{}, domain.ValidationError{Fields: []domain.FieldError{{Field: "credentials", Message: "valid email, display name, and password of at least 12 characters are required"}}}
	}
	if in.AcceptedTermsVersion == "" || len(in.AcceptedTermsVersion) > 32 || in.AcceptedPrivacyVersion == "" || len(in.AcceptedPrivacyVersion) > 32 {
		return TokenPair{}, domain.ValidationError{Fields: []domain.FieldError{{Field: "consent", Message: "accepted terms and privacy policy versions are required"}}}
	}
	hash, err := s.hasher.Hash(in.Password)
	if err != nil {
		return TokenPair{}, fmt.Errorf("hash password: %w", err)
	}
	now := s.clock.Now()
	user := domain.User{ID: s.ids.New(), Email: in.Email, DisplayName: in.DisplayName, PasswordHash: hash, Status: domain.UserStatusActive, Role: domain.RoleUser, Currency: "IDR", Timezone: "Asia/Jakarta", Payday: 25, AcceptedTermsVersion: in.AcceptedTermsVersion, AcceptedPrivacyVersion: in.AcceptedPrivacyVersion, CreatedAt: now, UpdatedAt: now}
	var pair TokenPair
	err = s.uow.WithinTransaction(ctx, func(txctx context.Context) error {
		created, err := s.users.Create(txctx, user)
		if err != nil {
			return err
		}
		pair, err = s.newSession(txctx, created, in.UserAgent, in.IPAddress, now)
		if err != nil {
			return err
		}
		return s.audit(txctx, created.ID, "user.registered", "user", created.ID, now)
	})
	return pair, err
}
```

- [ ] **Step 7: Run the application tests to verify they pass**

Run: `cd api && go test ./internal/application/... -run 'TestRegister|TestRefresh' -v`
Expected: `TestRegisterCreatesUserAndTokens`, `TestRegisterRejectsMissingConsent`, `TestRefreshRotatesSessionAndRejectsReuse` all PASS.

- [ ] **Step 8: Update the HTTP layer**

In `api/internal/adapters/httpapi/auth_handlers.go`:

```go
type registerRequest struct {
	Email                  string `json:"email"`
	Password               string `json:"password"`
	DisplayName            string `json:"display_name"`
	AcceptedTermsVersion   string `json:"accepted_terms_version"`
	AcceptedPrivacyVersion string `json:"accepted_privacy_version"`
}
```

```go
func (s *Server) register(c fiber.Ctx) error {
	var req registerRequest
	if err := c.Bind().Body(&req); err != nil {
		return domain.ErrInvalidInput
	}
	pair, err := s.svc.Auth.Register(c, application.RegisterInput{
		Email: req.Email, Password: req.Password, DisplayName: req.DisplayName,
		AcceptedTermsVersion: req.AcceptedTermsVersion, AcceptedPrivacyVersion: req.AcceptedPrivacyVersion,
		UserAgent: c.Get("User-Agent"), IPAddress: c.IP(),
	})
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(mapTokenPair(pair))
}
```

- [ ] **Step 9: Fix the four existing HTTP-level tests that register a user**

These currently POST a body without the two new required fields, so they
will now get a 422 `VALIDATION_ERROR` instead of 201. Update each request
body:

In `api/internal/adapters/httpapi/server_test.go`, there are
three inline `/v1/auth/register` calls (in `TestRegisterAndCreateAccount`,
`TestTransactionAndReversalHTTPFlow`, `TestUpdateProfileHTTPFlow`). Add to
each of their `map[string]any{...}` request bodies:

```go
"accepted_terms_version":   "2026-08-02",
"accepted_privacy_version": "2026-08-02",
```

In `api/internal/adapters/httpapi/reporting_handlers_test.go`,
update the shared `registerTestUser` helper's body the same way:

```go
func registerTestUser(t *testing.T, server *Server, email string) string {
	t.Helper()
	resp, body := requestJSON(t, server.App(), http.MethodPost, "/v1/auth/register", "", map[string]any{
		"email":                     email,
		"password":                  "strong-password",
		"display_name":              "Reporting User",
		"accepted_terms_version":    "2026-08-02",
		"accepted_privacy_version":  "2026-08-02",
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("register status=%d body=%s", resp.StatusCode, body)
	}
	var tokens struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &tokens); err != nil {
		t.Fatal(err)
	}
	return tokens.AccessToken
}
```

- [ ] **Step 10: Update the OpenAPI spec**

In `api/openapi/openapi.yaml`:

```yaml
    RegisterRequest:
      type: object
      required: [email, password, display_name, accepted_terms_version, accepted_privacy_version]
      properties:
        email: { type: string, format: email }
        password: { type: string, minLength: 12, maxLength: 128 }
        display_name: { type: string, minLength: 1, maxLength: 100 }
        accepted_terms_version: { type: string, minLength: 1, maxLength: 32 }
        accepted_privacy_version: { type: string, minLength: 1, maxLength: 32 }
```

- [ ] **Step 11: Run the full backend verification suite**

Run, from the repo root:
```bash
task migrate:up
cd api && go test ./... && go test -race ./internal/...
cd "$OLDPWD" && task lint
cd api && govulncheck ./...
cd "$OLDPWD" && task test:integration
```
Expected: all PASS; `task lint` shows no *new* finding categories beyond
the documented pre-existing baseline (`docs/P0_GAP_ANALYSIS.md` /
`docs/PROGRESS.md`).

- [ ] **Step 12: Update PROGRESS.md**

Add a short new dated entry to `docs/PROGRESS.md` following the existing
format: requirement ID `AUTH-001` (consent fields), files changed
(list from this task), migration `00002_users_registration_consent.sql`,
commands run and results from Step 11.

- [ ] **Step 13: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add api docs/PROGRESS.md
git commit -m "feat(api): capture accepted terms/privacy versions at registration (AUTH-001)"
```

(If this repo is not yet a git repository, skip this step and note it in
the task's completion report instead — `git init` is a decision for the
user, not something to do unprompted.)

---

## Task 2: Mobile — Expo scaffold + custom Tamagui theme

**Files:**
- Create: `mobile/` (via `create-expo-app`)
- Create: `mobile/tamagui.config.ts`
- Create: `mobile/metro.config.js`
- Create: `mobile/src/theme/fonts.ts`
- Modify: `mobile/app/_layout.tsx`

**Interfaces:**
- Produces: default export `config` from `tamagui.config.ts` (type `AppConfig`), used by every later screen task via `TamaguiProvider`.
- Produces: `useAppFontsLoaded(): boolean` from `src/theme/fonts.ts`, used by the root layout to gate rendering until Fraunces/Plex fonts are loaded.
- Produces: `PocketCard` is **not** built in this task — it's Task 7 (Login screen), since it's first needed there and reused by Register/Home.

- [ ] **Step 1: Scaffold the Expo project**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan/services"
npx create-expo-app@latest mobile --template blank-typescript
cd mobile
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

Edit `mobile/package.json` `"main"` field to `"expo-router/entry"`
and add to `"scripts"`: `"generate:api": "openapi-typescript ../api/openapi/openapi.yaml -o src/api/generated/types.ts"`.
Edit `mobile/app.json`: set `"scheme": "sakuplan"` and add
`"plugins": ["expo-router"]`.

Delete the template's `App.tsx` (Expo Router replaces it with `app/_layout.tsx` + route files).

- [ ] **Step 2: Install Tamagui and fonts**

```bash
npm install tamagui @tamagui/config @tamagui/animations-react-native
npx expo install expo-font @expo-google-fonts/fraunces @expo-google-fonts/ibm-plex-sans @expo-google-fonts/ibm-plex-mono
```

- [ ] **Step 3: Write the Tamagui config**

Create `mobile/tamagui.config.ts`:

```ts
import { createAnimations } from '@tamagui/animations-react-native'
import { createFont, createTamagui, createTokens } from 'tamagui'

const color = {
  kertas: '#F5F6F3',
  tinta: '#1E2A22',
  terjaga: '#0E6B58',
  leluasa: '#C9A227',
  kulit: '#7C6A5B',
  peringatan: '#B23B33',
  white: '#FFFFFF',
}

const tokens = createTokens({
  color,
  space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, true: 16 },
  size: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64, true: 16 },
  radius: { 0: 0, 1: 4, 2: 8, 3: 12, true: 8 },
  zIndex: { 0: 0, 1: 100, 2: 200, true: 0 },
})

const headingFont = createFont({
  family: 'Fraunces_600SemiBold',
  size: { 1: 14, 2: 16, 3: 20, 4: 24, 5: 32, 6: 40, true: 20 },
  weight: { 1: '400', 2: '600', true: '600' },
  lineHeight: { 1: 18, 2: 22, 3: 26, 4: 30, 5: 40, 6: 48, true: 26 },
})

const bodyFont = createFont({
  family: 'IBMPlexSans_400Regular',
  size: { 1: 12, 2: 14, 3: 16, 4: 18, true: 16 },
  weight: { 1: '400', 2: '500', true: '400' },
  lineHeight: { 1: 16, 2: 20, 3: 24, 4: 26, true: 24 },
})

const monoFont = createFont({
  family: 'IBMPlexMono_500Medium',
  size: { 1: 14, 2: 16, 3: 20, 4: 28, true: 16 },
  weight: { 1: '500', true: '500' },
  lineHeight: { 1: 18, 2: 22, 3: 26, 4: 34, true: 22 },
})

const lightTheme = {
  background: tokens.color.kertas,
  color: tokens.color.tinta,
  primary: tokens.color.terjaga,
  primaryText: tokens.color.white,
  accent: tokens.color.leluasa,
  borderColor: tokens.color.kulit,
  danger: tokens.color.peringatan,
}

export const config = createTamagui({
  animations: createAnimations({
    fast: { type: 'timing', duration: 120 },
    medium: { type: 'timing', duration: 200 },
  }),
  defaultFont: 'body',
  fonts: { heading: headingFont, body: bodyFont, mono: monoFont },
  tokens,
  themes: { light: lightTheme },
})

export type AppConfig = typeof config

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
```

- [ ] **Step 4: Write the font-loading hook**

Create `mobile/src/theme/fonts.ts`:

```ts
import {
  useFonts as useFraunces,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces'
import {
  useFonts as usePlexSans,
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans'
import {
  useFonts as usePlexMono,
  IBMPlexMono_500Medium,
} from '@expo-google-fonts/ibm-plex-mono'

export function useAppFontsLoaded(): boolean {
  const [frauncesLoaded] = useFraunces({ Fraunces_600SemiBold })
  const [plexSansLoaded] = usePlexSans({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
  })
  const [plexMonoLoaded] = usePlexMono({ IBMPlexMono_500Medium })
  return frauncesLoaded && plexSansLoaded && plexMonoLoaded
}
```

- [ ] **Step 5: Configure Metro for Tamagui**

Create `mobile/metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config')
const { withTamagui } = require('@tamagui/metro-plugin')

const config = getDefaultConfig(__dirname)

module.exports = withTamagui(config, {
  components: ['tamagui'],
  config: './tamagui.config.ts',
  outputCSS: './tamagui-web.css',
})
```

Install the plugin: `npm install @tamagui/metro-plugin`.

- [ ] **Step 6: Wire the root layout**

Create `mobile/app/_layout.tsx`:

```tsx
import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { TamaguiProvider, Theme, YStack, Spinner } from 'tamagui'
import config from '../tamagui.config'
import { useAppFontsLoaded } from '../src/theme/fonts'

export default function RootLayout() {
  const fontsLoaded = useAppFontsLoaded()

  if (!fontsLoaded) {
    return (
      <TamaguiProvider config={config}>
        <Theme name="light">
          <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
            <Spinner size="large" color="$primary" />
          </YStack>
        </Theme>
      </TamaguiProvider>
    )
  }

  return (
    <TamaguiProvider config={config}>
      <Theme name="light">
        <StatusBar style="dark" />
        <Slot />
      </Theme>
    </TamaguiProvider>
  )
}
```

- [ ] **Step 7: Verify the app boots**

Run: `cd mobile && npx expo start --ios` (or `--android`; either
simulator/emulator is acceptable — this is a visual boot check, not an
automated test).
Expected: a blank `$kertas`-colored screen with a centered `$primary`
(teal) spinner while fonts load, then an empty screen (no route content
yet — `Slot` has nothing to render until Task 6 adds route groups). No
red-box errors.

- [ ] **Step 8: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile
git commit -m "feat(mobile): scaffold Expo app with custom Tamagui theme"
```

---

## Task 3: Mobile — Generated OpenAPI client

**Files:**
- Create: `mobile/src/api/generated/types.ts` (generated, not hand-edited)
- Create: `mobile/src/api/client.ts`
- Create: `mobile/.env.example`
- Modify: `mobile/package.json` (already added the `generate:api` script in Task 2, Step 1)

**Interfaces:**
- Consumes: `api/openapi/openapi.yaml` (must be run from a checkout where `api` exists as a sibling).
- Produces: `export const api` from `src/api/client.ts` — an `openapi-fetch` `Client<paths>` instance, pre-configured with `baseUrl` and ready for `.GET(...)`/`.POST(...)` calls using the generated path/schema types. Used by Task 4 (auth store's underlying calls happen through this), Tasks 7, 8, 9 (screens).
- Produces: `export type paths` and `export type components` re-exported from `src/api/generated/types.ts` for other tasks that need response/request types (e.g. `components['schemas']['User']`).

- [ ] **Step 1: Install the client tooling**

```bash
cd mobile
npm install openapi-fetch
npm install -D openapi-typescript
```

- [ ] **Step 2: Generate the types**

```bash
npm run generate:api
```

Expected: `src/api/generated/types.ts` is created, containing a `paths`
interface with keys like `"/v1/auth/register"`, `"/v1/dashboard"`, etc.,
and a `components` interface with `schemas.User`, `schemas.ErrorEnvelope`,
etc. — mirroring `api/openapi/openapi.yaml` exactly.

- [ ] **Step 3: Write the base client**

Create `mobile/.env.example`:

```
EXPO_PUBLIC_API_URL=http://localhost:8080
```

Create `mobile/src/api/client.ts`:

```ts
import createClient from 'openapi-fetch'
import type { paths } from './generated/types'

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'

export const api = createClient<paths>({ baseUrl })

export type { paths, components } from './generated/types'
```

(The auth-header injection and 401 refresh-and-retry middleware are added
in Task 5, once the auth store and secure token storage it depends on
exist — this task only produces the bare typed client.)

- [ ] **Step 4: Verify it compiles and resolves a real path**

Create a throwaway `mobile/src/api/client.smoke.ts` (delete after
verifying — this is a manual typecheck, not a committed test):

```ts
import { api } from './client'

async function smoke() {
  const { data, error } = await api.GET('/v1/planning/safe-to-spend')
  void data
  void error
}
void smoke
```

Run: `cd mobile && npx tsc --noEmit`
Expected: no type errors. Delete `client.smoke.ts`.

- [ ] **Step 5: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/api mobile/.env.example mobile/package.json mobile/package-lock.json
git commit -m "feat(mobile): generate typed OpenAPI client from api spec"
```

---

## Task 4: Mobile — Secure token storage + Zustand auth store

**Files:**
- Create: `mobile/src/auth/secureTokens.ts`
- Create: `mobile/src/auth/store.ts`
- Create: `mobile/src/auth/store.test.ts`
- Create: `mobile/jest.config.js`
- Modify: `mobile/package.json` (`"test"` script)

**Interfaces:**
- Produces: `saveRefreshToken(token: string): Promise<void>`, `getRefreshToken(): Promise<string | null>`, `clearRefreshToken(): Promise<void>` from `src/auth/secureTokens.ts`. Consumed by Task 5 (refresh interceptor) and Tasks 7–9 (screens, on login/register/logout).
- Produces: `useAuthStore` (Zustand hook) from `src/auth/store.ts`, with shape:
  ```ts
  interface AuthState {
    accessToken: string | null
    user: components['schemas']['User'] | null
    isHydrating: boolean
    setSession: (accessToken: string, user: components['schemas']['User']) => void
    clearSession: () => void
    setHydrating: (value: boolean) => void
  }
  ```
  `isAuthenticated` is *not* a stored field — it's derived (`accessToken !== null`) by consumers, to avoid two fields going out of sync. Consumed by Task 5 (interceptor calls `setSession`/`clearSession`), Task 6 (route redirect reads `accessToken`/`isHydrating`), Tasks 7–9 (screens call `setSession` on login/register success, `clearSession` on logout).

- [ ] **Step 1: Install dependencies**

```bash
cd mobile
npx expo install expo-secure-store zustand
npm install -D jest jest-expo @testing-library/react-native @types/jest
```

Add to `mobile/package.json` `"scripts"`: `"test": "jest"`.

- [ ] **Step 2: Configure Jest**

Create `mobile/jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
}
```

- [ ] **Step 3: Write the failing store test**

Create `mobile/src/auth/store.test.ts`:

```ts
import { useAuthStore } from './store'

const testUser = {
  id: 'u1',
  email: 'user@example.com',
  display_name: 'Test User',
  status: 'active' as const,
  role: 'user' as const,
  currency: 'IDR',
  timezone: 'Asia/Jakarta',
  payday: 25,
  minimum_buffer: 0,
  ai_consent: false,
}

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, isHydrating: true })
  })

  it('starts unauthenticated and hydrating', () => {
    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isHydrating).toBe(true)
  })

  it('setSession stores the access token and user', () => {
    useAuthStore.getState().setSession('token-123', testUser)
    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('token-123')
    expect(state.user).toEqual(testUser)
  })

  it('clearSession resets to unauthenticated', () => {
    useAuthStore.getState().setSession('token-123', testUser)
    useAuthStore.getState().clearSession()
    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.user).toBeNull()
  })

  it('setHydrating toggles the hydration flag', () => {
    useAuthStore.getState().setHydrating(false)
    expect(useAuthStore.getState().isHydrating).toBe(false)
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd mobile && npm test -- store.test.ts`
Expected: FAIL — `./store` module not found.

- [ ] **Step 5: Write the secure token storage wrapper**

Create `mobile/src/auth/secureTokens.ts`:

```ts
import * as SecureStore from 'expo-secure-store'

const REFRESH_TOKEN_KEY = 'sakuplan.refreshToken'

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token)
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
}

export async function clearRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
}
```

- [ ] **Step 6: Write the store**

Create `mobile/src/auth/store.ts`:

```ts
import { create } from 'zustand'
import type { components } from '../api/client'

type User = components['schemas']['User']

interface AuthState {
  accessToken: string | null
  user: User | null
  isHydrating: boolean
  setSession: (accessToken: string, user: User) => void
  clearSession: () => void
  setHydrating: (value: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isHydrating: true,
  setSession: (accessToken, user) => set({ accessToken, user }),
  clearSession: () => set({ accessToken: null, user: null }),
  setHydrating: (value) => set({ isHydrating: value }),
}))
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd mobile && npm test -- store.test.ts`
Expected: all 4 tests PASS.

- [ ] **Step 8: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/auth mobile/jest.config.js mobile/package.json mobile/package-lock.json
git commit -m "feat(mobile): add Zustand auth store and secure refresh-token storage"
```

---

## Task 5: Mobile — 401 refresh interceptor

**Files:**
- Modify: `mobile/src/api/client.ts`
- Create: `mobile/src/api/refreshInterceptor.ts`
- Create: `mobile/src/api/refreshInterceptor.test.ts`

**Interfaces:**
- Consumes: `useAuthStore` (`getState`/`setState` directly, not the hook — this runs outside React) from Task 4, `getRefreshToken`/`saveRefreshToken`/`clearRefreshToken` from Task 4.
- Produces: `installAuthMiddleware(client: Client<paths>): void`, called once from `src/api/client.ts` on the exported `api` instance. Not consumed elsewhere directly, but its *effect* (auto-attached `Authorization` header, transparent refresh-and-retry, forced `clearSession()` on unrecoverable 401) is relied on by every screen task that calls `api.GET`/`api.POST` on authenticated endpoints (Task 9's `/v1/me` call).

- [ ] **Step 1: Write the failing interceptor test**

Create `mobile/src/api/refreshInterceptor.test.ts`. This tests
the pure retry-decision logic in isolation (`shouldAttemptRefresh`,
extracted so it's testable without mocking `fetch`/`openapi-fetch`'s
middleware plumbing):

```ts
import { shouldAttemptRefresh } from './refreshInterceptor'

describe('shouldAttemptRefresh', () => {
  it('returns true for a 401 response that has not already been retried', () => {
    const response = new Response(null, { status: 401 })
    expect(shouldAttemptRefresh(response, false)).toBe(true)
  })

  it('returns false for a 401 response that has already been retried once', () => {
    const response = new Response(null, { status: 401 })
    expect(shouldAttemptRefresh(response, true)).toBe(false)
  })

  it('returns false for a non-401 response', () => {
    const response = new Response(null, { status: 500 })
    expect(shouldAttemptRefresh(response, false)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd mobile && npm test -- refreshInterceptor.test.ts`
Expected: FAIL — `./refreshInterceptor` module not found.

- [ ] **Step 3: Write the interceptor**

Create `mobile/src/api/refreshInterceptor.ts`:

```ts
import type { Client, Middleware } from 'openapi-fetch'
import { useAuthStore } from '../auth/store'
import { clearRefreshToken, getRefreshToken, saveRefreshToken } from '../auth/secureTokens'
import type { paths } from './generated/types'

export function shouldAttemptRefresh(response: Response, alreadyRetried: boolean): boolean {
  return response.status === 401 && !alreadyRetried
}

async function refreshSession(baseUrl: string): Promise<string | null> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null

  const res = await fetch(`${baseUrl}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) return null

  const body = (await res.json()) as {
    access_token: string
    refresh_token: string
    user: import('./generated/types').components['schemas']['User']
  }
  await saveRefreshToken(body.refresh_token)
  useAuthStore.getState().setSession(body.access_token, body.user)
  return body.access_token
}

export function installAuthMiddleware(client: Client<paths>, baseUrl: string): void {
  const middleware: Middleware = {
    async onRequest({ request }) {
      const token = useAuthStore.getState().accessToken
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`)
      }
      return request
    },
    async onResponse({ request, response }) {
      const alreadyRetried = request.headers.has('X-Retry-After-Refresh')
      if (!shouldAttemptRefresh(response, alreadyRetried)) {
        return response
      }
      const newAccessToken = await refreshSession(baseUrl)
      if (!newAccessToken) {
        await clearRefreshToken()
        useAuthStore.getState().clearSession()
        return response
      }
      const retryRequest = new Request(request, {
        headers: new Headers(request.headers),
      })
      retryRequest.headers.set('Authorization', `Bearer ${newAccessToken}`)
      retryRequest.headers.set('X-Retry-After-Refresh', '1')
      return fetch(retryRequest)
    },
  }
  client.use(middleware)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd mobile && npm test -- refreshInterceptor.test.ts`
Expected: all 3 tests PASS.

- [ ] **Step 5: Wire the middleware into the exported client**

Update `mobile/src/api/client.ts`:

```ts
import createClient from 'openapi-fetch'
import type { paths } from './generated/types'
import { installAuthMiddleware } from './refreshInterceptor'

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'

export const api = createClient<paths>({ baseUrl })
installAuthMiddleware(api, baseUrl)

export type { paths, components } from './generated/types'
```

- [ ] **Step 6: Run the full test suite to confirm nothing broke**

Run: `cd mobile && npm test`
Expected: all tests (Task 4's + Task 5's) PASS.

- [ ] **Step 7: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/src/api
git commit -m "feat(mobile): add 401 refresh-and-retry auth middleware"
```

---

## Task 6: Mobile — Expo Router auth gate

**Files:**
- Create: `mobile/app/(auth)/_layout.tsx`
- Create: `mobile/app/(app)/_layout.tsx`
- Modify: `mobile/app/_layout.tsx` (cold-start session hydration)
- Create: `mobile/src/auth/useHydrateSession.ts`

**Interfaces:**
- Consumes: `useAuthStore`, `getRefreshToken` (Task 4), `api` (Task 3/5, for the `/v1/auth/refresh` call to turn a stored refresh token into a fresh access token on cold start).
- Produces: `useHydrateSession(): void` from `src/auth/useHydrateSession.ts`, called once in the root layout — on mount, reads the refresh token from secure storage, exchanges it for a session via `POST /v1/auth/refresh` if present, then calls `setHydrating(false)` regardless of outcome.
- Produces: the `(auth)` and `(app)` route groups' layouts, which Tasks 7–9 place their screen files into (`app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/(app)/home.tsx` — those files are created by Tasks 7–9, not this one).

- [ ] **Step 1: Write the session-hydration hook**

Create `mobile/src/auth/useHydrateSession.ts`:

```ts
import { useEffect } from 'react'
import { api } from '../api/client'
import { clearRefreshToken, getRefreshToken, saveRefreshToken } from './secureTokens'
import { useAuthStore } from './store'

export function useHydrateSession(): void {
  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      const refreshToken = await getRefreshToken()
      if (!refreshToken) {
        useAuthStore.getState().setHydrating(false)
        return
      }
      const { data, error } = await api.POST('/v1/auth/refresh', {
        body: { refresh_token: refreshToken },
      })
      if (cancelled) return
      if (error || !data) {
        await clearRefreshToken()
        useAuthStore.getState().setHydrating(false)
        return
      }
      await saveRefreshToken(data.refresh_token)
      useAuthStore.getState().setSession(data.access_token, data.user)
      useAuthStore.getState().setHydrating(false)
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])
}
```

- [ ] **Step 2: Write the `(auth)` group layout — redirects away if already authenticated**

Create `mobile/app/(auth)/_layout.tsx`:

```tsx
import { Redirect, Slot } from 'expo-router'
import { useAuthStore } from '../../src/auth/store'

export default function AuthGroupLayout() {
  const accessToken = useAuthStore((state) => state.accessToken)
  if (accessToken) {
    return <Redirect href="/(app)/home" />
  }
  return <Slot />
}
```

- [ ] **Step 3: Write the `(app)` group layout — redirects to login if not authenticated**

Create `mobile/app/(app)/_layout.tsx`:

```tsx
import { Redirect, Slot } from 'expo-router'
import { useAuthStore } from '../../src/auth/store'

export default function AppGroupLayout() {
  const accessToken = useAuthStore((state) => state.accessToken)
  if (!accessToken) {
    return <Redirect href="/(auth)/login" />
  }
  return <Slot />
}
```

- [ ] **Step 4: Wire hydration and the initial redirect**

Expo Router needs an actual route file to redirect *from* on cold start,
so hydration and the initial redirect decision live in `app/index.tsx`,
not in `_layout.tsx` — `_layout.tsx` stays a pure provider shell.

Create `mobile/app/index.tsx`:

```tsx
import { Redirect } from 'expo-router'
import { Spinner, YStack } from 'tamagui'
import { useAuthStore } from '../src/auth/store'
import { useHydrateSession } from '../src/auth/useHydrateSession'

export default function Index() {
  useHydrateSession()
  const isHydrating = useAuthStore((state) => state.isHydrating)
  const accessToken = useAuthStore((state) => state.accessToken)

  if (isHydrating) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    )
  }
  return <Redirect href={accessToken ? '/(app)/home' : '/(auth)/login'} />
}
```

`mobile/app/_layout.tsx` needs no change in this task — it stays
the same provider shell Task 2 wrote, with no auth/hydration logic in it.
For reference, that file remains:

```tsx
import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Spinner, TamaguiProvider, Theme, YStack } from 'tamagui'
import config from '../tamagui.config'
import { useAppFontsLoaded } from '../src/theme/fonts'

export default function RootLayout() {
  const fontsLoaded = useAppFontsLoaded()

  return (
    <TamaguiProvider config={config}>
      <Theme name="light">
        <StatusBar style="dark" />
        {!fontsLoaded ? (
          <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
            <Spinner size="large" color="$primary" />
          </YStack>
        ) : (
          <Slot />
        )}
      </Theme>
    </TamaguiProvider>
  )
}
```

- [ ] **Step 5: Verify the redirect chain manually**

Run: `cd mobile && npx expo start`, open in a simulator.
Expected: app boots, briefly shows the spinner, then — since no route
files exist yet at `(auth)/login` or `(app)/home` (Tasks 7/9 add them) —
Expo Router will show its "Unmatched Route" screen. That's the correct,
expected state for this task: the redirect logic ran and pointed at
`/(auth)/login`, which doesn't exist *yet*. Confirm via the Expo dev
tools/console that no error was thrown other than the expected route-not-
found.

- [ ] **Step 6: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/app mobile/src/auth/useHydrateSession.ts
git commit -m "feat(mobile): add Expo Router auth gate and cold-start session hydration"
```

---

## Task 7: Mobile — `PocketCard` component + Login screen

**Files:**
- Create: `mobile/src/components/PocketCard.tsx`
- Create: `mobile/app/(auth)/login.tsx`
- Create: `mobile/src/auth/useLogin.ts`

**Interfaces:**
- Produces: `PocketCard` (React component, `YStack`-based, accepts standard Tamagui stack props via `...props` plus `children`) from `src/components/PocketCard.tsx`. Reused by Task 8 (Register) and Task 9 (Home) — those tasks import it, they do not redefine it.
- Produces: `useLogin()` from `src/auth/useLogin.ts` — a thin wrapper around `useMutation` calling `api.POST('/v1/auth/login', ...)`, returning `{ mutate, isPending, error }` (TanStack Query's `useMutation` return shape) and, on success, persisting the refresh token + calling `setSession`. Task 8's `useRegister` follows the identical pattern.
- Consumes: `api` (Task 3/5), `useAuthStore` (Task 4), `saveRefreshToken` (Task 4). All screen copy is a hardcoded Bahasa Indonesia string literal — no translation function.

- [ ] **Step 1: Install TanStack Query**

```bash
cd mobile
npm install @tanstack/react-query
```

Wrap the app in a `QueryClientProvider`. Update
`mobile/app/_layout.tsx` — add near the top:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()
```

and wrap the returned tree's `<Theme name="light">` contents with
`<QueryClientProvider client={queryClient}>...</QueryClientProvider>`
(innermost, inside `Theme`, so query hooks used by screens have access to
both the Tamagui theme and the query client).

- [ ] **Step 2: Write `PocketCard`**

Create `mobile/src/components/PocketCard.tsx`:

```tsx
import { styled, YStack } from 'tamagui'

export const PocketCard = styled(YStack, {
  name: 'PocketCard',
  backgroundColor: '$background',
  borderTopWidth: 1,
  borderTopColor: '$borderColor',
  borderStyle: 'dashed',
  borderRadius: '$3',
  padding: '$5',
  gap: '$4',
  width: '100%',
  maxWidth: 440,
  alignSelf: 'center',
})
```

- [ ] **Step 3: Write `useLogin`**

Create `mobile/src/auth/useLogin.ts`:

```ts
import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { saveRefreshToken } from './secureTokens'
import { useAuthStore } from './store'

interface LoginInput {
  email: string
  password: string
}

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data, error } = await api.POST('/v1/auth/login', { body: input })
      if (error || !data) {
        throw new Error('invalid_credentials')
      }
      return data
    },
    onSuccess: async (data) => {
      await saveRefreshToken(data.refresh_token)
      useAuthStore.getState().setSession(data.access_token, data.user)
    },
  })
}
```

- [ ] **Step 4: Write the Login screen**

Create `mobile/app/(auth)/login.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'expo-router'
import { Button, Input, Label, Text, XStack, YStack } from 'tamagui'
import { PocketCard } from '../../src/components/PocketCard'
import { useLogin } from '../../src/auth/useLogin'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()

  const canSubmit = email.trim().length > 0 && password.length > 0 && !login.isPending

  return (
    <YStack flex={1} backgroundColor="$background" padding="$5" justifyContent="center" gap="$6">
      <Text fontFamily="$heading" fontSize="$5" textAlign="center" color="$color">
        SakuPlan
      </Text>

      <PocketCard>
        <Text fontFamily="$heading" fontSize="$4" color="$color">
          Masuk ke SakuPlan
        </Text>
        <Text fontFamily="$body" fontSize="$2" color="$kulit">
          Kelola pengeluaran dan lihat berapa yang aman kamu belanjakan hari ini.
        </Text>

        {login.isError ? (
          <YStack backgroundColor="$peringatan" borderRadius="$2" padding="$3">
            <Text fontFamily="$body" color="$white" fontSize="$2">
              Email atau kata sandi salah.
            </Text>
          </YStack>
        ) : null}

        <YStack gap="$2">
          <Label htmlFor="login-email" fontFamily="$body" fontSize="$2" color="$kulit">
            Email
          </Label>
          <Input
            id="login-email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        </YStack>

        <YStack gap="$2">
          <Label htmlFor="login-password" fontFamily="$body" fontSize="$2" color="$kulit">
            Kata sandi
          </Label>
          <Input
            id="login-password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
          />
        </YStack>

        <Button
          backgroundColor="$primary"
          color="$primaryText"
          disabled={!canSubmit}
          opacity={canSubmit ? 1 : 0.5}
          onPress={() => login.mutate({ email, password })}
        >
          {login.isPending ? 'Memuat...' : 'Masuk'}
        </Button>

        <XStack justifyContent="center" gap="$2">
          <Text fontFamily="$body" fontSize="$2" color="$kulit">
            Belum punya akun?
          </Text>
          <Link href="/(auth)/register">
            <Text fontFamily="$body" fontSize="$2" color="$primary" textDecorationLine="underline">
              Buat akun
            </Text>
          </Link>
        </XStack>
      </PocketCard>
    </YStack>
  )
}
```

- [ ] **Step 5: Verify manually against the running backend**

With `api` running (`task run`) and its migrations applied
(Task 1's `00002_...` included), run `cd mobile && npx expo
start`. Expected: the app now redirects to `/(auth)/login` and renders
the screen above with the `$kertas` background, Fraunces title, teal
button. Submit with a non-existent email/wrong password: an inline
`$peringatan` error banner appears reading "Email atau kata sandi salah."
Leave fields empty: button is disabled (50% opacity).

- [ ] **Step 6: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/app/(auth)/login.tsx mobile/src/components mobile/src/auth/useLogin.ts mobile/app/_layout.tsx mobile/package.json mobile/package-lock.json
git commit -m "feat(mobile): add PocketCard component and Login screen"
```

---

## Task 8: Mobile — Register screen

**Files:**
- Create: `mobile/app/(auth)/register.tsx`
- Create: `mobile/src/auth/useRegister.ts`
- Create: `mobile/src/auth/consentVersions.ts`

**Interfaces:**
- Consumes: `PocketCard` (Task 7), `api`/`useAuthStore`/`saveRefreshToken` (Tasks 3/4/5). All screen copy is a hardcoded Bahasa Indonesia string literal, matching Login's exact wording style — no translation function.
- Produces: `useRegister()` — same shape/pattern as `useLogin` (Task 7), calling `POST /v1/auth/register` with the two consent-version fields from `consentVersions.ts`.
- Produces: `CURRENT_TERMS_VERSION`, `CURRENT_PRIVACY_VERSION` string constants from `src/auth/consentVersions.ts` — the single source of truth for the version strings sent at registration, so a future terms/privacy update only requires bumping these two constants.

- [ ] **Step 1: Write the consent version constants**

Create `mobile/src/auth/consentVersions.ts`:

```ts
export const CURRENT_TERMS_VERSION = '2026-08-02'
export const CURRENT_PRIVACY_VERSION = '2026-08-02'
```

(Matches the version strings used in Task 1's backend tests — both sides
of the contract agree on the same value for this pass. There's no
in-app terms/privacy document yet in this pass; the checkbox links are
non-functional placeholders that navigate nowhere, called out explicitly
in the screen's implementation below rather than silently omitted.)

- [ ] **Step 2: Write `useRegister`**

Create `mobile/src/auth/useRegister.ts`:

```ts
import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { saveRefreshToken } from './secureTokens'
import { useAuthStore } from './store'
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from './consentVersions'

interface RegisterInput {
  email: string
  password: string
  displayName: string
}

export function useRegister() {
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data, error } = await api.POST('/v1/auth/register', {
        body: {
          email: input.email,
          password: input.password,
          display_name: input.displayName,
          accepted_terms_version: CURRENT_TERMS_VERSION,
          accepted_privacy_version: CURRENT_PRIVACY_VERSION,
        },
      })
      if (error || !data) {
        throw new Error('registration_failed')
      }
      return data
    },
    onSuccess: async (data) => {
      await saveRefreshToken(data.refresh_token)
      useAuthStore.getState().setSession(data.access_token, data.user)
    },
  })
}
```

- [ ] **Step 3: Write the Register screen**

Create `mobile/app/(auth)/register.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'expo-router'
import { Button, Checkbox, Input, Label, Text, XStack, YStack } from 'tamagui'
import { Check } from '@tamagui/lucide-icons'
import { PocketCard } from '../../src/components/PocketCard'
import { useRegister } from '../../src/auth/useRegister'

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consentAccepted, setConsentAccepted] = useState(false)
  const register = useRegister()

  const canSubmit =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 12 &&
    consentAccepted &&
    !register.isPending

  return (
    <YStack flex={1} backgroundColor="$background" padding="$5" justifyContent="center" gap="$6">
      <Text fontFamily="$heading" fontSize="$5" textAlign="center" color="$color">
        SakuPlan
      </Text>

      <PocketCard>
        <Text fontFamily="$heading" fontSize="$4" color="$color">
          Buat akun SakuPlan
        </Text>

        {register.isError ? (
          <YStack backgroundColor="$peringatan" borderRadius="$2" padding="$3">
            <Text fontFamily="$body" color="$white" fontSize="$2">
              Terjadi kesalahan. Coba lagi.
            </Text>
          </YStack>
        ) : null}

        <YStack gap="$2">
          <Label htmlFor="register-name" fontFamily="$body" fontSize="$2" color="$kulit">
            Nama tampilan
          </Label>
          <Input id="register-name" value={displayName} onChangeText={setDisplayName} />
        </YStack>

        <YStack gap="$2">
          <Label htmlFor="register-email" fontFamily="$body" fontSize="$2" color="$kulit">
            Email
          </Label>
          <Input
            id="register-email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        </YStack>

        <YStack gap="$2">
          <Label htmlFor="register-password" fontFamily="$body" fontSize="$2" color="$kulit">
            Kata sandi
          </Label>
          <Input
            id="register-password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
          />
          <Text fontFamily="$body" fontSize="$1" color="$kulit">
            Minimal 12 karakter
          </Text>
        </YStack>

        <XStack alignItems="center" gap="$3">
          <Checkbox
            id="register-consent"
            checked={consentAccepted}
            onCheckedChange={(value) => setConsentAccepted(value === true)}
            backgroundColor={consentAccepted ? '$primary' : undefined}
            borderColor="$kulit"
          >
            <Checkbox.Indicator>
              <Check color="$primaryText" />
            </Checkbox.Indicator>
          </Checkbox>
          <Text fontFamily="$body" fontSize="$1" color="$kulit" flexShrink={1}>
            Saya menyetujui{' '}
            <Text color="$primary" textDecorationLine="underline">
              Ketentuan Layanan
            </Text>{' '}
            dan{' '}
            <Text color="$primary" textDecorationLine="underline">
              Kebijakan Privasi
            </Text>
          </Text>
        </XStack>

        <Button
          backgroundColor="$primary"
          color="$primaryText"
          disabled={!canSubmit}
          opacity={canSubmit ? 1 : 0.5}
          onPress={() =>
            register.mutate({ email, password, displayName })
          }
        >
          {register.isPending ? 'Memuat...' : 'Buat Akun'}
        </Button>

        <XStack justifyContent="center" gap="$2">
          <Text fontFamily="$body" fontSize="$2" color="$kulit">
            Sudah punya akun?
          </Text>
          <Link href="/(auth)/login">
            <Text fontFamily="$body" fontSize="$2" color="$primary" textDecorationLine="underline">
              Masuk
            </Text>
          </Link>
        </XStack>
      </PocketCard>
    </YStack>
  )
}
```

Install the icon package used above: `npx expo install
@tamagui/lucide-icons`. The Terms/Privacy links are rendered as styled
inline text (not tappable `Link`s to a real document) since no in-app
terms/privacy content exists yet in this pass — that's an explicit,
visible gap rather than a silently broken tap target, and is noted in the
completion report for this task.

- [ ] **Step 4: Verify manually against the running backend**

With `api` running, run `npx expo start`, navigate to Register.
Confirm: submit button stays disabled until name, email, a ≥12-character
password, and the consent checkbox are all satisfied; successful
registration lands on the (still-unmatched-route) `/(app)/home` — expected
until Task 9 adds that screen. Confirm in the backend logs / via
`psql`/`task` tooling that the new user row has non-empty
`accepted_terms_version`/`accepted_privacy_version`.

- [ ] **Step 5: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/app/(auth)/register.tsx mobile/src/auth/useRegister.ts mobile/src/auth/consentVersions.ts mobile/package.json mobile/package-lock.json
git commit -m "feat(mobile): add Register screen with terms/privacy consent"
```

---

## Task 9: Mobile — Home screen + Logout

**Files:**
- Create: `mobile/app/(app)/home.tsx`
- Create: `mobile/src/auth/useCurrentUser.ts`
- Create: `mobile/src/auth/useLogout.ts`

**Interfaces:**
- Consumes: `PocketCard` (Task 7), `api` (Task 3/5), `useAuthStore` (Task 4), `clearRefreshToken`/`getRefreshToken` (Task 4). All screen copy is a hardcoded Bahasa Indonesia string literal — no translation function.
- Produces: `useCurrentUser()` — a `useQuery` wrapper around `GET /v1/me`, returning TanStack Query's standard `{ data, isLoading, error }`.
- Produces: `useLogout()` — a `useMutation` wrapper around `POST /v1/auth/logout`, which on success (or failure — logout must always clear local state even if the network call fails, since the goal is "the user is signed out on this device") clears the refresh token and calls `clearSession()`.

- [ ] **Step 1: Write `useCurrentUser`**

Create `mobile/src/auth/useCurrentUser.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/me')
      if (error || !data) {
        throw new Error('failed_to_load_profile')
      }
      return data
    },
  })
}
```

- [ ] **Step 2: Write `useLogout`**

Create `mobile/src/auth/useLogout.ts`:

```ts
import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { clearRefreshToken, getRefreshToken } from './secureTokens'
import { useAuthStore } from './store'

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const refreshToken = await getRefreshToken()
      if (refreshToken) {
        await api.POST('/v1/auth/logout', { body: { refresh_token: refreshToken } })
      }
    },
    onSettled: async () => {
      await clearRefreshToken()
      useAuthStore.getState().clearSession()
    },
  })
}
```

- [ ] **Step 3: Write the Home screen**

Create `mobile/app/(app)/home.tsx`:

```tsx
import { Button, Spinner, Text, YStack } from 'tamagui'
import { PocketCard } from '../../src/components/PocketCard'
import { useCurrentUser } from '../../src/auth/useCurrentUser'
import { useLogout } from '../../src/auth/useLogout'

export default function HomeScreen() {
  const { data: user, isLoading } = useCurrentUser()
  const logout = useLogout()

  return (
    <YStack flex={1} backgroundColor="$background" padding="$5" justifyContent="center" gap="$6">
      {isLoading || !user ? (
        <YStack alignItems="center">
          <Spinner size="large" color="$primary" />
        </YStack>
      ) : (
        <>
          <Text fontFamily="$heading" fontSize="$5" color="$color">
            {`Halo, ${user.display_name}`}
          </Text>

          <PocketCard>
            <Text fontFamily="$body" fontSize="$2" color="$kulit">
              Akun kamu sudah aktif.
            </Text>
            <Text fontFamily="$body" fontSize="$3" color="$color">
              {user.email}
            </Text>
            <Text fontFamily="$body" fontSize="$2" color="$kulit">
              Ringkasan keuanganmu akan muncul di sini.
            </Text>
          </PocketCard>

          <Button
            alignSelf="center"
            backgroundColor="transparent"
            color="$kulit"
            onPress={() => logout.mutate()}
          >
            Keluar
          </Button>
        </>
      )}
    </YStack>
  )
}
```

- [ ] **Step 4: Verify the full flow manually**

With `api` running, run `npx expo start`. Register a new user →
land on Home showing the greeting, email, and placeholder subtitle inside
a pocket card → tap Keluar → redirected back to `/(auth)/login` and the
secure-stored refresh token is cleared (confirm by force-quitting and
relaunching the app: it should land on Login, not silently re-authenticate).
Then log back in with the same credentials → same Home screen.

- [ ] **Step 5: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add mobile/app/(app)/home.tsx mobile/src/auth/useCurrentUser.ts mobile/src/auth/useLogout.ts
git commit -m "feat(mobile): add Home screen with profile display and logout"
```

---

## Task 10: Mobile — Final verification pass

**Files:** none created — this task runs the full suite and fixes anything it finds.

- [ ] **Step 1: Run the full mobile test suite**

Run: `cd mobile && npm test`
Expected: all tests from Tasks 4 and 5 PASS (auth store: 4 tests; refresh
interceptor: 3 tests).

- [ ] **Step 2: Typecheck the whole app**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors. If the generated `src/api/generated/types.ts` is
stale relative to `api/openapi/openapi.yaml` (e.g. Task 1 added
fields to `RegisterRequest`), re-run `npm run generate:api` first.

- [ ] **Step 3: Lint**

```bash
cd mobile
npx expo lint
```
Fix anything it flags.

- [ ] **Step 4: End-to-end manual walkthrough**

With `api` running against a migrated database (`task
infra:up && task migrate:up && task run`), run `cd mobile &&
npx expo start` and, on a simulator/device:
1. Land on Login (cold start, no stored session).
2. Navigate to Register, submit with the consent checkbox unchecked —
   confirm the button stays disabled.
3. Check the consent checkbox, submit a valid registration — confirm it
   lands on Home with the correct greeting/email.
4. Tap Keluar — confirm redirect to Login and that force-quitting +
   relaunching does not silently re-authenticate.
5. Log back in with the same credentials — confirm Home renders again.
6. Attempt login with a wrong password — confirm the generic
   `Email atau kata sandi salah.` banner (not a field-specific "email not
   found" message).

- [ ] **Step 5: Update PROGRESS.md**

Add a dated entry to `docs/PROGRESS.md`: mobile scaffold + auth flow
complete, listing `mobile` as a new top-level surface, the
screens shipped, and confirmation that the manual walkthrough in Step 4
passed. Cross-reference `docs/superpowers/specs/2026-08-02-mobile-scaffold-auth-design.md`.

- [ ] **Step 6: Commit**

```bash
cd "/data/Gawai Duniawi/SaaS/sakuplan"
git add docs/PROGRESS.md
git commit -m "docs: record mobile scaffold + auth flow completion"
```

---

## Self-Review Notes

- **Spec coverage:** location/tooling (Task 2), navigation (Task 6), UI/Tamagui theme (Task 2), API client (Task 3), server state (Tasks 7–9), token storage + interceptor (Tasks 4–5), PRD-alignment backend fix (Task 1), localization (hardcoded Bahasa Indonesia strings per the 2026-08-03 spec revision — no dedicated task, inline in Tasks 7–9), visual design direction (Tasks 2, 7), all three screens (Tasks 7–9), testing scope (Tasks 4, 5, 10) — every spec section maps to at least one task.
- **Type consistency verified:** `AuthState` shape defined once in Task 4 and reused verbatim (not redefined) by Tasks 5, 6, 7, 8, 9; `PocketCard` defined once in Task 7 and imported (not redefined) by Tasks 8–9; `CURRENT_TERMS_VERSION`/`CURRENT_PRIVACY_VERSION` defined once in Task 8 and match the literal string used in Task 1's backend tests.
- **Known gap surfaced, not hidden:** Task 8 explicitly calls out that the Terms/Privacy Policy links are non-functional placeholder text in this pass (no in-app document exists yet) rather than silently shipping dead tap targets without comment.
