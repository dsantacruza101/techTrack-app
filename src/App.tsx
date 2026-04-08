import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SchoolProvider } from './contexts/SchoolContext'
import { TopbarProvider } from './contexts/TopbarContext'
import ProtectedRoute from './shared/components/ProtectedRoute'
import LoginPage from './features/auth/pages/LoginPage'
import AppLayout from './layouts/AppLayout/AppLayout'
import AssetsPage from './pages/AssetsPage'
import CategoriesPage from './pages/CategoriesPage'
import UsersPage from './pages/UsersPage'
import WorkOrdersPage from './pages/WorkOrdersPage'
import ITManagementPage from './pages/ITManagementPage'
import PreventiveCarePage from './pages/PreventiveCarePage'
import FinancePage from './pages/FinancePage'
import ReportsPage from './pages/ReportsPage'
import InventoryPage from './pages/InventoryPage'
import MapPage from './pages/MapPage'
import AnalyticsPage from './pages/AnalyticsPage'
import IntegrationsPage from './pages/IntegrationsPage'
import MobileQRPage from './pages/MobileQRPage'
import OptionsPage from './pages/OptionsPage'
import SeedPage from './pages/SeedPage'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
    <TopbarProvider>
    <SchoolProvider>
      <Routes>

        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — all authenticated users */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/assets" replace />} />

          {/* All authenticated users */}
          <Route path="assets"          element={<AssetsPage />} />
          <Route path="work-orders"     element={<WorkOrdersPage />} />
          <Route path="it-management"   element={<ITManagementPage />} />
          <Route path="preventive-care" element={<PreventiveCarePage />} />
          <Route path="inventory"       element={<InventoryPage />} />
          <Route path="map"             element={<MapPage />} />
          <Route path="mobile-qr"       element={<MobileQRPage />} />

          {/* Admin + superAdmin only */}
          <Route path="categories" element={<ProtectedRoute allowedRoles={['superAdmin', 'admin']}><CategoriesPage /></ProtectedRoute>} />
          <Route path="users"      element={<ProtectedRoute allowedRoles={['superAdmin', 'admin']}><UsersPage /></ProtectedRoute>} />
          <Route path="finance"    element={<ProtectedRoute allowedRoles={['superAdmin', 'admin']}><FinancePage /></ProtectedRoute>} />
          <Route path="reports"    element={<ProtectedRoute allowedRoles={['superAdmin', 'admin']}><ReportsPage /></ProtectedRoute>} />
          <Route path="analytics"  element={<ProtectedRoute allowedRoles={['superAdmin', 'admin']}><AnalyticsPage /></ProtectedRoute>} />
          <Route path="options"    element={<ProtectedRoute allowedRoles={['superAdmin', 'admin']}><OptionsPage /></ProtectedRoute>} />

          {/* superAdmin only */}
          <Route path="integrations" element={<ProtectedRoute allowedRoles={['superAdmin']}><IntegrationsPage /></ProtectedRoute>} />
          <Route path="_seed"        element={<ProtectedRoute allowedRoles={['superAdmin']}><SeedPage /></ProtectedRoute>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/assets" replace />} />

      </Routes>
    </SchoolProvider>
    </TopbarProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
