import { useCallback, useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { apiErrorMessage } from '@/lib/apiErrors'

/**
 * Tải một tài nguyên theo khóa; đổi khóa thì hủy request cũ và không hiện kết quả của khóa trước.
 * `key = null` nghĩa là chưa đủ điều kiện gọi API (ví dụ ID trên URL sai).
 */
export function useApiResource<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>, onAuthFailure?: () => void) {
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState<{ key: string; data?: T; error?: string }>()
  const fullKey = key === null ? null : `${key}:${retry}`
  useEffect(() => {
    if (fullKey === null) return
    const abort = new AbortController()
    // StrictMode dọn lượt effect thử trước khi microtask này gửi request.
    void Promise.resolve()
      .then(async () => {
        if (abort.signal.aborted) return
        const data = await load(abort.signal)
        if (!abort.signal.aborted) setResult({ key: fullKey, data })
      })
      .catch(failure => {
        if (abort.signal.aborted) return
        setResult({ key: fullKey, error: apiErrorMessage(failure) })
        if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure?.()
      })
    return () => abort.abort()
    // `load` đổi theo mỗi lần render; khóa đã đại diện cho đầu vào của request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey])
  const reload = useCallback(() => setRetry(value => value + 1), [])
  const current = result?.key === fullKey ? result : undefined

  return { data: current?.data, error: current?.error, reload }
}
