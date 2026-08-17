/**
 * SakuPlan financial logic — pure, platform-free, UI-free.
 *
 * Ported verbatim from the prototype's `computeDerived` / mutation methods / `renderVals`
 * selectors. Selectors return DATA and SEMANTIC STATUS ('ok' | 'over' | 'overdue' | ...).
 * They never return colors — the components map status to color. That separation is the one
 * intentional change from the prototype, where colors were mixed into the selectors.
 *
 * Every function here is deterministic given (state, today). Keep it that way; this is the
 * part of the app that is worth unit-testing.
 */

import { daysBetween, fmtDateLong, parseIso } from './format'

// ---------------------------------------------------------------- types

export type AccountType = 'Tunai' | 'Bank' | 'E-Wallet' | 'Tabungan'
export type BillStatus = 'paid' | 'overdue' | 'upcoming'
export type SuggestionKind = 'update' | 'new'

export interface Account {
  id: number
  name: string
  type: AccountType
  balance: number
}
export interface Transaction {
  id: number
  date: string // local ISO date, no time
  desc: string
  category: string
  account: string
  amount: number // negative = expense, positive = income
}
export interface Budget {
  id: number
  name: string
  allocated: number
  spent: number
}
export interface Bill {
  id: number
  name: string
  amount: number
  due: string
  status: BillStatus
}
export interface Goal {
  id: number
  name: string
  target: number
  contributed: number
  deadline: string
}
export interface Notification {
  id: number
  text: string
  read: boolean
}
export interface AiSuggestion {
  id: number
  kind: SuggestionKind
  category: string
  current: number
  suggested: number
  reason: string
}
export interface Session {
  id: number
  device: string
  current: boolean
  active: string
}

export interface AppState {
  userName: string
  paydayDay: string // kept as a string because it is bound to a text input
  safetyBuffer: string
  aiConsent: boolean
  accounts: Account[]
  transactions: Transaction[]
  budgets: Budget[]
  bills: Bill[]
  goals: Goal[]
  notifications: Notification[]
  aiSuggestions: AiSuggestion[]
  sessions: Session[]
}

// ---------------------------------------------------------------- payday

/**
 * Next payday strictly after `today`.
 * If the chosen day-of-month does not exist in a month (e.g. 31 in February) the payday
 * falls on that month's last day. The profile screen states this rule to the user verbatim.
 */
export function nextPaydayDate(day: number, today: Date): Date {
  const d = Math.max(1, Math.min(31, day || 25))
  const candidateFor = (year: number, month: number) => {
    const lastDay = new Date(year, month + 1, 0).getDate()
    return new Date(year, month, Math.min(d, lastDay))
  }
  let cand = candidateFor(today.getFullYear(), today.getMonth())
  if (cand <= today) {
    let nm = today.getMonth() + 1
    let ny = today.getFullYear()
    if (nm > 11) {
      nm = 0
      ny++
    }
    cand = candidateFor(ny, nm)
  }
  return cand
}

// ---------------------------------------------------------------- the core calculation

export interface Derived {
  /** Cash you can actually touch. Excludes every 'Tabungan' account. */
  liquid: number
  unpaidBills: number
  /** Sum of each budget's UNSPENT remainder, floored at 0 per budget. */
  remainingBudget: number
  safetyBuffer: number
  safeUntilPayday: number
  /** Days until payday, floored at 1 so the division below can never blow up. */
  days: number
  safeToday: number
  paydayDate: Date
}

/**
 * safeUntilPayday = liquid − unpaidBills − remainingBudget − safetyBuffer
 * safeToday       = safeUntilPayday ÷ days
 *
 * Both can go negative; that is a real and expected state, and the UI reframes it as
 * "Batas harian terlampaui" rather than showing a minus figure. Do not clamp it here.
 */
export function computeDerived(state: AppState, today: Date): Derived {
  const liquid = state.accounts
    .filter((a) => a.type !== 'Tabungan')
    .reduce((s, a) => s + a.balance, 0)
  const unpaidBills = state.bills
    .filter((b) => b.status !== 'paid')
    .reduce((s, b) => s + b.amount, 0)
  const remainingBudget = state.budgets.reduce(
    (s, b) => s + Math.max(b.allocated - b.spent, 0),
    0
  )
  const safetyBuffer = parseInt(state.safetyBuffer, 10) || 0
  const paydayDate = nextPaydayDate(parseInt(state.paydayDay, 10), today)
  const safeUntilPayday = liquid - unpaidBills - remainingBudget - safetyBuffer
  let days = daysBetween(today, paydayDate)
  if (days < 1) days = 1
  return {
    liquid,
    unpaidBills,
    remainingBudget,
    safetyBuffer,
    safeUntilPayday,
    days,
    safeToday: safeUntilPayday / days,
    paydayDate,
  }
}

// ---------------------------------------------------------------- mutations
// Each returns a partial state patch. No mutation in place, no side effects.

export interface TransactionDraft {
  amount: number
  type: 'expense' | 'income'
  category: string
  account: string
  note: string
}

/**
 * Adds a transaction, moves the account balance, and increments the matching budget's
 * `spent` when it is an expense. Returns null when the amount is not a positive number —
 * the caller should treat that as "do nothing", exactly as the prototype does.
 */
export function addTransaction(
  state: AppState,
  draft: TransactionDraft,
  today: string
): Partial<AppState> | null {
  if (!draft.amount || draft.amount <= 0) return null
  const sign = draft.type === 'expense' ? -1 : 1
  const category =
    draft.type === 'income' ? 'Pemasukan' : draft.category || 'Lain-lain'

  const accounts = state.accounts.map((a) =>
    a.name === draft.account ? { ...a, balance: a.balance + sign * draft.amount } : a
  )
  const budgets =
    sign < 0
      ? state.budgets.map((b) =>
          b.name === category ? { ...b, spent: b.spent + draft.amount } : b
        )
      : state.budgets

  const txn: Transaction = {
    id: Date.now(),
    date: today,
    desc: draft.note || category,
    category,
    account: draft.account,
    amount: sign * draft.amount,
  }
  return { accounts, budgets, transactions: [txn, ...state.transactions] }
}

/**
 * Marks a bill paid, debits `sourceAccount`, and records the payment as a transaction.
 * The prototype hardcoded 'BCA'; that is now a parameter. Let the user pick it.
 */
export function markBillPaid(
  state: AppState,
  id: number,
  sourceAccount: string,
  today: string
): Partial<AppState> | null {
  const bill = state.bills.find((b) => b.id === id)
  if (!bill || bill.status === 'paid') return null
  const bills = state.bills.map((b) => (b.id === id ? { ...b, status: 'paid' as BillStatus } : b))
  const accounts = state.accounts.map((a) =>
    a.name === sourceAccount ? { ...a, balance: a.balance - bill.amount } : a
  )
  const txn: Transaction = {
    id: Date.now(),
    date: today,
    desc: `Bayar ${bill.name}`,
    category: 'Tagihan',
    account: sourceAccount,
    amount: -bill.amount,
  }
  return { bills, accounts, transactions: [txn, ...state.transactions] }
}

/** Moves money into a savings goal: goal up, source account down, transaction recorded. */
export function addGoalFunds(
  state: AppState,
  goalId: number,
  amount: number,
  sourceAccount: string,
  today: string
): Partial<AppState> | null {
  if (!amount || amount <= 0) return null
  const goal = state.goals.find((g) => g.id === goalId)
  if (!goal) return null
  const goals = state.goals.map((g) =>
    g.id === goalId ? { ...g, contributed: g.contributed + amount } : g
  )
  const accounts = state.accounts.map((a) =>
    a.name === sourceAccount ? { ...a, balance: a.balance - amount } : a
  )
  const txn: Transaction = {
    id: Date.now(),
    date: today,
    desc: `Transfer ke ${goal.name}`,
    category: 'Tabungan',
    account: sourceAccount,
    amount: -amount,
  }
  return { goals, accounts, transactions: [txn, ...state.transactions] }
}

/** Sets a budget's allocation. Rejects negatives; 0 is allowed. */
export function setBudgetAllocation(
  state: AppState,
  id: number,
  amount: number
): Partial<AppState> | null {
  if (!Number.isFinite(amount) || amount < 0) return null
  return { budgets: state.budgets.map((b) => (b.id === id ? { ...b, allocated: amount } : b)) }
}

/**
 * Applies an AI suggestion. 'update' overwrites the matching budget's allocation;
 * 'new' appends a budget with spent: 0. The suggestion is consumed either way.
 * Nothing here happens without an explicit user tap — that is the product's promise.
 */
export function approveSuggestion(state: AppState, id: number): Partial<AppState> | null {
  const s = state.aiSuggestions.find((x) => x.id === id)
  if (!s) return null
  const budgets =
    s.kind === 'update'
      ? state.budgets.map((b) => (b.name === s.category ? { ...b, allocated: s.suggested } : b))
      : [...state.budgets, { id: Date.now(), name: s.category, allocated: s.suggested, spent: 0 }]
  return { budgets, aiSuggestions: state.aiSuggestions.filter((x) => x.id !== id) }
}

export function rejectSuggestion(state: AppState, id: number): Partial<AppState> {
  return { aiSuggestions: state.aiSuggestions.filter((x) => x.id !== id) }
}

// ---------------------------------------------------------------- selectors

/** Top 3 budgets by amount spent, descending. Home "Pengeluaran terbesar bulan ini". */
export function topCategories(state: AppState) {
  return [...state.budgets].sort((a, b) => b.spent - a.spent).slice(0, 3)
}

/** The goal closest to completion by ratio. Drives the Home goal card. */
export function topGoal(state: AppState): Goal | undefined {
  return [...state.goals].sort(
    (a, b) => b.contributed / b.target - a.contributed / a.target
  )[0]
}

export interface AttentionItem {
  key: string
  kind: 'bill' | 'budget'
  refId: number
  title: string
  detail: string
  amount: number
  actionLabel: string
}

/**
 * The single "Perlu perhatian" list on Home. Deliberately merges two different problems —
 * overdue bills and blown budgets — because to the user they are the same thing:
 * something needs a decision right now.
 */
export function attentionItems(state: AppState, today: Date): AttentionItem[] {
  const overdue = state.bills.filter(
    (b) => b.status === 'overdue' || (b.status !== 'paid' && daysBetween(today, parseIso(b.due)) < 0)
  )
  const exceeded = state.budgets.filter((b) => b.spent > b.allocated)
  return [
    ...overdue.map((b) => ({
      key: `bill-${b.id}`,
      kind: 'bill' as const,
      refId: b.id,
      title: b.name,
      detail: `Terlambat ${Math.abs(daysBetween(today, parseIso(b.due)))} hari`,
      amount: b.amount,
      actionLabel: 'Tandai dibayar',
    })),
    ...exceeded.map((b) => ({
      key: `budget-${b.id}`,
      kind: 'budget' as const,
      refId: b.id,
      title: `Anggaran ${b.name} terlampaui`,
      detail: `Melebihi anggaran ${money(b.spent - b.allocated)} · terpakai ${money(b.spent)} dari ${money(b.allocated)}`,
      amount: b.spent - b.allocated,
      actionLabel: 'Lihat anggaran',
    })),
  ]
}

export interface BudgetRow extends Budget {
  pct: number
  barWidth: number
  over: boolean
  overage: number
}

export function budgetRows(state: AppState): BudgetRow[] {
  return state.budgets.map((b) => {
    const pct = Math.round((b.spent / b.allocated) * 100) || 0
    return {
      ...b,
      pct,
      barWidth: Math.min(pct, 100),
      over: b.spent > b.allocated,
      overage: b.spent - b.allocated,
    }
  })
}

export type BillState = 'paid' | 'overdue' | 'today' | 'upcoming'

export interface BillRow extends Bill {
  state: BillState
  statusLabel: string
  canPay: boolean
}

export function billRows(state: AppState, today: Date): BillRow[] {
  return state.bills.map((b) => {
    const diff = daysBetween(today, parseIso(b.due))
    let s: BillState
    let statusLabel: string
    if (b.status === 'paid') {
      s = 'paid'
      statusLabel = `Lunas · ${fmtDateLong(b.due)}`
    } else if (b.status === 'overdue' || diff < 0) {
      s = 'overdue'
      statusLabel = `Lewat jatuh tempo ${Math.abs(diff)} hari`
    } else if (diff === 0) {
      s = 'today'
      statusLabel = 'Jatuh tempo hari ini'
    } else {
      s = 'upcoming'
      statusLabel = `Jatuh tempo ${fmtDateLong(b.due)} (${diff} hari lagi)`
    }
    return { ...b, state: s, statusLabel, canPay: b.status !== 'paid' }
  })
}

export function goalRows(state: AppState) {
  return state.goals.map((g) => ({
    ...g,
    pct: Math.min(100, Math.round((g.contributed / g.target) * 100)),
    deadlineLabel: fmtDateLong(g.deadline),
  }))
}

/** Laporan bars normalize against the LARGEST category, not against each allocation. */
export function categoryBars(state: AppState) {
  const max = Math.max(...state.budgets.map((b) => b.spent), 1)
  return state.budgets.map((b) => ({
    name: b.name,
    spent: b.spent,
    pct: Math.round((b.spent / max) * 100),
  }))
}

export function transactionRows(state: AppState) {
  return [...state.transactions].sort((a, b) => b.id - a.id)
}

export function budgetTotals(state: AppState) {
  return {
    allocated: state.budgets.reduce((s, b) => s + b.allocated, 0),
    spent: state.budgets.reduce((s, b) => s + b.spent, 0),
  }
}

export function totalBalance(state: AppState): number {
  return state.accounts.reduce((s, a) => s + a.balance, 0)
}

export function unreadCount(state: AppState): number {
  return state.notifications.filter((n) => !n.read).length
}

/** AI is surfaced only with consent AND pending suggestions. */
export function hasAi(state: AppState): boolean {
  return state.aiSuggestions.length > 0 && state.aiConsent
}

/** Accounts eligible to fund a transaction — savings are excluded by design. */
export function spendableAccounts(state: AppState): Account[] {
  return state.accounts.filter((a) => a.type !== 'Tabungan')
}

// ---------------------------------------------------------------- chart

/**
 * Cash-flow chart geometry for the 380×130 viewBox.
 * TODO(handoff): the series is placeholder data from the prototype. Replace `income` and
 * `expense` with real monthly aggregates; keep the projection maths unchanged.
 */
export function cashflowChart(
  months: string[],
  income: number[],
  expense: number[],
  maxV = 9_000_000
) {
  const W = 380
  const H = 130
  const stepX = W / (months.length - 1)
  const toY = (v: number) => H - (v / maxV) * 110
  const project = (vals: number[]) =>
    vals.map((v, i) => ({ x: +(i * stepX).toFixed(1), y: +toY(v).toFixed(1) }))
  const toPoints = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x},${p.y}`).join(' ')
  const incomePts = project(income)
  const expensePts = project(expense)
  const last = months.length - 1
  return {
    width: W,
    height: H,
    gridY: [20, 70, 120],
    months,
    incomePoints: toPoints(incomePts),
    expensePoints: toPoints(expensePts),
    summary: {
      income: income[last],
      expense: expense[last],
      net: income[last] - expense[last],
    },
  }
}

// Local copy so this module has zero imports from the formatting layer beyond dates.
function money(n: number): string {
  const r = Math.round(n || 0)
  const neg = r < 0
  const digits = String(Math.abs(r))
  let out = ''
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += '.'
    out += digits[i]
  }
  return (neg ? '-' : '') + 'Rp' + out
}
