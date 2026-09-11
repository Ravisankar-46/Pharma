import { useState } from 'react'
import { createReturnRequest, getDaysRemaining, getExpiryLabel, isReturnEligible, verifyHandoverOtp } from '../services/pharmacyService'
import './ReturnsPage.css'

const emptyForm = { medicineId: '', quantity: '', condition: 'Sealed', reason: 'Expired', notes: '' }

function statusLabel(status) {
  if (status === 'HANDOVER_VERIFIED') return 'Handover completed'
  return status === 'RETURN_REQUESTED' ? 'Return requested' : status.replaceAll('_', ' ')
}

function nextStepLabel(status) {
  if (status === 'RECEIVED') return 'Ready for manufacturer handoff'
  if (status === 'DISPUTE') return 'Resolution required'
  if (status === 'PICKUP_SCHEDULED') return 'Pickup scheduled'
  return 'Awaiting distributor pickup'
}

function requestedDate(timestamp) {
  if (!timestamp?.toDate) return 'Just now'
  return timestamp.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function pickupDateLabel(value) {
  if (!value) return 'Date to be confirmed'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function ReturnStatus({ status }) {
  return <span className={`return-status-badge ${status.toLowerCase()}`}>{statusLabel(status)}</span>
}

function HandoverVerification({ returnRequest, user, pharmacyId }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const initiated = Boolean(returnRequest.handoverOtpHash)
  const verified = Boolean(returnRequest.handoverVerified)

  async function verify(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try { await verifyHandoverOtp({ returnRequest, otp: code, user, pharmacyId }); setMessage('HANDOVER VERIFIED'); setCode('') } catch (actionError) { setError(actionError.message) } finally { setBusy(false) }
  }

  if (verified) return <div className="handover-panel verified"><p className="eyebrow">Handover verification</p><strong>✓ HANDOVER VERIFIED</strong><span>The return has been successfully handed over to the authorized collector.</span></div>
  return <div className="handover-panel"><p className="eyebrow">Handover verification</p><p>The authorized collector will provide the verification code during collection.</p>{!initiated ? <><strong>WAITING FOR DISTRIBUTOR</strong><span>The Distributor must confirm pickup and generate the handover code before it can be entered here.</span></> : <><strong>✓ HANDOVER VERIFICATION INITIATED</strong><span>Ask the authorized collector for the code when they arrive.</span><form onSubmit={verify}><label>Enter verification code<input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" placeholder="6-digit code" aria-label="6-digit handover verification code" required /><small>6-digit verification code</small></label><button type="submit" className="button primary" disabled={busy || code.length !== 6}>Verify handover</button></form></>}{message && <div className="form-alert success" role="status">{message}</div>}{error && <div className="form-alert error" role="alert">{error}</div>}</div>
}

export default function ReturnsPage({ medicines, returns, user, pharmacyId }) {
  const requestedMedicineId = new URLSearchParams(window.location.search).get('medicineId') || ''
  const requestedMedicine = medicines.find((medicine) => medicine.id === requestedMedicineId)
  const [form, setForm] = useState({
    ...emptyForm,
    medicineId: requestedMedicineId,
    quantity: requestedMedicine?.quantity ? String(requestedMedicine.quantity) : '',
    reason: requestedMedicine && getDaysRemaining(requestedMedicine.expiryDate) > 0 ? 'Approaching expiry' : 'Expired',
  })
  const [showForm, setShowForm] = useState(Boolean(requestedMedicineId))
  const [evidenceName, setEvidenceName] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [error, setError] = useState('')
  const activeReturnMedicineIds = new Set(returns.filter((item) => item.status === 'RETURN_REQUESTED').map((item) => item.medicineId))
  const eligible = medicines.filter((medicine) => isReturnEligible(medicine, activeReturnMedicineIds))
  const activeReturns = returns.filter((item) => item.status === 'RETURN_REQUESTED')
  const scheduledReturns = returns.filter((item) => item.status === 'PICKUP_SCHEDULED')
  const collectionReturns = [...scheduledReturns, ...returns.filter((item) => ['VERIFICATION_PENDING', 'HANDOVER_VERIFIED'].includes(item.status)), ...activeReturns]
  const automaticReturns = returns.filter((item) => item.source === 'AUTO_EXPIRY')
  const selected = medicines.find((medicine) => medicine.id === form.medicineId)
  const unitsInReturn = activeReturns.reduce((sum, item) => sum + Number(item.quantity || 0), 0)

  function openForm(medicineId = '') {
    const medicine = medicines.find((item) => item.id === medicineId) || eligible[0]
    setForm({ ...emptyForm, medicineId: medicine?.id || '', quantity: medicine?.quantity ? String(medicine.quantity) : '', reason: medicine && getDaysRemaining(medicine.expiryDate) > 0 ? 'Approaching expiry' : 'Expired' })
    setConfirmation(null)
    setError('')
    setShowForm(true)
  }

  function update(event) {
    setForm((current) => {
      const next = { ...current, [event.target.name]: event.target.value }
      if (event.target.name === 'medicineId') {
        const medicine = medicines.find((item) => item.id === event.target.value)
        next.quantity = medicine?.quantity ? String(medicine.quantity) : ''
        next.reason = medicine && getDaysRemaining(medicine.expiryDate) > 0 ? 'Approaching expiry' : 'Expired'
      }
      if (event.target.name === 'quantity' && selected && Number(event.target.value) > Number(selected.quantity)) {
        setError(`Return quantity cannot exceed available stock (${selected.quantity} ${selected.unit}).`)
      } else if (event.target.name === 'quantity') {
        setError('')
      }
      return next
    })
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!selected) { setError('Select an eligible batch to continue.'); return }
    const quantity = Number(form.quantity || selected.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError('Return quantity must be greater than 0.')
      return
    }
    if (quantity > selected.quantity) {
      setError(`Return quantity cannot exceed available stock (${selected.quantity} ${selected.unit}).`)
      return
    }
    setBusy(true)
    try {
      const returnId = await createReturnRequest({ medicine: selected, ...form, quantity, user, pharmacyId })
      setConfirmation({ returnId, medicineName: `Return request ${returnId} created successfully. ${selected.medicineName}`, batchNumber: selected.batchNumber, quantity, unit: selected.unit })
      setForm(emptyForm)
      setEvidenceName('')
      setShowForm(false)
    } catch (returnError) {
      setError(returnError.message || 'Return request could not be submitted.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-stack returns-page">
      <div className="page-heading"><div><p className="eyebrow">Reverse flow</p><h1>Returns</h1><p className="page-subtitle">Move expired stock out of your pharmacy and keep every batch traceable.</p></div><button type="button" className="button primary return-primary-action" onClick={() => openForm()}>+ Initiate return <span aria-hidden="true">→</span></button></div>
      {collectionReturns.length > 0 && <section className="collection-panel" aria-labelledby="collection-heading"><div className="section-heading"><div><p className="eyebrow">Shared return updates</p><h2 id="collection-heading">{scheduledReturns.length ? 'Collection scheduled' : 'Return requested'}</h2><p>{scheduledReturns.length ? 'Your return has been accepted by the distributor.' : 'Waiting for the distributor to schedule collection.'}</p></div><span className="count-pill">{collectionReturns.length} active</span></div><div className="collection-list">{collectionReturns.map((returnRequest) => <article className={`collection-card ${returnRequest.status === 'PICKUP_SCHEDULED' ? 'scheduled' : 'waiting'}`} key={returnRequest.id}><div className="collection-card-heading"><div><span className={`return-source ${returnRequest.source === 'AUTO_EXPIRY' ? 'automatic' : 'manual'}`}>{returnRequest.source === 'AUTO_EXPIRY' ? 'AUTO EXPIRY' : 'MANUAL RETURN'}</span><h3>{returnRequest.medicineName} <small>{returnRequest.strength}</small></h3></div><ReturnStatus status={returnRequest.status} /></div>{returnRequest.status === 'PICKUP_SCHEDULED' ? <><div className="collection-details"><span><small>Distributor</small><strong>{returnRequest.distributorName || 'Distributor'}</strong></span><span><small>Collector</small><strong>{returnRequest.collectorName || returnRequest.assignedPerson || 'Assigned collector'}</strong><small>{returnRequest.collectorRole || 'Authorized collection executive'}</small></span><span><small>Contact</small><strong>{returnRequest.collectorPhone || 'Contact shared by distributor'}</strong></span><span><small>Pickup</small><strong>{pickupDateLabel(returnRequest.pickupDate || returnRequest.pickupScheduledAt)}</strong><small>{returnRequest.pickupTimeWindow || 'Time window to be confirmed'}</small></span><span><small>Reference</small><strong>{returnRequest.pickupReference || 'Pending reference'}</strong></span><span><small>Return</small><strong>Batch {returnRequest.batchNumber}</strong><small>{returnRequest.quantity} units</small></span></div><HandoverVerification returnRequest={returnRequest} user={user} pharmacyId={pharmacyId} /></> : <div className="collection-waiting"><p>Your return request has been sent to the distributor.</p><span>Batch {returnRequest.batchNumber} · {returnRequest.quantity} units</span><strong>Waiting for pickup scheduling.</strong></div>}</article>)}</div>{scheduledReturns.length > 0 && <div className="collection-instructions"><p className="eyebrow">Collection instructions</p><ul><li>Keep the return package ready and the batch number visible.</li><li>Keep the declared quantity and original packaging intact.</li><li>Do not sell or transfer returned units.</li><li>Verify the collector&apos;s identity before handover.</li><li>Share the return handover OTP only during authorized handover.</li><li>Complete the PharmaLoop handover process.</li></ul></div>}</section>}
      {confirmation && <section className="return-confirmation" role="status"><div className="confirmation-icon">✓</div><div className="confirmation-copy"><p className="eyebrow">Request submitted</p><h2>Return request submitted</h2><p>{confirmation.medicineName} · Batch {confirmation.batchNumber}</p><span>{confirmation.quantity} {confirmation.unit} are now marked for reverse-chain pickup.</span></div><div className="confirmation-status"><small>Status</small><ReturnStatus status="RETURN_REQUESTED" /></div><button type="button" className="button secondary" onClick={() => document.querySelector('.return-history')?.scrollIntoView({ behavior: 'smooth' })}>View return</button></section>}
        {confirmation && <section className="return-confirmation" role="status"><div className="confirmation-icon">✓</div><div className="confirmation-copy"><p className="eyebrow">Request submitted</p><h2>Return request submitted</h2><p>{confirmation.medicineName} · Batch {confirmation.batchNumber}</p><span>{confirmation.quantity} {confirmation.unit} are now marked for reverse-chain pickup.</span></div><div className="confirmation-status"><small>Status</small><ReturnStatus status="RETURN_REQUESTED" /></div><button type="button" className="button secondary" onClick={() => document.querySelector('.return-history')?.scrollIntoView({ behavior: 'smooth' })}>View return</button></section>}
      <section className="return-summary return-summary-cards"><article className="summary-card summary-expired"><span className="summary-icon">!</span><div><strong>{eligible.length}</strong><h3>Ready to return</h3><p>Expired stock requiring action</p></div></article><article className="summary-card summary-pending"><span className="summary-icon">↻</span><div><strong>{activeReturns.length}</strong><h3>Awaiting pickup</h3><p>Distributor pickup pending</p></div></article><article className="summary-card summary-flow"><span className="summary-icon">▦</span><div><strong>{unitsInReturn}</strong><h3>Units in return</h3><p>Stock moving through reverse flow</p></div></article></section>
      <section className="action-required"><div className="section-heading"><div><p className="eyebrow">Return eligibility</p><h2>Action required</h2><p>These batches are within 30 days of expiry or have already expired.</p></div><span className="count-pill">{eligible.length} ready</span></div>{eligible.length ? <div className="action-card-grid">{eligible.map((medicine) => { const daysRemaining = getDaysRemaining(medicine.expiryDate); return <article className="action-card manual-return-card" key={medicine.id}><div className="action-card-top"><div className="medicine-avatar action-avatar">{medicine.medicineName.slice(0, 1)}</div><span className="return-source manual">MANUAL RETURN</span></div><h3>{medicine.medicineName} <small>{medicine.strength}</small></h3><div className="action-meta"><span>Batch <strong>{medicine.batchNumber}</strong></span><span><strong>{medicine.quantity} {medicine.unit}</strong> available</span></div><div className="action-expiry"><span>{getExpiryLabel(medicine.expiryDate)}</span><small>{daysRemaining > 0 ? 'Reason: Approaching expiry' : `${Math.abs(daysRemaining)} days past expiry · Reason: Expired stock`}</small></div><button type="button" className="button primary full-width" onClick={() => openForm(medicine.id)}>Return <span aria-hidden="true">→</span></button></article> })}</div> : <div className="return-clear-state"><span className="empty-icon">✓</span><div><h3>You&apos;re all clear</h3><p>There&apos;s no return-eligible stock waiting for a return.</p></div></div>}</section>
      {automaticReturns.length > 0 && <section className="automatic-return-section"><div className="section-heading"><div><p className="eyebrow">Automatic return initiated</p><h2>PharmaLoop requested collection</h2><p>These batches reached the automatic five-day expiry threshold.</p></div><span className="count-pill">{automaticReturns.length} initiated</span></div><div className="automatic-return-list">{automaticReturns.map((returnRequest) => { const calculatedDays = getDaysRemaining(returnRequest.expiryDate); const daysRemaining = Number.isFinite(calculatedDays) ? calculatedDays : returnRequest.triggerDaysRemaining; return <article className="automatic-return-card" key={returnRequest.id}><div><span className="return-source automatic">AUTOMATIC RETURN INITIATED</span><h3>{returnRequest.medicineName} <small>{returnRequest.strength}</small></h3><p>Batch {returnRequest.batchNumber} · {returnRequest.quantity} units · {daysRemaining} days until expiry</p><strong>Distributor collection has been requested.</strong></div><button type="button" className="button secondary" onClick={() => document.querySelector('.return-history')?.scrollIntoView({ behavior: 'smooth' })}>View return</button></article> })}</div><div className="return-instructions"><p className="eyebrow">Return instructions</p><p>Please prepare the batch for distributor collection before expiry.</p><ul><li>Separate the batch from sellable stock.</li><li>Keep the original packaging and batch number visible.</li><li>Keep the declared quantity ready.</li><li>Do not sell these units.</li><li>Hand the package only to authorized distributor personnel.</li><li>Confirm the handover through PharmaLoop.</li></ul></div></section>}
      {showForm && <section className="panel form-panel return-form-panel"><div className="panel-heading"><div><p className="eyebrow">New request</p><h2>Initiate a return</h2><p className="form-intro">Check the batch details, then choose how many units to send back.</p></div><button type="button" className="icon-button" aria-label="Close form" onClick={() => setShowForm(false)}>×</button></div><form className="return-form improved-return-form" onSubmit={submit}><fieldset><legend>Batch details</legend><label>Medicine batch<select name="medicineId" value={form.medicineId} onChange={update}><option value="">Select eligible batch</option>{eligible.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.medicineName} {medicine.strength} · {medicine.batchNumber}</option>)}</select></label>{selected && <div className="batch-details-grid"><span><small>Medicine</small><strong>{selected.medicineName}</strong></span><span><small>Strength</small><strong>{selected.strength}</strong></span><span><small>Batch</small><strong>{selected.batchNumber}</strong></span><span><small>Expiry</small><strong>{selected.expiryDate}</strong></span><span><small>Available quantity</small><strong>{selected.quantity} {selected.unit}</strong></span></div>}</fieldset><fieldset><legend>Return details</legend><div className="form-two-col"><label>Return quantity<input name="quantity" type="number" min="1" value={form.quantity || selected?.quantity || ''} onChange={update} required /><small>Recommended: {selected ? `${selected.quantity} ${selected.unit}` : 'select a batch first'}</small></label><label>Condition<select name="condition" value={form.condition} onChange={update}><option>Sealed</option><option>Damaged</option><option>Opened</option><option>Unknown</option></select></label></div><label>Reason<select name="reason" value={form.reason} onChange={update}><option>Approaching expiry</option><option>Expired</option><option>Unused stock</option><option>Damaged stock</option><option>Other</option></select></label><label>Notes <span className="optional">optional</span><textarea name="notes" value={form.notes} onChange={update} placeholder="Add context for the pickup team" rows="3" /></label></fieldset><fieldset><legend>Evidence</legend><label className="evidence-field">Evidence photo <span className="optional">local preview only · not uploaded</span><input type="file" accept="image/*" onChange={(event) => setEvidenceName(event.target.files?.[0]?.name || '')} /><span className="file-picker">{evidenceName || 'Choose a local file'}</span></label></fieldset>{error && <div className="form-alert error" role="alert">{error}</div>}<div className="form-actions"><button type="button" className="button secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="button primary" disabled={busy}>{busy ? 'Submitting...' : 'Submit return request'} <span aria-hidden="true">→</span></button></div></form></section>}
      <section className="panel return-history"><div className="panel-heading"><div><p className="eyebrow">Request history</p><h2>Return requests</h2><p className="form-intro">Track every batch after it leaves the action queue.</p></div><span className="count-pill">{returns.length} total</span></div>{returns.length ? <div className="return-list">{returns.map((returnRequest) => <article className="return-row improved-return-row" key={returnRequest.id}><div className="medicine-avatar">{returnRequest.medicineName.slice(0, 1)}</div><div className="return-details"><span className={`return-source ${returnRequest.source === 'AUTO_EXPIRY' ? 'automatic' : 'manual'}`}>{returnRequest.source === 'AUTO_EXPIRY' ? 'AUTOMATIC RETURN' : 'MANUAL RETURN'}</span><strong>{returnRequest.medicineName} <small>{returnRequest.strength}</small></strong><span>Batch {returnRequest.batchNumber} · {returnRequest.quantity} units · {returnRequest.condition}</span><small>Reason: {returnRequest.reason} · Requested: {requestedDate(returnRequest.requestedAt)}</small></div><div className="return-row-status"><ReturnStatus status={returnRequest.status} /><span>Next: {nextStepLabel(returnRequest.status)}</span></div></article>)}</div> : <div className="empty-state"><span className="empty-icon">↻</span><strong>No return requests yet</strong><p>Requests will appear here after submission.</p></div>}</section>
      <section className="next-steps"><div className="section-heading"><div><p className="eyebrow">Reverse chain</p><h2>What happens next?</h2></div></div><div className="flow-steps"><div className="flow-step current"><span>1</span><div><small>You are here</small><strong>Return requested</strong><p>Your request is recorded and the stock is no longer sellable.</p></div></div><div className="flow-line" /><div className="flow-step muted-step"><span>2</span><div><strong>Pickup scheduled</strong><p>Distributor coordinates the collection.</p></div></div><div className="flow-line" /><div className="flow-step muted-step"><span>3</span><div><strong>Verified reverse chain</strong><p>The batch continues through authorized handling.</p></div></div></div></section>
    </div>
  )
}
