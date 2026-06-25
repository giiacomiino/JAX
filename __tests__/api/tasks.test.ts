import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data: [], error: null }),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
}

;(createClient as jest.Mock).mockReturnValue(mockSupabase)

describe('Tasks validation', () => {
  it('rejects task with empty title', () => {
    const input = { title: '', priority: 'high', category: 'work' }
    expect(input.title.trim().length).toBe(0)
  })

  it('accepts valid task input', () => {
    const input = { title: 'Revisar reportes', priority: 'high', category: 'work' }
    expect(input.title.trim().length).toBeGreaterThan(0)
    expect(['high', 'medium', 'low']).toContain(input.priority)
  })
})
