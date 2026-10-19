import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Globe,
  Shield,
  Home,
  Wrench,
  UserCheck,
  ChevronDown,
  Sparkles,
  X,
} from 'lucide-react'
import type { Role } from '@/mocks/types'
import { useApp } from '@/mocks/AppContext'

export const RoleSwitcher: React.FC = () => {
  const { role, setRole, currentUser } = useApp()
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)

  // 5 actor đã chốt (DB-D02); khách vãng lai không có tài khoản, 'user' là khách đã đăng ký.
  // notBuilt: vai trò đã chốt nhưng khu vực màn hình chưa có trong prototype.
  const rolesConfig: { id: Role; label: string; icon: React.ReactNode; defaultPath: string; color: string; notBuilt?: boolean }[] = [
    { id: 'guest', label: 'Khách tìm phòng', icon: <Globe className="w-3.5 h-3.5" />, defaultPath: '/', color: 'text-sky-600 bg-sky-50 border-sky-200' },
    { id: 'user', label: 'Khách đã đăng ký', icon: <Sparkles className="w-3.5 h-3.5" />, defaultPath: '/account/appointments', color: 'text-teal-600 bg-teal-50 border-teal-200' },
    { id: 'admin', label: 'Quản trị viên', icon: <Shield className="w-3.5 h-3.5" />, defaultPath: '/admin', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { id: 'resident', label: 'Cư dân', icon: <Home className="w-3.5 h-3.5" />, defaultPath: '/resident', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', notBuilt: true },
    { id: 'technician', label: 'Kỹ thuật viên', icon: <Wrench className="w-3.5 h-3.5" />, defaultPath: '/staff/maintenance-requests', color: 'text-amber-600 bg-amber-50 border-amber-200', notBuilt: true },
    { id: 'guard', label: 'Bảo vệ', icon: <UserCheck className="w-3.5 h-3.5" />, defaultPath: '/staff/appointments', color: 'text-blue-600 bg-blue-50 border-blue-200', notBuilt: true },
  ]

  const handleSelectRole = (newRole: Role, path: string) => {
    setRole(newRole)
    setIsExpanded(false)
    navigate(path)
  }

  const currentConfig = rolesConfig.find((r) => r.id === role) || rolesConfig[0]

  return (
    <div className="relative z-40 flex items-center shrink-0">
      {/* Floating Role Pill */}
      <div className="relative">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 text-white hover:bg-slate-900 backdrop-blur-md shadow-xl border border-slate-700/80 text-xs font-semibold transition-all hover:scale-102 cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="flex items-center gap-1.5 text-slate-200">
            {currentConfig.icon}
            <span><span className="hidden sm:inline">Vai trò: </span><strong className="text-white">{currentConfig.label}</strong></span>
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isExpanded && (
          <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-2xl border border-slate-200/90 p-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Chuyển vai trò xem thử
                </span>
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {currentUser.name}
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-1 space-y-1">
              {rolesConfig.map((item) => {
                const isActive = item.id === role
                if (item.notBuilt) {
                  return (
                    <div
                      key={item.id}
                      aria-disabled="true"
                      title="Khu vực màn hình của vai trò này chưa có trong prototype"
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2 opacity-60">
                        <span className={`p-1.5 rounded-lg border ${item.color}`}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Chưa có màn hình
                      </span>
                    </div>
                  )
                }
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectRole(item.id, item.defaultPath)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-100 text-slate-950 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`p-1.5 rounded-lg border ${item.color}`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="p-2 border-t border-slate-100 text-[11px] text-slate-400 text-center">
              Dữ liệu mock dùng chung cho mọi vai trò
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
