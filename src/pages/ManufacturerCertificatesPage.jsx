import { downloadDestructionCertificate } from '../services/certificatePdf'

function issuedLabel(value) {
  if (!value?.toDate) return 'Recently issued'
  return value.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ManufacturerCertificatesPage({ certificates, navigate }) {
  const demoCertificate = { id: 'demo-static-certificate', certificateNumber: 'PL-COMP-2026-001', medicineName: 'Demo Medicine 500 mg', batchNumber: 'DEMO-BATCH-001', quantityDestroyed: 100, issuedAt: new Date('2026-09-11T00:00:00'), status: 'DESTROYED' }
  const visibleCertificates = certificates.length ? certificates : [demoCertificate]
  return <div className="page-stack manufacturer-page"><div className="page-heading"><div><p className="eyebrow">Traceability records</p><h1>Destruction certificates</h1><p className="page-subtitle">PharmaLoop-generated records for completed disposal workflows.</p></div></div><section className="panel manufacturer-table-panel"><div className="panel-heading"><div><p className="eyebrow">Completed disposal</p><h2>Certificates</h2></div><span className="count-pill">{visibleCertificates.length} {visibleCertificates.length === 1 ? 'certificate' : 'certificates'}</span></div><div className="table-wrap"><table className="manufacturer-workflow-table"><thead><tr><th>Certificate</th><th>Medicine</th><th>Batch</th><th>Quantity destroyed</th><th>Issued</th><th>Status</th><th>Action</th></tr></thead><tbody>{visibleCertificates.map((certificate) => <tr key={certificate.id}><td><strong>{certificate.certificateNumber}</strong></td><td><strong>{certificate.medicineName}</strong></td><td><code>{certificate.batchNumber}</code></td><td><strong>{certificate.quantityDestroyed}</strong><small>units</small></td><td><small>{issuedLabel(certificate.issuedAt)}</small></td><td><span className="manufacturer-status status-destroyed">{certificate.status}</span></td><td>{certificate.id === 'demo-static-certificate' ? <button type="button" className="table-action distributor-action" onClick={() => downloadDestructionCertificate(certificate)}>Download certificate</button> : <button type="button" className="table-action distributor-action" onClick={() => navigate(`/manufacturer/certificates/${certificate.id}`)}>View certificate</button>}</td></tr>)}</tbody></table></div></section></div>
}
