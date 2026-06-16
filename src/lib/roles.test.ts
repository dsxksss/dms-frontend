import { describe, it, expect } from 'vitest'
import { roleAtLeast } from '@/lib/roles'

describe('roleAtLeast', () => {
  it('respects the hierarchy owner > manager > contributor > viewer', () => {
    expect(roleAtLeast('owner', 'manager')).toBe(true)
    expect(roleAtLeast('manager', 'manager')).toBe(true)
    expect(roleAtLeast('contributor', 'manager')).toBe(false)
    expect(roleAtLeast('viewer', 'contributor')).toBe(false)
    expect(roleAtLeast('contributor', 'viewer')).toBe(true)
  })

  it('treats non-members (null/undefined) as below any role', () => {
    expect(roleAtLeast(null, 'viewer')).toBe(false)
    expect(roleAtLeast(undefined, 'viewer')).toBe(false)
  })
})
