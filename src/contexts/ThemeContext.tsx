import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import darkThemeUrl from 'primereact/resources/themes/lara-dark-blue/theme.css?url'
import lightThemeUrl from 'primereact/resources/themes/lara-light-blue/theme.css?url'

type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', toggleTheme: () => {} })

export const useTheme = () => useContext(ThemeContext)

const LINK_ID = 'primereact-theme'

const THEME_URLS: Record<Theme, string> = {
  dark: darkThemeUrl,
  light: lightThemeUrl,
}

function applyThemeLink(theme: Theme) {
  let link = document.getElementById(LINK_ID) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = LINK_ID
    link.rel = 'stylesheet'
    // Insert before first app stylesheet so app overrides still win
    const first = document.head.querySelector('link[rel="stylesheet"], style')
    document.head.insertBefore(link, first ?? null)
  }
  link.href = THEME_URLS[theme]
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('tt-theme') as Theme) || 'dark'
  })

  // Apply on first paint (synchronous attribute so CSS variables are ready)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    applyThemeLink(theme)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply on every change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('tt-theme', theme)
    applyThemeLink(theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
