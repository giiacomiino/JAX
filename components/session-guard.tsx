'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SessionGuard() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const remember = localStorage.getItem('jax_remember')
    if (remember === 'false') {
      // Session-only mode: if sessionStorage flag is gone, browser was closed → sign out
      const sessionActive = sessionStorage.getItem('jax_session_active')
      if (!sessionActive) {
        supabase.auth.signOut().then(() => {
          router.push('/login')
          router.refresh()
        })
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
