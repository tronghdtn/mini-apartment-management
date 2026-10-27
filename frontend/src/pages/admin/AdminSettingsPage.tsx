import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { Building2, Calendar, CreditCard, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { DaySettingForm } from '@/features/settings/DaySettingForm'
import { getSettings } from '@/features/settings/api'
import { daySettingLabels } from '@/features/settings/types'
import type { DaySettingKey, Setting, SettingsResult } from '@/features/settings/types'
import { apiErrorMessage } from '@/lib/apiErrors'

const readOnlySections = [
  { title: 'Thông tin hệ thống và liên hệ', icon: Building2, fields: [
    ['system.name', 'Tên hệ thống'], ['system.contact_phone', 'Số điện thoại liên hệ'], ['system.contact_email', 'Email liên hệ'],
  ] },
  { title: 'Tài khoản ngân hàng', icon: CreditCard, fields: [
    ['bank.name', 'Ngân hàng'], ['bank.account_number', 'Số tài khoản'], ['bank.account_holder', 'Chủ tài khoản'],
  ] },
]

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
    setSuccess(`Đã lưu ${daySettingLabels[setting.key as DaySettingKey].toLowerCase()}: ${setting.value} ngày.`)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Cấu hình / Cài đặt hệ thống</p>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5"><Settings aria-hidden="true" className="w-6 h-6 text-sky-600" />Cài đặt hệ thống</h1>
        <p className="text-sm text-slate-500 mt-2">Xem cấu hình hiện có và lưu riêng từng tham số thời hạn.</p>
      </header>
      {success && <p role="status" className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800">{success}</p>}
      {loading ? <p role="status" className="text-sm text-slate-500 py-6">Đang tải cấu hình…</p> : error ? (
        <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
          <p className="text-sm text-rose-700">{error}</p>
          <Button variant="outline" onClick={() => { setError(''); setLoading(true); setRevision(value => value + 1) }}>Thử lại</Button>
        </div>
      ) : result && <>
        {result.missing_keys.length > 0 && <p role="note" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">Còn {result.missing_keys.length} khóa chưa cấu hình. Các giá trị chưa có được để trống, không dùng dữ liệu mẫu.</p>}
        {readOnlySections.map(({ title, icon: Icon, fields }) => (
          <section key={title} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <h2 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3"><Icon aria-hidden="true" className="w-5 h-5 text-sky-600" />{title}</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map(([key, label]) => <div key={key}><dt className="text-sm font-semibold text-slate-500">{label}</dt><dd className="text-sm text-slate-800 mt-1 break-words">{result.data.find(setting => setting.key === key)?.value || 'Chưa cấu hình'}</dd></div>)}
            </dl>
            <p className="text-xs text-slate-500">Thông tin này hiện chỉ đọc.</p>
          </section>
        ))}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3"><Calendar aria-hidden="true" className="w-5 h-5 text-sky-600" />Tham số thời hạn</h2>
          {(Object.keys(daySettingLabels) as DaySettingKey[]).map(key => <DaySettingForm key={key} settingKey={key} setting={result.data.find(setting => setting.key === key)} onSaved={saved} onAuthFailure={() => void refresh()} />)}
          <p className="text-sm text-slate-500">Mỗi nút chỉ lưu tham số tương ứng. Không sửa thời hạn trên hóa đơn hoặc hợp đồng đã phát sinh.</p>
        </section>
        <p className="text-sm text-slate-500">Thanh toán online và mã QR chưa được kết nối trong phần cấu hình này.</p>
      </>}
    </div>
  )
}
