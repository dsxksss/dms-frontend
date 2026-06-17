import { describe, it, expect } from 'vitest'
import { slugify, randomSlug, autoSlug } from '@/lib/slug'

describe('slugify', () => {
  it('lowercases and hyphenates ascii names', () => {
    expect(slugify('R&D Center')).toBe('r-d-center')
    expect(slugify('Acme Pharma')).toBe('acme-pharma')
  })

  it('trims leading/trailing separators', () => {
    expect(slugify('  Hello!  ')).toBe('hello')
    expect(slugify('--a--b--')).toBe('a-b')
  })

  it('returns empty for CJK-only names', () => {
    expect(slugify('恒瑞医药')).toBe('')
  })
})

describe('randomSlug', () => {
  it('uses the prefix and a short suffix', () => {
    expect(randomSlug('org')).toMatch(/^org-[a-z0-9]{1,6}$/)
  })
})

describe('autoSlug', () => {
  it('uses the ascii slug when available', () => {
    expect(autoSlug('Acme Pharma', 'org')).toBe('acme-pharma')
  })

  it('falls back to a random slug for CJK names', () => {
    expect(autoSlug('恒瑞医药', 'org')).toMatch(/^org-[a-z0-9]{1,6}$/)
  })
})
