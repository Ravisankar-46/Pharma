import { useMemo, useState } from 'react'
import { completeSale, getExpiryStatus } from '../services/pharmacyService'

function money(value) {
  return `₹${Number(value || 0).toFixed(2)}`
}

export default function BillingPage({ medicines, user, pharmacyId }) {
  const [selectedId, setSelectedId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [cart, setCart] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const sellable = medicines.filter((medicine) => getExpiryStatus(medicine.expiryDate) !== 'EXPIRED' && medicine.quantity > 0 && medicine.returnStatus !== 'RETURN_REQUESTED')
  const selected = medicines.find((medicine) => medicine.id === selectedId)
  const total = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const cartQuantity = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])

  function addToBill(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!selected) { setError('Select a medicine batch first.'); return }
    if (getExpiryStatus(selected.expiryDate) === 'EXPIRED') { setError('SALE BLOCKED — This medicine batch has expired.'); return }
    const requested = Number(quantity)
    const existing = cart.find((item) => item.medicineId === selected.id)
    if (!Number.isInteger(requested) || requested <= 0) { setError('Enter a whole number greater than zero.'); return }
    if (requested + (existing?.quantity || 0) > selected.quantity) { setError(`Insufficient stock. Only ${selected.quantity} units are available.`); return }
    setCart((items) => existing ? items.map((item) => item.medicineId === selected.id ? { ...item, quantity: item.quantity + requested } : item) : [...items, { medicineId: selected.id, medicineName: selected.medicineName, strength: selected.strength, batchNumber: selected.batchNumber, quantity: requested, unitPrice: Number(selected.sellingPrice) }])
    setQuantity(1)
    setSelectedId('')
  }

  async function finishSale() {
    setError('')
    setMessage('')
    if (!cart.length) { setError('Add at least one item to the bill.'); return }
    setBusy(true)
    try {
      for (const item of cart) {
        const currentMedicine = medicines.find((medicine) => medicine.id === item.medicineId)
        await completeSale({ medicine: currentMedicine, quantity: item.quantity, user, pharmacyId })
      }
      setCart([])
      setMessage(`Sale complete. ${cartQuantity} ${cartQuantity === 1 ? 'unit' : 'units'} recorded successfully.`)
    } catch (saleError) {
      setError(saleError.message || 'Sale could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading"><div><p className="eyebrow">Point of sale</p><h1>New bill</h1><p className="page-subtitle">Select a batch, confirm the quantity, and complete the sale.</p></div><div className="live-label"><span className="status-dot" /> Live inventory</div></div>
      {message && <div className="inline-message success" role="status">{message}</div>}
      {error && <div className="inline-message error" role="alert">{error}</div>}
      <div className="billing-layout">
        <section className="panel selection-panel"><div className="panel-heading"><div><p className="eyebrow">Add items</p><h2>Choose medicine</h2></div><span className="step-number">01</span></div><form onSubmit={addToBill} className="billing-form"><label>Medicine batch<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">Select a sellable batch</option>{sellable.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.medicineName} {medicine.strength} · {medicine.batchNumber} · {medicine.quantity} available</option>)}</select></label>{selected && <div className="selected-preview"><div className="medicine-avatar large">{selected.medicineName.slice(0, 1)}</div><div><strong>{selected.medicineName} <small>{selected.strength}</small></strong><span>Batch {selected.batchNumber}</span><span>{money(selected.sellingPrice)} per {selected.unit}</span></div><span className="stock-chip">{selected.quantity} left</span></div>}<label>Quantity<input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label><button type="submit" className="button secondary full-width">Add to bill <span aria-hidden="true">+</span></button></form><div className="billing-note"><span>i</span><p>Expired and returned batches are automatically excluded from sale.</p></div></section>
        <section className="panel bill-panel"><div className="panel-heading"><div><p className="eyebrow">Current bill</p><h2>Order summary</h2></div><span className="step-number">02</span></div>{cart.length ? <div className="cart-list">{cart.map((item) => <div className="cart-row" key={item.medicineId}><div><strong>{item.medicineName} <small>{item.strength}</small></strong><span>Batch {item.batchNumber} · {item.quantity} units</span></div><strong>{money(item.quantity * item.unitPrice)}</strong></div>)}</div> : <div className="empty-state bill-empty"><span className="empty-icon">+</span><strong>Your bill is empty</strong><p>Choose a medicine on the left to get started.</p></div>}<div className="bill-total"><span>Total <small>{cartQuantity} units</small></span><strong>{money(total)}</strong></div><button type="button" className="button primary full-width complete-button" onClick={finishSale} disabled={busy || !cart.length}>{busy ? 'Completing sale...' : 'Complete sale'} <span aria-hidden="true">→</span></button></section>
      </div>
    </div>
  )
}
