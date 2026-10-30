import { useParams } from 'react-router'
import { MaintenanceRequestDetail } from '@/features/maintenance-requests/MaintenanceRequestDetail'

export function TechnicianTaskDetailPage() {
  const { requestId } = useParams<{ requestId: string }>()
  return <MaintenanceRequestDetail key={requestId} audience="technician" requestId={requestId}/>
}
