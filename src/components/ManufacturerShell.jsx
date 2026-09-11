import { useState } from 'react'
import { logOut } from '../services/pharmacyService'
import AssistantPanel from './AssistantPanel'

const links = [
  { path: '/manufacturer/dashboard', label: 'Overview' },
  { path: '/manufacturer/returns', label: 'Incoming Returns' },
  { path: '/manufacturer/disposal', label: 'Disposal' },
  { path: '/manufacturer/certificates', label: 'Certificates' },
]

export default function ManufacturerShell({ user, profile, route, navigate, assistantData, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  async function logout() { setLoggingOut(true); try { await logOut(); navigate('/login') } finally { setLoggingOut(false) } }
  return <div className="app-frame manufacturer-frame"><aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}><div className="brand-lockup"><div className="brand-mark">P</div><div><strong>PharmaLoop</strong><span>Manufacturer operations</span></div></div><div className="sidebar-label">Workspace</div><nav className="primary-nav" aria-label="Manufacturer navigation">{links.map((link) => <button className={route === link.path || (link.path.includes('/returns') && route.includes('/manufacturer/returns/')) ? 'nav-item active' : 'nav-item'} key={link.path} type="button" onClick={() => { navigate(link.path); setMobileOpen(false) }}>{link.label}</button>)}</nav><div className="sidebar-footer"><div className="sidebar-note"><span className="status-dot" /><span><strong>Manufacturer workspace</strong><small>Firestore synced</small></span></div><button type="button" className="logout-button" onClick={logout} disabled={loggingOut}>↪ {loggingOut ? 'Signing out...' : 'Sign out'}</button></div></aside>{mobileOpen && <button type="button" className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}<main className="main-area"><header className="topbar"><button type="button" className="mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}><span className="windows-menu-icon" aria-hidden="true"><i /><i /><i /><i /></span></button><div className="breadcrumb">Manufacturer workspace <span>/</span> {links.find((link) => route === link.path)?.label || 'Return detail'}</div><div className="topbar-actions"><AssistantPanel {...assistantData} /><div className="topbar-user"><div className="avatar">{(profile?.name || user?.email || 'M').slice(0, 1).toUpperCase()}</div><div><strong>{profile?.name || 'Manufacturer team'}</strong><span>{profile?.manufacturerName || 'ABC Pharma'}</span></div></div></div></header><div className="page-content">{children}</div></main></div>
}
