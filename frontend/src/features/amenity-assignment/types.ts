export type AmenityTargetType = 'buildings' | 'rooms'
export type ArchivedVisibility = 'show' | 'hide'

export interface AssignedAmenity {
  id: number
  name: string
  description: string | null
  is_archived: boolean
}

export interface AmenityAssignment {
  direct: AssignedAmenity[]
  inherited: AssignedAmenity[]
  effective: AssignedAmenity[]
}

/** /amenities chỉ trả danh mục chưa lưu trữ, dùng làm lựa chọn gán mới. */
export interface AmenityOption {
  id: number
  name: string
  description: string | null
}
