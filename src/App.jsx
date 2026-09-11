import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import AppShell from './components/AppShell'
import DistributorShell from './components/DistributorShell'
import DistributorDashboardPage from './pages/DistributorDashboardPage'
import DistributorReturnDetailPage from './pages/DistributorReturnDetailPage'
import DistributorReturnsPage from './pages/DistributorReturnsPage'
import BillingPage from './pages/BillingPage'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import LoginPage from './pages/LoginPage'
import ReturnsPage from './pages/ReturnsPage'
import ManufacturerShell from './components/ManufacturerShell'
import ManufacturerDashboardPage from './pages/ManufacturerDashboardPage'
import ManufacturerReturnsPage from './pages/ManufacturerReturnsPage'
import ManufacturerReturnDetailPage from './pages/ManufacturerReturnDetailPage'
import ManufacturerDisposalPage from './pages/ManufacturerDisposalPage'
import ManufacturerCertificatesPage from './pages/ManufacturerCertificatesPage'
import ManufacturerCertificateDetailPage from './pages/ManufacturerCertificateDetailPage'
import InspectorShell from './components/InspectorShell'
import InspectorDashboardPage from './pages/InspectorDashboardPage'
import InspectorDetectionPage from './pages/InspectorDetectionPage'
import InspectorAlertsPage from './pages/InspectorAlertsPage'
import InspectorHistoryPage from './pages/InspectorHistoryPage'
import PublicQrPage from './pages/PublicQrPage'
import PublicMedicinePage from './pages/PublicMedicinePage'
import {
  DEMO_PHARMACY,
  ensureUserProfile,
  subscribeToMedicines,
  subscribeToDistributorReturns,
  subscribeToReturns,
  subscribeToSales,
  runAutoExpiryEscalation,
  seedDemoInventory,
  subscribeToManufacturerReturns,
  subscribeToDisposals,
  subscribeToCertificates,
  subscribeToComplianceAlerts,
  subscribeToComplianceAudit,
  syncPublicShop,
} from './services/pharmacyService'
import './App.css'
import './pages/Distributor.css'
import './pages/Manufacturer.css'
import './pages/Inspector.css'

function getCurrentRoute() {
  const route = window.location.pathname
  if (route.startsWith('/public/shop/')) return route
  if (route.startsWith('/distributor/') || route.startsWith('/manufacturer/') || route.startsWith('/inspector/')) return route
  return ['/dashboard', '/inventory', '/billing', '/returns', '/qr', '/login'].includes(route) ? route : '/dashboard'
}

function App() {
  const [route, setRoute] = useState(getCurrentRoute)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [medicines, setMedicines] = useState(null)
  const [returns, setReturns] = useState([])
  const [sales, setSales] = useState([])
  const [disposals, setDisposals] = useState([])
  const [dataError, setDataError] = useState('')
  const [certificates, setCertificates] = useState([])
  const [complianceAlerts, setComplianceAlerts] = useState([])
  const [complianceAudit, setComplianceAudit] = useState([])
  const publicShopMatch = route.match(/^\/public\/shop\/([^/]+)$/)
  const isPublicShopRoute = Boolean(publicShopMatch)

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
        setComplianceAlerts([])
        setComplianceAudit([])
        if (window.location.pathname.startsWith('/public/shop/')) return
        if (!window.location.pathname.startsWith('/distributor') && !window.location.pathname.startsWith('/manufacturer') && !window.location.pathname.startsWith('/inspector') && !window.location.pathname.startsWith('/public/shop/')) {
          if (window.location.pathname !== '/login') {
            window.history.replaceState({}, '', '/login')
            setRoute('/login')
          }
        } else if (window.location.pathname.startsWith('/manufacturer')) {
          window.history.replaceState({}, '', '/login')
          setRoute('/login')
        } else if (window.location.pathname.startsWith('/inspector')) {
          window.history.replaceState({}, '', '/login')
          setRoute('/login')
        } else if (window.location.pathname !== '/distributor/login') {
          window.history.replaceState({}, '', '/distributor/login')
          setRoute('/distributor/login')
        }
        return
      }
      try {
        const nextProfile = await ensureUserProfile(nextUser)
        setProfile(nextProfile)
        if (window.location.pathname.startsWith('/public/shop/')) return
        const distributorRoute = window.location.pathname.startsWith('/distributor')
        const manufacturerRoute = window.location.pathname.startsWith('/manufacturer')
        const inspectorRoute = window.location.pathname.startsWith('/inspector')
        if (nextProfile.role === 'MANUFACTURER' && (!manufacturerRoute || window.location.pathname === '/manufacturer/login')) {
          window.history.replaceState({}, '', '/manufacturer/dashboard')
          setRoute('/manufacturer/dashboard')
        } else if (nextProfile.role === 'DISTRIBUTOR' && (!distributorRoute || window.location.pathname === '/distributor/login')) {
          window.history.replaceState({}, '', '/distributor/dashboard')
          setRoute('/distributor/dashboard')
        } else if (nextProfile.role === 'INSPECTOR' && (!inspectorRoute || window.location.pathname === '/inspector/login')) {
          window.history.replaceState({}, '', '/inspector/dashboard')
          setRoute('/inspector/dashboard')
        } else if (nextProfile.role !== 'DISTRIBUTOR' && distributorRoute) {
          window.history.replaceState({}, '', '/dashboard')
          setRoute('/dashboard')
        } else if (nextProfile.role !== 'MANUFACTURER' && manufacturerRoute) {
          window.history.replaceState({}, '', '/dashboard')
          setRoute('/dashboard')
        } else if (nextProfile.role !== 'INSPECTOR' && inspectorRoute) {
          window.history.replaceState({}, '', '/dashboard')
          setRoute('/dashboard')
        }
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
    if (isPublicShopRoute) return undefined
    if (!user) return undefined
    if (profile?.role === 'DISTRIBUTOR') {
      const handleError = () => setDataError('Unable to load distributor returns. Please check your connection and try again.')
      const unsubscribeReturns = subscribeToDistributorReturns(setReturns, handleError)
      return () => unsubscribeReturns()
    }
    if (profile?.role === 'MANUFACTURER') {
      const handleError = () => setDataError('Unable to load manufacturer records. Please check your connection and try again.')
      const unsubscribeReturns = subscribeToManufacturerReturns(setReturns, handleError)
      const unsubscribeDisposals = subscribeToDisposals(setDisposals, handleError)
      const unsubscribeCertificates = subscribeToCertificates(setCertificates, handleError)
      return () => { unsubscribeReturns(); unsubscribeDisposals(); unsubscribeCertificates() }
    }
    if (profile?.role === 'INSPECTOR') {
      const handleError = () => setDataError('Unable to load compliance records. Please check your connection and try again.')
      const unsubscribeAlerts = subscribeToComplianceAlerts(setComplianceAlerts, handleError)
      const unsubscribeAudit = subscribeToComplianceAudit(setComplianceAudit, handleError)
      return () => { unsubscribeAlerts(); unsubscribeAudit() }
    }
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
  }, [user, profile?.pharmacyId, profile?.role, isPublicShopRoute])

  useEffect(() => {
    if (isPublicShopRoute) return undefined
    if (!user || profile?.role !== 'PHARMACY' || !medicines) return undefined
    seedDemoInventory(profile.pharmacyId || DEMO_PHARMACY.id).catch(() => {})
    runAutoExpiryEscalation({ pharmacyId: profile.pharmacyId || DEMO_PHARMACY.id, medicines, returns, user }).catch(() => {})
    return undefined
  }, [user, profile?.role, profile?.pharmacyId, medicines, returns, isPublicShopRoute])

  useEffect(() => {
    if (isPublicShopRoute) return undefined
    if (!user || profile?.role !== 'PHARMACY' || !medicines) return undefined
    syncPublicShop({ profile, medicines }).catch(() => {})
    return undefined
  }, [user, profile, medicines, isPublicShopRoute])

  if (publicShopMatch) return <PublicMedicinePage publicShopId={decodeURIComponent(publicShopMatch[1])} />
  if (authLoading) return <div className="app-loading"><div className="loading-mark">P</div><span>Opening your workspace...</span></div>
  if (!user) return <LoginPage />

  if (profile?.role === 'MANUFACTURER') {
    const detailMatch = route.match(/^\/manufacturer\/returns\/(.+)$/)
    const certificateMatch = route.match(/^\/manufacturer\/certificates\/(.+)$/)
    const detailReturn = returns.find((item) => item.id === detailMatch?.[1])
    const manufacturerCertificates = certificates.filter((item) => item.manufacturerId === profile?.manufacturerId || !item.manufacturerId)
    const certificate = manufacturerCertificates.find((item) => item.id === certificateMatch?.[1])
    const manufacturerPage = detailMatch
      ? <ManufacturerReturnDetailPage returnRequest={detailReturn} user={user} profile={profile} navigate={navigate} />
      : certificateMatch
        ? <ManufacturerCertificateDetailPage certificate={certificate} navigate={navigate} />
        : route === '/manufacturer/returns'
          ? <ManufacturerReturnsPage returns={returns} navigate={navigate} />
          : route === '/manufacturer/disposal'
            ? <ManufacturerDisposalPage disposals={disposals} navigate={navigate} />
            : route === '/manufacturer/certificates'
              ? <ManufacturerCertificatesPage certificates={manufacturerCertificates} navigate={navigate} />
              : <ManufacturerDashboardPage profile={profile} returns={returns} navigate={navigate} />
    return <ManufacturerShell user={user} profile={profile} route={route} navigate={navigate} assistantData={{ role: 'MANUFACTURER', returns, profile }}>{dataError ? <div className="loading-panel error-panel"><strong>{dataError}</strong></div> : manufacturerPage}</ManufacturerShell>
  }

  if (profile?.role === 'INSPECTOR') {
    const inspectorPage = route === '/inspector/detection' || route === '/inspector/search' || route === '/inspector/inspections'
      ? <InspectorDetectionPage user={user} />
      : route === '/inspector/alerts'
        ? <InspectorAlertsPage alerts={complianceAlerts} audit={complianceAudit} user={user} navigate={navigate} />
        : route === '/inspector/history' || route === '/inspector/audit'
          ? <InspectorHistoryPage audit={complianceAudit} />
          : <InspectorDashboardPage alerts={complianceAlerts} audit={complianceAudit} user={user} navigate={navigate} />
    return <InspectorShell user={user} profile={profile} route={route} navigate={navigate}><div>{dataError ? <div className="loading-panel error-panel"><strong>{dataError}</strong></div> : inspectorPage}</div></InspectorShell>
  }

  if (profile?.role === 'DISTRIBUTOR') {
    const distributorDetailMatch = route.match(/^\/distributor\/returns\/(.+)$/)
    const detailId = distributorDetailMatch?.[1]
    const detailReturn = returns.find((item) => item.id === detailId)
    const distributorPage = detailId
      ? <DistributorReturnDetailPage returnRequest={detailReturn} user={user} profile={profile} navigate={navigate} />
      : route === '/distributor/returns'
        ? <DistributorReturnsPage returns={returns} navigate={navigate} />
        : <DistributorDashboardPage returns={returns} navigate={navigate} profile={profile} />
    return <DistributorShell user={user} profile={profile} route={route} navigate={navigate} pendingCount={returns.filter((item) => item.status !== 'RECEIVED').length} assistantData={{ role: 'DISTRIBUTOR', returns, profile }}>{dataError ? <div className="loading-panel error-panel"><strong>{dataError}</strong><button type="button" className="button secondary" onClick={() => window.location.reload()}>Try again</button></div> : distributorPage}</DistributorShell>
  }

  const dataLoading = medicines === null
  const pharmacyId = profile?.pharmacyId || DEMO_PHARMACY.id
  const returnCount = returns.filter((item) => item.status === 'RETURN_REQUESTED').length
  const page = route === '/inventory'
    ? <InventoryPage medicines={medicines || []} returns={returns} pharmacyId={pharmacyId} navigate={navigate} />
    : route === '/billing'
      ? <BillingPage medicines={medicines || []} user={user} pharmacyId={pharmacyId} />
      : route === '/returns'
        ? <ReturnsPage medicines={medicines || []} returns={returns} user={user} pharmacyId={pharmacyId} />
        : route === '/qr'
          ? <PublicQrPage profile={profile} medicines={medicines || []} />
        : <DashboardPage medicines={medicines || []} sales={sales} returns={returns} profile={profile} navigate={navigate} />

  return (
    <AppShell user={user} profile={profile} route={route} navigate={navigate} returnCount={returnCount} assistantData={{ role: 'PHARMACY', medicines: medicines || [], returns, sales, profile }}>
      {dataLoading ? <div className="loading-panel"><div className="loading-spinner" /><strong>Syncing your pharmacy data...</strong><span>Firestore is checking the latest stock.</span></div> : dataError ? <div className="loading-panel error-panel"><strong>{dataError}</strong><button type="button" className="button secondary" onClick={() => window.location.reload()}>Try again</button></div> : page}
    </AppShell>
  )
}

export default App
