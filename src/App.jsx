import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import AppShell from './components/AppShell'
import BillingPage from './pages/BillingPage'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import LoginPage from './pages/LoginPage'
import ReturnsPage from './pages/ReturnsPage'
import {
  DEMO_PHARMACY,
  ensureUserProfile,
  subscribeToMedicines,
  subscribeToReturns,
  subscribeToSales,
} from './services/pharmacyService'
import './App.css'

function getCurrentRoute() {
  const route = window.location.pathname
  return ['/dashboard', '/inventory', '/billing', '/returns', '/login'].includes(route) ? route : '/dashboard'
}

function App() {
  const [route, setRoute] = useState(getCurrentRoute)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [medicines, setMedicines] = useState(null)
  const [returns, setReturns] = useState([])
  const [sales, setSales] = useState([])
  const [dataError, setDataError] = useState('')

  function navigate(nextRoute) {
    window.history.pushState({}, '', nextRoute)
    setRoute(window.location.pathname)
  }

  useEffect(() => {
    const handlePopState = () => setRoute(getCurrentRoute())
    window.addEventListener('popstate', handlePopState)
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      setAuthLoading(false)
      setDataError('')
      if (!nextUser) {
        setProfile(null)
        setMedicines(null)
        setReturns([])
        setSales([])
        if (window.location.pathname !== '/login') {
          window.history.replaceState({}, '', '/login')
          setRoute('/login')
        }
        return
      }
      if (window.location.pathname === '/login') {
        window.history.replaceState({}, '', '/dashboard')
        setRoute('/dashboard')
      }
      try {
        const nextProfile = await ensureUserProfile(nextUser)
        setProfile(nextProfile)
      } catch {
        setProfile({ ...DEMO_PHARMACY, uid: nextUser.uid, name: nextUser.email })
      }
    })
    return () => {
      window.removeEventListener('popstate', handlePopState)
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) return undefined
    const pharmacyId = profile?.pharmacyId || DEMO_PHARMACY.id
    const handleError = () => {
      setDataError('Unable to load pharmacy data. Please check your connection and try again.')
    }
    const unsubscribeMedicines = subscribeToMedicines(pharmacyId, (items) => {
      setMedicines(items)
    }, handleError)
    const unsubscribeReturns = subscribeToReturns(pharmacyId, setReturns, handleError)
    const unsubscribeSales = subscribeToSales(pharmacyId, setSales, handleError)
    return () => {
      unsubscribeMedicines()
      unsubscribeReturns()
      unsubscribeSales()
    }
  }, [user, profile?.pharmacyId])

  if (authLoading) return <div className="app-loading"><div className="loading-mark">P</div><span>Opening your workspace...</span></div>
  if (!user) return <LoginPage />

  const dataLoading = medicines === null
  const pharmacyId = profile?.pharmacyId || DEMO_PHARMACY.id
  const returnCount = returns.filter((item) => item.status === 'RETURN_REQUESTED').length
  const page = route === '/inventory'
    ? <InventoryPage medicines={medicines || []} returns={returns} pharmacyId={pharmacyId} navigate={navigate} />
    : route === '/billing'
      ? <BillingPage medicines={medicines || []} user={user} pharmacyId={pharmacyId} />
      : route === '/returns'
        ? <ReturnsPage medicines={medicines || []} returns={returns} user={user} pharmacyId={pharmacyId} />
        : <DashboardPage medicines={medicines || []} sales={sales} returns={returns} profile={profile} navigate={navigate} />

  return (
    <AppShell user={user} profile={profile} route={route} navigate={navigate} returnCount={returnCount}>
      {dataLoading ? <div className="loading-panel"><div className="loading-spinner" /><strong>Syncing your pharmacy data...</strong><span>Firestore is checking the latest stock.</span></div> : dataError ? <div className="loading-panel error-panel"><strong>{dataError}</strong><button type="button" className="button secondary" onClick={() => window.location.reload()}>Try again</button></div> : page}
    </AppShell>
  )
}

export default App
