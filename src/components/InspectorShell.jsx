import { useState } from 'react'
import { logOut } from '../services/pharmacyService'

const links = [
  { path: '/inspector/dashboard', label: 'Dashboard' },
  { path: '/inspector/detection', label: 'Batch Re-entry Detection' },
  { path: '/inspector/alerts', label: 'Compliance Alerts' },
  { path: '/inspector/search', label: 'Batch Search' },
  { path: '/inspector/inspections', label: 'Shop Inspections' },
  { path: '/inspector/history', label: 'Batch History' },
  { path: '/inspector/audit', label: 'Audit Trail' },
]

export default function InspectorShell({ user, profile, route, navigate, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  async function logout() { setLoggingOut(true); try { await logOut(); navigate('/login') } finally { setLoggingOut(false) } }
  const currentLabel = links.find((link) => route.startsWith(link.path))?.label || 'Dashboard'
   return <div className="app-frame inspector-frame"><aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}><div className="brand-lockup"><div className="brand-mark">P</div><div><strong>PharmaLoop</strong><span>Drug Inspector / Compliance</span></div></div><div className="sidebar-label">DRUG INSPECTOR</div><nav className="primary-nav" aria-label="Inspector navigation">{links.map((link) => <button className={route.startsWith(link.path) ? 'nav-item active' : 'nav-item'} key={link.path} type="button" onClick={() => { navigate(link.path); setMobileOpen(false) }}>{link.label}</button>)}</nav><div className="sidebar-footer"><div className="sidebar-note"><span className="status-dot" /><span><strong>Inspector workspace</strong><small>Firestore synced</small></span></div><button type="button" className="logout-button" onClick={logout} disabled={loggingOut}>↪ {loggingOut ? 'Signing out...' : 'Sign out'}</button></div></aside>{mobileOpen && <button type="button" className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}<main className="main-area"><header className="topbar"><button type="button" className="mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}><span className="windows-menu-icon" aria-hidden="true"><i /><i /><i /><i /></span></button><div className="breadcrumb">Drug Inspector workspace <span>/</span> {currentLabel}</div><div className="topbar-actions"><button type="button" className="button secondary inspector-notification" onClick={() => navigate('/inspector/alerts')}>Notifications</button><div className="topbar-user"><div className="avatar">{(profile?.name || user?.email || 'I').slice(0, 1).toUpperCase()}</div><div><strong>{profile?.name || 'Drug Inspector'}</strong><span>Tamil Nadu Drug Control</span></div></div></div></header><div className="page-content">{children}</div></main></div>
}
