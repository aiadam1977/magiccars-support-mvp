'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function Nav() {
  const path   = usePathname()
  const router = useRouter()

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/cases', label: 'All Activity' },
    { href: '/callers', label: 'Customers' },
    { href: '/templates', label: 'Email Templates' },
    { href: '/team', label: 'Team' },
    { href: '/demo', label: 'Test Session' },
  ]

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <nav className="bg-[#E31837] text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-[#E31837] text-sm">
            MC
          </div>
          <span className="font-bold text-lg tracking-tight">MagicCars Support</span>
        </div>
        <div className="flex items-center gap-1">
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
          <button
            onClick={handleLogout}
            className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}
