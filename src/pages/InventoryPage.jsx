import { useMemo, useState } from 'react'
import { addMedicine, getExpiryLabel, getExpiryStatus, isReturnEligible } from '../services/pharmacyService'

const emptyForm = { medicineName: '', strength: '', batchNumber: '', quantity: '', unit: 'tablets', expiryDate: '', sellingPrice: '', manufacturerName: '' }

function StatusBadge({ status }) {
  return <span className={`status-badge ${status.toLowerCase()}`}>{status.replace('_', ' ')}</span>
}

export default function InventoryPage({ medicines, returns, pharmacyId, navigate }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const activeReturnIds = new Set(returns.filter((item) => item.status === 'RETURN_REQUESTED').map((item) => item.medicineId))
  const filtered = useMemo(() => medicines.filter((medicine) => {
    const matchesSearch = `${medicine.medicineName} ${medicine.strength} ${medicine.batchNumber}`.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || getExpiryStatus(medicine.expiryDate) === statusFilter
    return matchesSearch && matchesStatus
  }), [medicines, search, statusFilter])

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!form.medicineName.trim() || !form.batchNumber.trim() || !form.expiryDate || Number(form.quantity) <= 0 || Number(form.sellingPrice) < 0) {
      setError('Add a medicine name, batch, valid quantity, expiry date, and non-negative price.')
      return
    }
    setBusy(true)
    try {
      await addMedicine({ pharmacyId, ...form })
      setForm(emptyForm)
      setShowForm(false)
      setMessage('Medicine batch added successfully.')
    } catch (addError) {
      setError(addError.message || 'Medicine could not be added.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading"><div><p className="eyebrow">Stock room</p><h1>Inventory</h1><p className="page-subtitle">Every batch, quantity, and expiry signal in one view.</p></div><button type="button" className="button primary" onClick={() => { setShowForm(true); setMessage(''); setError('') }}>+ Add medicine</button></div>
      {message && <div className="inline-message success" role="status">{message}</div>}
      {error && !showForm && <div className="inline-message error" role="alert">{error}</div>}
      <section className="toolbar panel"><label className="search-box"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search medicine or batch" aria-label="Search medicine or batch" /></label><label className="filter-select"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All batches</option><option value="NORMAL">Normal</option><option value="NEAR_EXPIRY">Near expiry</option><option value="RETURN_ELIGIBLE">Return eligible</option><option value="EXPIRED">Expired</option></select></label><span className="toolbar-count">{filtered.length} of {medicines.length} batches</span></section>
      {showForm && <section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">New batch</p><h2>Add medicine stock</h2></div><button type="button" className="icon-button" aria-label="Close form" onClick={() => setShowForm(false)}>×</button></div><form className="medicine-form" onSubmit={handleSubmit}><label>Medicine name<input name="medicineName" value={form.medicineName} onChange={updateField} placeholder="e.g. Paracetamol" required /></label><label>Strength<input name="strength" value={form.strength} onChange={updateField} placeholder="e.g. 500mg" /></label><label>Batch number<input name="batchNumber" value={form.batchNumber} onChange={updateField} placeholder="e.g. PCM008" required /></label><label>Quantity<input name="quantity" type="number" min="1" value={form.quantity} onChange={updateField} placeholder="0" required /></label><label>Unit<select name="unit" value={form.unit} onChange={updateField}><option>tablets</option><option>capsules</option><option>bottles</option><option>sachets</option><option>strips</option></select></label><label>Expiry date<input name="expiryDate" type="date" value={form.expiryDate} onChange={updateField} required /></label><label>Selling price (₹)<input name="sellingPrice" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={updateField} placeholder="0.00" required /></label><label>Manufacturer <span className="optional">optional</span><input name="manufacturerName" value={form.manufacturerName} onChange={updateField} placeholder="Company name" /></label><div className="form-actions"><button type="button" className="button secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="button primary" disabled={busy}>{busy ? 'Adding batch...' : 'Add batch'} <span aria-hidden="true">→</span></button></div>{error && <div className="form-alert error" role="alert">{error}</div>}</form></section>}
      <section className="panel inventory-panel"><div className="table-wrap"><table><thead><tr><th>Medicine</th><th>Batch</th><th>Available</th><th>Expiry</th><th>Price</th><th>Action</th></tr></thead><tbody>{filtered.map((medicine) => { const status = getExpiryStatus(medicine.expiryDate); const canReturn = isReturnEligible(medicine, activeReturnIds); return <tr key={medicine.id}><td><div className="table-medicine"><div className="medicine-avatar">{medicine.medicineName.slice(0, 1)}</div><span><strong>{medicine.medicineName}</strong><small>{medicine.strength} · {medicine.manufacturerName || 'Manufacturer not listed'}</small></span></div></td><td><code>{medicine.batchNumber}</code></td><td><strong className={medicine.quantity === 0 ? 'zero-stock' : ''}>{medicine.quantity}</strong><small>{medicine.unit}</small></td><td><div className="expiry-cell"><StatusBadge status={status} /><span>{getExpiryLabel(medicine.expiryDate)}</span></div></td><td>₹{Number(medicine.sellingPrice || 0).toFixed(2)}</td><td>{canReturn ? <button type="button" className="table-action return-action" onClick={() => navigate(`/returns?medicineId=${medicine.id}`)}>Return <span aria-hidden="true">→</span></button> : activeReturnIds.has(medicine.id) ? <span className="available-label">Return requested</span> : <span className="available-label">Available</span>}</td></tr> })}</tbody></table>{!filtered.length && <div className="empty-state"><span className="empty-icon">⌕</span><strong>No batches found</strong><p>Try a different search or add a new medicine batch.</p></div>}</div></section>
    </div>
  )
}
