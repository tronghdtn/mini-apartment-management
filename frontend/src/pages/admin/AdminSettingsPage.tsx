import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, Landmark, QrCode, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { apiConflictMessage, apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { getSettings, saveDaySetting, saveSystemSetting } from '@/features/settings/api'
import { daySettingSchema, systemSettingSchema, type DaySettingInput, type SystemSettingInput } from '@/features/settings/schemas'
import type { DaySettingKey, Setting, TextSettingKey } from '@/features/settings/types'
import { buildVietQrUrl, saveCustomQrDataUrl, syncSiteSettingsFromApi, usePublicSettings } from '@/lib/publicSettings'

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition'

function TextSettingCard({ settingKey, label, hint, inputType = 'text', currentValue, busy, onBusyChange, onSaved }: {
  settingKey: TextSettingKey
  label: string
  hint: string
  inputType?: 'text' | 'email'
  currentValue: string | null
  busy: boolean
  onBusyChange: (busy: boolean) => void
  onSaved: (setting: Setting) => void
}) {
  const id = useId()
  const [notice, setNotice] = useState('')
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<SystemSettingInput>({
    resolver: zodResolver(systemSettingSchema(settingKey)),
    defaultValues: { value: currentValue ?? '' },
  })
  useEffect(() => { reset({ value: currentValue ?? '' }) }, [currentValue, reset])
  const submit = handleSubmit(async input => {
    setNotice('')
    onBusyChange(true)
    try {
      const saved = await saveSystemSetting(settingKey, input, currentValue)
      onSaved(saved)
      setNotice(saved.value === null ? `Đã xóa ${label.toLowerCase()}.` : `Đã lưu ${label.toLowerCase()}.`)
    } catch (failure) {
      applyApiErrors(failure, setError, ['value'])
      setError('root', { message: apiConflictMessage(failure) })
    } finally {
      onBusyChange(false)
    }
  })

  const placeholders: Record<TextSettingKey, string> = {
    'system.name': 'VD: Hệ thống Căn hộ MiniApart',
    'system.contact_phone': 'VD: 0901.000.001',
    'system.contact_email': 'VD: contact@miniapart.vn',
    'bank.name': 'VD: Vietcombank, MB Bank, Techcombank, BIDV...',
    'bank.account_number': 'VD: 0071000123456',
    'bank.account_holder': 'VD: NGUYEN DUC TRONG',
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={isSubmitting} className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/40">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <label htmlFor={id} className="block text-sm font-bold text-slate-900">{label}</label>
          <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
        </div>
        <span className="text-xs font-medium text-slate-500">
          Hiện tại: <strong className="text-slate-800">{currentValue === null || currentValue.trim() === '' ? 'Chưa cấu hình' : currentValue}</strong>
        </span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
        <div className="flex-1">
          <input
            id={id}
            type={inputType}
            disabled={busy}
            placeholder={placeholders[settingKey]}
            {...register('value', { onChange: () => setNotice('') })}
            aria-invalid={!!errors.value}
            aria-describedby={`${id}-error`}
            className={inputClass}
          />
          <p id={`${id}-error`} className="text-xs text-rose-600 mt-1">{errors.value?.message}</p>
        </div>
        <Button type="submit" disabled={busy} isLoading={isSubmitting} aria-label={`Lưu ${label.toLowerCase()}`}>Lưu</Button>
      </div>
      {errors.root && <p role="alert" className="text-xs text-rose-700">{errors.root.message}</p>}
      {notice && <p role="status" className="text-xs font-semibold text-emerald-700">{notice}</p>}
    </form>
  )
}

function DaySettingForm({ settingKey, label, hint, currentValue, busy, onBusyChange, onSaved }: {
  settingKey: DaySettingKey
  label: string
  hint: string
  currentValue: string | undefined
  busy: boolean
  onBusyChange: (busy: boolean) => void
  onSaved: (setting: Setting) => void
}) {
  const id = useId()
  const [notice, setNotice] = useState('')
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<DaySettingInput>({
    resolver: zodResolver(daySettingSchema),
    defaultValues: { value: currentValue ?? '' },
  })
  useEffect(() => { reset({ value: currentValue ?? '' }) }, [currentValue, reset])
  const submit = handleSubmit(async input => {
    setNotice('')
    onBusyChange(true)
    try {
      const saved = await saveDaySetting(settingKey, input)
      onSaved(saved)
      setNotice(`Đã lưu ${label.toLowerCase()}: ${saved.value ?? input.value} ngày.`)
    } catch (failure) {
      applyApiErrors(failure, setError, ['value'])
    } finally {
      onBusyChange(false)
    }
  })
  return (
    <form onSubmit={submit} noValidate aria-busy={isSubmitting} className="space-y-3 rounded-2xl border border-slate-200 p-4 bg-slate-50/40">
      <div>
        <label htmlFor={id} className="block text-sm font-bold text-slate-900">{label}</label>
        <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
        <div className="flex-1">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            disabled={busy}
            placeholder="VD: 5"
            {...register('value')}
            aria-invalid={!!errors.value}
            aria-describedby={`${id}-error`}
            className={inputClass}
          />
          <p id={`${id}-error`} className="text-xs text-rose-600 mt-1">{errors.value?.message}</p>
        </div>
        <Button type="submit" disabled={busy} isLoading={isSubmitting} aria-label={`Lưu ${label.toLowerCase()}`}>Lưu</Button>
      </div>
      {errors.root && <p role="alert" className="text-xs text-rose-700">{errors.root.message}</p>}
      {notice && <p role="status" className="text-xs font-semibold text-emerald-700">{notice}</p>}
    </form>
  )
}

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [missingKeys, setMissingKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [qrNotice, setQrNotice] = useState('')
  const qrInputRef = useRef<HTMLInputElement>(null)
  const siteSettings = usePublicSettings()

  useEffect(() => {
    const controller = new AbortController()
    getSettings(controller.signal)
      .then(result => {
        if (!controller.signal.aborted) {
          setSettings(result.data)
          setMissingKeys(result.missing_keys ?? [])
          syncSiteSettingsFromApi(result.data)
        }
      })
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [revision])

  const byKey = new Map(settings.map(item => [item.key, item]))
  const valueOf = (key: string) => byKey.get(key)?.value ?? null
  const updateOne = (saved: Setting) => {
    setSettings(current => {
      const next = current.some(item => item.key === saved.key)
        ? current.map(item => item.key === saved.key ? saved : item)
        : [...current, saved]
      syncSiteSettingsFromApi(next)
      return next
    })
    setMissingKeys(current => current.filter(key => key !== saved.key))
  }

  const handleUploadCustomQr = (file: File | undefined) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setQrNotice('Vui lòng chọn ảnh JPG, PNG hoặc WebP tối đa 5MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        saveCustomQrDataUrl(reader.result)
        setQrNotice('Đã lưu ảnh Mã QR chuyển khoản. Ảnh này sẽ hiển thị trên toàn bộ hóa đơn!')
      }
    }
    reader.readAsDataURL(file)
    if (qrInputRef.current) qrInputRef.current.value = ''
  }

  const bankName = valueOf('bank.name')
  const bankAccountNumber = valueOf('bank.account_number')
  const bankAccountHolder = valueOf('bank.account_holder')
  const autoVietQrUrl = buildVietQrUrl({
    bankName,
    accountNumber: bankAccountNumber,
    accountHolder: bankAccountHolder,
    amount: 4500000,
    transferContent: 'THANH TOAN PHONG A101',
  })
  const activeQrImage = siteSettings.customQrDataUrl || autoVietQrUrl

  if (loading) return <p role="status" className="text-sm text-slate-500 py-6">Đang tải cài đặt hệ thống…</p>
  if (error) return (
    <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
      <p className="text-sm text-rose-700">{error}</p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => { setLoading(true); setError(''); setRevision(value => value + 1) }}>Thử lại</Button>
        <a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Cài Đặt Hệ Thống</h1>
          <p className="text-xs text-slate-500 mt-1">
            Thông tin thương hiệu, hotline liên hệ, tài khoản ngân hàng nhận tiền & mã QR thanh toán hóa đơn.
          </p>
        </div>
        <Button variant="outline" disabled={busy} onClick={() => { setLoading(true); setError(''); setRevision(value => value + 1) }}>
          Tải lại cài đặt
        </Button>
      </div>

      {missingKeys.length > 0 && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          Một số khóa cấu hình chưa có bản ghi khởi tạo ({missingKeys.join(', ')}); bạn có thể nhập giá trị và bấm Lưu ở từng mục bên dưới để khởi tạo ngay.
        </p>
      )}

      <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h2 className="font-bold text-base text-slate-900">1. Thông tin hệ thống & Liên hệ công khai</h2>
          <p className="text-xs text-slate-500 mt-1">
            Khi cập nhật tại đây, Tên hệ thống, Số điện thoại Hotline và Email sẽ đồng bộ ngay lập tức lên thanh menu Trang chủ, Chân trang, Trang Liên hệ và Trang Chi tiết phòng.
          </p>
        </div>
        <div className="space-y-4">
          <TextSettingCard settingKey="system.name" label="Tên hệ thống" hint="Tên thương hiệu hiển thị trên thanh điều hướng và chân trang công khai (tối đa 191 ký tự)." currentValue={valueOf('system.name')} busy={busy} onBusyChange={setBusy} onSaved={updateOne} />
          <TextSettingCard settingKey="system.contact_phone" label="Số điện thoại liên hệ (Hotline)" hint="Số điện thoại tư vấn hiển thị trên nút Hotline của Trang chủ và trang Liên hệ." currentValue={valueOf('system.contact_phone')} busy={busy} onBusyChange={setBusy} onSaved={updateOne} />
          <TextSettingCard settingKey="system.contact_email" label="Email liên hệ" hint="Địa chỉ email nhận phản hồi của khách hàng và cư dân." inputType="email" currentValue={valueOf('system.contact_email')} busy={busy} onBusyChange={setBusy} onSaved={updateOne} />
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
        <div>
          <h2 className="font-bold text-base text-slate-900">2. Tài khoản ngân hàng & Mã QR nhận chuyển khoản</h2>
          <p className="text-xs text-slate-500 mt-1">
            Thông tin này hiển thị trực tiếp trong mục <strong>Thanh toán chuyển khoản</strong> của từng Hóa đơn. Hệ thống tự động tạo mã <strong>VietQR</strong> theo Ngân hàng & Số tài khoản, hoặc bạn có thể tải ảnh mã QR riêng từ máy tính.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <TextSettingCard settingKey="bank.name" label="Tên ngân hàng" hint="Nhập tên hoặc mã ngân hàng (VD: Vietcombank, MB Bank, Techcombank, BIDV, ACB, VietinBank...)." currentValue={bankName} busy={busy} onBusyChange={setBusy} onSaved={updateOne} />
            <TextSettingCard settingKey="bank.account_number" label="Số tài khoản" hint="Chỉ gồm 6 đến 20 chữ số 0-9, không chứa dấu cách." currentValue={bankAccountNumber} busy={busy} onBusyChange={setBusy} onSaved={updateOne} />
            <TextSettingCard settingKey="bank.account_holder" label="Chủ tài khoản" hint="Tên chủ tài khoản thụ hưởng (tối đa 100 ký tự)." currentValue={bankAccountHolder} busy={busy} onBusyChange={setBusy} onSaved={updateOne} />
          </div>

          {/* Live QR & Bank Card Preview */}
          <div className="lg:col-span-5 rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50/80 to-white p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-700">
                <QrCode className="w-4 h-4" />
                Xem trước thẻ QR trên Hóa đơn
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {siteSettings.customQrDataUrl ? 'Ảnh QR tải lên' : autoVietQrUrl ? 'VietQR tự động' : 'Chưa có STK'}
              </span>
            </div>

            {activeQrImage ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center space-y-3 shadow-2xs">
                <img
                  src={activeQrImage}
                  alt="Mã QR chuyển khoản ngân hàng"
                  className="w-48 h-48 object-contain mx-auto rounded-xl border border-slate-100 p-1 bg-white"
                />
                <div className="text-xs space-y-0.5 text-slate-700">
                  <p className="font-bold text-slate-900 text-sm">{bankName || 'Ngân hàng nhận thanh toán'}</p>
                  {bankAccountNumber && <p className="font-mono font-bold text-sky-700">STK: {bankAccountNumber}</p>}
                  {bankAccountHolder && <p className="text-slate-500 uppercase">{bankAccountHolder}</p>}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center space-y-2">
                <Landmark className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Chưa có mã QR hiển thị</p>
                <p className="text-[11px] text-slate-500">
                  Hãy lưu <strong>Tên ngân hàng</strong> + <strong>Số tài khoản</strong> ở bên trái để tự động sinh mã VietQR, hoặc tải ảnh mã QR của bạn ở bên dưới.
                </p>
              </div>
            )}

            {/* Custom QR Image Upload */}
            <div className="pt-2 border-t border-sky-100 space-y-2">
              <p className="text-xs font-bold text-slate-800">Tải ảnh Mã QR riêng của bạn (tùy chọn):</p>
              <input
                ref={qrInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={e => handleUploadCustomQr(e.target.files?.[0])}
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<ImagePlus className="w-3.5 h-3.5" />}
                  onClick={() => qrInputRef.current?.click()}
                >
                  {siteSettings.customQrDataUrl ? 'Đổi ảnh QR khác' : 'Tải ảnh mã QR lên'}
                </Button>
                {siteSettings.customQrDataUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
                    onClick={() => {
                      saveCustomQrDataUrl('')
                      setQrNotice('Đã gỡ ảnh QR riêng; hệ thống sẽ dùng mã VietQR tự động theo Số tài khoản.')
                    }}
                    className="text-rose-600"
                  >
                    Dùng lại VietQR tự động
                  </Button>
                )}
              </div>
              {qrNotice && <p className="text-xs font-semibold text-emerald-700">{qrNotice}</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
        <div>
          <h2 className="font-bold text-base text-slate-900">3. Quy tắc tính hạn Hóa đơn & Cảnh báo Hợp đồng</h2>
          <p className="text-xs text-slate-500 mt-1">Chỉ áp dụng từ thời điểm lưu; không tự tính lại các hóa đơn đã lập trước đó.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DaySettingForm settingKey="invoice.due_days" label="Số ngày hạn thanh toán hóa đơn" hint="Số nguyên từ 1 đến 365 ngày kể từ đầu kỳ." currentValue={valueOf('invoice.due_days') ?? undefined} busy={busy} onBusyChange={setBusy} onSaved={updateOne} />
          <DaySettingForm settingKey="contract.expiring_warning_days" label="Số ngày cảnh báo hợp đồng sắp hết hạn" hint="Số nguyên từ 1 đến 365 ngày trước ngày kết thúc." currentValue={valueOf('contract.expiring_warning_days') ?? undefined} busy={busy} onBusyChange={setBusy} onSaved={updateOne} />
        </div>
      </section>
    </div>
  )
}
