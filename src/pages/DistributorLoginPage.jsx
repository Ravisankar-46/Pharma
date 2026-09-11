import { useState } from 'react'
import { createDemoDistributorAccount, DEMO_DISTRIBUTOR_ACCOUNT, getFriendlyAuthError, signIn } from '../services/pharmacyService'

export default function DistributorLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('login')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMode('login')
    setError('')
    setMessage('')
    try { await signIn(email, password) } catch (authError) { setError(getFriendlyAuthError(authError)) } finally { setBusy(false) }
  }

  async function createDemo() {
    setBusy(true)
    setMode('demo')
    setError('')
    setMessage('')
    try { await createDemoDistributorAccount() } catch (authError) {
      if (authError?.code === 'auth/email-already-in-use') {
        setEmail(DEMO_DISTRIBUTOR_ACCOUNT.email)
        setPassword(DEMO_DISTRIBUTOR_ACCOUNT.password)
        setMessage('Demo distributor account already exists. Use the credentials shown to sign in.')
      } else setError(getFriendlyAuthError(authError))
    } finally { setBusy(false) }
  }

  return (
    <main className="login-page distributor-login-page">
      <section className="login-visual"><div className="login-brand"><div className="brand-mark">P</div><strong>PharmaLoop</strong></div><div className="visual-copy"><p className="eyebrow light-eyebrow">Distributor operations</p><h1>Verify every<br /><em>handoff.</em></h1><p>Receive pharmacy returns, compare declared and physical quantities, and keep every batch traceable.</p></div><div className="visual-foot"><span>DISTRIBUTOR / REVERSE LOGISTICS</span><span>LAYER 2</span></div></section>
      <section className="login-panel"><div className="login-panel-inner"><div className="mobile-login-brand"><div className="brand-mark">P</div><strong>PharmaLoop</strong></div><p className="eyebrow">Distributor portal</p><h2>Sign in to operations</h2><p className="login-subtitle">Use a distributor account to review incoming returns.</p><form onSubmit={submit} className="login-form"><label htmlFor="distributor-email">Work email<input id="distributor-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@distribution.com" required /></label><label htmlFor="distributor-password">Password<input id="distributor-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required minLength="6" /></label>{error && <div className="form-alert error" role="alert">{error}</div>}{message && <div className="form-alert success" role="status">{message}</div>}<button className="button primary full-width" type="submit" disabled={busy}>{busy && mode === 'login' ? 'Signing in...' : 'Sign in'} <span aria-hidden="true">→</span></button></form><div className="demo-divider"><span>Need a demo account?</span></div><button className="button secondary full-width" type="button" onClick={createDemo} disabled={busy}>{busy && mode === 'demo' ? 'Creating account...' : 'Create demo distributor account'}</button><div className="demo-credentials"><span>Demo credentials</span><code>{DEMO_DISTRIBUTOR_ACCOUNT.email}</code><code>{DEMO_DISTRIBUTOR_ACCOUNT.password}</code></div></div></section>
    </main>
  )
}
