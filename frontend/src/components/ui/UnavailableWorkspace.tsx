import { useId, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, CircleHelp, LockKeyhole, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from './Button'
import { EmptyState } from './EmptyState'
import { Modal } from './Modal'
import { Tabs } from './Tabs'

interface WorkspaceAction { label: string; fields: string[] }
interface WorkspaceSection { title: string; fields?: string[] }
interface UnavailableWorkspaceProps {
  title: string
  description: string
  icon: LucideIcon
  eyebrow?: string
  tabs?: string[]
  stats?: string[]
  columns?: string[]
  actions?: WorkspaceAction[]
  sections?: WorkspaceSection[]
  backTo?: string
}

/** A missing data source is distinct from a successful API response with zero rows. */
export function UnavailableWorkspace({ title, description, icon: Icon, eyebrow = 'Quản lý chung cư mini', tabs = [], stats = [], columns = [], actions = [], sections = [], backTo }: UnavailableWorkspaceProps) {
  const [tab, setTab] = useState('0')
  const [action, setAction] = useState<WorkspaceAction | null>(null)
  const id = useId()
  return <div className="space-y-6">
    {backTo && <Link to={backTo} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-sky-600"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Quay lại danh sách</Link>}
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="mb-1 text-xs font-bold uppercase tracking-wider text-sky-600">{eyebrow}</p><h1 className="flex items-center gap-2.5 text-xl font-extrabold text-slate-900 sm:text-2xl"><Icon aria-hidden="true" className="h-6 w-6 shrink-0 text-sky-600" />{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div><div className="flex flex-wrap gap-2">{actions.map(item => <Button key={item.label} variant="outline" size="sm" onClick={() => setAction(item)} icon={<CircleHelp className="h-4 w-4" />}>{item.label}</Button>)}</div></header>
    <p role="status" className="flex gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"><LockKeyhole aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />Chức năng này chưa kết nối dữ liệu nghiệp vụ. Các số liệu chưa được cung cấp; biểu mẫu chỉ hiển thị cấu trúc và chưa nhận thao tác lưu.</p>
    {stats.length > 0 && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(label => <section key={label} className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 font-display text-2xl font-bold text-slate-400" aria-label={`${label}: chưa có số liệu`}>—</p></section>)}</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
      <div className="space-y-4 border-b border-slate-100 p-4 sm:p-5">{tabs.length > 0 && <Tabs tabs={tabs.map((label, index) => ({ id: String(index), label }))} activeTab={tab} onChange={setTab} size="sm" />}<div className="relative max-w-md"><label htmlFor={`${id}-search`} className="sr-only">Tìm kiếm</label><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input id={`${id}-search`} disabled placeholder="Tìm kiếm — chưa kết nối dữ liệu" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm" /></div></div>
      {columns.length > 0 ? <div className="overflow-x-auto"><table className="w-full min-w-160 text-left text-sm"><thead className="bg-slate-50 text-xs font-bold text-slate-500"><tr>{columns.map(column => <th key={column} scope="col" className="px-5 py-3">{column}</th>)}</tr></thead><tbody><tr><td colSpan={columns.length}><EmptyState title="Dữ liệu chưa được kết nối" description="Đây là trạng thái chưa triển khai, không phải kết quả danh sách rỗng. Dữ liệu sẽ được hiển thị sau khi chức năng được kết nối theo quyền của tài khoản." /></td></tr></tbody></table></div> : <EmptyState title={tabs.length ? `${tabs[Number(tab)]} — chưa có nguồn dữ liệu` : 'Dữ liệu chưa được kết nối'} description="Thông tin sẽ được hiển thị từ hệ thống khi nghiệp vụ tương ứng được triển khai. Không sử dụng bản ghi hoặc số tiền minh họa." />}
    </section>
    {sections.length > 0 && <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">{sections.map(section => <section key={section.title} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"><h2 className="border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">{section.title}</h2>{section.fields?.map(label => <div key={label} className="flex flex-wrap justify-between gap-2 text-sm"><span className="text-slate-500">{label}</span><span className="text-slate-400">Chưa có dữ liệu</span></div>)}</section>)}</div>}
    <Modal isOpen={action !== null} onClose={() => setAction(null)} title={action?.label} maxWidth="lg"><p className="mb-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-900">Biểu mẫu chưa được mở để lưu dữ liệu. Không gửi thông tin hoặc tệp tại đây.</p><fieldset disabled className="space-y-4">{action?.fields.map((label, index) => <div key={label}><label htmlFor={`${id}-field-${index}`} className="mb-1.5 block text-xs font-bold text-slate-700">{label}</label><input id={`${id}-field-${index}`} value="" readOnly className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></div>)}<Button disabled>Lưu — chưa được mở</Button></fieldset><div className="mt-5 flex justify-end border-t border-slate-100 pt-4"><Button variant="outline" onClick={() => setAction(null)}>Đóng</Button></div></Modal>
  </div>
}
