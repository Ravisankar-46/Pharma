export async function downloadDestructionCertificate(certificate) {
  const response = await fetch('/certificates/PharmaLoop_Layer4_Compliance_Certificate.pdf')
  if (!response.ok) throw new Error('Certificate PDF is unavailable.')
  const blob = await response.blob()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `PharmaLoop_Layer4_Compliance_Certificate_${certificate?.certificateNumber || 'Demo'}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
}
