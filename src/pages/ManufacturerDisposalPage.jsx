const disposalStatuses = ['ACCEPTED_FOR_DISPOSAL', 'DISPOSAL_SCHEDULED', 'DISPOSAL_IN_PROGRESS', 'AFTER_DISPOSAL_EVIDENCE_CAPTURED', 'DISPOSAL_COMPLETED', 'DESTROYED']
const statusLabels = { ACCEPTED_FOR_DISPOSAL: 'Accepted for disposal', DISPOSAL_SCHEDULED: 'Disposal scheduled', DISPOSAL_IN_PROGRESS: 'Disposal in progress', AFTER_DISPOSAL_EVIDENCE_CAPTURED: 'After evidence captured', DISPOSAL_COMPLETED: 'Disposal completed', DESTROYED: 'Destroyed' }

function dateLabel(value) {
  if (!value) return 'Not scheduled'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ManufacturerDisposalPage({ disposals, navigate }) {
  const workflows = (disposals || []).filter((item) => disposalStatuses.includes(item.status))
  return <div className="page-stack manufacturer-page"><div className="page-heading"><div><p className="eyebrow">Authorized disposal</p><h1>Disposal</h1><p className="page-subtitle">Manage scheduled destruction, live evidence, and completed disposal workflows.</p></div></div><section className="panel manufacturer-table-panel"><div className="panel-heading"><div><p className="eyebrow">Operational queue</p><h2>Disposal workflows</h2></div><span className="count-pill">{workflows.length} {workflows.length === 1 ? 'workflow' : 'workflows'}</span></div><div className="table-wrap"><table className="manufacturer-workflow-table"><thead><tr><th>Batch</th><th>Medicine</th><th>Quantity</th><th>Waste facility</th><th>Schedule</th><th>Status</th><th>Action</th></tr></thead><tbody>{workflows.map((item) => <tr key={item.id}><td><code>{item.batchNumber}</code></td><td><strong>{item.medicineName}</strong><small>{item.strength || ''}</small></td><td><strong>{item.quantity}</strong><small>units</small></td><td><small>{item.wasteFacilityName || 'Not selected'}</small></td><td><small>{dateLabel(item.disposalScheduledAt || item.scheduledAt)}</small></td><td><span className={`manufacturer-status status-${(item.status || '').toLowerCase()}`}>{statusLabels[item.status] || item.status?.replaceAll('_', ' ')}</span></td><td><button type="button" className="table-action distributor-action" onClick={() => navigate(`/manufacturer/returns/${item.returnId}`)}>Open workflow</button></td></tr>)}</tbody></table>{!workflows.length && <div className="empty-state"><strong>No disposal workflows yet</strong><p>Manufacturer-accepted returns will appear here when disposal begins.</p></div>}</div></section></div>
}
