import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { apiErrorMessage } from '@/lib/apiErrors'
import { getContract, getContractOptions } from '@/features/contracts/api'
import { DraftContractForm } from '@/features/contracts/DraftContractForm'
import type { Contract, ContractOptions } from '@/features/contracts/types'

const flow = [
  { title: 'Phòng, người thuê, thời hạn và tiền', detail: 'Lưu thành bản nháp; có thể sửa hoặc xóa khi chưa nhận cọc.', place: 'Trang này' },
  { title: 'Dịch vụ và điều khoản', detail: 'Chọn dịch vụ định kỳ, phí trả trước hạn và điều kiện miễn đã thỏa thuận.', place: 'Chi tiết hợp đồng' },
  { title: 'Nhận cọc và kích hoạt', detail: 'Xác nhận thực nhận cọc, nhập chỉ số điện nước đầu rồi kích hoạt.', place: 'Chi tiết hợp đồng' },
  { title: 'Bàn giao và thanh lý', detail: 'Chốt chỉ số, kiểm tra tài sản, hóa đơn tất toán, đối soát cọc.', place: 'Sau khi hiệu lực' },
]

export function AdminContractNewPage() {
  const { contractId } = useParams<{ contractId: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [options, setOptions] = useState<ContractOptions | null>(null)
  const [contract, setContract] = useState<Contract>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [resolvedId, setResolvedId] = useState<string>()
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getContractOptions(controller.signal), contractId ? getContract(contractId, controller.signal) : Promise.resolve(undefined)])
      .then(([choices, draft]) => { if (!controller.signal.aborted) { setOptions(choices); setContract(draft); setError(''); setResolvedId(contractId) } })
      .catch(failure => { if (!controller.signal.aborted) { setOptions(null); setContract(undefined); setError(apiErrorMessage(failure)); setResolvedId(contractId) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [contractId, revision])
  const reload = () => { setLoading(true); setRevision(value => value + 1) }
  if (loading || resolvedId !== contractId) return <p role="status" className="text-sm text-slate-500 py-6">Đang tải dữ liệu lập hợp đồng…</p>
  if (error || !options) return <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4"><h1 className="text-xl font-bold text-slate-900">Chưa tải được dữ liệu hợp đồng</h1><p role="alert" className="text-sm text-rose-700">{error}</p><div className="flex flex-wrap gap-3 items-center"><Button variant="outline" onClick={reload}>Thử lại</Button><Link to="/admin/contracts" className="text-sm text-sky-700 underline">Về danh sách hợp đồng</Link><a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a></div></div>
  if (contract && contract.status !== 'draft') return <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4"><h1 className="text-xl font-bold text-slate-900">Hợp đồng không còn là bản nháp</h1><p role="alert" className="text-sm text-slate-600">Không thể sửa các thông tin này sau khi hợp đồng đã chuyển trạng thái.</p><Link to={`/admin/contracts/${contract.id}`} className="text-sm text-sky-700 underline">Xem chi tiết hợp đồng</Link></div>
  return <div className="max-w-5xl mx-auto space-y-6 pb-12">
    <nav aria-label="Đường dẫn" className="flex flex-wrap gap-2 items-center text-xs text-slate-500"><Link to="/admin/contracts" className="hover:text-slate-900">Hợp đồng</Link><ChevronRight className="w-3.5 h-3.5" />{contract && <><Link to={`/admin/contracts/${contract.id}`} className="hover:text-slate-900">Bản nháp #{contract.id}</Link><ChevronRight className="w-3.5 h-3.5" /></>}<span className="font-bold text-slate-900">{contract ? 'Sửa bản nháp' : 'Lập hợp đồng mới'}</span></nav>
    <div><h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{contract ? 'Sửa Hợp Đồng Nháp' : 'Lập Hợp Đồng Cho Thuê'}</h1><p className="text-xs text-slate-500 mt-1">{contract ? `Bản nháp #${contract.id} · Phòng ${contract.room.code}. Thay đổi chỉ được lưu khi bấm lưu.` : 'Lưu các thông tin cơ bản dưới dạng bản nháp; chưa kích hoạt hợp đồng.'}</p></div>
    <section aria-labelledby="contract-flow-title" className="p-4 sm:p-5 bg-sky-50 border border-sky-100 rounded-2xl text-sm text-sky-900 space-y-3">
      <h2 id="contract-flow-title" className="font-bold">Quy trình hợp đồng</h2>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{flow.map((item, index) => <li key={item.title} className={`rounded-xl border p-3 ${index === 0 ? 'border-sky-300 bg-white' : 'border-sky-100 bg-sky-50'}`}>
        <span className="block text-xs font-bold uppercase tracking-wide text-sky-700">{index === 0 ? 'Trang này' : item.place}</span>
        <span className="mt-1 block font-semibold text-slate-900">{item.title}</span>
        <span className="mt-1 hidden text-xs text-slate-600 sm:block">{item.detail}</span>
      </li>)}</ol>
      <p className="text-xs text-sky-800">Lưu nháp không nhận cọc, không đổi trạng thái phòng hoặc vai trò người thuê. Sau khi lưu, quản lý hồ sơ tại tab Người ở cùng trên trang chi tiết bản nháp; số người khai báo được giữ riêng.</p>
    </section>
    <DraftContractForm key={`${contractId ?? 'new'}-${revision}`} options={options} contract={contract} roomId={params.get('roomId')} onReload={reload} onCancel={() => navigate(contract ? `/admin/contracts/${contract.id}` : '/admin/contracts')} onSaved={saved => navigate(`/admin/contracts/${saved.id}`, { state: { success: contract ? 'Đã cập nhật hợp đồng nháp.' : 'Đã lưu hợp đồng nháp.' } })} />
  </div>
}
