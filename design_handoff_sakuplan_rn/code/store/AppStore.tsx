import React, { createContext, useContext, useMemo, useState } from 'react'
import * as F from '../lib/finance'
import { seedState, FROZEN_TODAY } from '../data/seed'
import { toLocalIso } from '../lib/format'

/**
 * Deliberately dependency-free: React context + useState, no zustand/redux.
 * The prototype was one component holding one state object, and the app is small enough
 * that this is a faithful and honest port. If your codebase already standardises on a
 * store, move `state` into it — every mutation is already a pure (state) => patch function
 * in lib/finance.ts, so the swap is mechanical.
 */

const SOURCE_ACCOUNT = 'BCA' // TODO(handoff): let the user pick this. See SCREENS.md #4.

interface Ctx {
  state: F.AppState
  today: Date
  derived: F.Derived
  patch: (p: Partial<F.AppState>) => void
  actions: {
    addTransaction: (draft: F.TransactionDraft) => void
    markBillPaid: (id: number) => void
    addGoalFunds: (goalId: number, amount: number) => void
    setBudgetAllocation: (id: number, amount: number) => void
    approveSuggestion: (id: number) => void
    rejectSuggestion: (id: number) => void
    markNotificationRead: (id: number) => void
    revokeSession: (id: number) => void
    setUserName: (v: string) => void
    setPaydayDay: (v: string) => void
    setSafetyBuffer: (v: string) => void
    toggleAiConsent: () => void
  }
}

const AppContext = createContext<Ctx | null>(null)

export function AppProvider({
  children,
  initial = seedState,
  today = FROZEN_TODAY,
}: {
  children: React.ReactNode
  initial?: F.AppState
  today?: Date
}) {
  const [state, setState] = useState<F.AppState>(initial)
  const todayIso = toLocalIso(today)

  const value = useMemo<Ctx>(() => {
    const patch = (p: Partial<F.AppState>) => setState((s) => ({ ...s, ...p }))
    /** Applies a pure mutation; a null result means "invalid input, do nothing". */
    const apply = (fn: (s: F.AppState) => Partial<F.AppState> | null) =>
      setState((s) => {
        const p = fn(s)
        return p ? { ...s, ...p } : s
      })

    return {
      state,
      today,
      derived: F.computeDerived(state, today),
      patch,
      actions: {
        addTransaction: (draft) => apply((s) => F.addTransaction(s, draft, todayIso)),
        markBillPaid: (id) => apply((s) => F.markBillPaid(s, id, SOURCE_ACCOUNT, todayIso)),
        addGoalFunds: (goalId, amount) =>
          apply((s) => F.addGoalFunds(s, goalId, amount, SOURCE_ACCOUNT, todayIso)),
        setBudgetAllocation: (id, amount) => apply((s) => F.setBudgetAllocation(s, id, amount)),
        approveSuggestion: (id) => apply((s) => F.approveSuggestion(s, id)),
        rejectSuggestion: (id) => apply((s) => F.rejectSuggestion(s, id)),
        markNotificationRead: (id) =>
          setState((s) => ({
            ...s,
            notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
          })),
        revokeSession: (id) =>
          setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) })),
        setUserName: (v) => patch({ userName: v }),
        setPaydayDay: (v) => patch({ paydayDay: v }),
        setSafetyBuffer: (v) => patch({ safetyBuffer: v }),
        toggleAiConsent: () => setState((s) => ({ ...s, aiConsent: !s.aiConsent })),
      },
    }
  }, [state, today, todayIso])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
