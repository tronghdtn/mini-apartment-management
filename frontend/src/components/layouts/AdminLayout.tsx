import { DashboardShell, type NavItem } from './DashboardShell'

const navItems: NavItem[] = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/buildings', label: 'Tòa nhà' },
  { to: '/admin/rooms', label: 'Phòng' },
  { to: '/admin/residents', label: 'Cư dân' },
]

export function AdminLayout() {
  return <DashboardShell areaLabel="Quản trị viên" homePath="/admin" navItems={navItems} />
}
