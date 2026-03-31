import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './shared/components/ProtectedRoute'
import LoginPage from './features/auth/pages/LoginPage'
import AppLayout from './layouts/AppLayout/AppLayout'
import AssetsPage from './pages/AssetsPage'
import CategoriesPage from './pages/CategoriesPage'
import UsersPage from './pages/UsersPage'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>

        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — all authenticated users */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/assets" replace />} />
          <Route path="assets" element={<AssetsPage />} />

          {/* Admin + superAdmin only */}
          <Route
            path="categories"
            element={
              <ProtectedRoute allowedRoles={['superAdmin', 'admin']}>
                <CategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={['superAdmin', 'admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/assets" replace />} />

      </Routes>
    </AuthProvider>
  </BrowserRouter>
)

export default App
