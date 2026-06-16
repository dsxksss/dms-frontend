import { describe, it, expect } from 'vitest'
import { tenantFromHost } from '@/lib/tenant'

describe('tenantFromHost', () => {
  it('resolves a single subdomain label to the tenant', () => {
    expect(tenantFromHost('acme.dms.app', 'dms.app')).toBe('acme')
    expect(tenantFromHost('ACME.dms.app:8080', '.dms.app')).toBe('acme')
  })

  it('returns null for non-tenant hosts', () => {
    expect(tenantFromHost('dms.app', 'dms.app')).toBeNull()
    expect(tenantFromHost('www.dms.app', 'dms.app')).toBeNull()
    expect(tenantFromHost('api.dms.app', 'dms.app')).toBeNull()
    expect(tenantFromHost('a.b.dms.app', 'dms.app')).toBeNull()
    expect(tenantFromHost('localhost:5173', 'dms.app')).toBeNull()
    expect(tenantFromHost('acme.dms.app', '')).toBeNull()
    expect(tenantFromHost('acme.dms.app', undefined)).toBeNull()
  })
})
