import { useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { applyApiErrors, apiErrorMessage } from '@/lib/apiErrors'
import { getSettings, saveSystemSetting } from './api'
import { systemSettingSchema, type SystemSettingInput } from './schemas'
import { textSettingLabels, type Setting, type TextSettingKey } from './types'

export function SystemSettingForm({ settingKey, setting, onSaved, onAuthFailure }: {
  settingKey: TextSettingKey; setting?: Setting; onSaved: (setting: Setting) => void; onAuthFailure: () => void
}) {
  const [baseline, setBaseline] = useState(setting?.value ?? null)
  const [busy, setBusy] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [notice, setNotice] = useState('')
  const flight = useRef(false)
  const form = useForm<SystemSettingInput>({ resolver: zodResolver(systemSettingSchema(settingKey)), defaultValues: { value: setting?.value ?? '' } })
  async function submit(input: SystemSettingInput) {
    if (flight.current || conflict) return
    flight.current = true; setBusy(true); setNotice('')
    try {
      const saved = await saveSystemSetting(settingKey, input, baseline)
      setBaseline(saved.value); form.reset({ value: saved.value ?? '' }); onSaved(saved)
      setNotice('Đã lưu cấu hình.')
    } catch (failure) {
      applyApiErrors(failure, form.setError, ['value'])
      if (isAxiosError(failure)) {
        if (failure.response?.status === 409) setConflict(true)
        if ([401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
      }
    } finally { flight.current = false; setBusy(false) }
  }
  async function reload() {
    if (flight.current) return
    flight.current = true; setBusy(true)
    try {
      const latest = await getSettings()
      setBaseline(latest.data.find(row => row.key === settingKey)?.value ?? null)
      setConflict(false); form.clearErrors()
      setNotice('Đã tải giá trị hiện tại. Nội dung đang nhập được giữ lại; hãy kiểm tra trước khi lưu.')
    } catch (failure) {
      form.setError('root', { message: apiErrorMessage(failure) })
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
    } finally { flight.current = false; setBusy(false) }
  }
  const id = `setting-${settingKey}`
  return <form noValidate onSubmit={event => { void form.handleSubmit(submit)(event) }} className="min-w-0 rounded-2xl border border-slate-200 p-4 space-y-3">
    <label htmlFor={id} className="block text-sm font-bold text-slate-700">{textSettingLabels[settingKey]}</label>
    <p className="text-xs text-slate-500 break-words">Giá trị đã lưu: {baseline ?? 'Chưa cấu hình'}.</p>
    <fieldset disabled={busy} className="min-w-0 space-y-3">
      <input id={id} type={settingKey === 'system.contact_email' ? 'email' : 'text'} inputMode={settingKey === 'system.contact_phone' ? 'tel' : undefined} placeholder="Nhập giá trị cấu hình..." {...form.register('value')} aria-invalid={!!form.formState.errors.value} aria-describedby={`${id}-help`} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-sky-500 disabled:bg-slate-100" />
      <p id={`${id}-help`} className="text-xs text-slate-500">Để trống và lưu để xóa giá trị cấu hình. Mỗi lần chỉ lưu trường này.</p>
      {form.formState.errors.value && <p role="alert" className="text-sm text-rose-700">{form.formState.errors.value.message}</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" disabled={conflict} isLoading={busy}>Lưu {textSettingLabels[settingKey].toLowerCase()}</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => { form.reset({ value: baseline ?? '' }); setNotice('') }}>Hủy thay đổi</Button>
        {conflict && <Button type="button" size="sm" variant="outline" onClick={() => { void reload() }}>Tải lại giá trị hiện tại</Button>}</div>
    </fieldset>
    {form.formState.errors.root && <p role="alert" className="text-sm text-rose-700">{form.formState.errors.root.message}</p>}
    {notice && <p role="status" className="text-sm text-teal-700">{notice}</p>}
  </form>
}
