import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Lightbox } from '@/components/ui/Lightbox'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import type { RoomPhoto } from '@/types/roomPhotos'
import { getRoomPhotos, uploadRoomPhotos, setRoomCover, removeRoomPhoto } from './api'
import { roomPhotoUploadSchema } from './schemas'
import type { RoomPhotoUploadInput } from './schemas'

export function RoomPhotosPanel({ roomId }: { roomId: number }) {
  const { refresh } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ attempt: number; photos?: RoomPhoto[]; error?: string }>()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [failure, setFailure] = useState('')
  const [removeTarget, setRemoveTarget] = useState<RoomPhoto>()
  const [preview, setPreview] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const form = useForm<RoomPhotoUploadInput>({ resolver: zodResolver(roomPhotoUploadSchema), defaultValues: { photos: [] } })
  const current = result?.attempt === attempt ? result : undefined
  const photos = current?.photos

  useEffect(() => {
    const abort = new AbortController()
    getRoomPhotos(roomId, abort.signal)
      .then(data => { if (!abort.signal.aborted) setResult({ attempt, photos: data }) })
      .catch(error => {
        if (abort.signal.aborted) return
        setResult({ attempt, error: apiErrorMessage(error) })
        if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) void refresh()
      })
    return () => abort.abort()
  }, [roomId, attempt, refresh])

  function reloadPhotos() { setPreview(null); setAttempt(value => value + 1) }
  function showFailure(error: unknown) {
    let message = apiErrorMessage(error)
    if (isAxiosError(error) && (!error.response || error.response.status >= 500)) {
      message += ' Kết quả thao tác chưa xác định; tải lại danh sách trước khi gửi lại.'
    }
    setFailure(message)
    if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) void refresh()
    if (isAxiosError(error) && error.response?.status === 409) reloadPhotos()
  }
  async function submitPhotos(data: RoomPhotoUploadInput) {
    setBusy(true); setFailure(''); setNotice('')
    try {
      const next = await uploadRoomPhotos(roomId, data)
      setResult({ attempt, photos: next }); form.reset({ photos: [] })
      if (fileInput.current) fileInput.current.value = ''
      setNotice('Đã thêm ảnh phòng.')
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 422) {
        applyApiErrors(error, form.setError, ['photos', ...Array.from({ length: 20 }, (_, index) => 'photos.' + index)])
      }
      showFailure(error)
    } finally { setBusy(false) }
  }
  async function chooseCover(photo: RoomPhoto) {
    if (!photos || busy) return
    setBusy(true); setFailure(''); setNotice('')
    try {
      const next = await setRoomCover(roomId, photo.id, photos.find(item => item.is_cover)?.id ?? null)
      setResult({ attempt, photos: next }); setNotice('Đã cập nhật ảnh bìa.')
    } catch (error) { showFailure(error) } finally { setBusy(false) }
  }
  async function confirmRemove() {
    if (!removeTarget || busy) return
    setBusy(true); setFailure(''); setNotice('')
    try {
      await removeRoomPhoto(roomId, removeTarget.id)
      setRemoveTarget(undefined); setNotice('Đã gỡ ảnh phòng.'); reloadPhotos()
    } catch (error) { showFailure(error) } finally { setBusy(false) }
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4" aria-label="Ảnh phòng">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Ảnh phòng</h2>
      <Button type="button" variant="outline" disabled={busy || !current} onClick={reloadPhotos}>Tải lại ảnh</Button></div>
    <p className="text-sm text-slate-500">Tối đa 20 ảnh/phòng; JPG, PNG, WebP, 5 MiB/ảnh và 30 MiB/lần gửi.</p>
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {failure && <p role="alert" className="text-sm text-rose-700">{failure}</p>}
    {!current ? <p role="status">Đang tải ảnh phòng…</p> : current.error ? <div role="alert"><p>{current.error}</p><Button variant="outline" onClick={reloadPhotos}>Thử lại ảnh</Button></div> : <>
      <form onSubmit={event => { void form.handleSubmit(submitPhotos)(event) }} className="space-y-3"><fieldset disabled={busy} className="flex flex-wrap items-start gap-3">
        <label className="block text-sm font-semibold">Chọn ảnh phòng<input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp"
          onChange={event => form.setValue('photos', Array.from(event.target.files ?? []), { shouldValidate: true })}
          className="mt-2 block max-w-full text-sm" /></label>
        <Button type="submit" disabled={!photos || photos.length >= 20} isLoading={busy}>Thêm ảnh</Button>
      </fieldset><p role="alert" className="text-sm text-rose-700">{form.formState.errors.photos?.message ?? form.formState.errors.photos?.root?.message ?? form.formState.errors.photos?.[0]?.message}</p></form>
      {photos?.length === 0 && <p>Chưa có ảnh phòng.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{photos?.map((photo, index) => <article key={photo.id} className="rounded-xl border border-slate-200 p-3 space-y-3">
        <button type="button" onClick={() => setPreview(index)} className="block w-full" aria-label={`Xem ảnh ${index + 1}`}><img src={photo.url} alt={`Ảnh phòng ${index + 1}`} className="aspect-video w-full object-cover rounded-lg" /></button>
        <p className="text-sm">{photo.is_cover ? 'Ảnh bìa' : `Ảnh ${index + 1}`}</p>
        <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy || photo.is_cover} onClick={() => void chooseCover(photo)}>Đặt làm bìa</Button>
          <Button size="sm" variant="danger" disabled={busy} onClick={() => { setFailure(''); setRemoveTarget(photo) }} aria-label={`Gỡ ảnh ${index + 1}`}>Gỡ ảnh</Button></div>
      </article>)}</div>
    </>}
    <Modal isOpen={!!removeTarget} onClose={() => { if (!busy) setRemoveTarget(undefined) }} title="Gỡ ảnh phòng" maxWidth="sm">
      <p>Gỡ ảnh này khỏi thư viện phòng?</p>{failure && <p role="alert" className="mt-3 text-sm text-rose-700">{failure}</p>}<div className="mt-5 flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={() => setRemoveTarget(undefined)}>Hủy</Button>
        <Button variant="danger" isLoading={busy} onClick={() => void confirmRemove()}>Xác nhận gỡ ảnh</Button></div>
    </Modal>
    <Lightbox isOpen={preview !== null && !!photos?.length} onClose={() => setPreview(null)} images={photos?.map(item => item.url) ?? []} currentIndex={preview ?? 0} setCurrentIndex={setPreview} roomTitle="Ảnh phòng" />
  </section>
}
