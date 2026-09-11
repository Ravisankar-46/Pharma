import { useState } from 'react'
import { assignPickup, flagReturnDispute, generateHandoverVerification, verifyReturnReceipt } from '../services/pharmacyService'
import './DistributorReturnDetail.css'

function PickupSummary({ returnRequest }) {
  return <div className="pickup-summary"><span><small>Distributor</small><strong>{returnRequest.distributorName || 'Distributor'}</strong></span><span><small>Collector</small><strong>{returnRequest.collectorName || returnRequest.assignedPerson || 'Assigned collector'}</strong><small>{returnRequest.collectorRole || 'Authorized collection executive'}</small></span><span><small>Phone</small><strong>{returnRequest.collectorPhone || 'Contact shared by distributor'}</strong></span><span><small>Pickup</small><strong>{returnRequest.pickupDate || returnRequest.pickupScheduledAt}</strong><small>{returnRequest.pickupTimeWindow || 'Time window to be confirmed'}</small></span><span><small>Reference</small><strong>{returnRequest.pickupReference || 'Pending reference'}</strong></span><span><small>Assigned person</small><strong>{returnRequest.assignedPerson || 'Not specified'}</strong></span></div>
}

function DistributorHandoverOtp({ returnRequest, user, profile }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const verified = Boolean(returnRequest.handoverVerified)
  const expired = returnRequest.handoverOtpExpiresAt?.toDate?.() < new Date()
  async function regenerate() {
    setBusy(true); setError('')
    try { await generateHandoverVerification({ returnRequest, user, distributorId: profile.distributorId, profile }) } catch (actionError) { setError(actionError.message) } finally { setBusy(false) }
  }
  if (verified) return <div className="distributor-otp-panel verified"><strong>✓ HANDOVER VERIFIED</strong><span>The OTP was used successfully. Handover completed for this return.</span><small>STATUS · HANDOVER COMPLETED</small></div>
  return <div className="distributor-otp-panel"><p className="eyebrow">Handover verification</p><strong>Handover OTP</strong>{returnRequest.handoverOtpDemo && !expired ? <><b className="distributor-otp-code">{returnRequest.handoverOtpDemo}</b><span>Share this verification code with the pharmacy.</span><small>OTP valid for this handover · Demo-mode code, valid for 30 minutes</small></> : <><span>{expired ? 'HANDOVER CODE EXPIRED' : 'Generate one OTP for this handover and share it with the pharmacy.'}</span><button type="button" className="button secondary" onClick={regenerate} disabled={busy}>{expired ? 'Regenerate OTP' : 'Generate handover OTP'}</button></>}{error && <div className="form-alert error" role="alert">{error}</div>}</div>
}

export default function DistributorReturnDetailPage({ returnRequest, user, profile, navigate }) {
  const [batch, setBatch] = useState(returnRequest?.batchNumber || '')
  const [quantity, setQuantity] = useState(returnRequest?.quantity || '')
  const [condition, setCondition] = useState('Sealed')
  const [notes, setNotes] = useState('')
  const [pickupDate, setPickupDate] = useState(returnRequest?.pickupScheduledAt || '')
  const [pickupTimeWindow, setPickupTimeWindow] = useState(returnRequest?.pickupTimeWindow || '')
  const [pickupReference, setPickupReference] = useState(returnRequest?.pickupReference || '')
  const [distributorName, setDistributorName] = useState(returnRequest?.distributorName || profile?.distributorName || '')
  const [collectorName, setCollectorName] = useState(returnRequest?.collectorName || '')
  const [collectorPhone, setCollectorPhone] = useState(returnRequest?.collectorPhone || '')
  const [collectorRole, setCollectorRole] = useState(returnRequest?.collectorRole || 'Authorized Collection Executive')
  const [assignedPerson, setAssignedPerson] = useState(returnRequest?.assignedPerson || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  if (!returnRequest) return <div className="loading-panel error-panel"><strong>Return request not found.</strong><button type="button" className="button secondary" onClick={() => navigate('/distributor/returns')}>Back to returns</button></div>

  const expected = Number(returnRequest.quantity)
  const received = Number(quantity)
  const difference = Number.isFinite(received) && received > 0 ? received - expected : null
  const handoverVerified = Boolean(returnRequest.handoverVerified)
  const locked = ['RECEIVED', 'DISPUTE'].includes(returnRequest.status)
  const scheduled = ['PICKUP_SCHEDULED', 'HANDOVER_VERIFIED'].includes(returnRequest.status)
  const batchMatches = batch.trim() === returnRequest.batchNumber
  const quantityMatches = difference === 0
  const canReceive = handoverVerified && batchMatches && quantityMatches && !locked
  const mismatch = batch.length > 0 && !batchMatches
  const discrepancy = difference !== null && difference !== 0

  async function run(action) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
      setMessage('Update saved to the shared return record.')
    } catch (actionError) {
      setError(actionError.message || 'The update could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  function flagDiscrepancy() {
    const reason = mismatch ? 'Batch mismatch' : 'Quantity discrepancy'
    const detail = mismatch ? `Expected ${returnRequest.batchNumber}, received ${batch}.` : `Expected ${expected}, received ${received}.`
    return run(() => flagReturnDispute({ returnRequest, receivedBatchNumber: batch, receivedQuantity: quantity, disputeReason: reason, disputeNotes: `${detail} ${notes}`.trim(), user, distributorId: profile.distributorId }))
  }

  function schedulePickup() {
    return run(async () => {
      await assignPickup({ returnRequest, pickupDate, pickupTimeWindow, pickupReference, distributorName, collectorName, collectorPhone, collectorRole, assignedPerson, notes, user, distributorId: profile.distributorId })
      await generateHandoverVerification({ returnRequest: { ...returnRequest, status: 'PICKUP_SCHEDULED', distributorId: profile.distributorId }, user, distributorId: profile.distributorId, profile })
    })
  }

  return <div className="page-stack distributor-page">
    <div className="page-heading"><div><p className="eyebrow">Return verification</p><h1>{returnRequest.medicineName}</h1><p className="page-subtitle">Batch {returnRequest.batchNumber} · Pharmacy-declared return</p></div><button type="button" className="button secondary" onClick={() => navigate('/distributor/returns')}>← All returns</button></div>
    {message && <div className="inline-message success" role="status">{message}</div>}
    {error && <div className="inline-message error" role="alert">{error}</div>}

    <section className="panel declared-panel workflow-step"><div className="panel-heading"><div><p className="eyebrow">Step 1 · Pharmacy record</p><h2>Pharmacy declared</h2></div><span className="comparison-label">READ ONLY</span></div><div className="declared-details"><span><small>Medicine</small><strong>{returnRequest.medicineName} {returnRequest.strength}</strong></span><span><small>Batch number</small><strong>{returnRequest.batchNumber}</strong></span><span><small>Expected quantity</small><strong>{expected} units</strong></span><span><small>From pharmacy</small><strong>{returnRequest.pharmacyId}</strong></span><span><small>Return status</small><strong>{returnRequest.status.replaceAll('_', ' ')}</strong></span></div></section>

    <section className="panel pickup-panel workflow-step"><div className="panel-heading"><div><p className="eyebrow">Step 2 · Collection scheduling</p><h2>{scheduled ? 'Collection scheduled' : 'Assign pickup'}</h2><p className="form-intro">{scheduled ? 'The pharmacy can now see the assigned collector details.' : 'Tell the pharmacy who is collecting this return.'}</p></div><span className="comparison-label">SHARED RECORD</span></div>{scheduled ? <><PickupSummary returnRequest={returnRequest} /><DistributorHandoverOtp returnRequest={returnRequest} user={user} profile={profile} /></> : <form className="pickup-form"><label>Distributor name<input value={distributorName} onChange={(event) => setDistributorName(event.target.value)} placeholder="Apollo Distribution Hub" /></label><label>Collector name<input value={collectorName} onChange={(event) => setCollectorName(event.target.value)} placeholder="Ravi Kumar" /></label><label>Collector phone<input type="tel" value={collectorPhone} onChange={(event) => setCollectorPhone(event.target.value)} placeholder="+91 XXXXX XXXXX" /></label><label>Collector role<input value={collectorRole} onChange={(event) => setCollectorRole(event.target.value)} placeholder="Authorized Collection Executive" /></label><label>Pickup date<input type="date" value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} /></label><label>Pickup time window<input value={pickupTimeWindow} onChange={(event) => setPickupTimeWindow(event.target.value)} placeholder="10:00 - 12:00" /></label><label>Pickup reference<input value={pickupReference} onChange={(event) => setPickupReference(event.target.value)} placeholder="e.g. PU-2026-001" /></label><label>Assigned person / driver<input value={assignedPerson} onChange={(event) => setAssignedPerson(event.target.value)} placeholder="Name" /></label><label className="pickup-notes">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Collect sealed return package from pharmacy counter." /></label><button type="button" className="button secondary" disabled={busy || !pickupDate || !pickupReference || !collectorName || !collectorPhone} onClick={schedulePickup}>Assign pickup</button></form>}</section>

    <section className="panel received-panel workflow-step"><div className="panel-heading"><div><p className="eyebrow">Step 3 · Physical handoff</p><h2>{handoverVerified ? 'Distributor verification' : 'Handover verification pending'}</h2><p className="form-intro">{handoverVerified ? 'The physical handover has been verified. Now verify the batch and received quantity.' : 'The Pharmacy must enter the handover code provided by the authorized collector.'}</p></div><span className="comparison-label">VERIFICATION</span></div>{!handoverVerified ? <div className="handover-pending-state"><strong>Handover verification pending</strong><span>Batch, quantity, condition, notes, receipt, and dispute controls unlock after the Pharmacy verifies the handover.</span>{returnRequest.handoverVerificationStatus === 'WAITING_FOR_DISTRIBUTOR_CODE' && <small>Secure Distributor code delivery requires a trusted backend in this frontend-only build.</small>}</div> : <><div className="verification-result received-result"><strong>✓ Handover verified</strong><span>Continue with batch and quantity verification.</span></div><form className="verification-form"><label>Scan or enter batch number<input value={batch} onChange={(event) => setBatch(event.target.value)} disabled={locked} /></label><label>Received quantity<input type="number" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} disabled={locked} /></label><label>Condition<select value={condition} onChange={(event) => setCondition(event.target.value)} disabled={locked}><option>Sealed</option><option>Damaged</option><option>Opened</option><option>Unknown</option></select></label><label>Verification notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes" disabled={locked} /></label>{mismatch && <div className="verification-warning">Expected batch: <strong>{returnRequest.batchNumber}</strong> · Received batch: <strong>{batch}</strong>. BATCH MISMATCH</div>}{discrepancy && !mismatch && <div className="verification-warning">Expected quantity: <strong>{expected}</strong> · Received quantity: <strong>{received}</strong>. QUANTITY DISCREPANCY · Difference: <strong>{Math.abs(difference)} units</strong></div>}<div className="verification-actions"><button type="button" className="button primary" disabled={!canReceive || busy} onClick={() => run(() => verifyReturnReceipt({ returnRequest, receivedBatchNumber: batch, receivedQuantity: quantity, condition, verificationNotes: notes, user, distributorId: profile.distributorId }))}>Confirm received <span aria-hidden="true">→</span></button><button type="button" className="button secondary" disabled={busy || locked || (!mismatch && !discrepancy)} onClick={flagDiscrepancy}>Flag discrepancy</button></div></form></>}</section>
  </div>
}
