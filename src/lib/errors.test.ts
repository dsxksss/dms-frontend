import { describe, it, expect } from 'vitest'
import { AppError, quotaI18nKey } from '@/lib/errors'

const conflict = (detail: string) =>
  new AppError('conflict', 409, detail, { detail })

describe('quotaI18nKey', () => {
  it('maps quota 409 details to friendly keys', () => {
    expect(
      quotaI18nKey(conflict('organization limit reached (1); upgrade plan for more')),
    ).toBe('error.quota.orgs')
    expect(
      quotaI18nKey(
        conflict('organization member limit reached (1); upgrade plan for more'),
      ),
    ).toBe('error.quota.users')
    expect(
      quotaI18nKey(
        conflict('storage quota exceeded (5+5 > 3 bytes); upgrade plan for more'),
      ),
    ).toBe('error.quota.storage')
  })

  it('returns null for non-quota errors', () => {
    expect(quotaI18nKey(conflict('version conflict'))).toBeNull()
    expect(quotaI18nKey(new AppError('validation', 422, 'bad'))).toBeNull()
    expect(quotaI18nKey(new Error('x'))).toBeNull()
  })
})
