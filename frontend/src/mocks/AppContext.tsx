import React, { createContext, useContext, useState } from 'react'
import type {
  Role,
  UserAccount,
  Invoice,
  PaymentProof,
  MaintenanceRequest,
  ViewingAppointment,
  Contract,
  MeterReading,
  AppNotification,
  Room,
} from '@/mocks/types'
import { users, invoices as initialInvoices, payments as initialPayments, maintenanceRequests as initialMaintenance, viewingAppointments as initialAppointments, contracts as initialContracts, meterReadings as initialReadings, notifications as initialNotifications, rooms as initialRooms } from '@/mocks/data'

interface ToastMessage {
  id: string
  title: string
  message?: string
  type: 'success' | 'error' | 'info'
}

interface AppContextType {
  role: Role
  setRole: (role: Role) => void
  currentUser: UserAccount
  // Invoices & Payments
  invoices: Invoice[]
  payments: PaymentProof[]
  submitPaymentProof: (invoiceId: number, amount: number, content: string, fileUrl?: string) => void
  confirmPayment: (paymentId: number) => void
  rejectPayment: (paymentId: number, reason: string) => void
  issueInvoice: (invoiceId: number) => void
  cancelInvoice: (invoiceId: number, reason: string) => void
  // Maintenance Requests
  maintenanceRequests: MaintenanceRequest[]
  submitMaintenanceRequest: (roomId: number, title: string, priority: MaintenanceRequest['priority'], description: string, images?: string[]) => void
  assignTechnician: (requestId: number, techName: string) => void
  startMaintenance: (requestId: number) => void
  resolveMaintenance: (requestId: number, handlerNote: string, completionImages?: string[]) => void
  // Appointments
  appointments: ViewingAppointment[]
  createAppointment: (data: Omit<ViewingAppointment, 'id' | 'code' | 'status' | 'guardStatus' | 'createdAt'>) => ViewingAppointment
  confirmAppointment: (id: number) => void
  completeAppointment: (id: number) => void
  cancelAppointment: (id: number) => void
  checkInGuest: (id: number, guardNote?: string) => void
  checkOutGuest: (id: number, guardNote?: string) => void
  // Contracts
  contracts: Contract[]
  activateContract: (contractId: number, initialEl: number, initialWater: number, note?: string) => void
  terminateContract: (contractId: number, handoverDate: string, reason: Contract['closureReason'], note: string) => void
  // Meter Readings
  meterReadings: MeterReading[]
  addMeterReading: (reading: Omit<MeterReading, 'id'>) => void
  // Notifications
  notifications: AppNotification[]
  markNotificationAsRead: (id: number) => void
  markAllNotificationsAsRead: () => void
  unreadCount: number
  // Rooms
  rooms: Room[]
  toggleRoomPublic: (roomId: number) => void
  // Toasts
  showToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<Role>('guest')
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [payments, setPayments] = useState<PaymentProof[]>(initialPayments)
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>(initialMaintenance)
  const [appointments, setAppointments] = useState<ViewingAppointment[]>(initialAppointments)
  const [contracts, setContracts] = useState<Contract[]>(initialContracts)
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>(initialReadings)
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications)
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // Match active user according to role
  const currentUser: UserAccount = users.find((u) => u.role === role) || {
    id: 99,
    name: 'Khách vãng lai',
    email: 'khach@miniapartment.vn',
    phone: '0900000000',
    role: 'guest',
    status: 'active',
    hasActiveContract: false,
    createdAt: '2026-10-16',
  }

  const showToast = (title: string, message?: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, title, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  const setRole = (newRole: Role) => {
    setRoleState(newRole)
    showToast(`Đã chuyển vai trò: ${getRoleLabel(newRole)}`, undefined, 'info')
  }

  function getRoleLabel(r: Role) {
    switch (r) {
      case 'admin': return 'Quản trị viên'
      case 'resident': return 'Cư dân'
      case 'technician': return 'Kỹ thuật viên'
      case 'guard': return 'Bảo vệ'
      case 'user': return 'Khách đã đăng ký'
      default: return 'Khách vãng lai'
    }
  }

  // Submit Payment Proof
  const submitPaymentProof = (invoiceId: number, amount: number, content: string, fileUrl?: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId)
    if (!invoice) return

    const newPayment: PaymentProof = {
      id: Date.now(),
      invoiceId,
      invoiceCode: invoice.code || `INV-${invoice.id}`,
      roomCode: invoice.roomCode,
      buildingName: invoice.buildingName,
      residentName: invoice.residentName,
      residentPhone: invoice.residentPhone,
      amount,
      method: 'bank_transfer',
      proofImageUrl: fileUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
      transferContent: content,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    }

    setPayments((prev) => [newPayment, ...prev])
    showToast('Đã gửi minh chứng chuyển khoản!', 'Ban quản trị sẽ đối soát và xác nhận.', 'success')
  }

  // Confirm Payment
  const confirmPayment = (paymentId: number) => {
    setPayments((prev) =>
      prev.map((p) => {
        if (p.id === paymentId) {
          const receiptNumber = `RCP-202610-${Math.floor(1000 + Math.random() * 9000)}`
          // Also update invoice remaining & paid
          setInvoices((invs) =>
            invs.map((inv) => {
              if (inv.id === p.invoiceId) {
                // [MOCK-TIỀN] Chỉ mô phỏng. paid_amount thật = tổng payment confirmed do Backend tính.
                const newPaid = inv.paidAmount + p.amount
                const newRemaining = Math.max(0, inv.totalAmount - newPaid)
                return {
                  ...inv,
                  paidAmount: newPaid,
                  remainingAmount: newRemaining,
                  status: newRemaining === 0 ? 'paid' : 'partially_paid',
                }
              }
              return inv
            })
          )
          return {
            ...p,
            status: 'confirmed',
            receiptNumber,
            confirmedAt: new Date().toISOString(),
            confirmedBy: 'Trần Đức Long (Admin)',
          }
        }
        return p
      })
    )
    showToast('Đã xác nhận thanh toán!', 'Đã cập nhật công nợ và sinh biên nhận thành công.', 'success')
  }

  // Reject Payment
  const rejectPayment = (paymentId: number, reason: string) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status: 'rejected', rejectReason: reason } : p))
    )
    showToast('Đã từ chối thanh toán', `Lý do: ${reason}`, 'error')
  }

  // Issue Invoice
  const issueInvoice = (invoiceId: number) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          const code = `INV-202610-${Math.floor(1000 + Math.random() * 9000)}`
          return { ...inv, code, status: 'issued' }
        }
        return inv
      })
    )
    showToast('Đã phát hành hóa đơn!', 'Hóa đơn đã được gửi thông báo tới cư dân.', 'success')
  }

  // Cancel Invoice
  const cancelInvoice = (invoiceId: number, reason: string) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: 'cancelled' } : inv))
    )
    showToast('Đã hủy hóa đơn', `Lý do: ${reason}`, 'info')
  }

  // Submit Maintenance Request
  const submitMaintenanceRequest = (
    roomId: number,
    title: string,
    priority: MaintenanceRequest['priority'],
    description: string,
    images: string[] = []
  ) => {
    const room = rooms.find((r) => r.id === roomId)
    const code = `MR-202610-${Math.floor(1000 + Math.random() * 9000)}`
    const newReq: MaintenanceRequest = {
      id: Date.now(),
      code,
      roomId,
      roomCode: room ? room.code : 'Phòng',
      buildingName: room ? room.buildingName : 'An Phú Residence',
      residentId: currentUser.id,
      residentName: currentUser.name,
      residentPhone: currentUser.phone,
      title,
      description,
      priority,
      status: 'pending',
      images: images.length ? images : ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80'],
      createdAt: new Date().toISOString(),
    }

    setMaintenanceRequests((prev) => [newReq, ...prev])
    showToast('Đã gửi yêu cầu sửa chữa!', `Mã yêu cầu: ${code}`, 'success')
  }

  // Assign Technician
  const assignTechnician = (requestId: number, techName: string) => {
    setMaintenanceRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? { ...req, assignedTo: techName, assignedAt: new Date().toISOString(), status: 'in_progress' }
          : req
      )
    )
    showToast(`Đã phân công việc cho ${techName}!`, undefined, 'success')
  }

  // Start Maintenance (Technician)
  const startMaintenance = (requestId: number) => {
    setMaintenanceRequests((prev) =>
      prev.map((req) => (req.id === requestId ? { ...req, status: 'in_progress' } : req))
    )
    showToast('Đã bắt đầu xử lý sự cố!', undefined, 'info')
  }

  // Resolve Maintenance (Technician)
  const resolveMaintenance = (requestId: number, handlerNote: string, completionImages: string[] = []) => {
    setMaintenanceRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? {
              ...req,
              status: 'resolved',
              handlerNote,
              completionImages,
              resolvedAt: new Date().toISOString(),
            }
          : req
      )
    )
    showToast('Đã hoàn thành xử lý sự cố!', 'Yêu cầu được chuyển sang trạng thái Đã xử lý.', 'success')
  }

  // Appointments
  const createAppointment = (data: Omit<ViewingAppointment, 'id' | 'code' | 'status' | 'guardStatus' | 'createdAt'>) => {
    const code = `APT-202610-${Math.floor(1000 + Math.random() * 9000)}`
    const newApt: ViewingAppointment = {
      ...data,
      id: Date.now(),
      code,
      status: 'pending',
      guardStatus: 'not_arrived',
      createdAt: new Date().toISOString(),
    }
    setAppointments((prev) => [newApt, ...prev])
    showToast('Đã ghi nhận lịch hẹn xem phòng!', `Mã lịch: ${code}`, 'success')
    return newApt
  }

  const confirmAppointment = (id: number) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'confirmed' } : a))
    )
    showToast('Đã xác nhận lịch hẹn!', undefined, 'success')
  }

  const completeAppointment = (id: number) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'completed' } : a))
    )
    showToast('Đã hoàn tất buổi xem phòng!', undefined, 'success')
  }

  const cancelAppointment = (id: number) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a))
    )
    showToast('Đã hủy lịch hẹn', undefined, 'info')
  }

  const checkInGuest = (id: number, guardNote?: string) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, guardStatus: 'checked_in', checkedInAt: new Date().toISOString(), guardNote }
          : a
      )
    )
    showToast('Đã Check-in khách vào xem phòng!', undefined, 'success')
  }

  const checkOutGuest = (id: number, guardNote?: string) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              guardStatus: 'checked_out',
              checkedOutAt: new Date().toISOString(),
              guardNote: guardNote || a.guardNote,
            }
          : a
      )
    )
    showToast('Đã Check-out khách ra!', undefined, 'success')
  }

  // Activate Contract
  const activateContract = (contractId: number, initialEl: number, initialWater: number, note?: string) => {
    const code = `HD-2026-${Math.floor(1000 + Math.random() * 9000)}`
    setContracts((prev) =>
      prev.map((c) =>
        c.id === contractId
          ? {
              ...c,
              code,
              status: 'active',
              initialElectricityReading: initialEl,
              initialWaterReading: initialWater,
              note: note || c.note,
            }
          : c
      )
    )
    showToast(`Đã kích hoạt hợp đồng thành công!`, `Mã hợp đồng: ${code}`, 'success')
  }

  // Terminate Contract
  const terminateContract = (
    contractId: number,
    handoverDate: string,
    reason: Contract['closureReason'],
    note: string
  ) => {
    setContracts((prev) =>
      prev.map((c) =>
        c.id === contractId
          ? {
              ...c,
              status: 'terminated',
              actualEndDate: handoverDate,
              closureReason: reason,
              closureNote: note,
              closedAt: new Date().toISOString(),
              depositStatus: 'settled',
            }
          : c
      )
    )
    showToast('Đã hoàn tất thanh lý hợp đồng!', undefined, 'success')
  }

  // Add Meter Reading
  const addMeterReading = (reading: Omit<MeterReading, 'id'>) => {
    const newR: MeterReading = {
      ...reading,
      id: Date.now(),
    }
    setMeterReadings((prev) => [newR, ...prev])
    showToast('Đã lưu chỉ số điện nước!', undefined, 'success')
  }

  // Notifications
  const markNotificationAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    showToast('Đã đánh dấu tất cả thông báo là đã đọc', undefined, 'info')
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Toggle Room Public
  const toggleRoomPublic = (roomId: number) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, is_public: !r.is_public } : r))
    )
    showToast('Đã cập nhật trạng thái công khai phòng', undefined, 'info')
  }

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        currentUser,
        invoices,
        payments,
        submitPaymentProof,
        confirmPayment,
        rejectPayment,
        issueInvoice,
        cancelInvoice,
        maintenanceRequests,
        submitMaintenanceRequest,
        assignTechnician,
        startMaintenance,
        resolveMaintenance,
        appointments,
        createAppointment,
        confirmAppointment,
        completeAppointment,
        cancelAppointment,
        checkInGuest,
        checkOutGuest,
        contracts,
        activateContract,
        terminateContract,
        meterReadings,
        addMeterReading,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        unreadCount,
        rooms,
        toggleRoomPublic,
        showToast,
      }}
    >
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/80 animate-in slide-in-from-bottom-5 duration-200"
          >
            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-sky-400" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold">{toast.title}</h4>
              {toast.message && (
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {toast.message}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
