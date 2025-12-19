'use client'

import { useState, useEffect } from 'react'

type Theme = 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    // Force dark mode globally
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  }, [])

  const toggleTheme = () => {
    // Theme is now forced dark
  }

  return { theme: 'dark' as Theme, toggleTheme }
}
