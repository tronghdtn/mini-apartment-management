import { useRef, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
import { saveDaySetting } from './api'
import { daySettingSchema } from './schemas'
import type { DaySettingInput } from './schemas'
import { daySettingLabels } from './types'
import type { DaySettingKey, Setting } from './types'

interface DaySettingFormProps {
  settingKey: DaySettingKey
  setting?: Setting
  onSaved: (setting: Setting) => void
  onAuthFailure: () => void
}

export function DaySettingForm({ settingKey, setting, onSaved, onAuthFailure }: DaySettingFormProps) {
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const { register, handleSubmit, setError, reset, formState: { errors } } = useForm<DaySettingInput>({
    resolver: zodResolver(daySettingSchema), defaultValues: { value: setting?.value ?? '' },
  })
  const id = `setting-${settingKey}`

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    void handleSubmit(async input => {
      if (submitting.current) return
      submitting.current = true
      setBusy(true)
      try {
        const saved = await saveDaySetting(settingKey, input)
        reset({ value: saved.value ?? '' })
        onSaved(saved)
      } catch (failure) {
        applyApiErrors(failure, setError, ['value'])
        if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
      } finally {
        submitting.current = false
        setBusy(false)
      }
    })(event)
  }

  return (
    <form noValidate onSubmit={submit} className="rounded-2xl border border-slate-200 p-4 space-y-3">
      <label htmlFor={id} className="block text-sm font-bold text-slate-700">{daySettingLabels[settingKey]}</label>
      <p className="text-sm text-slate-500">Giá trị đã lưu: {setting?.value ?? 'Chưa cấu hình'}{setting?.value != null ? ' ngày' : ''}.</p>
      <div className="flex flex-wrap gap-3 items-start">
        <div className="flex-1 min-w-40">
          <input id={id} inputMode="numeric" autoComplete="off" disabled={busy} aria-invalid={!!errors.value} aria-describedby={`${id}-help`} {...register('value')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-sky-500 disabled:bg-slate-100" />
          <p id={`${id}-help`} className="text-xs text-slate-500 mt-1">Nhập từ 1 đến 365 ngày.</p>
          {errors.value && <p role="alert" className="text-sm text-rose-700 mt-1">{errors.value.message}</p>}
        </div>
        <Button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu số ngày'}</Button>
      </div>
      {errors.root && <p role="alert" className="text-sm text-rose-700">{errors.root.message}</p>}
    </form>
  )
}
