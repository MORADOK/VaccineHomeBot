export type StaffRole = 'admin' | 'healthcare_staff'
export type AssignableRole = StaffRole | 'patient'

export function normalizeStaffEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export function mayManageRoles(callerRoles: readonly string[]): boolean {
  return callerRoles.includes('admin') || callerRoles.includes('superadmin')
}

export function mayGrantRole(callerRoles: readonly string[], role: unknown): boolean {
  if (!mayManageRoles(callerRoles)) return false
  if (role === 'admin') return callerRoles.includes('superadmin')
  return role === 'healthcare_staff' || role === 'patient'
}

export function mayInviteStaff(callerRoles: readonly string[], role: unknown): boolean {
  return (role === 'admin' || role === 'healthcare_staff') && mayGrantRole(callerRoles, role)
}

export function mayAssignExistingRole(
  callerRoles: readonly string[],
  callerId: string,
  targetId: string,
  targetRoles: readonly string[],
  requestedRole: unknown
): 'allowed' | 'forbidden' | 'already-assigned' | 'conflict' {
  if (!mayGrantRole(callerRoles, requestedRole)) return 'forbidden'
  if (callerId === targetId) return 'forbidden'
  if (targetRoles.includes('superadmin') && !callerRoles.includes('superadmin')) return 'forbidden'
  if (targetRoles.includes(requestedRole as string)) return 'already-assigned'
  if (targetRoles.length) return 'conflict'
  return 'allowed'
}
