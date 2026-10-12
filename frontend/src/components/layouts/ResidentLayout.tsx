import { DashboardShell, type NavItem } from './DashboardShell'

const navItems: NavItem[] = [
  { to: '/resident', label: 'Tổng quan', end: true },
  { to: '/resident/invoices', label: 'Hóa đơn' },
  { to: '/resident/requests', label: 'Yêu cầu sửa chữa' },
  { to: '/resident/profile', label: 'Thông tin cá nhân' },
]

export function ResidentLayout() {
  return <DashboardShell areaLabel="Cư dân" homePath="/resident" navItems={navItems} />
}
