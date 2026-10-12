import { createBrowserRouter } from 'react-router'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { ResidentLayout } from '@/components/layouts/ResidentLayout'
import { AdminBuildingsPage } from '@/pages/admin/AdminBuildingsPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminResidentsPage } from '@/pages/admin/AdminResidentsPage'
import { AdminRoomsPage } from '@/pages/admin/AdminRoomsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ContactPage } from '@/pages/public/ContactPage'
import { HomePage } from '@/pages/public/HomePage'
import { LoginPage } from '@/pages/public/LoginPage'
import { RoomsPage } from '@/pages/public/RoomsPage'
import { ResidentDashboardPage } from '@/pages/resident/ResidentDashboardPage'
import { ResidentInvoicesPage } from '@/pages/resident/ResidentInvoicesPage'
import { ResidentProfilePage } from '@/pages/resident/ResidentProfilePage'
import { ResidentRequestsPage } from '@/pages/resident/ResidentRequestsPage'
import { RouteErrorPage } from '@/pages/RouteErrorPage'

// TODO: bảo vệ /resident và /admin bằng route guard khi triển khai xác thực Sanctum.
export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'rooms', element: <RoomsPage /> },
          { path: 'contact', element: <ContactPage /> },
          { path: 'login', element: <LoginPage /> },
        ],
      },
      {
        path: 'resident',
        element: <ResidentLayout />,
        children: [
          { index: true, element: <ResidentDashboardPage /> },
          { path: 'invoices', element: <ResidentInvoicesPage /> },
          { path: 'requests', element: <ResidentRequestsPage /> },
          { path: 'profile', element: <ResidentProfilePage /> },
        ],
      },
      {
        path: 'admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'buildings', element: <AdminBuildingsPage /> },
          { path: 'rooms', element: <AdminRoomsPage /> },
          { path: 'residents', element: <AdminResidentsPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
