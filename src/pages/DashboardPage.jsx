import { useState } from 'react'
import { seedDemoInventory } from '../services/pharmacyService'
import './DashboardPage.css'

const operations = [
  { key: 'stock', icon: '▦', title: 'Stock', description: 'Manage medicines, batches, expiry dates and available quantities.', path: '/inventory', tone: 'sage' },
  { key: 'billing', icon: '▤', title: 'Billing', description: 'Sell medicines and manage pharmacy billing.', path: '/billing', tone: 'cream' },
  { key: 'returns', icon: '↻', title: 'Returns', description: 'Manage expiry-based returns and distributor collection.', path: '/returns', tone: 'amber' },
]

export default function DashboardPage({ medicines, profile, navigate }) {
  const [seeding, setSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState('')
  const [seedError, setSeedError] = useState('')

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

  const shopName = profile?.shopName || profile?.pharmacyName || 'Your pharmacy'
  const ownerName = profile?.ownerName || profile?.name || 'Pharmacy owner'
  const contactDetails = [profile?.phone, profile?.email].filter(Boolean).join(' · ')

  return (
    <div className="page-stack pharmacy-dashboard">
      <section className="shop-identity" aria-labelledby="shop-name">
        <p className="eyebrow">Your pharmacy</p>
        <h1 id="shop-name">{shopName}</h1>
        <p className="shop-owner">Owner: {ownerName}</p>
        {profile?.address && <p className="shop-address">{profile.address}</p>}
        {contactDetails && <p className="shop-contact">{contactDetails}</p>}
      </section>

      <section className="operations-section" aria-labelledby="workspace-title">
        <div className="operations-heading"><p className="eyebrow">Pharmacy workspace</p><h2 id="workspace-title">Choose an operation</h2></div>
        <div className="operations-grid">
          {operations.map((operation) => <article className={`operation-card ${operation.tone}`} key={operation.key}>
            <button type="button" className="operation-card-link" onClick={() => navigate(operation.path)}>
              <span className="operation-icon" aria-hidden="true">{operation.icon}</span>
              <span className="operation-title">{operation.title}</span>
              <span className="operation-description">{operation.description}</span>
              <span className="operation-action">Open {operation.title} <span aria-hidden="true">→</span></span>
            </button>
            {operation.key === 'stock' && !medicines.length && <button type="button" className="operation-secondary" onClick={handleSeed} disabled={seeding}>{seeding ? 'Preparing demo stock...' : 'Load demo stock'}</button>}
          </article>)}
        </div>
      </section>
      {seedMessage && <div className="inline-message success" role="status">{seedMessage}</div>}
      {seedError && <div className="inline-message error" role="alert">{seedError}</div>}
    </div>
  )
}
