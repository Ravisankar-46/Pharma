import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { syncPublicShop } from '../services/pharmacyService'
import './PublicMedicine.css'

function safeFileName(value) { return String(value || 'Shop').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') }

export default function PublicQrPage({ profile, medicines }) {
  const qrRef = useRef(null)
  const [publicShopId, setPublicShopId] = useState(profile.publicShopId || `SHOP-${profile.pharmacyId}`)
  const [error, setError] = useState('')
  const shopName = profile.shopName || profile.pharmacyName || 'Greenleaf Pharmacy'
  const shopAddress = profile.shopAddress || profile.address || '12 Garden Road, Chennai'
  const publicUrl = useMemo(() => `${window.location.origin}/public/shop/${publicShopId}`, [publicShopId])
  useEffect(() => { syncPublicShop({ profile, medicines }).then(setPublicShopId).catch(() => setError('Public QR could not be synced. Please try again.')) }, [profile, medicines])
  function download() {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `PharmaLoop_${safeFileName(shopName)}_QR.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
  return <div className="page-stack public-qr-page"><div className="page-heading"><div><p className="eyebrow">Layer 5 · Public medicine transparency</p><h1>Public Medicine QR</h1><p className="page-subtitle">Let customers check medicine availability and expiry information directly from your shop.</p></div></div>{error && <div className="inline-message error" role="alert">{error}</div>}<section className="public-qr-layout"><div className="panel qr-card"><p className="eyebrow">Your shop QR</p><div className="qr-frame" ref={qrRef}><QRCodeCanvas value={publicUrl} size={250} level="M" includeMargin /></div><strong>Scan this QR code to view public medicine information.</strong><div className="qr-actions"><button type="button" className="button primary" onClick={download}>Download QR</button><button type="button" className="button secondary" onClick={() => window.print()}>Print QR</button></div></div><div className="panel qr-details"><p className="eyebrow">Public shop profile</p><h2>{shopName}</h2><p>{shopAddress}</p><dl><dt>Public URL</dt><dd>{publicUrl}</dd><dt>Public shop ID</dt><dd>{publicShopId}</dd><dt>Inventory records</dt><dd>{medicines.length} batches</dd></dl><small>Only safe medicine availability and expiry information is shared publicly.</small></div></section></div>
}
