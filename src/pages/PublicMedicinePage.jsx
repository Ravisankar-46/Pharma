import { useEffect, useMemo, useState } from 'react'
import { getDaysRemaining, subscribeToPublicShop } from '../services/pharmacyService'
import './PublicMedicine.css'

function expiryStatus(expiryDate) {
  const days = getDaysRemaining(expiryDate)
  if (days < 0) return { label: 'EXPIRED', tone: 'expired', warning: 'Do not use or purchase this medicine. Please consult the pharmacist.' }
  if (days <= 5) return { label: 'URGENT', tone: 'urgent', warning: 'Check the expiry date on the physical pack before purchase or use.' }
  if (days <= 30) return { label: 'EXPIRING SOON', tone: 'soon', warning: 'Check the expiry date on the physical pack before purchase or use.' }
  if (days <= 60) return { label: 'NEAR EXPIRY', tone: 'near', warning: 'Check the expiry date on the physical pack before purchase or use.' }
  return { label: 'NORMAL', tone: 'normal', warning: '' }
}
function dateLabel(value) { const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) }
function updatedLabel(value) { if (!value?.toDate) return 'Recently'; return value.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) }

export default function PublicMedicinePage({ publicShopId }) {
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  useEffect(() => subscribeToPublicShop(publicShopId, setData, () => setError('Unable to load medicine information. Please try again.')), [publicShopId])
  const filtered = useMemo(() => (data?.medicines || []).filter((medicine) => `${medicine.medicineName} ${medicine.strength} ${medicine.batchNumber}`.toLowerCase().includes(search.toLowerCase())), [data, search])
  if (error) return <main className="public-page"><div className="public-error"><h1>Unable to load medicine information</h1><p>Please try again.</p></div></main>
  if (!data) return <main className="public-page"><div className="public-loading">Loading medicine information...</div></main>
  if (!data.shop) return <main className="public-page"><div className="public-error"><h1>Shop not found</h1><p>The QR code may be invalid or unavailable.</p></div></main>
  if (data.shop.publicQrEnabled === false) return <main className="public-page"><div className="public-error"><h1>Public medicine information is currently unavailable.</h1></div></main>
  return <main className="public-page"><header className="public-header"><div className="public-brand"><span>P</span><strong>PHARMALOOP</strong></div><p>MEDICINE INFORMATION</p></header><section className="public-intro"><p className="public-eyebrow">Verified shop medicine information</p><h1>{data.shop.shopName}</h1><p>{data.shop.shopAddress}</p></section><section className="public-content"><label className="public-search">Search medicine...<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search medicine or batch number" /></label>{filtered.length ? <div className="public-medicine-grid">{filtered.map((medicine) => { const status = expiryStatus(medicine.expiryDate); const availability = status.tone === 'expired' ? 'UNAVAILABLE' : medicine.availability; return <article className="public-medicine-card" key={medicine.id}><div className="public-card-heading"><h2>{medicine.medicineName} {medicine.strength}</h2><span className={`public-badge ${status.tone}`}>{availability}</span></div><dl><dt>Batch</dt><dd>{medicine.batchNumber}</dd><dt>Expiry</dt><dd>{dateLabel(medicine.expiryDate)}</dd><dt>Availability</dt><dd>{availability}</dd><dt>Expiry status</dt><dd><span className={`public-status ${status.tone}`}>{status.label}</span></dd></dl>{status.warning && <p className={`public-warning ${status.tone}`}>{status.warning}</p>}<small>Last updated: {updatedLabel(medicine.updatedAt)}</small></article> })}</div> : <div className="public-empty"><h2>{data.medicines.length ? 'No matching medicines' : 'No public medicine information available yet.'}</h2><p>Try searching by medicine name or batch number.</p></div>}</section><footer className="public-disclaimer">PharmaLoop displays medicine availability and expiry information provided by the participating pharmacy.<br />Always verify the physical pack, batch number and expiry date before purchase or use.</footer></main>
}
