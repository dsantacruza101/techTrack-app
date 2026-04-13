import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrimeReactProvider } from 'primereact/api'

// PrimeIcons
import 'primeicons/primeicons.css'

// PrimeFlex (responsive utility classes)
import 'primeflex/primeflex.css'

// App globals & design tokens
import './index.css'

import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrimeReactProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </PrimeReactProvider>
  </StrictMode>,
)
