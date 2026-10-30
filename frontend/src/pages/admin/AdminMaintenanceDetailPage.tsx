import { useParams } from 'react-router'
import { MaintenanceRequestDetail } from '@/features/maintenance-requests/MaintenanceRequestDetail'

export function AdminMaintenanceDetailPage() {
  const { requestId } = useParams<{ requestId: string }>()
  return <MaintenanceRequestDetail key={requestId} audience="admin" requestId={requestId}/>
}
