export type Role = 'guest' | 'user' | 'resident' | 'admin' | 'technician' | 'guard'

export interface Building {
  id: number
  name: string
  address: string
  district: string
  city: string
  floors: number
  totalRooms: number
  availableRooms: number
  occupiedRooms: number
  maintenanceRooms: number
  description: string
  coverImage: string
  buildingAmenities: string[]
  mapUrl?: string
  contactPhone: string
  status: 'active' | 'inactive'
}

export interface ServiceFee {
  id: number
  name: string
  code: string
  type: 'metered' | 'per_room' | 'per_person' | 'per_unit' | 'free'
  price: number // in VND
  priceDisplay: string
  unit: string
  note: string
  status: 'active' | 'inactive'
  isSystem?: boolean
}

export interface UtilityPriceHistory {
  id: number
  serviceId: number
  serviceCode: 'ELECTRICITY' | 'WATER'
  serviceName: string
  unitPrice: number
  effectiveFrom: string // YYYY-MM-01
  appliedToInvoices: boolean
}

export interface Room {
  id: number
  code: string
  title: string
  buildingId: number
  buildingName: string
  buildingAddress: string
  district: string
  floor: number
  area: string // e.g. "28.00"
  price: number // in VND
  deposit: number // in VND
  capacity: number // e.g. 2
  status: 'available' | 'occupied' | 'maintenance' | 'inactive'
  is_public: boolean
  featured?: boolean
  description: string
  roomAmenities: string[]
  buildingAmenities: string[]
  images: string[]
  currentResident?: string
  currentContractId?: number
  availableFrom?: string
}

export interface Amenity {
  id: number
  name: string
  description: string
  category: 'room' | 'building' | 'both'
  inUseCount: number
}

export interface UserAccount {
  id: number
  name: string
  email: string
  phone: string
  idNumber?: string // CCCD (only visible to admin)
  role: Role
  status: 'active' | 'locked'
  roomCode?: string
  buildingName?: string
  hasActiveContract: boolean
  createdAt: string
}

export interface ContractOccupant {
  id: number
  contractId: number
  name: string
  phone: string
  relation: string
}

export interface ContractServiceItem {
  id: number
  serviceId: number
  serviceName: string
  code: string
  type: 'metered' | 'per_room' | 'per_person' | 'per_unit'
  quantity: number
  unitPrice: number | null // null for metered
  startDate: string
  endDate: string
}

export interface Contract {
  id: number
  code: string | null // null when draft, generated HD-YYYY-NNNN on activation
  roomId: number
  roomCode: string
  buildingId: number
  buildingName: string
  buildingAddress: string
  residentId: number
  residentName: string
  residentPhone: string
  residentEmail: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD (last day of staying)
  actualEndDate?: string | null // YYYY-MM-DD (handover date, null if active)
  monthlyRent: number
  depositAmount: number
  depositStatus: 'unpaid' | 'held' | 'settled'
  status: 'draft' | 'active' | 'terminated'
  warningStatus?: 'normal' | 'expiring_soon' | 'overdue'
  earlyTerminationType: 'none' | 'fixed' | 'multiplier'
  earlyTerminationValue?: number // fixed VND or multiplier e.g. 1.5
  exemptionCondition?: string // điều kiện miễn phí trước hạn — chỉ minh họa, cấu trúc chờ duyệt P1–P12
  initialElectricityReading?: number
  initialWaterReading?: number
  note?: string
  createdAt: string
  closedAt?: string
  closureReason?: 'on_time' | 'early_termination' | 'same_day'
  closureNote?: string
  occupants?: ContractOccupant[]
  services?: ContractServiceItem[]
}

export interface MeterReading {
  id: number
  roomId: number
  roomCode: string
  buildingName: string
  serviceId: number
  serviceCode: 'ELECTRICITY' | 'WATER'
  serviceName: string
  period: string // YYYY-MM-01 (consumption month)
  readingDate: string // YYYY-MM-DD
  oldReading: number
  newReading: number
  consumption: number
  unitPrice: number
  kind: 'periodic' | 'final'
  contractId?: number | null
  invoiceId?: number | null
}

export interface InvoiceItem {
  id: number
  type: 'rent' | 'electricity' | 'water' | 'service' | 'discount' | 'other' | 'termination_fee' | 'damage'
  description: string
  quantity: string
  unitPrice: number
  amount: number // signed integer VND (negative for discount)
}

export interface Invoice {
  id: number
  code: string | null // INV-YYYYMM-NNNN, null if draft
  contractId: number
  contractCode: string
  roomId: number
  roomCode: string
  buildingName: string
  residentId: number
  residentName: string
  residentPhone: string
  type: 'monthly' | 'final'
  period: string // YYYY-MM-01
  issueDate: string
  dueDate: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled'
  isOverdue?: boolean
  items: InvoiceItem[]
  relatedInvoiceId?: number | null // for replacement invoice
}

export interface PaymentProof {
  id: number
  invoiceId: number
  invoiceCode: string
  roomCode: string
  buildingName: string
  residentName: string
  residentPhone: string
  amount: number
  method: 'bank_transfer' | 'cash' | 'deposit'
  proofImageUrl?: string
  transferContent?: string
  submittedAt: string
  status: 'pending' | 'confirmed' | 'rejected'
  receiptNumber?: string | null // RCP-YYYYMM-NNNN
  rejectReason?: string
  confirmedAt?: string
  confirmedBy?: string
}

export interface MaintenanceRequest {
  id: number
  code: string // MR-YYYYMM-NNNN
  roomId: number
  roomCode: string
  buildingName: string
  residentId: number
  residentName: string
  residentPhone: string
  title: string
  description: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected'
  assignedTo?: string | null // technician name
  assignedAt?: string | null
  images: string[]
  completionImages?: string[]
  handlerNote?: string
  managementNote?: string
  createdAt: string
  resolvedAt?: string | null
}

export interface ViewingAppointment {
  id: number
  code: string // APT-YYYYMM-NNNN
  roomId: number
  roomCode: string
  buildingName: string
  buildingAddress: string
  guestName: string
  guestPhone: string
  guestEmail?: string
  date: string // YYYY-MM-DD
  timeSlot: string
  note?: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  guardStatus: 'not_arrived' | 'checked_in' | 'checked_out'
  checkedInAt?: string | null
  checkedOutAt?: string | null
  guardNote?: string
  managementNote?: string
  createdAt: string
}

// Yêu cầu đặt lịch do form Public tạo (khôi phục từ public-ui-concept)
export interface AppointmentRequest {
  id?: string
  code?: string
  roomId: number
  roomCode: string
  roomTitle: string
  buildingName: string
  buildingAddress: string
  guestName: string
  guestPhone: string
  guestEmail?: string
  date: string // YYYY-MM-DD
  timeSlot: string
  note?: string
  createdAt?: string
  status?: 'pending' | 'confirmed' | 'cancelled'
}

export interface AppNotification {
  id: number
  targetRole: 'all' | 'admin' | 'resident' | 'technician' | 'guard' | 'user'
  userId?: number
  title: string
  message: string
  createdAt: string
  isRead: boolean
  linkUrl?: string
}

export interface SystemSettings {
  systemName: string
  hotline: string
  email: string
  supportHours: string
  bankName: string
  bankAccount: string
  bankAccountName: string
  vietQrUrl: string
  invoiceDueDays: number
  contractExpiringWarningDays: number
}

export interface FilterState {
  keyword: string
  buildingId: string
  priceRange: string
  areaRange: string
  capacity: string
  amenities: string[]
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'area-desc'
}
