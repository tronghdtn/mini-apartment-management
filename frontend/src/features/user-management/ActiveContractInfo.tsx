import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import type { UserSummary } from './types'

export function ActiveContractInfo({ user }: { user: Pick<UserSummary, 'has_active_contract' | 'active_contract'> }) {
  return (
    <div className="space-y-2">
      <Badge tone={user.has_active_contract ? 'emerald' : 'slate'}>{user.has_active_contract ? 'Đang thuê' : 'Không đang thuê'}</Badge>
      {user.active_contract && <div className="text-xs">
        <Link to={`/admin/rooms/${user.active_contract.room.id}`} className="font-semibold text-sky-700 hover:underline">Phòng {user.active_contract.room.code}</Link>
        <p className="text-slate-500 mt-1">{user.active_contract.room.building.name}</p>
      </div>}
    </div>
  )
}
