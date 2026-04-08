import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface TopbarCtx {
  title: string
  setTitle: (t: string) => void
  clearTitle: () => void
}

export const TopbarContext = createContext<TopbarCtx>({
  title: '',
  setTitle: () => {},
  clearTitle: () => {},
})

export const TopbarProvider = ({ children }: { children: ReactNode }) => {
  const [title, setTitleState] = useState('')
  const setTitle   = useCallback((t: string) => setTitleState(t), [])
  const clearTitle = useCallback(() => setTitleState(''), [])
  return (
    <TopbarContext.Provider value={{ title, setTitle, clearTitle }}>
      {children}
    </TopbarContext.Provider>
  )
}

export const useTopbarTitle = () => useContext(TopbarContext)
