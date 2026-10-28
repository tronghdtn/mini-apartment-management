import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { apiErrorMessage } from '@/lib/apiErrors'
import { getPaymentProof } from './api'

export function PrivatePaymentProof({id,onAuthFailure}:{id:number;onAuthFailure:()=>void}) {
  const [photo,setPhoto]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const flight=useRef<AbortController|null>(null),url=useRef('')
  useEffect(()=>()=>{flight.current?.abort();if(url.current)URL.revokeObjectURL(url.current)},[])
  async function open(){
    if(flight.current)return
    const abort=new AbortController();flight.current=abort;setBusy(true);setError('')
    try{const blob=await getPaymentProof(id,abort.signal);if(abort.signal.aborted)return
      if(!['image/jpeg','image/png','image/webp'].includes(blob.type))throw new Error('Ảnh không hợp lệ.')
      url.current=URL.createObjectURL(blob);setPhoto(url.current)
    }catch(failure){if(!abort.signal.aborted){setError(apiErrorMessage(failure));if(isAxiosError(failure)&&[401,403].includes(failure.response?.status??0))onAuthFailure()}}
    finally{if(!abort.signal.aborted){flight.current=null;setBusy(false)}}
  }
  return <div className="space-y-2">{photo?<><img src={photo} alt={`Minh chứng thanh toán #${id}`} className="max-h-64 max-w-full rounded-xl border border-slate-200 object-contain"/><Button variant="ghost" onClick={()=>{URL.revokeObjectURL(url.current);url.current='';setPhoto('')}}>Ẩn minh chứng #{id}</Button></>:<Button variant="outline" disabled={busy} onClick={()=>void open()}>Xem minh chứng #{id}</Button>}{error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}</div>
}
