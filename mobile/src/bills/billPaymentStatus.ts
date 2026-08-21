import type { components } from '../api/client'

type Bill = components['schemas']['Bill']

export function isPaidForPeriod(bill: Bill, periodDue: Date): boolean {
  if (!bill.last_paid_due_date) return false
  return new Date(bill.last_paid_due_date) >= periodDue
}
