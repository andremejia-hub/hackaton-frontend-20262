import { Navigate, Outlet, Route, Routes, useLocation, Link } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { ErrorState, Loading } from './components/Feedback'
import { AuthPage } from './pages/AuthPage'
import { Dashboard } from './pages/Dashboard'
import { WantedList } from './pages/WantedList'
import { WantedDetail } from './pages/WantedDetail'

function PrivateRoute() {
  const { session } = useAuth()
  const location = useLocation()
  return session ? <Outlet /> : <Navigate to="/login" state={{ from: `${location.pathname}${location.search}${location.hash}` }} replace />
}
export function App() {
  const { restoring, error, restore, logout } = useAuth()
  if (restoring) return <main className="startup"><Loading text="Verificando la sesión de tu tripulación…" /></main>
  if (error) return <main className="startup"><ErrorState error={error} retry={restore} /><button className="secondary" onClick={logout}>Volver al login</button></main>
  return <Routes>
    <Route path="/login" element={<AuthPage key="login" />} />
    <Route path="/register" element={<AuthPage key="register" register />} />
    <Route element={<PrivateRoute />}><Route element={<Layout />}>
      <Route index element={<Dashboard />} />
      <Route path="dashboard" element={<Navigate to="/" replace />} />
      <Route path="wanted" element={<WantedList />} />
      <Route path="wanted/:id" element={<WantedDetail />} />
    </Route></Route>
    <Route path="*" element={<main className="not-found"><span className="eyebrow">Rumbo desconocido</span><h1>404 · Fuera del mapa</h1><p>Esta página no existe en la bitácora.</p><Link className="button" to="/">Volver al inicio</Link></main>} />
  </Routes>
}
