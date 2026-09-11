import { useState } from 'react'
import {
  createDemoAccount,
  createDemoDistributorAccount,
  createDemoInspectorAccount,
  createDemoManufacturerAccount,
  DEMO_ACCOUNT,
  DEMO_DISTRIBUTOR_ACCOUNT,
  DEMO_INSPECTOR_ACCOUNT,
  DEMO_MANUFACTURER_ACCOUNT,
  getFriendlyAuthError,
  getUserProfile,
  logOut,
  signIn,
} from '../services/pharmacyService'

const workspaces = {
  pharmacy: { role: 'PHARMACY', label: 'Layer 1 - Pharmacy / Retailer', organizationLabel: 'Shop Name', personLabel: 'Owner Name', organizationPlaceholder: 'ABC Medicals', personPlaceholder: 'Raj Kumar', demo: DEMO_ACCOUNT },
  distributor: { role: 'DISTRIBUTOR', label: 'Layer 2 - Distributor', organizationLabel: 'Distributor Name', personLabel: 'Authorized Person', organizationPlaceholder: 'Apollo Distribution Hub', personPlaceholder: 'Ravi Kumar', demo: DEMO_DISTRIBUTOR_ACCOUNT },
  manufacturer: { role: 'MANUFACTURER', label: 'Layer 3 - Manufacturer', organizationLabel: 'Manufacturer Name', personLabel: 'Authorized Person', organizationPlaceholder: 'ABC Pharma', personPlaceholder: 'Manufacturer operations team', demo: DEMO_MANUFACTURER_ACCOUNT },
  inspector: { role: 'INSPECTOR', label: 'Layer 4 - Drug Inspector / Compliance', organizationLabel: 'Inspector Office', personLabel: 'Inspector Name', organizationPlaceholder: 'Drug Control Department', personPlaceholder: 'Drug Inspector', demo: DEMO_INSPECTOR_ACCOUNT },
}

export default function LoginPage() {
  const [workspace, setWorkspace] = useState('pharmacy')
  const [organizationName, setOrganizationName] = useState('')
  const [personName, setPersonName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const selected = workspaces[workspace]

  function selectWorkspace(event) {
    setWorkspace(event.target.value)
    setOrganizationName('')
    setPersonName('')
    setPhone('')
    setEmail('')
    setPassword('')
    setError('')
    setMessage('')
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const credential = await signIn(email, password)
      const profile = await getUserProfile(credential.user.uid)
      const role = profile?.role || 'PHARMACY'
      if (role !== selected.role) {
        await logOut()
        const accountType = role === 'DISTRIBUTOR' ? 'Distributor' : role === 'MANUFACTURER' ? 'Manufacturer' : role === 'INSPECTOR' ? 'Drug Inspector' : 'Pharmacy'
        setError(`This account is registered as a ${accountType} account. Please select ${accountType}.`)
      }
    } catch (authError) {
      setError(getFriendlyAuthError(authError))
    } finally {
      setBusy(false)
    }
  }

  async function createDemo() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (workspace === 'pharmacy') await createDemoAccount()
      else if (workspace === 'distributor') await createDemoDistributorAccount()
      else if (workspace === 'manufacturer') await createDemoManufacturerAccount()
      else await createDemoInspectorAccount()
    } catch (authError) {
      if (authError?.code === 'auth/email-already-in-use') {
        setEmail(selected.demo.email)
        setPassword(selected.demo.password)
        setMessage('Demo account already exists. Use the credentials shown to sign in.')
      } else setError(getFriendlyAuthError(authError))
    } finally {
      setBusy(false)
    }
  }

  return <main className="login-page common-login-page"><section className="login-visual"><div className="login-brand"><div className="brand-mark">P</div><strong>PharmaLoop</strong></div><div className="visual-copy"><p className="eyebrow light-eyebrow">Reverse pharmaceutical chain</p><h1>Move every batch<br /><em>with confidence.</em></h1><p>One trusted workspace for pharmacy stock, distributor returns, and batch-level reverse traceability.</p></div><div className="visual-foot"><span>PHARMACY · DISTRIBUTOR · MANUFACTURER · INSPECTOR</span><span>EST. 2026</span></div></section><section className="login-panel"><div className="login-panel-inner"><div className="mobile-login-brand"><div className="brand-mark">P</div><strong>PharmaLoop</strong></div><p className="eyebrow">Workspace access</p><h2>Enter your operations workspace</h2><p className="login-subtitle">Choose a workspace first. Your Firebase role still controls access.</p><label className="workspace-picker" htmlFor="workspace">Select workspace<select id="workspace" value={workspace} onChange={selectWorkspace}>{Object.entries(workspaces).map(([key, item]) => <option value={key} key={key}>{item.label}</option>)}</select></label><form onSubmit={submit} className="login-form"><label htmlFor="organizationName">{selected.organizationLabel}<input id="organizationName" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder={selected.organizationPlaceholder} /></label><label htmlFor="personName">{selected.personLabel}<input id="personName" value={personName} onChange={(event) => setPersonName(event.target.value)} placeholder={selected.personPlaceholder} /></label><label htmlFor="phone">Phone Number<input id="phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 XXXXX XXXXX" /></label><label htmlFor="email">Work email<input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@pharmacy.com" required autoComplete="email" /></label><label htmlFor="password">Password<input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required minLength="6" autoComplete="current-password" /></label>{error && <div className="form-alert error" role="alert">{error}</div>}{message && <div className="form-alert success" role="status">{message}</div>}<button className="button primary full-width" type="submit" disabled={busy}>{busy ? 'Signing in...' : `Sign in to ${workspace}`}<span aria-hidden="true">→</span></button></form><div className="demo-divider"><span>Need a demo account?</span></div><button className="button secondary full-width" type="button" onClick={createDemo} disabled={busy}>{busy ? 'Creating account...' : `Create demo ${workspace} account`}</button><div className="demo-credentials"><span>Demo credentials</span><code>{selected.demo.email}</code><code>{selected.demo.password}</code></div><p className="login-legal">Firebase Authentication protects this workspace. Your operational data stays scoped to your account.</p></div></section></main>
}
