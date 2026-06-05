'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const path = usePathname()

  const links = [
    { href: '/demo', label: 'Demo Simulator' },
    { href: '/cases', label: 'All Activity' },
    { href: '/templates', label: 'Email Templates' },
  ]

  return (
    <nav className="bg-[#E31837] text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-[#E31837] text-sm">
            MC
          </div>
          <span className="font-bold text-lg tracking-tight">MagicCars Support</span>
          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full ml-1">MVP</span>
        </div>
        <div className="flex gap-1">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                path === link.href
                  ? 'bg-white text-[#E31837]'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
