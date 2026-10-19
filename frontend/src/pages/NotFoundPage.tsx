import React from 'react'
import { Link } from 'react-router'
import { Home, Search, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
      <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-sky-600" />
      </div>

      <div>
        <span className="text-4xl font-extrabold text-slate-900 tracking-tight block">
          404
        </span>
        <h1 className="text-xl font-bold text-slate-800 mt-2">
          Không Tìm Thấy Trang Yêu Cầu
        </h1>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Đường dẫn bạn truy cập có thể đã bị thay đổi hoặc không tồn tại trên hệ thống MiniApart.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <Link to="/">
          <Button variant="primary" size="md" icon={<Home className="w-4 h-4" />}>
            Về Trang chủ
          </Button>
        </Link>
        <Link to="/rooms">
          <Button variant="outline" size="md" icon={<Search className="w-4 h-4" />}>
            Tìm phòng trống
          </Button>
        </Link>
      </div>
    </div>
  )
}
