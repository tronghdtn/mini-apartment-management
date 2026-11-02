import { useCallback, useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { getResidentOverview } from './api'
import type { ResidentOverview } from './types'

/** Kết quả lượt tải hiện tại; khi tải lại, lượt cũ bị ẩn cho đến khi lượt mới trả về. */
export function useResidentOverview() {
  const { refresh } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ attempt: number; data?: ResidentOverview; error?: string }>()
  useEffect(() => {
    const abort = new AbortController()
    getResidentOverview(abort.signal)
      .then(data => { if (!abort.signal.aborted) setResult({ attempt, data }) })
      .catch(failure => {
        if (abort.signal.aborted) return
        setResult({ attempt, error: apiErrorMessage(failure) })
        if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh()
      })
    return () => abort.abort()
  }, [attempt, refresh])
  const reload = useCallback(() => setAttempt(value => value + 1), [])

  return { current: result?.attempt === attempt ? result : undefined, reload }
}
