import { RouterProvider } from 'react-router'
import { router } from './router'
import { AppProvider } from '@/mocks/AppContext'

export function App() {
  // AppProvider là "backend giả" trong bộ nhớ (mock). Khi tích hợp Laravel API,
  // từng màn hình chuyển dần sang gọi src/features/<feature>/api.ts.
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  )
}
