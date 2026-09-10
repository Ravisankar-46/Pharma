import { useState } from 'react'
import {
  getExpiryLabel,
  getExpiryStatus,
  isReturnEligible,
  seedDemoInventory,
} from '../services/pharmacyService'

function formatCurrency(value) {
  return `₹${Number(value || 0).toFixed(2)}`
}

function StatusBadge({ status }) {
  return <span className={`status-badge ${status.toLowerCase()}`}>{status.replace('_', ' ')}</span>
}

export default function DashboardPage({ medicines, sales, returns, profile, navigate }) {
  const [seeding, setSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState('')
  const [seedError, setSeedError] = useState('')
  const totalUnits = medicines.reduce((sum, medicine) => sum + Number(medicine.quantity || 0), 0)
  const nearExpiry = medicines.filter((medicine) => getExpiryStatus(medicine.expiryDate) === 'NEAR_EXPIRY')
  const expired = medicines.filter((medicine) => getExpiryStatus(medicine.expiryDate) === 'EXPIRED')
  const pendingReturns = returns.filter((returnRequest) => returnRequest.status === 'RETURN_REQUESTED')
  const activeReturnIds = new Set(pendingReturns.map((returnRequest) => returnRequest.medicineId))
  const returnAttention = medicines.filter((medicine) => isReturnEligible(medicine, activeReturnIds))
  const today = new Date().toDateString()
  const billsToday = sales.filter((sale) => sale.soldAt?.toDate?.().toDateString() === today).length
  const attention = [...expired, ...nearExpiry].slice(0, 5)

  async function handleSeed() {
    setSeeding(true)
    setSeedMessage('')
    setSeedError('')
    try {
      const added = await seedDemoInventory(profile.pharmacyId)
      setSeedMessage(added ? `${added} demo batches added to your inventory.` : 'Demo inventory is already up to date.')
    } catch {
      setSeedError('Demo inventory could not be added. Check your Firestore connection.')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading dashboard-heading">
        <div><p className="eyebrow">Tuesday, September 10, 2026</p><h1>Good morning, {profile?.name?.split(' ')[0] || 'there'}.</h1><p className="page-subtitle">Here is the pulse of your pharmacy today.</p></div>
        {!medicines.length && <button type="button" className="button primary" onClick={handleSeed} disabled={seeding}>{seeding ? 'Preparing demo stock...' : 'Load demo inventory'} <span aria-hidden="true">→</span></button>}
      </div>
      {seedMessage && <div className="inline-message success" role="status">{seedMessage}</div>}
      {seedError && <div className="inline-message error" role="alert">{seedError}</div>}
      <section className="metric-grid" aria-label="Pharmacy summary">
        <article className="metric-card feature-metric"><div className="metric-top"><span className="metric-icon green">✦</span><span className="metric-caption">Across all batches</span></div><strong>{medicines.length}</strong><span className="metric-label">Total medicines</span></article>
        <article className="metric-card"><div className="metric-top"><span className="metric-icon amber">▦</span><span className="metric-caption">On hand now</span></div><strong>{totalUnits}</strong><span className="metric-label">Units in stock</span></article>
        <article className="metric-card"><div className="metric-top"><span className="metric-icon amber">◷</span><span className="metric-caption">Within 60 days</span></div><strong>{nearExpiry.length}</strong><span className="metric-label">Near expiry</span></article>
        <article className="metric-card"><div className="metric-top"><span className="metric-icon red">!</span><span className="metric-caption">Action needed</span></div><strong>{expired.length}</strong><span className="metric-label">Expired batches</span></article>
        <article className="metric-card"><div className="metric-top"><span className="metric-icon lavender">↗</span><span className="metric-caption">Since midnight</span></div><strong>{billsToday}</strong><span className="metric-label">Bills today</span></article>
        <article className="metric-card"><div className="metric-top"><span className="metric-icon rose">↻</span><span className="metric-caption">Awaiting pickup</span></div><strong>{pendingReturns.length}</strong><span className="metric-label">Pending returns</span></article>
      </section>
      <section className="panel dashboard-return-alert"><div className="panel-heading"><div><p className="eyebrow">Automatic return alert</p><h2>Returns need attention</h2><p className="section-subtitle">These batches are within 30 days of expiry or have already expired.</p></div><span className="count-pill">{returnAttention.length} batches</span></div>{returnAttention.length ? <div className="dashboard-return-list">{returnAttention.slice(0, 4).map((medicine) => <article className="dashboard-return-row" key={medicine.id}><div className="medicine-avatar">{medicine.medicineName.slice(0, 1)}</div><div><strong>{medicine.medicineName} <small>{medicine.strength}</small></strong><span>Batch {medicine.batchNumber} · {medicine.quantity} {medicine.unit}</span><span>{getExpiryLabel(medicine.expiryDate)}</span></div><span className={`status-badge ${getExpiryStatus(medicine.expiryDate).toLowerCase()}`}>{getExpiryStatus(medicine.expiryDate).replace('_', ' ')}</span><button type="button" className="button primary" onClick={() => navigate(`/returns?medicineId=${medicine.id}`)}>Initiate return <span aria-hidden="true">→</span></button></article>)}</div> : <div className="empty-state compact"><span className="empty-icon">✓</span><strong>No returns need attention</strong><p>There are no return-eligible batches right now.</p></div>}</section>
      <div className="content-grid dashboard-grid">
        <section className="panel attention-panel"><div className="panel-heading"><div><p className="eyebrow">Stock health</p><h2>Attention required</h2></div><span className="count-pill">{attention.length} items</span></div>{attention.length ? <div className="attention-list">{attention.map((medicine) => <div className="attention-row" key={medicine.id}><div className="medicine-avatar">{medicine.medicineName.slice(0, 1)}</div><div className="attention-details"><strong>{medicine.medicineName} <small>{medicine.strength}</small></strong><span>Batch {medicine.batchNumber} · {medicine.quantity} {medicine.unit}</span></div><div className="attention-expiry"><StatusBadge status={getExpiryStatus(medicine.expiryDate)} /><span>{getExpiryLabel(medicine.expiryDate)}</span></div></div>)}</div> : <div className="empty-state compact"><span className="empty-icon">✓</span><strong>Everything looks healthy</strong><p>No batches need attention right now.</p></div>}</section>
        <section className="panel activity-panel"><div className="panel-heading"><div><p className="eyebrow">Latest movement</p><h2>Recent sales</h2></div><span className="text-link">{formatCurrency(sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0))} total</span></div>{sales.length ? <div className="activity-list">{sales.slice(-5).reverse().map((sale) => <div className="activity-row" key={sale.id}><span className="activity-mark">↗</span><div><strong>{sale.medicineName}</strong><span>{sale.quantity} units · Batch {sale.batchNumber}</span></div><b>{formatCurrency(sale.totalAmount)}</b></div>)}</div> : <div className="empty-state compact"><span className="empty-icon">↗</span><strong>No sales recorded yet</strong><p>Completed bills will appear here.</p></div>}</section>
      </div>
    </div>
  )
}
