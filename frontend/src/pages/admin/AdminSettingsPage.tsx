import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { Building2, Calendar, CreditCard, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { DaySettingForm } from '@/features/settings/DaySettingForm'
import { SystemSettingForm } from '@/features/settings/SystemSettingForm'
import { getSettings } from '@/features/settings/api'
import { bankSettingLabels, daySettingLabels, systemSettingLabels, textSettingLabels } from '@/features/settings/types'
import type { BankSettingKey, DaySettingKey, SystemSettingKey, Setting, SettingsResult } from '@/features/settings/types'
import { apiErrorMessage } from '@/lib/apiErrors'

export function AdminSettingsPage() {
  const { refresh } = useAuth()
  const [result, setResult] = useState<SettingsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getSettings(controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data) })
      .catch(failure => {
        if (!controller.signal.aborted) {
          setError(apiErrorMessage(failure))
          if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh()
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [revision, refresh])

  function saved(setting: Setting) {
    setResult(current => current && ({
      data: [...current.data.filter(item => item.key !== setting.key), setting],
      missing_keys: current.missing_keys.filter(key => key !== setting.key),
    }))
    setSuccess(`Đã lưu ${({ ...daySettingLabels, ...textSettingLabels } as Record<string, string>)[setting.key].toLowerCase()}.`)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Cấu hình / Cài đặt hệ thống</p>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5"><Settings aria-hidden="true" className="w-6 h-6 text-sky-600" />Cài đặt hệ thống</h1>
        <p className="text-sm text-slate-500 mt-2">Mỗi thông tin hệ thống, ngân hàng và tham số thời hạn được lưu riêng.</p>
      </header>
      {success && <p role="status" className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800">{success}</p>}
      {loading ? <p role="status" className="text-sm text-slate-500 py-6">Đang tải cấu hình…</p> : error ? (
        <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
          <p className="text-sm text-rose-700">{error}</p>
          <Button variant="outline" onClick={() => { setError(''); setLoading(true); setRevision(value => value + 1) }}>Thử lại</Button>
        </div>
      ) : result && <>
        {result.missing_keys.length > 0 && <p role="note" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">Còn {result.missing_keys.length} khóa chưa cấu hình. Các giá trị chưa có được để trống, không dùng dữ liệu mẫu.</p>}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-3 border-b border-slate-100 pb-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sm text-sky-700">1</span><Building2 aria-hidden="true" className="w-4 h-4 text-sky-600" />Thông tin hệ thống và liên hệ</h2>
          {(Object.keys(systemSettingLabels) as SystemSettingKey[]).map(key => <SystemSettingForm key={key} settingKey={key} setting={result.data.find(setting => setting.key === key)} onSaved={saved} onAuthFailure={() => void refresh()} />)}
        </section>
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-3 border-b border-slate-100 pb-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sm text-sky-700">2</span><CreditCard aria-hidden="true" className="w-4 h-4 text-sky-600" />Tài khoản ngân hàng nhận chuyển khoản</h2>
          {(Object.keys(bankSettingLabels) as BankSettingKey[]).map(key => <SystemSettingForm key={key} settingKey={key} setting={result.data.find(setting => setting.key === key)} onSaved={saved} onAuthFailure={() => void refresh()} />)}
          <p className="text-xs text-slate-500">Cư dân thấy đủ ba thông tin này trên hóa đơn còn nợ để tự chuyển khoản. Đổi thông tin không làm thay đổi hóa đơn hay thanh toán đã có.</p>
        </section>
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-3 border-b border-slate-100 pb-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sm text-sky-700">3</span><Calendar aria-hidden="true" className="w-4 h-4 text-sky-600" />Tham số thời hạn</h2>
          {(Object.keys(daySettingLabels) as DaySettingKey[]).map(key => <DaySettingForm key={key} settingKey={key} setting={result.data.find(setting => setting.key === key)} onSaved={saved} onAuthFailure={() => void refresh()} />)}
          <p className="text-sm text-slate-500">Mỗi nút chỉ lưu tham số tương ứng. Không sửa thời hạn trên hóa đơn hoặc hợp đồng đã phát sinh.</p>
        </section>
        <p className="text-sm text-slate-500">Thanh toán online và mã QR chưa được kết nối trong phần cấu hình này.</p>
      </>}
    </div>
  )
}
