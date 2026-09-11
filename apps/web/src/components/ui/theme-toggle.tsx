'use client'

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useThemeStore } from "@/store/theme"
import { Button } from "./button"

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg">
      <Button 
        variant={theme === 'light' ? 'default' : 'ghost'} 
        size="sm" 
        className="px-2 h-8"
        onClick={() => setTheme('light')}
      >
        <Sun size={16} />
      </Button>
      <Button 
        variant={theme === 'dark' ? 'default' : 'ghost'} 
        size="sm" 
        className="px-2 h-8"
        onClick={() => setTheme('dark')}
      >
        <Moon size={16} />
      </Button>
      <Button 
        variant={theme === 'system' ? 'default' : 'ghost'} 
        size="sm" 
        className="px-2 h-8"
        onClick={() => setTheme('system')}
      >
        <Monitor size={16} />
      </Button>
    </div>
  )
}
