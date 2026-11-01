import { fetchCsrfCookie, http } from '@/lib/http'
import { terminateContractSchema, type ContractSettlement, type TerminateContractInput } from './settlement'
import { closurePreviewSchema, finalMeterPreviewSchema, type ClosurePreview, type ClosurePreviewInput, type FinalMeterPreview, type FinalMeterPreviewInput } from './closure'
import { contractInspectionSchema, type ContractInspectionInput } from './inspection'
import type { ApiResource } from '@/types/api'
import { contractFiltersSchema, draftContractSchema, draftContractServicesSchema } from './schemas'
import type { ContractFilters, DraftContractInput, DraftContractServicesInput } from './schemas'
import type { Contract, ContractPage, ContractOptions, ContractRoomOption, ContractTenantOption, ContractServiceOption } from './types'
import { activateContractSchema, contractTermsSchema, type ActivateContractInput, type ContractTermsInput } from './schemas'
import { buildFinalInvoiceFormData, type FinalInvoiceDraft, type FinalInvoiceInput } from './finalInvoice'
import { contractOccupantsSchema, contractOccupantInputSchema, type ContractOccupants, type ContractOccupantInput } from './occupants'

export async function getContractOccupants(id: number, signal?: AbortSignal): Promise<ContractOccupants> {
  return contractOccupantsSchema.parse((await http.get(`/contracts/${id}/occupants`, { signal })).data.data)
}

export async function saveContractOccupant(id: number, input: ContractOccupantInput, revision: string, occupantId?: number): Promise<ContractOccupants> {
  const data = contractOccupantInputSchema.parse(input)
  const body = { ...data, expected_revision: revision, phone: data.phone || null, relationship: data.relationship || null }
  await fetchCsrfCookie()
  const response = occupantId === undefined
    ? await http.post(`/contracts/${id}/occupants`, body)
    : await http.patch(`/contracts/${id}/occupants/${occupantId}`, body)
  return contractOccupantsSchema.parse(response.data.data)
}

export async function removeContractOccupant(id: number, occupantId: number, revision: string): Promise<void> {
  await fetchCsrfCookie()
  await http.delete(`/contracts/${id}/occupants/${occupantId}`, { data: { expected_revision: revision } })
}

export async function createFinalInvoiceDraft(id: number, closure: FinalMeterPreviewInput, input: FinalInvoiceInput, expectedRevision: string): Promise<FinalInvoiceDraft> {
  await fetchCsrfCookie()
  const body = buildFinalInvoiceFormData(closure, input, expectedRevision)
  return (await http.post<ApiResource<FinalInvoiceDraft>>('/contracts/' + id + '/final-invoice', body)).data.data
}

export async function getContracts(page: number, filters: ContractFilters, signal?: AbortSignal): Promise<ContractPage> {
  const input = contractFiltersSchema.parse(filters)
  const params = { page, status: input.status || undefined, building_id: input.building_id || undefined,
    room_id: input.room_id || undefined, user_id: input.user_id || undefined, q: input.q || undefined, due: input.due || undefined }
  return (await http.get<ContractPage>('/contracts', { params, signal })).data
}

export async function getContract(id: string, signal?: AbortSignal): Promise<Contract> {
  return (await http.get<ApiResource<Contract>>(`/contracts/${encodeURIComponent(id)}`, { signal })).data.data
}

/** Duyệt đủ các trang; không bỏ mất lựa chọn nằm ngoài 20 dòng đầu. */
async function getAllOptions<T>(url: string, params: Record<string, string>, signal?: AbortSignal): Promise<T[]> {
  const result: T[] = []
  let page = 1
  while (true) {
    const response = await http.get<{ data: T[]; meta: { last_page: number } }>(url, { params: { ...params, page }, signal })
    result.push(...response.data.data)
    if (page >= response.data.meta.last_page) return result
    page += 1
  }
}

export async function getContractOptions(signal?: AbortSignal): Promise<ContractOptions> {
  const [rooms, tenants] = await Promise.all([
    getAllOptions<ContractRoomOption>('/rooms', { status: 'available' }, signal),
    getAllOptions<ContractTenantOption>('/users', { status: 'active', has_active_contract: '0' }, signal),
  ])
  return { rooms: rooms.filter(room => room.status === 'available'),
    tenants: tenants.filter(user => ['user', 'resident'].includes(user.role) && user.status === 'active' && !user.has_active_contract) }
}

export async function saveDraftContract(input: DraftContractInput, id?: number): Promise<Contract> {
  const valid = draftContractSchema.parse(input)
  const body = { ...valid, note: valid.note || null }
  await fetchCsrfCookie()
  const response = id === undefined
    ? await http.post<ApiResource<Contract>>('/contracts', body)
    : await http.patch<ApiResource<Contract>>(`/contracts/${id}`, body)
  return response.data.data
}

export async function deleteDraftContract(id: number): Promise<void> {
  await fetchCsrfCookie()
  await http.delete(`/contracts/${id}`)
}

export async function getContractServiceOptions(signal?: AbortSignal): Promise<ContractServiceOption[]> {
  return getAllOptions<ContractServiceOption>('/services', {}, signal)
}

/** Nháp: thay tập dịch vụ soạn thảo. Hợp đồng hiệu lực: gửi kèm phiên bản đã đọc, Laravel áp dụng từ 01 tháng sau. */
export async function saveDraftContractServices(id: number, input: DraftContractServicesInput, expectedRevision?: string): Promise<Contract> {
  const body = draftContractServicesSchema.parse(input)
  await fetchCsrfCookie()
  return (await http.put<ApiResource<Contract>>(`/contracts/${id}/services`, expectedRevision ? { ...body, expected_revision: expectedRevision } : body)).data.data
}

export async function saveContractTerms(id: number, input: ContractTermsInput): Promise<Contract> {
  const valid = contractTermsSchema.parse(input)
  await fetchCsrfCookie()
  return (await http.put<ApiResource<Contract>>(`/contracts/${id}/terms`, { ...valid,
    early_termination_fee_type: valid.early_termination_fee_type || null,
    early_termination_fee_amount: valid.early_termination_fee_type === 'fixed' ? valid.early_termination_fee_amount : null,
    early_termination_fee_multiplier: valid.early_termination_fee_type === 'rent_multiple' ? valid.early_termination_fee_multiplier : null,
  })).data.data
}

export async function confirmContractDeposit(id: number, expectedAmount: number, expectedRevision: string): Promise<Contract> {
  await fetchCsrfCookie()
  return (await http.post<ApiResource<Contract>>(`/contracts/${id}/deposit`, { confirmed: true, expected_amount: expectedAmount, expected_revision: expectedRevision })).data.data
}

export type ActivationContext = Record<'ELECTRICITY' | 'WATER', { current_reading: string; reading_date: string; kind: 'periodic' | 'final' } | null>
export async function getActivationContext(id: number, signal?: AbortSignal): Promise<ActivationContext> {
  return (await http.get<ApiResource<ActivationContext>>(`/contracts/${id}/activation-context`, { signal })).data.data
}
export async function activateContract(id: number, input: ActivateContractInput, expectedRevision: string): Promise<Contract> {
  const body = activateContractSchema.parse(input)
  await fetchCsrfCookie()
  return (await http.post<ApiResource<Contract>>(`/contracts/${id}/activate`, { ...body, expected_revision: expectedRevision })).data.data
}

export async function previewContractClosure(id: number, input: ClosurePreviewInput, expectedRevision: string): Promise<ClosurePreview> {
  await fetchCsrfCookie()
  return (await http.post<ApiResource<ClosurePreview>>(`/contracts/${id}/closure-preview`, {
    ...closurePreviewSchema.parse(input), expected_revision: expectedRevision,
  })).data.data
}

export async function previewFinalContractMeters(id: number, input: FinalMeterPreviewInput, expectedRevision: string): Promise<FinalMeterPreview> {
  await fetchCsrfCookie()
  return (await http.post<ApiResource<FinalMeterPreview>>(`/contracts/${id}/final-meter-preview`, {
    ...finalMeterPreviewSchema.parse(input), expected_revision: expectedRevision,
  })).data.data
}

export async function saveContractInspection(id: number, input: ContractInspectionInput, expectedRevision: string): Promise<Contract> {
  const valid = contractInspectionSchema.parse(input)
  const body = new FormData()
  body.append('inspection_result', valid.inspection_result)
  body.append('inspection_note', valid.inspection_note)
  body.append('expected_revision', expectedRevision)
  valid.photos.forEach(photo => body.append('photos[]', photo))

  return (await http.post<ApiResource<Contract>>(`/contracts/${id}/inspection`, body)).data.data
}

export async function getContractSettlement(id: number, signal?: AbortSignal): Promise<ContractSettlement> {
  return (await http.get<ApiResource<ContractSettlement>>(`/contracts/${id}/settlement-preview`, { signal })).data.data
}

export async function terminateContract(id: number, input: TerminateContractInput): Promise<ContractSettlement> {
  const body = terminateContractSchema.parse(input)
  await fetchCsrfCookie()
  return (await http.post<ApiResource<ContractSettlement>>(`/contracts/${id}/terminate`, body)).data.data
}
