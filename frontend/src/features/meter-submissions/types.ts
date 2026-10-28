export interface MeterSubmission {
  id: number; contract_id: number; room: { id: number; code: string; building_name: string }
  service: { id: number; name: string; unit: string }; period: string; reading_date: string; current_reading: string
  status: 'pending' | 'approved' | 'rejected'; submitted_at: string; reviewed_at: string | null; reviewed_by: number | null
  rejection_reason: string | null; approved_meter_reading_id: number | null; photo_url: string
}
export interface SubmissionContext { contract_id: number; room: { id: number; code: string; building_name: string }; services: { id: number; name: string; unit: string }[] }
export interface SubmissionPage { data: MeterSubmission[]; meta: { current_page: number; last_page: number; total: number } }
