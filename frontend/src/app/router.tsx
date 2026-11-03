import {
  AdminDashboardPage,
  AdminBuildingsPage,
  AdminBuildingDetailPage,
  AdminRoomsPage,
  AdminRoomDetailPage,
  AdminAmenitiesPage,
  AdminServicesPage,
  AdminUtilityPricesPage,
  AdminUsersPage,
  AdminUserDetailPage,
  AdminContractsPage,
  AdminContractNewPage,
  AdminContractDetailPage,
  AdminContractTerminatePage,
  AdminMeterReadingsPage,
  AdminInvoicesPage,
  AdminInvoiceDetailPage,
  AdminSettingsPage,
  AdminProfilePage,
  AdminAppointmentsPage,
  AdminDebtsPage,
  AdminMaintenancePage,
  AdminMaintenanceDetailPage,
  AdminNotificationsPage,
  AdminPaymentsPage,
  AdminResidentsPage,
} from './adminPages'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { AdminContractPrintPage, InvoicePrintPage, ReceiptPrintPage, ResidentContractPrintPage } from './printPages'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { ResidentLayout } from '@/components/layouts/ResidentLayout'
import { StaffLayout } from '@/components/layouts/StaffLayout'
import {
  ResidentProfilePage, StaffProfilePage, ResidentOverviewPage,
  ResidentContractsPage, ResidentContractDetailPage, ResidentInvoicesPage, ResidentInvoiceDetailPage,
  ResidentRequestsPage, ResidentRequestNewPage, ResidentRequestDetailPage, ResidentNotificationsPage,
  TechnicianTasksPage, TechnicianTaskDetailPage, GuardAppointmentsPage, StaffNotificationsPage,
} from './rolePages'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { HomePage } from '@/pages/public/HomePage'
import { RoomListPage } from '@/pages/public/RoomListPage'
import { RoomDetailPage } from '@/pages/public/RoomDetailPage'
import { BookingPage } from '@/pages/public/BookingPage'
import { ContactPage } from '@/pages/public/ContactPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RouteErrorPage } from '@/pages/RouteErrorPage'
import { LoginPage } from '@/pages/public/LoginPage'
import { ForgotPasswordPage } from '@/pages/public/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/public/ResetPasswordPage'
import { VerifyEmailPage } from '@/pages/public/VerifyEmailPage'
import { ConfirmEmailChangePage } from '@/pages/public/ConfirmEmailChangePage'
import { RegisterPage } from '@/pages/public/RegisterPage'
import { GuestAppointmentsPage } from '@/pages/public/GuestAppointmentsPage'
import { GuestProfilePage } from '@/pages/public/GuestProfilePage'

// Bản in đứng riêng ngoài layout để giấy chỉ còn nội dung tài liệu.
const printPage = (page: ReactNode) => <Suspense fallback={<p role="status" className="py-8 text-center text-slate-600">Đang tải bản in…</p>}>{page}</Suspense>

// Guard luôn ở ngoài layout; route chỉ thêm sau khi có trang tương ứng.
export const router = createBrowserRouter([
  {
    element: <RequireAuth roles={['admin']} />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/admin/invoices/:invoiceId/print', element: printPage(<InvoicePrintPage admin />) },
      { path: '/admin/payments/:paymentId/receipt', element: printPage(<ReceiptPrintPage admin />) },
      { path: '/admin/contracts/:contractId/print', element: printPage(<AdminContractPrintPage />) },
    ],
  },
  {
    element: <RequireAuth roles={['resident']} />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/resident/invoices/:invoiceId/print', element: printPage(<InvoicePrintPage />) },
      { path: '/resident/payments/:paymentId/receipt', element: printPage(<ReceiptPrintPage />) },
      { path: '/resident/contracts/:contractId/print', element: printPage(<ResidentContractPrintPage />) },
    ],
  },
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'rooms', element: <RoomListPage /> },
      { path: 'rooms/:roomId', element: <RoomDetailPage /> },
      { path: 'rooms/:roomId/book', element: <BookingPage /> },
      { path: 'book', element: <BookingPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'confirm-email-change', element: <ConfirmEmailChangePage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forbidden', element: <ForbiddenPage /> },
      { element: <RequireAuth />, children: [
        { path: 'account/appointments', element: <GuestAppointmentsPage /> },
        { path: 'account/profile', element: <GuestProfilePage /> },
      ] },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <RequireAuth roles={['admin']} />,
    children: [{
    path: '/admin',
    element: <AdminLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'buildings', element: <AdminBuildingsPage /> },
      { path: 'buildings/:buildingId', element: <AdminBuildingDetailPage /> },
      { path: 'rooms', element: <AdminRoomsPage /> },
      { path: 'rooms/:roomId', element: <AdminRoomDetailPage /> },
      { path: 'amenities', element: <AdminAmenitiesPage /> },
      { path: 'services', element: <AdminServicesPage /> },
      { path: 'utility-prices', element: <AdminUtilityPricesPage /> },
      { path: 'settings', element: <AdminSettingsPage /> },
      { path: 'profile', element: <AdminProfilePage /> },
      { path: 'residents', element: <AdminResidentsPage /> },
      { path: 'viewing-appointments', element: <AdminAppointmentsPage /> },
      { path: 'payments', element: <AdminPaymentsPage /> },
      { path: 'debts', element: <AdminDebtsPage /> },
      { path: 'maintenance-requests', element: <AdminMaintenancePage /> },
      { path: 'maintenance-requests/:requestId', element: <AdminMaintenanceDetailPage /> },
      { path: 'notifications', element: <AdminNotificationsPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'users/:userId', element: <AdminUserDetailPage /> },
      { path: 'contracts', element: <AdminContractsPage /> },
      { path: 'contracts/new', element: <AdminContractNewPage /> },
      { path: 'contracts/:contractId/edit', element: <AdminContractNewPage /> },
      { path: 'contracts/:contractId', element: <AdminContractDetailPage /> },
      { path: 'contracts/:contractId/terminate', element: <AdminContractTerminatePage /> },
      { path: 'meter-readings', element: <AdminMeterReadingsPage /> },
      { path: 'invoices', element: <AdminInvoicesPage /> },
      { path: 'invoices/:invoiceId', element: <AdminInvoiceDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
    }],
  },
  {
    element: <RequireAuth roles={['resident']} />,
    children: [{ path: '/resident', element: <ResidentLayout />, errorElement: <RouteErrorPage />, children: [
      { index: true, element: <ResidentOverviewPage /> },
      { path: 'profile', element: <ResidentProfilePage /> },
      { path: 'contracts', element: <ResidentContractsPage /> },
      { path: 'contracts/:contractId', element: <ResidentContractDetailPage /> },
      { path: 'invoices', element: <ResidentInvoicesPage /> },
      { path: 'invoices/:invoiceId', element: <ResidentInvoiceDetailPage /> },
      { path: 'requests', element: <ResidentRequestsPage /> },
      { path: 'requests/new', element: <ResidentRequestNewPage /> },
      { path: 'requests/:requestId', element: <ResidentRequestDetailPage /> },
      { path: 'notifications', element: <ResidentNotificationsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ] }],
  },
  {
    element: <RequireAuth roles={['technician', 'guard']} />,
    children: [{ path: '/staff', element: <StaffLayout />, errorElement: <RouteErrorPage />, children: [
      { index: true, element: <Navigate to="profile" replace /> },
      { path: 'profile', element: <StaffProfilePage /> },
      { path: 'notifications', element: <StaffNotificationsPage /> },
      { element: <RequireAuth roles={['technician']} />, children: [
        { path: 'maintenance-requests', element: <TechnicianTasksPage /> },
        { path: 'maintenance-requests/:requestId', element: <TechnicianTaskDetailPage /> },
      ] },
      { element: <RequireAuth roles={['guard']} />, children: [
        { path: 'appointments', element: <GuardAppointmentsPage /> },
      ] },
      { path: '*', element: <NotFoundPage /> },
    ] }],
  },
])
