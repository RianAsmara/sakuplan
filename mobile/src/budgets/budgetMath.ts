export function sumAllocations(allocations: Record<string, number>): number {
  return Object.values(allocations).reduce((sum, value) => sum + value, 0)
}

export function computeUnallocated(
  expectedIncome: number,
  savingsCommitment: number,
  minimumBuffer: number,
  allocations: Record<string, number>
): number {
  return expectedIncome - savingsCommitment - minimumBuffer - sumAllocations(allocations)
}
