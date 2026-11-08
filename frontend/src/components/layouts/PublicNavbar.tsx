import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import {
  Building2,
  Menu,
  X,
  PhoneCall,
} from 'lucide-react'
import { AccountActions } from '@/features/auth/AccountActions'
import { usePublicSettings } from '@/lib/publicSettings'

export const PublicNavbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const siteSettings = usePublicSettings()
  const contactPhone = siteSettings.contactPhone || '0901.000.001'
  const telHref = `tel:${contactPhone.replace(/[^0-9+]/g, '')}`

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const navLinks = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Tìm phòng trống', path: '/rooms' },
    { name: 'Liên hệ & Tòa nhà', path: '/contact' },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-200 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100 py-3'
            : 'bg-white/90 backdrop-blur-xs border-b border-slate-100/80 py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-sky-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-sky-600 transition-colors">
                  Mini<span className="text-sky-600">Apart</span>
                </span>
                <span className="hidden sm:block text-[10px] uppercase font-bold tracking-widest text-slate-400 -mt-1">
                  Chung cư mini tiện nghi
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 lg:gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive(link.path)
                      ? 'text-sky-700 bg-sky-50/80 font-semibold'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
              <a
                href={telHref}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-sky-700 transition-colors"
                title="Gọi Hotline tư vấn nhanh"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <PhoneCall className="w-3.5 h-3.5 text-sky-600" />
                <span>Hotline: <strong className="font-semibold text-slate-900">{contactPhone}</strong></span>
              </a>

              <AccountActions menu />
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex lg:hidden items-center gap-2">
              <AccountActions compact />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                aria-label="Menu"
                aria-expanded={mobileMenuOpen}
                aria-controls="public-mobile-navigation"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div id="public-mobile-navigation" className="lg:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 shadow-lg animate-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col gap-1.5">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive(link.path)
                      ? 'text-sky-600 bg-sky-50 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                <a
                  href={telHref}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-sky-600" />
                  <span>Hotline: {contactPhone}</span>
                </a>
                <AccountActions />
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  )
}
