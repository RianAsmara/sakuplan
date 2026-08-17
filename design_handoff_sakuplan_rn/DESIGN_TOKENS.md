# SakuPlan — Design Tokens (exact values)

Every value below is lifted verbatim from `reference/SakuPlan.dc.html`. Nothing here is
approximate. If a value is not in this file, it is not in the design.

## Color

| Token | Hex | Role |
| --- | --- | --- |
| `terjaga` | `#006B5E` | Primary. Brand green. Buttons, active tab, links, positive amounts, wordmark. |
| `tinta` | `#18251F` | Primary text, neutral amounts. |
| `kertas` | `#F7F8F4` | App background, progress-bar tracks, inactive segment fill. |
| `kulit` | `#66736C` | Secondary text, field borders, inactive tab. |
| `leluasa` | `#D2A21B` | Amber. Savings goals + AI suggestions ONLY. |
| `peringatan` | `#C3443D` | Red. Overdue, over-budget, destructive, unread dot, expense chart line. |
| `putih` | `#FFFFFF` | Card surface, tab-bar surface. |
| `hairline` | `#D8DDD7` | 1px list dividers and column separators. |
| `garisPutus` | `#AEB9B2` | 1.5px dashed border color (PocketCard, tab-bar top edge, inputs in onboarding). |
| `tekan` | `#EEF3EF` | Press background on the back button; also dashed divider inside the STS breakdown. |

### Alpha fills (used literally, do not re-derive)

```
rgba(0,107,94,0.06)    STS detail card background (positive)
rgba(0,107,94,0.15)    input focus ring
rgba(195,68,61,0.06)   "Perlu perhatian" block bg, auth error banner bg
rgba(195,68,61,0.05)   privacy danger-zone bg
rgba(195,68,61,0.04)   home STS card bg when over the daily limit
rgba(195,68,61,0.12)   divider between "Perlu perhatian" rows
rgba(210,162,27,0.05)  AI banner / AI suggestion card bg
rgba(210,162,27,0.18)  divider inside AI suggestion card
rgba(102,115,108,0.35) AI-consent toggle track, off state
rgba(24,37,31,0.10)    phone-frame shadow (web only — drop on native)
```

## Typography

Three families, three jobs. Do not mix them up — the split is deliberate.

| Family | Weights used | Used for |
| --- | --- | --- |
| **Fraunces** | 600 | Wordmark, onboarding headings, auth headings. Nothing else. |
| **IBM Plex Sans** | 400, 500, 600 | All UI text, titles, labels, buttons. |
| **IBM Plex Mono** | 500 | Every number, every currency amount, field micro-labels, IDR badge. |

### Scale (family / weight / size / line-height)

| Name | Spec | Where |
| --- | --- | --- |
| Wordmark L | Fraunces 600 · 24 | Auth screen brand |
| Wordmark M | Fraunces 600 · 22 | Onboarding brand |
| Wordmark S | Fraunces 600 · 20 | Home header brand |
| Display heading | Fraunces 600 · 24 | Onboarding step headings |
| Auth heading | Fraunces 600 · 20 | "Masuk" / "Buat Akun" |
| Tab title | Plex Sans 600 · 24 / 32 | Transaksi, Anggaran, Laporan, Lainnya |
| Tab description | Plex Sans 400 · 14 · kulit · marginTop 5 | Laporan only ("Ringkasan kondisi keuanganmu") |
| Detail title | Plex Sans 600 · 18 / 24 | Sub-screen header, 1 line, ellipsized |
| Section heading | Plex Sans 600 · 14 | "Perlu perhatian", "Riwayat", "Identitas" … |
| Group label | Plex Sans 500 · 11 · kulit · ls .02em | "Akun", "Perencanaan", "Aplikasi" in Lainnya |
| Body | Plex Sans 400 · 14 | List row primary text, menu items |
| Body S | Plex Sans 400 · 13 | Breakdown rows, notifications (1.5 lh), system rows |
| Meta | Plex Sans 400 · 12 · kulit | Supporting copy, summaries |
| Meta S | Plex Sans 400 · 11 · kulit | Row subtitles, chart legend |
| Micro | Plex Sans 400 · 10 · ls .04em | Chart month labels, "SARAN AI · MENUNGGU PERSETUJUAN" |
| Field label | Plex Mono 500 · 11 · kulit · ls .04em · UPPERCASE | Every form label |
| Amount XL | Plex Mono 500 · 42 / 1.1 | Home safe-to-spend figure |
| Amount L | Plex Mono 500 · 36 | Safe-to-spend detail figure |
| Amount M | Plex Mono 500 · 28 | Accounts total balance |
| Amount input | Plex Mono 500 · 26 | Transaction amount field |
| Amount 17 / 16 / 15 / 14 / 13 | Plex Mono 500 | Summary pair · account balance · bill + attention · txn + report · budget pct |
| Button | Plex Sans 500 · 14 | Primary/secondary buttons |
| Button S | Plex Sans 500 · 12–13 | Inline actions ("Ubah", "Tandai lunas", "Tolak") |
| Tab label | Plex Sans 500 · 11 | Bottom tab bar |

## Spacing

Screen padding: **20** horizontal in the main app (top 20, bottom 28) · **24** in onboarding and auth (top 28/32).

Used gaps and paddings: `2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28`.
Recurring rhythm: section bottom margin **20**, tab-title block bottom margin **22**,
section-heading bottom margin **10**, list row vertical padding **9 / 12 / 13 / 14**.

## Radius

`3` progress bars · `4` error banner · `6` small buttons, inputs, notes · `8` cards, buttons,
inputs, back button · `12` auth card · `14` chips · `50%` avatar + status dots.

## Borders

- List divider: `1px solid #D8DDD7`, applied as `borderTopWidth` on each row (so the first row gets a top rule).
- Column separator (home summary): `1px` wide, `#D8DDD7`, full height, `margin: 0 16px`.
- PocketCard: `1.5px dashed #AEB9B2`, radius 8 (auth card: radius 12 + shadow).
- Inputs, resting: `1.5px solid #66736C`, radius 8. Onboarding inputs: `1.5px dashed #AEB9B2`.
- Input focus: border `#006B5E` + `0 0 0 3px rgba(0,107,94,0.15)`.
- Tab bar top edge: `1.5px dashed #AEB9B2`.
- Active tab indicator: `2px solid #006B5E` on the **top** edge of the tab item (inactive items get the same 2px in `#66736C`… see note in SCREENS.md).
- Danger zone: `1.5px solid #C3443D`, radius 8.

## Elevation

Only two shadows exist:
- Auth card: `0 6px 20px rgba(24,37,31,0.10)`
- Phone frame: `0 0 40px rgba(24,37,31,0.10)` — **web-only artifact, do not port.**

No other surface has a shadow. Cards are defined by their dashed hairline, not by depth.

## Motion

- Press feedback: `transform: scale(0.97)` on buttons, `scale(0.98)` on cards, `scale(0.95)` on
  small icon buttons, `opacity: 0.7` on menu rows. Duration `120ms`, `cubic-bezier(.4,0,.2,1)`.
- AI-consent toggle knob: `left` transition `150ms`.
- Nothing else animates. There are no screen transitions in the prototype.

## Touch targets

- Back button: **44×44**, icon 21px, centered.
- Home avatar: 30×30 (visually) — needs an expanded hit area on native.
- Chips: `min-height: 32` — **below the 44px minimum**. See SCREENS.md for the required fix.
