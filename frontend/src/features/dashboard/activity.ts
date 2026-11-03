// Queue totals come from server pagination metadata, never the visible row count.
export const dashboardQueues = [
  { key: 'payments', label: 'Thanh toán chờ xác nhận', path: '/payments', params: { status: 'pending' }, href: '/admin/payments?status=pending' },
  { key: 'maintenance', label: 'Sửa chữa chờ xử lý', path: '/maintenance-requests', params: { status: 'pending' }, href: '/admin/maintenance-requests' },
  { key: 'expiring', label: 'Hợp đồng sắp hết hạn', path: '/contracts', params: { due: 'expiring' }, href: '/admin/contracts?due=expiring' },
  { key: 'overdue', label: 'Hợp đồng quá hạn trả phòng', path: '/contracts', params: { due: 'overdue' }, href: '/admin/contracts?due=overdue' },
] as const
export type DashboardQueue = typeof dashboardQueues[number]
