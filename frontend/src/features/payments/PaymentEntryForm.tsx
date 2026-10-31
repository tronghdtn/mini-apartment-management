import { useRef, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'
import { recordDirectPayment, submitPaymentProof } from './api'
import { directPaymentSchema, paymentProofSchema, type DirectPaymentInput, type PaymentProofInput } from './schemas'

interface Props { invoiceId:number; outstanding:number; revision?:string|null; onSaved:()=>void; onBusyChange:(busy:boolean)=>void; onAuthFailure:()=>void }
export function PaymentProofForm({invoiceId,outstanding,onSaved,onBusyChange,onAuthFailure}:Props) {
  const flight=useRef(false)
  const form=useForm<PaymentProofInput>({resolver:zodResolver(paymentProofSchema)})
  async function submit(event:FormEvent<HTMLFormElement>) {
    if(flight.current){event.preventDefault();return}
    flight.current=true;onBusyChange(true)
    try { await form.handleSubmit(async input=>{
      try {await submitPaymentProof(invoiceId,input);onSaved()}
      catch(failure){
        if(isAxiosError(failure)&&failure.response?.status===422)for(const key of ['amount','proof'] as const){const message=failure.response.data?.errors?.[key]?.[0];if(typeof message==='string')form.setError(key,{message})}
        const uncertain = isAxiosError(failure) && (!failure.response || failure.response.status >= 500)
        form.setError('root',{message:uncertain
          ? 'Chưa xác định được kết quả gửi. Hãy đóng biểu mẫu, tải lại lịch sử thanh toán và kiểm tra trước khi gửi lại.'
          : apiErrorMessage(failure)})
        if(isAxiosError(failure)&&[401,403].includes(failure.response?.status??0))onAuthFailure()
      }
    })(event) }finally{flight.current=false;onBusyChange(false)}
  }
  return <form noValidate onSubmit={submit} className="space-y-4"><p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">Còn phải trả: {formatVND(outstanding)}. Gửi ảnh chỉ tạo khoản chờ đối soát; chưa xác nhận đã nhận tiền và chưa giảm công nợ.</p><fieldset disabled={form.formState.isSubmitting} className="space-y-4"><label className="block text-sm font-bold">Số tiền đã chuyển (VND)<input type="number" step="1" {...form.register('amount',{valueAsNumber:true})} className="mt-1 w-full rounded-xl border border-slate-300 p-3"/><span className="text-xs text-rose-700">{form.formState.errors.amount?.message}</span></label><label className="block text-sm font-bold">Ảnh minh chứng chuyển khoản<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>form.setValue('proof',event.target.files?.[0],{shouldValidate:true})} className="mt-1 block w-full rounded-xl border border-slate-300 p-3 text-sm"/><span className="text-xs text-rose-700">{form.formState.errors.proof?.message}</span></label></fieldset>{form.formState.errors.root&&<p role="alert" className="text-sm text-rose-700">{form.formState.errors.root.message}</p>}<Button type="submit" isLoading={form.formState.isSubmitting}>Gửi minh chứng chờ đối soát</Button></form>
}

export function DirectPaymentForm({invoiceId,outstanding,revision,onSaved,onBusyChange,onAuthFailure}:Props) {
  const flight=useRef(false)
  const form=useForm<DirectPaymentInput>({resolver:zodResolver(directPaymentSchema),defaultValues:{method:'cash',confirmed_received:false}})
  async function submit(event:FormEvent<HTMLFormElement>) {
    if(flight.current){event.preventDefault();return}
    flight.current=true;onBusyChange(true)
    try{await form.handleSubmit(async input=>{
      try{await recordDirectPayment(invoiceId,revision!,input);onSaved()}
      catch(failure){
        if(isAxiosError(failure)&&failure.response?.status===422)for(const key of ['amount','method','confirmed_received'] as const){const message=failure.response.data?.errors?.[key]?.[0];if(typeof message==='string')form.setError(key,{message})}
        form.setError('root',{message:apiErrorMessage(failure)+(isAxiosError(failure)&&failure.response?.status===409?' Đóng biểu mẫu và tải lại hóa đơn trước khi nhận tiền.':'')})
        if(isAxiosError(failure)&&[401,403].includes(failure.response?.status??0))onAuthFailure()
      }
    })(event)}finally{flight.current=false;onBusyChange(false)}
  }
  return <form noValidate onSubmit={submit} className="space-y-4"><p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Còn phải trả: {formatVND(outstanding)}. Chỉ ghi nhận khi đã kiểm tra tiền thực nhận; hệ thống sẽ tạo biên nhận ngay.</p><fieldset disabled={form.formState.isSubmitting} className="space-y-4"><label className="block text-sm font-bold">Số tiền thực nhận (VND)<input type="number" step="1" {...form.register('amount',{valueAsNumber:true})} className="mt-1 w-full rounded-xl border border-slate-300 p-3"/><span className="text-xs text-rose-700">{form.formState.errors.amount?.message}</span></label><label className="block text-sm font-bold">Hình thức thực nhận<select {...form.register('method')} className="mt-1 w-full rounded-xl border border-slate-300 p-3"><option value="cash">Tiền mặt</option><option value="bank_transfer">Chuyển khoản đã đối chiếu</option></select></label><label className="flex items-start gap-2 text-sm"><input type="checkbox" {...form.register('confirmed_received')} className="mt-1"/>Tôi xác nhận đã thực nhận đúng số tiền trên.</label><p className="text-xs text-rose-700">{form.formState.errors.confirmed_received?.message}</p></fieldset>{form.formState.errors.root&&<p role="alert" className="text-sm text-rose-700">{form.formState.errors.root.message}</p>}<Button type="submit" disabled={!revision} isLoading={form.formState.isSubmitting}>Ghi nhận thực nhận</Button></form>
}
