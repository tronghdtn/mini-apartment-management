import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Bell } from 'lucide-react'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDateTime } from '@/lib/format'
import { getNotifications, readAllNotifications, readNotification } from './api'
import { withoutNotificationPage } from './filters'
import { notificationFiltersSchema } from './schemas'
import type { NotificationItem, NotificationPage } from './types'
import { RefreshingFrame } from '@/components/ui/RefreshingFrame'
import { useKeepPrevious } from '@/hooks/useKeepPrevious'

export function NotificationsWorkspace({ queryPrefix = '' }: { queryPrefix?: string }) {
  const {refresh}=useAuth()
  const navigate=useNavigate()
  const [params,setParams]=useSearchParams()
  const statusKey=`${queryPrefix}status`, pageKey=`${queryPrefix}page`
  const status=params.get(statusKey)??'all', page=params.get(pageKey)??'1'
  const [retry,setRetry]=useState(0), [busy,setBusy]=useState(false), [actionError,setActionError]=useState('')
  const flight=useRef(false)
  const key=`${status}:${page}:${retry}`
  const [result,setResult]=useState<{key:string;data?:NotificationPage;error?:string}>()
  const valid=notificationFiltersSchema.safeParse({status,page}).success
  useEffect(()=>{
    if(!valid)return
    const abort=new AbortController()
    getNotifications({status:status as 'all'|'unread',page},abort.signal).then(data=>{if(!abort.signal.aborted)setResult({key,data})})
      .catch(failure=>{if(!abort.signal.aborted){setResult({key,error:apiErrorMessage(failure)});if(isAxiosError(failure)&&[401,403].includes(failure.response?.status??0))void refresh()}})
    return ()=>abort.abort()
  },[key,status,page,valid,refresh])
  const current=result?.key===key?result:undefined
  const {value:shown,stale}=useKeepPrevious(current?.data?current:undefined)
  const error=!valid?'Bộ lọc thông báo không hợp lệ.':current?.error
  async function runReadAction(action:()=>Promise<unknown>,target?:string|null){
    if(flight.current)return
    flight.current=true;setBusy(true);setActionError('')
    try{
      await action()
      if(target)navigate(target)
      else{
        if(status==='unread')setParams(previous=>withoutNotificationPage(previous,queryPrefix))
        setRetry(value=>value+1)
      }
    }catch(failure){setActionError(apiErrorMessage(failure));if(isAxiosError(failure)&&[401,403].includes(failure.response?.status??0))void refresh()}
    finally{flight.current=false;setBusy(false)}
  }
  function openDetails(item:NotificationItem){
    if(flight.current||!item.link)return
    if(item.read_at)navigate(item.link)
    else void runReadAction(()=>readNotification(item.id),item.link)
  }
  function changePage(value:number){const next=new URLSearchParams(params);next.set(pageKey,String(value));setParams(next)}
  function changeStatus(value:string){const next=withoutNotificationPage(params,queryPrefix);if(value==='all')next.delete(statusKey);else next.set(statusKey,value);setParams(next)}
  return <div className="space-y-6"><header className="border-b border-slate-200 pb-5"><h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900"><Bell className="h-6 w-6 text-sky-600"/>Thông báo của tôi</h1><p className="mt-2 text-sm text-slate-500">Thông tin từ các nghiệp vụ liên quan đến tài khoản của bạn.</p></header>
    <div className="flex flex-wrap items-center justify-between gap-3"><nav aria-label="Lọc thông báo" className="flex gap-2">{(['all','unread'] as const).map(tab=><button type="button" key={tab} disabled={busy} aria-current={status===tab?'page':undefined} onClick={()=>{setActionError('');changeStatus(tab)}} className={`rounded-xl px-4 py-2 text-sm font-bold ${status===tab?'bg-sky-600 text-white':'bg-white text-slate-600'}`}>{tab==='all'?'Tất cả':'Chưa đọc'}</button>)}</nav><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy||!current?.data||current.data.unread_count===0} onClick={()=>void runReadAction(readAllNotifications)}>Đánh dấu tất cả đã đọc</Button><Button variant="outline" disabled={busy} onClick={()=>{setActionError('');setRetry(value=>value+1)}}>Tải lại</Button></div></div>
    {actionError&&<p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{actionError}</p>}
    {error?<div role="alert" className="rounded-2xl border border-rose-200 bg-white p-5"><p>{error}</p><Button onClick={()=>{if(!valid)changeStatus('all');setRetry(value=>value+1)}}>Thử lại</Button></div>:!shown?.data?<p role="status">Đang tải thông báo…</p>:<RefreshingFrame busy={stale} className="space-y-6">
      <p className="text-sm text-slate-500">{shown.data.unread_count} thông báo chưa đọc</p>
      {!shown.data.data.length?<p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Chưa có thông báo phù hợp.</p>:<ul className="space-y-3">{shown.data.data.map(item=><li key={item.id} className={`space-y-3 rounded-2xl border bg-white p-5 ${item.read_at?'border-slate-200':'border-sky-300'}`}><div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold text-slate-900">{item.title}</h2><span className="text-xs text-slate-500">{item.created_at?formatDateTime(item.created_at):'Chưa có thời gian'}</span></div><p className="whitespace-pre-wrap break-words text-sm text-slate-600">{item.body}</p><div className="flex flex-wrap items-center gap-4">{item.link&&<Link to={item.link} aria-disabled={busy} onClick={event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();openDetails(item)}} className="text-sm font-bold text-sky-700 underline">Xem chi tiết</Link>}{!item.read_at?<Button disabled={busy} variant="outline" onClick={()=>void runReadAction(()=>readNotification(item.id))}>Đánh dấu đã đọc</Button>:<span className="text-xs text-teal-700">Đã đọc</span>}</div></li>)}</ul>}
      <nav aria-label="Phân trang thông báo" className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Trang {shown.data.meta.current_page}/{shown.data.meta.last_page}</p><div className="flex gap-2"><Button variant="outline" disabled={busy||Number(page)<=1} onClick={()=>changePage(Number(page)-1)}>Trước</Button><Button variant="outline" disabled={busy||Number(page)>=shown.data.meta.last_page} onClick={()=>changePage(Number(page)+1)}>Sau</Button></div></nav>
    </RefreshingFrame>}
  </div>
}
