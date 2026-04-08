import { createContext, useContext, useState, type ReactNode } from 'react'

export type SchoolFilter = 'all' | 'school_a' | 'school_b'

interface SchoolContextType {
  school: SchoolFilter
  setSchool: (s: SchoolFilter) => void
}

const SchoolContext = createContext<SchoolContextType>({
  school:    'all',
  setSchool: () => {},
})

export const SchoolProvider = ({ children }: { children: ReactNode }) => {
  const [school, setSchool] = useState<SchoolFilter>('all')
  return (
    <SchoolContext.Provider value={{ school, setSchool }}>
      {children}
    </SchoolContext.Provider>
  )
}

export const useSchool = () => useContext(SchoolContext)
