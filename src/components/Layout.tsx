import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function Layout() {
  const { session, logout } = useAuth()
  return <div className="app-shell">
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <header className="site-header"><div className="header-inner">
      <NavLink className="brand" to="/"><span className="brand-mark" aria-hidden="true">⌖</span><span>LOG POSE<small>GUILD DE CAZARRECOMPENSAS</small></span></NavLink>
      <nav aria-label="Principal"><NavLink to="/" end>Bitácora</NavLink><NavLink to="/wanted">Se busca</NavLink><NavLink to="/news">Noticias</NavLink><NavLink to="/sagas">Sagas</NavLink></nav>
      <div className="session"><span>{session?.team.name}<small>{session?.team.code}</small></span><button className="secondary" onClick={logout}>Salir</button></div>
    </div></header>
    <main id="main" className="main-content"><Outlet /></main>
    <footer>Log Pose Console <span>East Blue · Grand Line · Registro de la Guild</span></footer>
  </div>
}
