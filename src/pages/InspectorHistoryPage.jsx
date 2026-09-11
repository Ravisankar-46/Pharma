import { DEMO_COMPLIANCE_BATCH } from '../services/pharmacyService'
import './Inspector.css'

const history = [
  ['Manufactured', '10 Jun 2026 · 09:10', 'MediCore Pharmaceuticals', 'Chennai, Tamil Nadu', 'SAFE'],
  ['Dispatched', '18 Jun 2026 · 14:20', 'Distributor', 'Chennai, Tamil Nadu', 'VERIFIED'],
  ['Delivered', '22 Jun 2026 · 11:05', 'CityCare Pharmacy', 'Chennai, Tamil Nadu', 'VERIFIED'],
  ['Return Registered', '15 Aug 2026 · 16:40', 'Reverse-chain process', 'CityCare Pharmacy', 'RESTRICTED'],
  ['Batch Flagged', '15 Aug 2026 · 16:42', 'Compliance event', 'CityCare Pharmacy', 'FLAGGED'],
  ['Previously Processed', '20 Aug 2026 · 10:15', 'Reverse-chain system', 'Manufacturer review', 'QUARANTINED'],
  ['Detected Again', '11 Sep 2026 · 10:42', 'Sri Lakshmi Medicals', 'Chennai, Tamil Nadu', 'ALERT'],
  ['Drug Inspector Alert', '11 Sep 2026 · 10:42', 'System', 'Tamil Nadu Drug Control', 'ACTION REQUIRED'],
]
function Badge({ value }) { return <span className={`inspector-badge ${String(value).toLowerCase().replaceAll(' ', '-')}`}>{value}</span> }
export default function InspectorHistoryPage({ audit }) { return <div className="page-stack inspector-page"><div className="page-heading"><div><p className="eyebrow">Drug Inspector Workspace</p><h1>Complete Batch History</h1><p className="page-subtitle">Full traceability for {DEMO_COMPLIANCE_BATCH.batchNumber}, including every reverse-chain and compliance event.</p></div></div><section className="panel inspector-history"><div className="panel-heading"><div><p className="eyebrow">Batch traceability</p><h2>{DEMO_COMPLIANCE_BATCH.batchNumber} · {DEMO_COMPLIANCE_BATCH.product}</h2></div><Badge value="FLAGGED" /></div><div className="timeline">{history.map(([event, time, organization, location, status]) => <div className="timeline-item" key={event}><i /><div><strong>{event}</strong><span>{time} · {organization} · {location}</span></div><Badge value={status} /></div>)}</div></section><section className="panel inspector-audit"><div className="panel-heading"><div><p className="eyebrow">Immutable system record</p><h2>Audit Trail</h2></div></div>{audit.length ? audit.map((item) => <div className="audit-row" key={item.id}><strong>{item.event}</strong><span>{item.batchNumber || DEMO_COMPLIANCE_BATCH.batchNumber} · {item.shopName || DEMO_COMPLIANCE_BATCH.currentShop} · System</span></div>) : <div className="audit-row"><strong>Batch Re-entry Detected</strong><span>11 Sep 2026, 10:42 AM · Drug Inspector Alert Created</span></div>}</section></div> }
