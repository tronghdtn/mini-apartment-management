import { useParams } from 'react-router'
import { MaintenanceRequestDetail } from '@/features/maintenance-requests/MaintenanceRequestDetail'

export function ResidentRequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>()
  return <MaintenanceRequestDetail key={requestId} audience="resident" requestId={requestId}/>
}
