import {useState} from 'react'
import {Button} from '@/components/ui/Button'
import {Modal} from '@/components/ui/Modal'
import {useAuth} from '@/features/auth/useAuth'
import {DirectPaymentForm,PaymentProofForm} from './PaymentEntryForm'
import {PaymentsWorkspace} from './PaymentsWorkspace'

export function InvoicePayments({invoiceId,status,outstanding,revision,admin=false,onChanged}:{invoiceId:number;status:string;outstanding:number;revision?:string|null;admin?:boolean;onChanged:()=>void}) {
  const {refresh}=useAuth()
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[version,setVersion]=useState(0)
  const payable=['issued','partially_paid'].includes(status)&&outstanding>0
  function saved(){setOpen(false);setVersion(value=>value+1);onChanged()}
  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Thanh toán hóa đơn</h2>{payable&&<Button disabled={busy||(admin&&!revision)} onClick={()=>setOpen(true)}>{admin?'Ghi nhận tiền thực nhận':'Gửi minh chứng chuyển khoản'}</Button>}</header><p className="text-sm text-slate-500">Minh chứng cần được Admin đối chiếu với tiền thực nhận. Thanh toán trực tuyến qua nhà cung cấp chưa được mở.</p><PaymentsWorkspace key={`${invoiceId}:${version}`} admin={admin} invoiceId={invoiceId} onChanged={onChanged} disabled={busy} onBusyChange={setBusy}/><Modal isOpen={open} onClose={()=>{if(!busy)saved()}} title={admin?'Ghi nhận thực nhận':'Gửi minh chứng chuyển khoản'} maxWidth="lg">{open&&(admin?<DirectPaymentForm invoiceId={invoiceId} outstanding={outstanding} revision={revision} onSaved={saved} onReload={saved} onBusyChange={setBusy} onAuthFailure={refresh}/>:<PaymentProofForm invoiceId={invoiceId} outstanding={outstanding} onSaved={saved} onReload={saved} onBusyChange={setBusy} onAuthFailure={refresh}/>)}</Modal></section>
}
