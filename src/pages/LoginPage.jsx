import { useState } from 'react'
import {
  createDemoAccount,
  DEMO_ACCOUNT,
  getFriendlyAuthError,
  signIn,
} from '../services/pharmacyService'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await signIn(email, password)
    } catch (authError) {
      setError(getFriendlyAuthError(authError))
    } finally {
      setBusy(false)
    }
  }

  async function handleDemoAccount() {
    setBusy(true)
    setMode('demo')
    setError('')
    setMessage('')
    try {
      await createDemoAccount()
    } catch (authError) {
      if (authError?.code === 'auth/email-already-in-use') {
        setEmail(DEMO_ACCOUNT.email)
        setPassword(DEMO_ACCOUNT.password)
        setMessage('Demo account already exists. Use the credentials shown to sign in.')
      } else {
        setError(getFriendlyAuthError(authError))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-brand"><div className="brand-mark">P</div><strong>PharmaLoop</strong></div>
        <div className="visual-copy">
          <p className="eyebrow light-eyebrow">Pharmacy operations, in one calm place</p>
          <h1>Keep every batch<br /><em>in the loop.</em></h1>
          <p>Track stock health, complete sales with confidence, and keep expired medicines moving toward a compliant return.</p>
        </div>
        <div className="visual-foot"><span>PHARMACY / RETAILER</span><span>EST. 2026</span></div>
      </section>
      <section className="login-panel">
        <div className="login-panel-inner">
          <div className="mobile-login-brand"><div className="brand-mark">P</div><strong>PharmaLoop</strong></div>
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to your workspace</h2>
          <p className="login-subtitle">Use your pharmacy account to continue.</p>
          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="email">Work email<input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@pharmacy.com" required autoComplete="email" /></label>
            <label htmlFor="password">Password<input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required minLength="6" autoComplete="current-password" /></label>
            {error && <div className="form-alert error" role="alert">{error}</div>}
            {message && <div className="form-alert success" role="status">{message}</div>}
            <button className="button primary full-width" type="submit" disabled={busy}>{busy && mode === 'login' ? 'Signing in...' : 'Sign in'}<span aria-hidden="true">→</span></button>
          </form>
          <div className="demo-divider"><span>Need a demo account?</span></div>
          <button className="button secondary full-width" type="button" onClick={handleDemoAccount} disabled={busy}>{busy && mode === 'demo' ? 'Creating account...' : 'Create demo pharmacy account'}</button>
          <div className="demo-credentials"><span>Demo credentials</span><code>{DEMO_ACCOUNT.email}</code><code>{DEMO_ACCOUNT.password}</code></div>
          <p className="login-legal">Firebase Authentication protects this workspace. Your pharmacy data stays scoped to your account.</p>
        </div>
      </section>
    </main>
  )
}
