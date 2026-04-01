import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar as PrimeDrawer } from 'primereact/sidebar'
import Sidebar from './components/Sidebar/Sidebar'
import Topbar from './components/Topbar/Topbar'
import './AppLayout.css'

const AppLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex min-h-screen surface-ground">
      {/* Sidebar Escritorio */}
      <aside className="tt-sidebar hidden md:flex flex-column surface-card border-right-1 border-white-alpha-10">
        <Sidebar />
      </aside>

      {/* Drawer Móvil */}
      <PrimeDrawer
        visible={drawerOpen}
        onHide={() => setDrawerOpen(false)}
        position="left"
        className="tt-mobile-drawer border-none"
        pt={{
          root: { className: 'w-15rem surface-card border-none' },
          header: { className: 'hidden' },
          content: { className: 'p-0 h-full' },
        }}
      >
        <Sidebar onNavClick={() => setDrawerOpen(false)} />
      </PrimeDrawer>

      {/* Área Principal */}
      <div className="tt-main flex flex-column flex-1 min-h-screen">
        <Topbar onMenuToggle={() => setDrawerOpen(true)} />
        <main className="p-4 md:p-6 lg:p-8"> {/* Padding responsivo */}
          <div className="mx-auto" style={{ maxWidth: '1400px' }}> {/* Contenedor de ancho máximo */}
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
