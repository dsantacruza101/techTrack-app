import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar as PrimeDrawer } from 'primereact/sidebar'
import Sidebar from './components/Sidebar/Sidebar'
import Topbar from './components/Topbar/Topbar'
import './AppLayout.css'

const AppLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--surface-ground)' }}>

      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside
        className="tt-sidebar hidden md:flex flex-column"
        style={{ background: 'var(--surface-card)', borderRight: '1px solid var(--surface-border)' }}
      >
        <Sidebar />
      </aside>

      {/* ── Mobile drawer ───────────────────────────────────────── */}
      <PrimeDrawer
        visible={drawerOpen}
        onHide={() => setDrawerOpen(false)}
        position="left"
        className="tt-mobile-drawer"
        pt={{
          root:    { style: { width: '240px', background: 'var(--surface-card)', border: 'none' } },
          header:  { style: { display: 'none' } },
          content: { style: { padding: 0, height: '100%' } },
        }}
      >
        <Sidebar onNavClick={() => setDrawerOpen(false)} />
      </PrimeDrawer>

      {/* ── Main area ───────────────────────────────────────────── */}
      <div className="tt-main flex flex-column flex-1 min-h-screen">
        <Topbar onMenuToggle={() => setDrawerOpen(true)} />
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>

    </div>
  )
}

export default AppLayout
