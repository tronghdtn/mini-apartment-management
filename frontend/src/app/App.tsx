import { RouterProvider } from 'react-router'
import { router } from './router'
import { AppProvider } from '@/mocks/AppContext'
import { AuthProvider } from '@/features/auth/AuthProvider'

export function App() {
  // AppProvider là "backend giả" trong bộ nhớ (mock). Khi tích hợp Laravel API,
  // từng màn hình chuyển dần sang gọi src/features/<feature>/api.ts.
  return (
    <AuthProvider><AppProvider>
      <RouterProvider router={router} />
    </AppProvider></AuthProvider>
  )
}
