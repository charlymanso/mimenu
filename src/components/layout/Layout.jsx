import { Outlet, NavLink, Link } from 'react-router-dom'
import { CalendarDays, BookOpen, ShoppingCart, Package, Settings } from 'lucide-react'

const navItems = [
  { to: '/planner',  icon: CalendarDays, label: 'Menú' },
  { to: '/recipes',  icon: BookOpen,     label: 'Recetas' },
  { to: '/shopping', icon: ShoppingCart, label: 'Compra' },
  { to: '/pantry',   icon: Package,      label: 'Despensa' },
  { to: '/settings', icon: Settings,     label: 'Ajustes' },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top header */}
      <header className="bg-white border-b border-orange-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/planner" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 20 20" width="18" height="18" fill="white" aria-hidden="true">
                {/* dome */}
                <path d="M4 14V10a6 6 0 0 1 12 0v4H4Z" />
                {/* brim */}
                <rect x="3" y="14" width="14" height="3.5" rx="1.75" />
              </svg>
            </div>
            <span className="font-bold text-xl text-primary-600">MiMenú</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 pb-24">
        <Outlet />
      </main>

      {/* Bottom navigation (mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-100 shadow-lg z-10">
        <div className="max-w-5xl mx-auto flex">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              <Icon size={20} strokeWidth={isActive => (isActive ? 2.5 : 1.8)} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
