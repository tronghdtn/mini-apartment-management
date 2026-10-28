import { http } from '@/lib/http'
import type { SubmissionInput } from './schemas'
import type { MeterSubmission, SubmissionContext, SubmissionPage } from './types'

export async function getSubmissions(page: number, status: string, period: string, roomId: string, signal?: AbortSignal) {
  return (await http.get<SubmissionPage>('/meter-reading-submissions', { params: { page, ...(status ? { status } : {}), ...(period ? { period } : {}), ...(roomId ? { room_id: roomId } : {}) }, signal })).data
}
export async function getSubmissionContext(signal?: AbortSignal) {
  return (await http.get<{ data: SubmissionContext }>('/meter-reading-submissions/context', { signal })).data.data
}
export async function sendSubmission(input: SubmissionInput) {
  const body = new FormData()
  body.append('service_id', String(input.service_id)); body.append('period', input.period); body.append('reading_date', input.reading_date)
  body.append('current_reading', input.current_reading); body.append('photo', input.photo)
  return (await http.post<{ data: MeterSubmission }>('/meter-reading-submissions', body)).data.data
}
export async function approveSubmission(id: number) {
  return (await http.post<{ data: MeterSubmission }>(`/meter-reading-submissions/${id}/approve`, {})).data.data
}
export async function rejectSubmission(id: number, rejection_reason: string) {
  return (await http.post<{ data: MeterSubmission }>(`/meter-reading-submissions/${id}/reject`, { rejection_reason })).data.data
}
export async function getSubmissionPhoto(id: number, signal?: AbortSignal): Promise<Blob> {
  return (await http.get<Blob>(`/meter-reading-submissions/${id}/photo`, { responseType: 'blob', signal })).data
}
