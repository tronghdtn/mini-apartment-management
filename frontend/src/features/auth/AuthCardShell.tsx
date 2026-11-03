import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Building2 } from 'lucide-react'

/** Khung thẻ giống trang Đăng nhập cho các trang tài khoản công khai (quên/đặt lại mật khẩu, liên kết email). */
export function AuthCardShell({ title, children }: { title: string; children: ReactNode }) {
  return <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
    <div className="space-y-5 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-teal-400 text-white"><Building2 className="h-5 w-5" /></div>
        <div><span className="block text-xl font-extrabold leading-tight text-slate-900">Mini<span className="text-sky-600">Apart</span></span><h1 className="text-xs text-slate-400">{title}</h1></div>
      </div>
      {children}
      <p className="border-t border-slate-100 pt-4 text-center text-xs text-slate-500"><Link to="/login" className="font-bold text-sky-600 hover:underline">Về trang đăng nhập</Link></p>
    </div>
  </div>
}
