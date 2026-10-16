import { describe, expect, it } from 'vitest'
import {
  normalizeStaffEmail,
  mayManageRoles,
  mayGrantRole,
  mayInviteStaff,
  mayAssignExistingRole,
} from '../../supabase/functions/_shared/staff-role-policy'

describe('staff invitation and role assignment policy', () => {
  it('normalizes valid emails and rejects invalid input', () => {
    expect(normalizeStaffEmail('  TEST@Example.com  ')).toBe('test@example.com')
    expect(normalizeStaffEmail('not-an-email')).toBeNull()
    expect(normalizeStaffEmail(null)).toBeNull()
    expect(normalizeStaffEmail('test@')).toBeNull()
  })

  it('denies anonymous and staff callers', () => {
    expect(mayManageRoles([])).toBe(false)
    expect(mayManageRoles(['healthcare_staff'])).toBe(false)
    expect(mayInviteStaff(['healthcare_staff'], 'healthcare_staff')).toBe(false)
    expect(mayGrantRole([], 'admin')).toBe(false)
  })

  it('allows admin to invite staff but not admins', () => {
    expect(mayInviteStaff(['admin'], 'healthcare_staff')).toBe(true)
    expect(mayInviteStaff(['admin'], 'admin')).toBe(false)
    expect(mayInviteStaff(['admin'], 'patient')).toBe(false)
  })

  it('allows superadmin to invite admin and staff', () => {
    expect(mayInviteStaff(['superadmin'], 'admin')).toBe(true)
    expect(mayInviteStaff(['superadmin'], 'healthcare_staff')).toBe(true)
  })

  it('rejects own role changes and unauthorized elevation', () => {
    expect(mayAssignExistingRole(['admin'], 'same', 'same', [], 'healthcare_staff')).toBe('forbidden')
    expect(mayAssignExistingRole(['admin'], 'caller', 'other', [], 'admin')).toBe('forbidden')
    expect(mayAssignExistingRole(['admin'], 'caller', 'other', ['superadmin'], 'patient')).toBe('forbidden')
  })

  it('does not duplicate or accumulate conflicting roles', () => {
    expect(mayAssignExistingRole(['admin'], 'caller', 'other', ['healthcare_staff'], 'healthcare_staff')).toBe('already-assigned')
    expect(mayAssignExistingRole(['admin'], 'caller', 'other', ['patient'], 'healthcare_staff')).toBe('conflict')
    expect(mayAssignExistingRole(['admin'], 'caller', 'other', [], 'healthcare_staff')).toBe('allowed')
  })
})
