# SakuPlan — Screen Specifications

13 screens. 5 are tabs, 8 are detail screens pushed on top of the tab shell.
Plus 2 flows outside the shell: onboarding (4 steps) and auth (login / register).

All copy below is **verbatim Indonesian** from the prototype. Do not translate, do not rewrite.

---

## Header system — there are exactly two, and they are not interchangeable

### A. Tab header (Beranda, Transaksi, Anggaran, Laporan, Lainnya)
No back button. No card, no border, no icon.
- Title: Plex Sans 600 · 24 / 32 · tinta, left-aligned.
- Optional description line under it: Plex Sans 400 · 14 · kulit · marginTop 5. **Only Laporan has one:** "Ringkasan kondisi keuanganmu".
- Optional compact right-side action, top-aligned, marginTop 6. **Only Anggaran has one:** "{n} saran AI ›" in leluasa, Plex Sans 500 · 12.
- Block bottom margin: 22.
- **Beranda is the exception** — it has no title header at all. It opens with the brand row (see below).

### B. Detail header (the 8 sub-screens)
- 56px tall bar, background kertas, `borderBottomWidth: 1` in hairline.
- Bleeds to the screen edges (in the HTML: `margin: -20px -20px 12px; padding: 0 16px`).
- Back button: **icon only**, 44×44 touch target, ArrowLeft 21px, terjaga stroke, radius 8, press bg `#EEF3EF`. `aria-label="Kembali"` → `accessibilityLabel="Kembali"`. **No "Kembali" text label.**
- Title: Plex Sans 600 · 18 / 24 · tinta, `marginLeft: 8`, single line, ellipsized.

Titles and back destinations:

| Route | Title | Back goes to |
| --- | --- | --- |
| `accounts` | Akun & saldo | Lainnya |
| `bills` | Tagihan berulang | Lainnya |
| `goals` | Target tabungan | Lainnya |
| `safeToSpendDetail` | Rincian aman belanja | Beranda |
| `notifications` | Notifikasi | Lainnya |
| `aiReview` | Rekomendasi AI | Lainnya |
| `privacy` | Privasi & keamanan | Lainnya |
| `profile` | Profil & preferensi | Beranda |

Note `profile` and `goals` are reachable from two places each (Beranda avatar / Beranda goal card,
and Lainnya). The prototype hardcodes one back target; **on native, use the natural stack pop
instead** — it is strictly better and matches the intent.

The bottom tab bar is **hidden** on all 8 detail screens (`showTabBar: !isSubScreen`).

---

## Bottom tab bar

Surface white, top edge `1.5px dashed #AEB9B2`. Five equal-flex items.
Each item: column layout, `gap: 3`, `padding: 14px 4px 12px`, icon 18px (`strokeWidth: 2`,
round cap/join), label Plex Sans 500 · 11. Icon and label share one color:
terjaga when active, kulit when inactive.

Active indicator: `borderTopWidth: 2` on the item, colored the same as the label. Inactive items
therefore also carry a 2px kulit top edge — this reads as a segmented rule across the bar. Keep it;
it is intentional and it is what makes the bar look like ledger paper.

Icons (Lucide equivalents): Beranda → `Home`, Transaksi → `ReceiptText`, Anggaran → `Wallet`,
Laporan → `BarChart3`, Lainnya → `MoreHorizontal`.

---

## 1. Beranda (Home)

Purpose: answer "how much can I spend today?" in one glance, then surface only what needs action.

Order, top to bottom:

1. **Brand row** — "SakuPlan" (Fraunces 600 · 20 · terjaga) left; right side a row with `gap: 12`:
   - "Notifikasi" text button (Plex Sans 400 · 13 · tinta) with a 6px `#C3443D` dot appended when unread > 0.
   - Avatar button: 30×30 circle, `1.5px solid terjaga` border, white fill, first letter of the user's name uppercased, Plex Mono 500 · 12 · terjaga.
   - Bottom margin 18.
2. **Greeting** — "Halo, {userName}. Kelola pengeluaran dan lihat berapa yang aman kamu belanjakan hari ini." Plex Sans 400 · 13 · kulit. Bottom margin 18.
3. **Safe-to-spend card** — dashed PocketCard, padding 20, radius 8, tappable → `safeToSpendDetail`.
   This card is **state-dependent and it is the most important logic in the design**:

   | | `safeToday >= 0` | `safeToday < 0` |
   | --- | --- | --- |
   | Label | "Aman dibelanjakan hari ini" | "Batas harian terlampaui" |
   | Label color | kulit | peringatan |
   | Amount color | terjaga | peringatan |
   | Border | kulit | peringatan |
   | Background | white | `rgba(195,68,61,0.04)` |
   | Supporting copy | "Aman hingga gajian: {safeUntilPayday} · {days} hari menuju gajian" | "Di atas batas aman · {days} hari menuju gajian" |

   Amount is always rendered as `fmt(Math.abs(safeToday))` — Plex Sans 500 · 12 label, Plex Mono 500 · 42 / 1.1 amount, supporting copy Plex Sans 400 · 13 · kulit · marginTop 8 with a trailing `›`.
   Negative is never shown as a minus number. It is reframed as a warning.
4. **Summary pair** — flat row, no card. Two `flex: 1` columns split by a 1px hairline divider
   (`width: 1`, `margin: 0 16px`). Left "Saldo tersedia" → `liquid`. Right "Pengeluaran bulan ini" →
   total budget spent. Labels Plex Sans 400 · 12 · kulit · marginBottom 6, values Plex Mono 500 · 17 · tinta. Bottom margin 20.
5. **Perlu perhatian** — rendered only when there is at least one item. Section heading, then one
   block with `background: rgba(195,68,61,0.06)`, radius 8, `overflow: hidden`. Each row:
   `padding: 13px 14px`, `borderTopWidth: 1` in `rgba(195,68,61,0.12)`, space-between.
   Left column: title (Plex Sans 400 · 14 · tinta) + detail (Plex Sans 400 · 12 · peringatan · marginTop 2).
   Right column: right-aligned, `gap: 6` — amount (Plex Mono 500 · 15 · tinta) then an inline
   action button (Plex Sans 500 · 12 · peringatan).
   Two item kinds are merged into this one list:
   - Overdue bill → title `{bill.name}`, detail "Terlambat {n} hari", amount = bill amount, action "Tandai dibayar" → marks the bill paid.
   - Over-budget category → title "Anggaran {name} terlampaui", detail "Melebihi anggaran {over} · terpakai {spent} dari {allocated}", amount = the overage, action "Lihat anggaran" → Anggaran tab.
6. **Top savings goal card** — dashed PocketCard, padding 14, tappable → `goals`. Goal name
   (Plex Sans 400 · 11 · kulit) left, "{pct}%" (Plex Mono 500 · 13 · leluasa) right; 6px progress bar
   (track kertas, fill leluasa, radius 3) with a **2px white dashed right edge on the fill**;
   then "{contributed} dari {target}" (Plex Sans 400 · 12 · kulit). Picks the goal with the highest completion ratio.
7. **Pengeluaran terbesar bulan ini** — section heading, then the top 3 budgets by `spent`,
   descending. Plain ledger rows: `padding: 9px 0`, `borderTopWidth: 1` hairline, name (Plex Sans 400 · 14)
   left, amount (Plex Mono 500 · 14) right. No bars, no card.
8. **AI banner** — only when `aiSuggestions.length > 0 && aiConsent`. Dashed leluasa border,
   `rgba(210,162,27,0.05)` fill, padding `12px 14px`, tappable → `aiReview`.
   Line 1: "SARAN AI · MENUNGGU PERSETUJUAN" (Plex Sans 400 · 10 · leluasa · ls .04em).
   Line 2: "{n} rekomendasi anggaran · " + "Tinjau rekomendasi ›" (the second part tinta, weight 500).

---

## 2. Transaksi

Quick-add form on top, history below. No separate "add" screen.

- Tab header "Transaksi".
- Type segmented control: two `flex: 1` buttons, `gap: 8`, radius 6, padding 10, Plex Sans 500 · 13.
  Selected = terjaga bg / white text. Unselected = kertas bg / tinta text. Labels "Pengeluaran", "Pemasukan".
- Amount field: `1.5px solid kulit`, radius 8, padding 14. "Rp" prefix (Plex Mono 500 · 26 · kulit, marginRight 6) then a numeric input (Plex Mono 500 · 26 · tinta, placeholder "0"). Digits only — strip non-numerics on every keystroke.
- Category chips: **only when type is Pengeluaran.** Wrapping row, `gap: 8`. Chip: `padding: 8px 14px`, radius 14, `1px` border, Plex Sans 400 · 12, `min-height: 32`. Selected = terjaga bg / white text / terjaga border. Unselected = white bg / tinta text / kulit border. Options come from the budget names.
- Account chips: same treatment, always visible. Options = accounts where `type !== 'Tabungan'` (savings accounts cannot fund a transaction).
- Note field: `1px solid hairline`, radius 6, padding 12, Plex Sans 400 · 13, placeholder "Catatan (opsional)".
- Submit: full-width terjaga button, padding 14, radius 8, "Simpan". Bottom margin 24.
- "Riwayat" section heading, then rows sorted by `id` descending: `padding: 12px 0`, hairline top
  border. Left: description (Plex Sans 400 · 14) + "{date} · {category} · {account}" (Plex Sans 400 · 11 · kulit).
  Right: amount, Plex Mono 500 · 14, **terjaga with a `+` prefix when income, tinta when expense.**

Submit behavior: ignore amounts ≤ 0. Sign the amount by type. Category defaults to "Lain-lain" for
expenses and is forced to "Pemasukan" for income. Adjust the chosen account's balance, increment the
matching budget's `spent` (expenses only), prepend the transaction, then clear amount, note and category.

## 3. Anggaran

Tab header "Anggaran" + optional "{n} saran AI ›" action. Then one row per budget:
`padding: 14px 0`, hairline top border.
- Name (Plex Sans 400 · 14) left, "{pct}%" right — Plex Mono 500 · 13, **peringatan when over, kulit otherwise**.
- 5px progress bar, radius 3, track kertas. Fill width `min(pct, 100)`, colored peringatan when over, terjaga otherwise.
- Summary line: over → "Melebihi anggaran {overage}" in peringatan; otherwise "{spent} dari {allocated}" in kulit. Plex Sans 400 · 12.
- "Ubah" text button (terjaga, Plex Sans 400 · 12) on the right of the summary line. Tapping it swaps
  in an inline editor: numeric input (`1px solid kulit`, radius 6, padding 9, Plex Mono 500 · 13) pre-filled
  with the current allocation + a "Simpan" button (terjaga, radius 6, `padding: 9px 14px`).
  Saving an empty or invalid value just cancels.

## 4. Laporan

Tab header "Laporan" + description "Ringkasan kondisi keuanganmu".

- **Cash-flow card** (dashed PocketCard, padding 16, bottom margin 24):
  - "Arus kas 6 bulan terakhir" (section heading) + "Agustus (bulan berjalan)" (Plex Sans 400 · 12 · kulit).
  - Line chart, `viewBox="0 0 380 130"`, rendered 100% wide × 126 tall. Three horizontal
    gridlines in kertas at y = 20, 70, 120. Income polyline: terjaga, 2px, solid. Expense polyline:
    peringatan, 2px, `strokeDasharray="4 3"`.
    Scale: `maxV = 9_000_000`, `y = 130 - (v / maxV) * 110`, `x = i * (380 / 5)`.
    Hardcoded series — months `['Mar','Apr','Mei','Jun','Jul','Agt']`,
    income `[8.5M ×6]`, expense `[3.2M, 3.9M, 3.6M, 4.4M, 4.1M, 3.48M]`.
    **This is placeholder data in the prototype. Wire it to real monthly aggregates.**
  - Month labels: 6 spans, space-between, Plex Sans 400 · 10 · kulit.
  - Legend: two items, `gap: 16` — a 14×2 color swatch + label ("Pemasukan", "Pengeluaran"), Plex Sans 400 · 11 · kulit.
  - Footer row, `borderTopWidth: 1` in kertas, `paddingTop: 12`, space-between: Pemasukan / Pengeluaran /
    Arus kas bersih. Labels Plex Sans 400 · 11 · kulit, values Plex Mono 500 · 14. Net value is terjaga when ≥ 0, peringatan when negative.
- **Pengeluaran per kategori** — section heading, then one row per budget: `padding: 10px 0`,
  hairline top border, name + amount, then a 6px terjaga bar whose width is `spent / max(spent) * 100`.
  Note this normalizes against the largest category, **not** against the allocation.

## 5. Lainnya

Tab header "Lainnya". Three labelled groups. Group label: Plex Sans 500 · 11 · kulit · ls .02em.
Each row is a full-width button: `padding: 14px 0`, hairline top border, space-between,
left side an icon (16px, kulit stroke) + label (Plex Sans 400 · 14 · tinta) with `gap: 10`,
right side a kulit `›`. Press state `opacity: 0.7`.

- **Akun** — Profil & preferensi (`User`), Akun & saldo (`Wallet`).
- **Perencanaan** — Tagihan berulang (`ReceiptText`), Target tabungan (`Target`), Rekomendasi AI (`Sparkles`, **leluasa stroke**, right side shows the suggestion count in leluasa).
- **Aplikasi** — Notifikasi (`Bell`, right side shows unread count), Privasi & keamanan (`Shield`).

Group spacing: `margin: 20px 0 2px` between groups.

## 6. Akun & saldo (detail)

Total block: "Total saldo" (Plex Sans 400 · 12 · kulit) + sum of **all** accounts including savings
(Plex Mono 500 · 28). Then one row per account: `padding: 13px 0`, hairline top border — name
(Plex Sans 400 · 14) + type (Plex Sans 400 · 11 · kulit) on the left, balance (Plex Mono 500 · 16) on the right.

## 7. Tagihan berulang (detail)

One row per bill: `padding: 13px 0`, hairline top border. Left: name + status line (Plex Sans 400 · 12).
Right: a row with `gap: 14` — amount (Plex Mono 500 · 15) then a "Tandai lunas" text button
(terjaga, Plex Sans 500 · 12, `whiteSpace: nowrap`) shown only when unpaid.

Status line rules, in order:
1. paid → "Lunas · {dueDateLong}" in terjaga
2. overdue or `diff < 0` → "Lewat jatuh tempo {|diff|} hari" in peringatan
3. `diff === 0` → "Jatuh tempo hari ini" in peringatan
4. otherwise → "Jatuh tempo {dueDateLong} ({diff} hari lagi)" in kulit

Marking a bill paid: set status `paid`, **debit the BCA account**, and append a transaction
"Bayar {bill.name}" in category "Tagihan". (The hardcoded BCA is a prototype shortcut — in the real
app, let the user choose the source account.)

## 8. Target tabungan (detail)

One dashed PocketCard per goal, padding 16, bottom margin 12.
Name + "{pct}%" in leluasa; 6px leluasa progress bar with the 2px white dashed right edge;
"{contributed} dari {target} · target {deadlineLong}" (Plex Sans 400 · 12 · kulit).
Then a full-width secondary button "Tambah Dana" (`1.5px solid terjaga`, transparent bg, terjaga text,
padding 11, radius 6). Tapping swaps in a numeric input (placeholder "Jumlah") + "Simpan".

Saving: add to `contributed`, debit BCA, append a "Transfer ke {goal.name}" transaction in category "Tabungan".

## 9. Rincian aman belanja (detail)

The calculation, shown as an audit trail. This screen exists to make the headline number trustworthy.

- Highlight card: `1.5px dashed terjaga`, `rgba(0,107,94,0.06)` bg, padding 18.
  "AMAN DIBELANJAKAN HARI INI" (Plex Sans 400 · 12 · kulit) / amount (Plex Mono 500 · 36 · terjaga) /
  "{safeUntilPayday} ÷ {days} hari sampai gajian" (Plex Sans 400 · 12 · kulit).
- "RINCIAN PERHITUNGAN" label (Plex Sans 400 · 11 · kulit).
- Breakdown PocketCard, padding 16. Four rows, `padding: 8px 0`, separated by
  `1px dashed #EEF3EF`; the last row has `padding: 10px 0` and no rule:
  1. "Saldo cair (tunai, bank, e-wallet)" → liquid, tinta
  2. "− Tagihan belum lunas" → unpaid bills, **both label and value peringatan**
  3. "− Sisa anggaran bulan ini" → remaining budget, both peringatan
  4. "= Aman sampai gajian" (Plex Sans 500 · 13) → result, Plex Mono 500 · 14 · terjaga

  The safety buffer is subtracted in the math but **is not shown as a row.** Consider adding it —
  flagged as an open question, not a bug to silently fix.

## 10. Notifikasi (detail)

One row per notification: `padding: 14px 0`, hairline top border, `gap: 10`, tappable to mark read.
7px dot (radius 50%, `marginTop: 5`, no shrink) — peringatan when unread, kulit when read.
Text: Plex Sans · 13 / 1.5 · tinta, **weight 500 when unread, 400 when read**.
Whole row `opacity: 0.6` when read, `1` when unread. Press state `opacity: 0.7`.

## 11. Rekomendasi AI (detail)

Disclaimer first: "Ini rekomendasi, bukan angka final. Kamu yang memutuskan." (Plex Sans 400 · 12 · kulit).
This framing is load-bearing — the AI never applies anything by itself.

One card per suggestion: `1.5px dashed leluasa`, `rgba(210,162,27,0.05)` bg, padding 16, bottom margin 12.
- "USULAN · {Kategori Baru|Ubah Alokasi}" (Plex Sans 400 · 11 · leluasa · ls .04em).
- Category name (Plex Sans 400 · 14).
- "Saat ini" → current amount (tinta) and "Usulan" → suggested amount (**leluasa**), each on a row with
  `borderTopWidth: 1` in `rgba(210,162,27,0.18)`, `padding: 7px 0`.
- Reason text (Plex Sans 400 · 12 / 1.5 · kulit).
- Two `flex: 1` buttons, `gap: 8`: "Tolak" (`1.5px solid kulit`, transparent, tinta) and "Terapkan" (terjaga, white text). Both radius 6, padding 10, Plex Sans 500 · 13.

Approve: `update` overwrites the matching budget's allocation; `new` appends a budget with
`spent: 0`. Either way the suggestion is removed. Reject just removes it.

Empty state: dashed PocketCard, padding 20, centered, "Tidak ada rekomendasi baru saat ini."

## 12. Privasi & keamanan (detail)

- "Sesi aktif" section heading, then one row per session: `padding: 13px 0`, hairline top border.
  Device (Plex Sans 400 · 13) + last-active (Plex Sans 400 · 11 · kulit). Non-current sessions get a
  "Keluar" button with a `LogOut` icon (13px) in peringatan, `gap: 5`.
- "Data" heading (`margin: 24px 0 10px`), then a left-aligned "Ekspor data saya ›" text button in
  terjaga. After tapping, show "Permintaan ekspor terkirim. File akan dikirim ke emailmu." in kulit.
- "Zona bahaya" heading in **peringatan** (`margin: 28px 0 10px`). Card: `1.5px solid peringatan`,
  `rgba(195,68,61,0.05)` bg, radius 8, padding 16.
  Step 1: explanation copy + full-width peringatan "Hapus akun" button.
  Step 2: "Ketik HAPUS untuk konfirmasi. Tindakan ini tidak bisa dibatalkan." + a text input
  (`1px solid peringatan`, Plex Mono 500 · 13) + "Konfirmasi hapus" button, **disabled with
  `opacity: 0.4` until the input is exactly `HAPUS`**.

## 13. Profil & preferensi (detail)

Four sections, each opening with a section heading.
- **Identitas** — "NAMA TAMPILAN" field label (with a `User` icon, 14px) + text input. Edits the display name live.
- **Gajian dan anggaran** — "TANGGAL GAJIAN SETIAP BULAN" numeric input, then the helper
  "Jika tanggal ini tidak ada di suatu bulan, gajian jatuh di hari terakhir bulan itu. Gajian
  berikutnya: {nextPaydayLong}." Then "BATAS AMAN MINIMUM" — an Rp-prefixed numeric input, helper
  "Selalu disisihkan dari perhitungan aman-belanja sebagai jaga-jaga."
- **AI** — row with "Izinkan rekomendasi AI" + "AI hanya memberikan usulan. Perubahan anggaran tetap
  memerlukan persetujuanmu." and a toggle on the right: 44×26 track, radius 13, terjaga when on /
  `rgba(102,115,108,0.35)` when off; 20px white knob at `top: 3`, `left: 3` → `left: 21`, 150ms.
  Section closes with `paddingBottom: 24` + a hairline bottom border.
- **Sistem** — three read-only rows (`padding: 13px 0`, hairline top border): Bahasa → "Bahasa Indonesia",
  Zona waktu → "Asia/Jakarta", Mata uang → "IDR" (**Plex Mono 500 · 13**).

Turning AI consent off hides the home AI banner and the Anggaran AI action (`hasAI = count > 0 && aiConsent`).

---

## Onboarding (4 steps, outside the tab shell)

Full-height column, padding `28px 24px 24px`. Header: wordmark (Fraunces 600 · 22 · terjaga) +
"LANGKAH {n} DARI 4" (Plex Mono 500 · 11 · kulit · ls .04em, marginBottom 28).
Body is `flex: 1`; the button row sits at the bottom with `gap: 10`, `marginTop: 16`.
Buttons: "Kembali" (`flex: 1`, `1.5px solid kulit`, transparent) shown from step 2 on;
"Lanjut" (`flex: 2`, terjaga) on steps 1–3; "Mulai Pakai SakuPlan" (`flex: 2`, terjaga) on step 4.
Onboarding inputs use the **dashed** border variant (`1.5px dashed #AEB9B2`), not the solid one.

1. "Halo. Siapa nama kamu?" / "Dan kapan tanggal gajianmu setiap bulan?" — NAMA text input, TANGGAL GAJIAN numeric input, then "Setiap tanggal {n} tiap bulan."
2. "Berapa penghasilan bulananmu?" / "Ini dasar perhitungan aman-belanja kamu." — PENGHASILAN PER BULAN, Rp-prefixed numeric input.
3. "Buat anggaran pertamamu" / "Alokasikan penghasilanmu ke kategori utama. Bisa diubah kapan saja nanti." — three editable category rows (name left, Rp + right-aligned 90px numeric input), then "Total dialokasikan: {total}".
4. "Semua siap, {obName}." / "Berikut ringkasan sebelum kamu mulai." — a PocketCard summarizing income, payday and total budget.

Finishing sets the user's display name from the entered name and drops into Beranda.

## Auth (login / register, outside the tab shell)

Padding `32px 24px 24px`. A back text button ("← Kembali", terjaga, Plex Sans 500 · 14) top-left.
Centered brand block: wordmark (Fraunces 600 · 24 · terjaga) + "Kelola pengeluaran dan lihat berapa
yang aman kamu belanjakan hari ini." (Plex Sans 400 · 13 · kulit).
Then the auth card: `1.5px dashed #AEB9B2`, radius 12, white, `0 6px 20px rgba(24,37,31,0.10)`, padding 24.

- Heading "Masuk" / "Buat Akun" (Fraunces 600 · 20).
- Error banner when present: `borderLeftWidth: 3` peringatan, `rgba(195,68,61,0.06)` bg, radius 4, `padding: 10px 12px`, Plex Sans 400 · 12 / 1.5 · tinta.
- Fields, each with an icon + Plex Mono field label: Login = Email (`Mail`), Kata sandi (`Lock`).
  Register = Nama (`User`), Email, Kata sandi, Konfirmasi kata sandi.
  Inputs: `1.5px solid kulit`, radius 8, `padding: 13px 14px`, Plex Sans 400 · 14. Password placeholder is `••••••••`.
- Primary button: full-width terjaga, padding 15, radius 8, icon + label, `gap: 8`.
  Login icon `LogIn`, label "Masuk". Register icon `UserPlus`, label "Daftar".
- Divider: two `flex: 1` 1px kertas rules with "atau" (Plex Sans 400 · 12 · kulit) between, `gap: 12`.
- **Google is the secondary option, below the divider** — full-width white button,
  `1.5px solid kulit`, radius 8, padding 13, the 4-color Google mark (18px) + "Masuk dengan Google" /
  "Daftar dengan Google". Keep Google's official mark colors exactly: `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`.
- Footer switch: "Belum punya akun? **Daftar**" / "Sudah punya akun? **Masuk**", centered, marginTop 22,
  the action word in terjaga.

Validation (prototype-level, keep it): login requires both fields — "Email dan kata sandi wajib diisi."
Register requires name, email and password — "Semua kolom wajib diisi." — and the confirmation must
match — "Konfirmasi kata sandi tidak cocok."

---

## Known issues to fix during implementation

1. **Chips are 32px tall.** Below the 44px minimum. Keep the visual size, add `hitSlop={{ top: 6, bottom: 6 }}` — do not grow the chip.
2. **The home avatar is 30px.** Same treatment: wrap in a 44×44 pressable, keep the 30px circle centered.
3. **`TODAY` is frozen** at `new Date(2026, 7, 4)` so the prototype's overdue bill and payday countdown stay reproducible. Replace with a real clock, but keep it **injectable** — the date-dependent logic needs to stay testable.
4. **BCA is hardcoded** as the source account for bill payments and goal contributions. Make it a user choice.
5. **The report chart is hardcoded.** Wire to real aggregates.
6. **Dashed borders + `borderRadius` are unreliable on Android.** See CLAUDE.md — use the provided `DashedBox`.
7. **The safety buffer is invisible** on the breakdown screen despite being part of the math. Ask the user before adding a row.
