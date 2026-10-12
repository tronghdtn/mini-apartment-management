import { useEffect, useState } from 'react'
import { getHealth } from './api'
import type { HealthStatus } from './types'

type State =
  | { kind: 'loading' }
  | { kind: 'success'; health: HealthStatus }
  | { kind: 'error'; message: string }

/** Hiển thị trạng thái kết nối tới API `/api/v1/health` — dùng để kiểm tra môi trường. */
export function ApiStatusCard() {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    getHealth(controller.signal)
      .then((health) => setState({ kind: 'success', health }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({ kind: 'error', message: error instanceof Error ? error.message : 'Lỗi không xác định' })
      })

    return () => controller.abort()
  }, [])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Trạng thái hệ thống</h2>

      {state.kind === 'loading' && <p className="mt-3 text-slate-500">Đang kiểm tra kết nối API…</p>}

      {state.kind === 'error' && (
        <p className="mt-3 text-red-600">Không kết nối được API: {state.message}</p>
      )}

      {state.kind === 'success' && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">API</dt>
          <dd>
            <StatusDot ok={state.health.status === 'ok'} />
            {state.health.status === 'ok' ? 'Hoạt động' : 'Có sự cố'}
          </dd>
          <dt className="text-slate-500">Cơ sở dữ liệu</dt>
          <dd>
            <StatusDot ok={state.health.database.status === 'ok'} />
            {state.health.database.driver}
            {state.health.database.error && (
              <span className="block text-xs text-red-600">{state.health.database.error}</span>
            )}
          </dd>
          {state.health.laravel_version && (
            <>
              <dt className="text-slate-500">Laravel / PHP</dt>
              <dd>
                {state.health.laravel_version} / {state.health.php_version}
              </dd>
            </>
          )}
        </dl>
      )}
    </div>
  )
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden
      className={`mr-2 inline-block size-2 rounded-full align-middle ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
    />
  )
}
