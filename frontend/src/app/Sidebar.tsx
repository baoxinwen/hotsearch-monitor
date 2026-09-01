import { NavLink } from 'react-router-dom'
import { Archive, Command as CommandIcon, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Settings, TrendingUp } from 'lucide-react'
import { useUIStore } from '../lib/store'
import { Kbd } from '../components/ui'

const NAV = [
  { to: '/', label: '实时热搜', icon: LayoutDashboard, kbd: '1', end: true },
  { to: '/insights', label: '趋势分析', icon: TrendingUp, kbd: '2' },
  { to: '/archive', label: '历史快照', icon: Archive, kbd: '3' },
  { to: '/settings', label: '设置', icon: Settings, kbd: '4' },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggle = useUIStore((s) => s.toggleSidebar)

  return (
    <aside
      className={`flex h-full flex-shrink-0 flex-col overflow-hidden border-r border-hair-soft bg-sidebar transition-[width] duration-200 ${
        collapsed ? 'w-[60px]' : 'w-[216px]'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center px-0 py-5' : 'px-4 py-5'}`}>
        <div className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-md bg-accent text-[14px] font-extrabold text-on-accent">
          H
        </div>
        {!collapsed && <span className="whitespace-nowrap text-[15px] font-bold tracking-tight text-ink">热搜监控</span>}
      </div>

      {/* 导航 */}
      <nav className="flex flex-col gap-0.5 px-2.5">
        {NAV.map(({ to, label, icon: Icon, kbd, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors ${
                collapsed ? 'justify-center px-0' : ''
              } ${
                isActive
                  ? 'bg-accent-soft font-semibold text-ink before:absolute before:-left-2.5 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-full before:bg-accent'
                  : 'text-mute hover:bg-surface-2 hover:text-body'
              }`
            }
          >
            <Icon size={16} strokeWidth={1.8} className="flex-shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{label}</span>}
            {!collapsed && <span className="ml-auto"><Kbd>{kbd}</Kbd></span>}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      {/* 底部 */}
      <div className="flex flex-col gap-0.5 border-t border-hair-soft p-2.5">
        <SidebarFootButton collapsed={collapsed} label="收起侧栏" onClick={toggle}>
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </SidebarFootButton>
      </div>
    </aside>
  )
}

function SidebarFootButton({
  collapsed,
  label,
  onClick,
  children,
}: {
  collapsed: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-mute transition-colors hover:bg-surface-2 hover:text-body ${
        collapsed ? 'justify-center px-0' : ''
      }`}
    >
      <span className="flex-shrink-0">{children}</span>
      {!collapsed && <span className="whitespace-nowrap">{label}</span>}
      {!collapsed && label === '命令面板' && <span className="ml-auto"><Kbd>⌘K</Kbd></span>}
    </button>
  )
}

export { CommandIcon }
