import { RequireAuth } from '@/features/auth/RequireAuth'
import { createBrowserRouter } from 'react-router'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { HomePage } from '@/pages/public/HomePage'
import { RoomListPage } from '@/pages/public/RoomListPage'
import { RoomDetailPage } from '@/pages/public/RoomDetailPage'
import { BookingPage } from '@/pages/public/BookingPage'
import { ContactPage } from '@/pages/public/ContactPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RouteErrorPage } from '@/pages/RouteErrorPage'
import { LoginPage } from '@/pages/public/LoginPage'
import { RegisterPage } from '@/pages/public/RegisterPage'
import { GuestAppointmentsPage } from '@/pages/public/GuestAppointmentsPage'
import { GuestProfilePage } from '@/pages/public/GuestProfilePage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminBuildingsPage } from '@/pages/admin/AdminBuildingsPage'
import { AdminBuildingDetailPage } from '@/pages/admin/AdminBuildingDetailPage'
import { AdminRoomsPage } from '@/pages/admin/AdminRoomsPage'
import { AdminRoomDetailPage } from '@/pages/admin/AdminRoomDetailPage'
import { AdminAmenitiesPage } from '@/pages/admin/AdminAmenitiesPage'
import { AdminServicesPage } from '@/pages/admin/AdminServicesPage'
import { AdminUtilityPricesPage } from '@/pages/admin/AdminUtilityPricesPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminUserDetailPage } from '@/pages/admin/AdminUserDetailPage'
import { AdminContractsPage } from '@/pages/admin/AdminContractsPage'
import { AdminContractNewPage } from '@/pages/admin/AdminContractNewPage'
import { AdminContractDetailPage } from '@/pages/admin/AdminContractDetailPage'
import { AdminContractTerminatePage } from '@/pages/admin/AdminContractTerminatePage'
import { AdminMeterReadingsPage } from '@/pages/admin/AdminMeterReadingsPage'
import { AdminInvoicesPage } from '@/pages/admin/AdminInvoicesPage'
import { AdminInvoiceDetailPage } from '@/pages/admin/AdminInvoiceDetailPage'
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage'

// Chỉ khai báo những màn hình đã thực sự có trang. Khu vực Cư dân (/resident) và
// Nhân viên (/staff) chưa có trang nào nên chưa được đăng ký route.
export const router = createBrowserRouter([
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
      { path: 'register', element: <RegisterPage /> },
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
])
