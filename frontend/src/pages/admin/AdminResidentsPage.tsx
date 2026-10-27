import { AdminUsersPage } from './AdminUsersPage'

/** Uses the approved users API; resident role and active tenancy remain distinct. */
export function AdminResidentsPage() {
  return <AdminUsersPage residentsOnly />
}
