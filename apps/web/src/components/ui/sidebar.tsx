'use client'

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSidebarStore } from "@/store/sidebar"
import { LayoutDashboard, Wallet, CheckSquare, Sparkles, Zap, Plug, Settings, ChevronLeft, ChevronRight } from "lucide-react"

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Wallet, label: 'Finance', href: '/finance' },
  { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
  { icon: Sparkles, label: 'Assistant', href: '/assistant' },
  { icon: Zap, label: 'Automations', href: '/automations' },
  { icon: Plug, label: 'Integrations', href: '/integrations' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isOpen, toggle } = useSidebarStore()

  return (
    <div className={cn("h-screen flex flex-col border-r border-surface-elevated bg-surface transition-all duration-300", isOpen ? "w-64" : "w-16")}>
      <div className="flex h-16 items-center justify-between px-4 border-b border-surface-elevated">
        {isOpen && <span className="font-bold text-lg text-primary truncate">Pulse</span>}
        <button onClick={toggle} className="p-1.5 rounded-md hover:bg-surface-elevated text-text-muted">
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <div className="flex-1 py-4 flex flex-col gap-1 px-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
              pathname.startsWith(item.href) 
                ? "bg-primary/10 text-primary" 
                : "text-text-muted hover:bg-surface-elevated hover:text-text"
            )}
          >
            <item.icon size={20} className="shrink-0" />
            {isOpen && <span>{item.label}</span>}
          </Link>
        ))}
      </div>

      <div className="p-2 border-t border-surface-elevated">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
            pathname.startsWith('/settings')
              ? "bg-primary/10 text-primary"
              : "text-text-muted hover:bg-surface-elevated hover:text-text"
          )}
        >
          <Settings size={20} className="shrink-0" />
          {isOpen && <span>Settings</span>}
        </Link>
      </div>
    </div>
  )
}
