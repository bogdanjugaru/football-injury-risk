import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Target, BarChart3, GitCompare, Brain, SplitSquareHorizontal, Shield, Clock } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/players', icon: Users, label: 'Jucatori' },
  { to: '/prediction', icon: Target, label: 'Predictie Risc' },
  { to: '/compare', icon: SplitSquareHorizontal, label: 'Comparare Jucatori' },
  { to: '/squad', icon: Shield, label: 'Risc Echipa' },
  { to: '/injury-timeline', icon: Clock, label: 'Istoric & Recuperare' },
  { to: '/statistics', icon: BarChart3, label: 'Statistici' },
  { to: '/model-comparison', icon: GitCompare, label: 'Comparare Modele' },
  { to: '/model', icon: Brain, label: 'Model ML' },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`fixed top-0 left-0 w-[250px] h-screen bg-bg2 border-r border-border flex flex-col z-50 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <span className="text-3xl text-primary">⚽</span>
          <div>
            <div className="text-[17px] font-bold text-text tracking-wide">FootballRisk</div>
            <div className="text-[11px] text-text-muted uppercase tracking-widest">Injury Analytics</div>
          </div>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-all duration-150 ${
                  isActive
                    ? 'bg-primary/15 text-primary font-semibold'
                    : 'text-text-muted hover:bg-bg3 hover:text-text'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-border">
          <div className="text-[11px] text-text-muted flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            Lucrare de Licenta 2026
          </div>
        </div>
      </aside>
    </>
  )
}
