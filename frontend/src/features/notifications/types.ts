export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  read_at: string | null
  created_at: string | null
}
export interface NotificationPage {
  data: NotificationItem[]
  unread_count: number
  meta: { current_page: number; last_page: number; total: number }
}
