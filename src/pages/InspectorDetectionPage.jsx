import { useState } from 'react'
import { checkBatchCompliance, DEMO_COMPLIANCE_BATCH } from '../services/pharmacyService'
import './Inspector.css'

const timeline = [
  ['Manufactured', '10 Jun 2026 · 09:10', 'MediCore Pharmaceuticals', 'Chennai, Tamil Nadu', 'SAFE'],
  ['Dispatched', '18 Jun 2026 · 14:20', 'Distributor', 'Chennai, Tamil Nadu', 'VERIFIED'],
  ['Delivered', '22 Jun 2026 · 11:05', 'CityCare Pharmacy', 'Chennai, Tamil Nadu', 'VERIFIED'],
  ['Return Registered', '15 Aug 2026 · 16:40', 'Reverse-chain process', 'CityCare Pharmacy', 'RESTRICTED'],
  ['Batch Flagged', '15 Aug 2026 · 16:42', 'Compliance event', 'CityCare Pharmacy', 'FLAGGED'],
  ['Previously Processed', '20 Aug 2026 · 10:15', 'Reverse-chain system', 'Manufacturer review', 'QUARANTINED'],
  ['Detected Again', '11 Sep 2026 · 10:42', 'Sri Lakshmi Medicals', 'Chennai, Tamil Nadu', 'ALERT'],
]

function Badge({ value }) { return <span className={`inspector-badge ${String(value).toLowerCase()}`}>{value}</span> }

export default function InspectorDetectionPage({ user }) {
  const [batchNumber, setBatchNumber] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function checkBatch(event, scanBatch = batchNumber) {
    event?.preventDefault()
    setBusy(true); setError(''); setMessage('')
    try {
      const nextResult = await checkBatchCompliance(scanBatch, 'SRI_LAKSHMI_MEDICALS', user)
      setResult(nextResult)
      if (nextResult.status === 'FLAGGED') setMessage('Compliance alert created and audit trail updated.')
    } catch (actionError) { setError(actionError.message) } finally { setBusy(false) }
  }
  const flagged = result?.status === 'FLAGGED'
  return <div className="page-stack inspector-page"><div className="page-heading"><div><p className="eyebrow">Drug Inspector Workspace</p><h1>Batch Re-entry Detection</h1><p className="page-subtitle">Identify previously processed, returned, recalled or restricted medicine batches appearing again for sale.</p></div></div>{message && <div className="inline-message success" role="status">{message}</div>}{error && <div className="inline-message error" role="alert">{error}</div>}<section className="panel inspector-search inspector-detection-search"><div className="panel-heading"><div><p className="eyebrow">Compliance lookup</p><h2>Check a Batch</h2><p className="page-subtitle">Search the batch history before allowing a retail appearance.</p></div></div><form onSubmit={checkBatch}><input value={batchNumber} onChange={(event) => setBatchNumber(event.target.value)} placeholder="Enter Batch Number" aria-label="Enter Batch Number" /><button type="submit" className="button primary" disabled={busy}>{busy ? 'Checking...' : 'Check Batch'}</button><button type="button" className="button secondary" onClick={() => { setBatchNumber(DEMO_COMPLIANCE_BATCH.batchNumber); checkBatch(null, DEMO_COMPLIANCE_BATCH.batchNumber) }} disabled={busy}>Simulate Scan</button></form><button type="button" className="text-button" onClick={() => setBatchNumber(DEMO_COMPLIANCE_BATCH.batchNumber)}>Use demo batch AMX2026B04</button></section>{flagged && <section className="inspector-detection-result"><div className="panel batch-result flagged"><p className="eyebrow">Previous event found</p><h2>🚨 SUSPICIOUS BATCH RE-ENTRY DETECTED</h2><p>This batch has previously been flagged in the reverse-chain system and has now been detected again at a retail outlet.</p><div className="alert-facts"><span><small>Product</small><b>{DEMO_COMPLIANCE_BATCH.product}</b></span><span><small>Batch</small><b>{DEMO_COMPLIANCE_BATCH.batchNumber}</b></span><span><small>Manufacturer</small><b>{DEMO_COMPLIANCE_BATCH.manufacturer}</b></span><span><small>Current Shop</small><b>{DEMO_COMPLIANCE_BATCH.currentShop}</b></span><span><small>Location</small><b>{DEMO_COMPLIANCE_BATCH.shopLocation}</b></span><span><small>Quantity</small><b>{DEMO_COMPLIANCE_BATCH.quantity} units</b></span><span><small>Previous Status</small><b>RETURNED / FLAGGED</b></span><span><small>Current Status</small><b>DETECTED FOR SALE</b></span></div><Badge value="HIGH" /></div><div className="panel inspector-shop"><div className="panel-heading"><div><p className="eyebrow">Retail outlet</p><h2>Retail Shop Details</h2></div><Badge value="PENDING" /></div><dl><dt>Shop Name</dt><dd>Sri Lakshmi Medicals</dd><dt>Drug License No</dt><dd>DL-TN-CHN-28471</dd><dt>Owner</dt><dd>Demo Shop Owner</dd><dt>Address</dt><dd>Chennai, Tamil Nadu</dd><dt>Contact</dt><dd>+91 XXXXX XXXXX</dd><dt>Last Inspection</dt><dd>15 Aug 2026</dd><dt>Flagged Quantity</dt><dd>24 units</dd><dt>Inspection</dt><dd>Pending</dd></dl><div className="inspector-actions"><button type="button" className="button primary" onClick={() => setMessage('Inspection case created for Sri Lakshmi Medicals.')}>Inspect Shop</button><button type="button" className="button secondary" onClick={() => window.location.hash = 'history'}>View Shop History</button></div></div></section>}{result && !flagged && <section className="panel batch-result safe"><h2>✓ Batch Verified</h2><p>No previous compliance issue detected for this batch.</p><span>Product: <b>{result.product}</b></span><span>Manufacturer: <b>{result.manufacturer}</b></span><span>Batch: <b>{result.batchNumber}</b></span><span>Current Status: <Badge value="VERIFIED" /></span></section>}<section className="panel inspector-history" id="history"><div className="panel-heading"><div><p className="eyebrow">Traceability</p><h2>Complete Batch History</h2></div><Badge value={flagged ? 'ALERT' : 'VERIFIED'} /></div><div className="timeline">{timeline.map(([event, time, organization, location, status]) => <div className="timeline-item" key={event}><i /><div><strong>{event}</strong><span>{time} · {organization} · {location}</span></div><Badge value={status} /></div>)}</div></section></div>
}
