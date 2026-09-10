import { useState } from 'react'
import { logOut } from '../services/pharmacyService'

const navigation = [
  { path: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { path: '/inventory', label: 'Inventory', icon: 'box' },
  { path: '/billing', label: 'Billing', icon: 'receipt' },
  { path: '/returns', label: 'Returns', icon: 'refresh' },
]

function NavIcon({ type }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>,
    receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.7-4L3 10" /><path d="M3 5v5h5M4 13a8 8 0 0 0 14.7 4L21 14" /><path d="M21 19v-5h-5" /></>,
  }
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">{paths[type]}</svg>
}

export default function AppShell({ user, profile, route, navigate, returnCount = 0, children }) {
  const [loggingOut, setLoggingOut] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logOut()
      navigate('/login')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="app-frame">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark">P</div>
          <div>
            <strong>PharmaLoop</strong>
            <span>Pharmacy operations</span>
          </div>
        </div>
        <div className="sidebar-label">Workspace</div>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <button
              className={route === item.path ? 'nav-item active' : 'nav-item'}
              key={item.path}
              type="button"
              onClick={() => { navigate(item.path); setMobileOpen(false) }}
            >
              <NavIcon type={item.icon} />
              {item.label}
              {item.path === '/returns' && (returnCount > 0 ? <span className="nav-count">{returnCount}</span> : <span className="nav-pip" />)}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-note">
            <span className="status-dot" />
            <span><strong>Live workspace</strong><small>Firestore synced</small></span>
          </div>
          <button type="button" className="logout-button" onClick={handleLogout} disabled={loggingOut}>
            <span aria-hidden="true">↪</span>{loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </aside>
      {mobileOpen && <button type="button" className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button type="button" className="mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <span className="windows-menu-icon" aria-hidden="true"><i /><i /><i /><i /></span>
          </button>
          <div className="breadcrumb">Pharmacy workspace <span>/</span> {navigation.find((item) => item.path === route)?.label || 'Dashboard'}</div>
          <div className="topbar-user">
            <div className="avatar">{(profile?.name || user?.email || 'P').slice(0, 1).toUpperCase()}</div>
            <div><strong>{profile?.name || 'Pharmacy team'}</strong><span>{profile?.pharmacyName || 'PharmaLoop pharmacy'}</span></div>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  )
}
