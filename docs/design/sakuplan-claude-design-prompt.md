# SakuPlan — Mobile UI/UX Design Brief

Paste this whole document as the prompt when asking Claude (or claude.ai/design)
to design or extend SakuPlan's mobile UI. It carries the product knowledge and
the visual system already shipped in code, so the output stays one coherent
product instead of reinventing itself per screen.

## The subject, in one paragraph

SakuPlan is an Indonesia-first personal budgeting app. It exists to answer one
question a salaried worker asks between paydays: *"Berapa yang aman aku
belanjakan hari ini?"* ("How much can I safely spend today without touching my
bills, savings, and essentials until payday?") The app is a deterministic
financial engine wearing the visual language of a physical money-management
habit familiar in Indonesia — the *amplop* (cash envelope), the *nota*
(receipt), the ticket stub torn at a perforation. Every screen's single job is
to make a real, current financial fact ("your balance is X," "you have Y
safe to spend," "this bill is due in Z days") legible at a glance, without
decoration that isn't load-bearing.

**Audience:** Indonesian salaried employees, young families managing shared
household budgets, and workers with variable income — people who already
track money in their heads or in notes apps and want something that does the
arithmetic honestly, not a "fintech" product performing sophistication.

## Product context (source: `docs/PRD.md`)

- Currency: IDR only at MVP, zero decimal minor units (Rp100.000, never
  Rp100.000,00). Language: Bahasa Indonesia. Time zone: Asia/Jakarta.
- Positioning: *"Smart personal budget planner that protects bills, tracks
  goals, and calculates safe-to-spend until payday."*
- The financial engine is deterministic and is the source of truth. AI may
  explain or summarize; it never silently calculates or applies changes. If
  a screen surfaces an AI explanation, it must be visually subordinate to
  and clearly separable from the real numbers — never blended in as if it
  were also a fact.
- Non-goals: this is not a bank, wallet, lender, or investment product, and
  the design should never borrow those categories' visual tropes (card
  issuer branding, stock-ticker chrome, investment-app gradients).

## Design tokens already shipped — extend these, do not replace them

These are live in `mobile/tamagui.config.ts` and used across the current
screens. Any new screen must be built from this exact palette and type
system, not a fresh one.

**Color** (semantic name → hex → role):
- `kertas` `#F5F6F3` — page background ("paper")
- `tinta` `#1E2A22` — primary text ("ink")
- `terjaga` `#0E6B58` — primary action / brand color, deep teal ("alert/awake" — the color of staying on top of your money)
- `leluasa` `#C9A227` — accent, warm gold ("freedom/room to breathe" — used for what's going *well*: goal progress, surplus)
- `kulit` `#7C6A5B` — secondary text, hairlines, muted content ("leather")
- `peringatan` `#B23B33` — danger/warning only, used sparingly
- `white` `#FFFFFF` — card surfaces, lifted off `kertas`

This is deliberately not a fintech-neon or bank-blue palette. It reads as
warm, paper-and-leather, editorial — closer to a well-kept ledger than an
app. Preserve that; don't drift toward SaaS-dashboard blue or crypto-app
near-black-plus-neon.

**Type** (three roles, already loaded as fonts):
- Display/heading: **Fraunces**, 600 SemiBold — a high-contrast serif with
  real character, used for screen titles and the "SakuPlan" mark. Use with
  restraint: titles and hero numbers only, never body copy.
- Body: **IBM Plex Sans**, 400 Regular — all UI copy, labels, descriptions.
- Numeric/financial: **IBM Plex Mono**, 500 Medium — every Rupiah amount,
  every date, every count. Tabular figures matter: a list of transaction
  amounts must align on the decimal/thousands separators the way a ledger
  does. This is the single most important typographic rule in the system —
  money is never set in the body or display face.

**Space/radius scale:** 0, 4, 8, 12, 16, 24, 32, 48 (space) and 0, 4, 8, 12
(radius) — small radii throughout, nothing pill-shaped except status chips.
Consistent with a paper/ledger object, not a soft "app" aesthetic.

## The signature element: the ticket stub

The core surface component, `PocketCard`, is a dashed-all-round-border card
lifted slightly off the page — visually a torn ticket stub or a pocket
receipt, not a generic "material design" card with a drop shadow. This is
the one element every screen should be recognized by. Extend the metaphor
rather than introducing a competing one:

- A transaction list reads like a running receipt: mono figures,
  right-aligned amounts, hairline dividers between "lines."
- A budget category is a small stub of its own — allocated amount, spent
  amount, a thin progress indicator, not a circular gauge or donut chart.
- A savings goal is a stub with a torn-edge progress fill, reinforcing "how
  much of this envelope is full."
- Empty/not-yet-real states (data that doesn't exist yet) use a visually
  *muted* variant of the same stub — dashed, no fill, low-opacity icon —
  so "coming soon" never looks like a broken version of "real."

## Priority: redesign Login and Register now

These two screens are the first impression and the current implementation
is a wireframe: the `PocketCard` reads as a hairline, not a card, inputs
have no real presence, and there's no keyboard-avoidance on Register's
longer form. Treat this as the first concrete deliverable, applying
everything above — full dashed ticket-stub border with a real shadow lift
off `kertas`, visible input borders with a `terjaga` focus ring, the error
banner as a left-accent tint rather than a solid red fill, top content
safe-area aware.

**Add a Google sign-in path to both screens**, as a secondary option below
the primary email/password action:

- Divider between the two paths reads "atau" (or), not a bare line.
- The Google button follows Google's own sign-in button branding (neutral
  white/outline button, unmodified "G" mark, "Masuk dengan Google" /
  "Daftar dengan Google") — don't recolor the G into the SakuPlan palette;
  Google's brand guidelines require the mark stay as-is, and visually this
  also correctly signals "external identity provider" as distinct from the
  app's own teal primary action.
- It's visually secondary to the email/password button (outline vs. solid
  `terjaga` fill) since email/password remains the primary supported
  method — Google is an additional path, not a replacement.
- **This is a design exploration only.** SakuPlan's PRD and Go API
  currently define email/password auth alone — there is no OAuth
  requirement or backend flow specified yet. Design the UI/UX for it, but
  don't imply a working callback/flow; treat it the same as the "not real
  yet" muted-state pattern used elsewhere in this system until it's scoped
  as an actual requirement and implemented server-side.

## Screens to design (full P0 surface, `docs/PRD.md` §5.1 / §6)

Design as one connected system, not isolated screens. Home already exists
and sets the visual baseline for the rest — match it. Login and Register
are covered by the priority section above.

1. **Onboarding** — payday date, income, first budget in under 5 minutes (a
   stated product goal; the flow's pacing is part of the design problem).
2. **Home / Dashboard** (`RPT-001`) — must surface, at a glance: liquid
   balance, safe-to-spend today, safe-to-spend until payday, days until
   payday, current budget used/remaining, next upcoming bill, savings-goal
   progress, largest spending categories. This is the screen users open
   most; the safe-to-spend figure is the hero — the single most
   characteristic fact in this product's world, and should read as such
   (large, mono, unmistakable) before anything else on the screen.
3. **Profile & preferences** (`USER-001`/`002`) — display name, locale,
   time zone, payday day-of-month, default currency, minimum safety
   buffer, and AI consent state, all directly editable. This is the
   settings a user actually changes over time (as opposed to the
   one-time-setup framing of Onboarding) — reachable from Home, likely via
   the header avatar badge already designed there. Payday editing should
   surface `USER-002`'s rule in plain language: if the chosen day doesn't
   exist in a month, payday falls on that month's last day.
4. **Accounts & balances** — cash, bank, e-wallet, savings, other; each
   account is its own stub.
5. **Transactions & transfers** — recording a transaction is a stated
   "under 10 seconds" goal; the entry flow's design is as much about speed
   as legibility. Ledger-style list for history.
6. **Budgets** — monthly periods, category allocations, consumption.
7. **Recurring bills** — due dates and payment status must be scannable in
   a list without opening each one.
8. **Savings goals** — target, contributed, progress.
9. **Safe-to-spend detail** — the dashboard figure's full breakdown/why.
10. **Reports** (`RPT-002`–`004`) — cash flow, consistency, category
    breakdowns; charts should stay in the mono/ledger register (bar and
    line, not 3D or donut) and use the existing palette only.
11. **Notifications** — budget/bill alerts.
12. **AI recommendation review** — draft budget suggestions the user
    approves or edits; must visually read as a *proposal*, distinct from
    the deterministic real numbers elsewhere (e.g., a dashed/ghost
    treatment consistent with the "not real yet" pattern above).
13. **Privacy & security controls** (`USER-004`) — data export, account
    deletion, active sessions. Distinct from Profile & preferences above:
    this screen is about data and account safety, not day-to-day settings.

## Voice and copy

- Bahasa Indonesia throughout, plain and direct register — match the
  existing screens' tone ("Kelola pengeluaran dan lihat berapa yang aman
  kamu belanjakan hari ini," "Belum punya akun?").
- Active voice, name things by what the person controls ("Catat transaksi,"
  not "Kirim data transaksi").
- Errors state what happened and how to fix it, in the interface's voice —
  no apologies, no vague "Terjadi kesalahan" where a specific cause is
  known.
- Every Rupiah value formatted `Rp` + thousands-separated integer, always in
  the mono face — never a raw number, never with decimals.

## Iconography

Lucide icons (`@tamagui/lucide-icons-2`, already a dependency) are the only
icon set. Use them beside text where the icon adds real recognition speed,
not as decoration:

- Form field labels get a small inline icon matching the field's type —
  envelope for email, lock for password, person for a name field — sized
  to sit inline with the label text (~14px), colored `$kulit` (the same
  muted tone as the label itself, not a brand-colored accent).
- Primary buttons whose action has an obvious icon equivalent (submit a
  login, create an account, log out) get that icon inline with the label
  via the button's own leading-icon slot, not a separate decorative badge.
- This is already the pattern in the shipped login/register/home screens —
  match it exactly rather than introducing a second icon treatment.
- What this is *not*: no icon inside a filled circular badge, no
  pastel-gradient icon fills, no icon-plus-headline "feature grid" (three
  circles with icons above short captions) — that's the generic AI-slop
  tell, not this product's own pattern. An icon here always sits directly
  next to the text it clarifies, same size register, same muted color.

## Platform constraints

- React Native (Expo, SDK 57) + Tamagui, light theme only for MVP (no dark
  mode work yet).
- Mobile-first, single column, safe-area aware (status bar / home
  indicator), keyboard-avoiding on any form screen.
- Accessibility floor: visible focus states, sufficient contrast (the
  palette above is already contrast-checked against `kertas`/`white`),
  respect reduced-motion.

## What to avoid

- The generic AI-design defaults: warm-cream-plus-terracotta,
  near-black-plus-neon-accent, or dense broadsheet-newspaper columns. This
  product already has a real, specific identity (paper/ledger/ticket-stub,
  teal + gold + leather) — don't dilute it toward any of those three.
- Bank-card or crypto-wallet visual tropes (embossed card numbers, chip
  icons, gradient "premium" cards) — SakuPlan explicitly is not a bank.
- Numbered-step markers or progress dots where the content isn't actually
  sequential.
- Circular/donut gauges for budget or goal progress — use the ticket-stub
  fill metaphor instead, it's the system's own visual language for "how
  much of this is used."
- Decorative motion. Motion is reserved for state feedback (button press,
  focus, a value updating) — nothing ambient or looping.
- **"AI slop" tells generally, watch for these specifically**: icon-in-a-
  pastel-circle feature grids; purple-to-blue or teal-to-lime gradient
  buttons/backgrounds; glassmorphism/frosted-blur cards; oversized rounded
  corners on everything (`radius` here tops out at `$3` = 12px, deliberately
  small); heavy drop shadows or glow used as decoration rather than real
  elevation; generic "Welcome back 👋" emoji-as-icon copy; meaningless
  abstract blob/wave shapes filling empty space; a hero section that's just
  a big centered headline over a gradient with no real content underneath.
  If a screen would look identical with SakuPlan's name swapped for any
  other fintech app's, it hasn't used this brief's specifics — the
  ticket-stub metaphor, the Rupiah/mono formatting, the Bahasa Indonesia
  voice, the paper-and-leather palette — enough to be unmistakably this
  product.
