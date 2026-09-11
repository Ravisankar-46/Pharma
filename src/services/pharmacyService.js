import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, db } from '../firebase'

export const DEMO_ACCOUNT = {
  email: 'demo@pharmacy.com',
  password: 'demo1234',
}

export const DEMO_DISTRIBUTOR_ACCOUNT = {
  email: 'demo@distributor.com',
  password: 'demo1234',
}

export const DEMO_MANUFACTURER_ACCOUNT = {
  email: 'demo@manufacturer.com',
  password: 'demo1234',
}

export const DEMO_INSPECTOR_ACCOUNT = {
  email: 'demo@inspector.com',
  password: 'demo1234',
}

export const DEMO_DISTRIBUTOR = {
  id: 'DIST_DEMO_001',
  name: 'Apollo Distribution Hub',
}

export const DEMO_MANUFACTURER = {
  id: 'MANUFACTURER_DEMO_001',
  name: 'ABC Pharma',
  authorizedPerson: 'Manufacturer operations team',
  address: '24 Industrial Estate, Chennai',
}

export const DEMO_WASTE_FACILITY = {
  id: 'BW-2026-001',
  name: 'ABC Biomedical Waste Management',
  authorizationStatus: 'VALID',
}

export const DEMO_PHARMACY = {
  id: 'PHARMACY_DEMO_001',
  name: 'Greenleaf Pharmacy',
  ownerName: 'Pharmacy team',
  phone: '+91 90000 00000',
  address: '12 Garden Road, Chennai',
}

export const DEMO_COMPLIANCE_BATCH = {
  product: 'Amoxicillin 500mg',
  batchNumber: 'AMX2026B04',
  manufacturer: 'MediCore Pharmaceuticals',
  previousLocation: 'CityCare Pharmacy',
  currentShop: 'Sri Lakshmi Medicals',
  shopLocation: 'Chennai, Tamil Nadu',
  quantity: 24,
  risk: 'HIGH',
}

const medicinesCollection = collection(db, 'medicines')

function dateWithOffset(days) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function getExpiryStatus(expiryDate) {
  const daysRemaining = getDaysRemaining(expiryDate)

  if (daysRemaining <= 0) return 'EXPIRED'
  if (daysRemaining <= 30) return 'RETURN_ELIGIBLE'
  if (daysRemaining <= 60) return 'NEAR_EXPIRY'
  return 'NORMAL'
}

export function getDaysRemaining(expiryDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(`${expiryDate}T00:00:00`)
  return Math.ceil((expiry - today) / 86400000)
}

export function isReturnEligible(medicine, activeReturnIds = new Set()) {
  return Number(medicine.quantity) > 0
    && !activeReturnIds.has(medicine.id)
    && medicine.returnStatus !== 'RETURN_REQUESTED'
}

export function getExpiryLabel(expiryDate) {
  const days = getDaysRemaining(expiryDate)
  if (days <= 0) return `Expired ${Math.abs(days)} days ago`
  return `Expires in ${days} days`
}

export function getFriendlyAuthError(error) {
  const code = error?.code || ''
  if (code.includes('invalid-credential') || code.includes('wrong-password')) {
    return 'Invalid email or password. Please try again.'
  }
  if (code.includes('user-not-found')) {
    return 'No account was found for this email.'
  }
  if (code.includes('email-already-in-use')) {
    return 'That email already has an account. Try signing in.'
  }
  if (code.includes('weak-password')) {
    return 'Choose a password with at least 6 characters.'
  }
  if (code.includes('invalid-email')) return 'Enter a valid email address.'
  return 'Something went wrong. Please try again.'
}

export async function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email.trim(), password)
}

export async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? snapshot.data() : null
}

export async function createDemoAccount() {
  return createUserWithEmailAndPassword(
    auth,
    DEMO_ACCOUNT.email,
    DEMO_ACCOUNT.password,
  )
}

export async function createDemoDistributorAccount() {
  const credential = await createUserWithEmailAndPassword(
    auth,
    DEMO_DISTRIBUTOR_ACCOUNT.email,
    DEMO_DISTRIBUTOR_ACCOUNT.password,
  )
  await setDoc(doc(db, 'users', credential.user.uid), {
    uid: credential.user.uid,
    name: 'Distributor operations team',
    email: credential.user.email,
    role: 'DISTRIBUTOR',
    distributorId: DEMO_DISTRIBUTOR.id,
    distributorName: DEMO_DISTRIBUTOR.name,
    createdAt: serverTimestamp(),
  }, { merge: true })
  return credential
}

export async function createDemoManufacturerAccount() {
  const credential = await createUserWithEmailAndPassword(auth, DEMO_MANUFACTURER_ACCOUNT.email, DEMO_MANUFACTURER_ACCOUNT.password)
  await setDoc(doc(db, 'users', credential.user.uid), { uid: credential.user.uid, name: DEMO_MANUFACTURER.authorizedPerson, email: credential.user.email, role: 'MANUFACTURER', manufacturerId: DEMO_MANUFACTURER.id, manufacturerName: DEMO_MANUFACTURER.name, address: DEMO_MANUFACTURER.address, createdAt: serverTimestamp() }, { merge: true })
  return credential
}

export async function createDemoInspectorAccount() {
  const credential = await createUserWithEmailAndPassword(auth, DEMO_INSPECTOR_ACCOUNT.email, DEMO_INSPECTOR_ACCOUNT.password)
  await setDoc(doc(db, 'users', credential.user.uid), { uid: credential.user.uid, name: 'Drug Inspector', email: credential.user.email, role: 'INSPECTOR', inspectorName: 'Drug Inspector', inspectorOrganization: 'Tamil Nadu Drug Control', createdAt: serverTimestamp() }, { merge: true })
  return credential
}

export async function logOut() {
  return signOut(auth)
}

export async function ensureUserProfile(user) {
  const existingSnapshot = await getDoc(doc(db, 'users', user.uid))
  const existing = existingSnapshot.exists() ? existingSnapshot.data() : {}
  const profile = {
    uid: user.uid,
    name: user.displayName || 'Pharmacy team',
    email: user.email || '',
    role: existing.role || 'PHARMACY',
    pharmacyId: DEMO_PHARMACY.id,
    pharmacyName: DEMO_PHARMACY.name,
    shopName: existing.shopName || DEMO_PHARMACY.name,
    shopAddress: existing.shopAddress || existing.address || DEMO_PHARMACY.address,
    publicShopId: existing.publicShopId || `SHOP-${DEMO_PHARMACY.id}`,
    publicQrEnabled: existing.publicQrEnabled !== false,
    ownerName: existing.ownerName || DEMO_PHARMACY.ownerName,
    phone: existing.phone || DEMO_PHARMACY.phone,
    address: existing.address || DEMO_PHARMACY.address,
    createdAt: serverTimestamp(),
  }
  if (existing.role === 'DISTRIBUTOR') {
    profile.name = existing.name || 'Distributor operations team'
    profile.distributorId = existing.distributorId || DEMO_DISTRIBUTOR.id
    profile.distributorName = existing.distributorName || DEMO_DISTRIBUTOR.name
    delete profile.pharmacyId
    delete profile.pharmacyName
  }
  if (existing.role === 'MANUFACTURER') {
    profile.name = existing.name || DEMO_MANUFACTURER.authorizedPerson
    profile.manufacturerId = existing.manufacturerId || DEMO_MANUFACTURER.id
    profile.manufacturerName = existing.manufacturerName || DEMO_MANUFACTURER.name
    profile.address = existing.address || DEMO_MANUFACTURER.address
    delete profile.pharmacyId
    delete profile.pharmacyName
  }
  if (existing.role === 'INSPECTOR') {
    profile.name = existing.name || 'Drug Inspector'
    profile.inspectorName = existing.inspectorName || 'Drug Inspector'
    profile.inspectorOrganization = existing.inspectorOrganization || 'Tamil Nadu Drug Control'
    delete profile.pharmacyId
    delete profile.pharmacyName
    delete profile.shopName
    delete profile.ownerName
  }
  await setDoc(doc(db, 'users', user.uid), profile, { merge: true })
  return profile
}

export function subscribeToComplianceAlerts(onData, onError) {
  return onSnapshot(collection(db, 'complianceAlerts'), (snapshot) => {
    onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort((first, second) => (second.detectedAt?.seconds || 0) - (first.detectedAt?.seconds || 0)))
  }, onError)
}

export function subscribeToComplianceAudit(onData, onError) {
  return onSnapshot(collection(db, 'complianceAudit'), (snapshot) => {
    onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort((first, second) => (second.timestamp?.seconds || 0) - (first.timestamp?.seconds || 0)))
  }, onError)
}

export async function checkBatchCompliance(batchNumber, shopId = 'SRI_LAKSHMI_MEDICALS', user = null) {
  const normalizedBatch = String(batchNumber || '').trim().toUpperCase()
  if (normalizedBatch !== DEMO_COMPLIANCE_BATCH.batchNumber) {
    return { status: 'SAFE', batchNumber: normalizedBatch, product: 'Unknown batch', manufacturer: 'Not found' }
  }

  const detectedAt = new Date()
  const alert = {
    alertId: `AL-${Date.now().toString().slice(-4)}`,
    batchNumber: DEMO_COMPLIANCE_BATCH.batchNumber,
    product: DEMO_COMPLIANCE_BATCH.product,
    manufacturer: DEMO_COMPLIANCE_BATCH.manufacturer,
    shopId,
    shopName: DEMO_COMPLIANCE_BATCH.currentShop,
    shopLocation: DEMO_COMPLIANCE_BATCH.shopLocation,
    quantity: DEMO_COMPLIANCE_BATCH.quantity,
    previousLocation: DEMO_COMPLIANCE_BATCH.previousLocation,
    previousEvent: 'Returned / Flagged',
    currentEvent: 'Detected for Sale',
    reason: 'Batch Re-entry',
    risk: DEMO_COMPLIANCE_BATCH.risk,
    status: 'OPEN',
    detectedAt,
    detectedBy: 'System',
    createdBy: user?.uid || 'system',
  }
  const alertRef = await addDoc(collection(db, 'complianceAlerts'), alert)
  await addDoc(collection(db, 'complianceAudit'), { event: 'Batch Re-entry Detected', batchNumber: alert.batchNumber, shopName: alert.shopName, timestamp: serverTimestamp(), detectedBy: 'System', action: 'Drug Inspector Alert Created', alertId: alertRef.id })
  return { status: 'FLAGGED', id: alertRef.id, ...alert }
}

export async function updateComplianceAlert(alertId, status, user) {
  await updateDoc(doc(db, 'complianceAlerts', alertId), { status, updatedAt: serverTimestamp(), updatedBy: user?.uid || 'inspector' })
  await addDoc(collection(db, 'complianceAudit'), { event: `Compliance Alert ${status}`, alertId, timestamp: serverTimestamp(), detectedBy: user?.uid || 'inspector', action: `Alert marked ${status.toLowerCase()}` })
}

export function subscribeToMedicines(pharmacyId, onData, onError) {
  const medicineQuery = query(medicinesCollection, where('pharmacyId', '==', pharmacyId))
  return onSnapshot(
    medicineQuery,
    (snapshot) => {
      const medicines = snapshot.docs
        .map((medicine) => ({ id: medicine.id, ...medicine.data() }))
        .sort((first, second) => first.medicineName.localeCompare(second.medicineName))
      onData(medicines)
    },
    onError,
  )
}

export function subscribeToPublicShop(publicShopId, onData, onError) {
  const shopRef = doc(db, 'publicShops', publicShopId)
  const medicineQuery = collection(db, 'publicShops', publicShopId, 'medicines')
  let shop = null
  let medicines = []
  let shopReady = false
  let medicinesReady = false
  function publish() {
    if (shopReady && medicinesReady) onData({ shop, medicines })
  }
  const unsubscribeShop = onSnapshot(shopRef, (snapshot) => {
    shop = snapshot.exists() ? snapshot.data() : null
    shopReady = true
    publish()
  }, onError)
  const unsubscribeMedicines = onSnapshot(medicineQuery, (snapshot) => {
    medicines = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    medicinesReady = true
    publish()
  }, onError)
  return () => { unsubscribeShop(); unsubscribeMedicines() }
}

export async function syncPublicShop({ profile, medicines }) {
  const publicShopId = profile.publicShopId || `SHOP-${profile.pharmacyId}`
  const shopRef = doc(db, 'publicShops', publicShopId)
  await setDoc(shopRef, {
    publicShopId,
    shopName: profile.shopName || profile.pharmacyName || DEMO_PHARMACY.name,
    shopAddress: profile.shopAddress || profile.address || DEMO_PHARMACY.address,
    publicQrEnabled: profile.publicQrEnabled !== false,
    updatedAt: serverTimestamp(),
  }, { merge: true })
  const publicMedicineCollection = collection(db, 'publicShops', publicShopId, 'medicines')
  await Promise.all(medicines.map((medicine) => setDoc(doc(publicMedicineCollection, medicine.id), {
    medicineName: medicine.medicineName,
    strength: medicine.strength || '',
    batchNumber: medicine.batchNumber,
    expiryDate: medicine.expiryDate,
    quantity: Number(medicine.quantity || 0),
    availability: Number(medicine.quantity || 0) <= 0 ? 'OUT OF STOCK' : Number(medicine.quantity) <= 10 ? 'LOW STOCK' : 'AVAILABLE',
    updatedAt: medicine.updatedAt || serverTimestamp(),
  }, { merge: true })))
  return publicShopId
}

export function subscribeToReturns(pharmacyId, onData, onError) {
  const returnQuery = query(collection(db, 'returns'), where('pharmacyId', '==', pharmacyId))
  return onSnapshot(
    returnQuery,
    (snapshot) => {
      const returns = snapshot.docs
        .map((returnRequest) => ({ id: returnRequest.id, ...returnRequest.data() }))
        .sort((first, second) => (second.requestedAt?.seconds || 0) - (first.requestedAt?.seconds || 0))
      onData(returns)
    },
    onError,
  )
}

export function subscribeToDistributorReturns(onData, onError) {
  return onSnapshot(
    collection(db, 'returns'),
    (snapshot) => {
      const returns = snapshot.docs
        .map((returnRequest) => ({ id: returnRequest.id, ...returnRequest.data() }))
        .sort((first, second) => (second.requestedAt?.seconds || 0) - (first.requestedAt?.seconds || 0))
      onData(returns)
    },
    onError,
  )
}

export function subscribeToSales(pharmacyId, onData, onError) {
  const salesQuery = query(collection(db, 'sales'), where('pharmacyId', '==', pharmacyId))
  return onSnapshot(salesQuery, (snapshot) => {
    onData(snapshot.docs.map((sale) => ({ id: sale.id, ...sale.data() })))
  }, onError)
}

export async function addMedicine({ pharmacyId, ...medicine }) {
  const existing = await getDocs(query(medicinesCollection, where('pharmacyId', '==', pharmacyId)))
  const duplicate = existing.docs.some((item) => item.data().batchNumber.toLowerCase() === medicine.batchNumber.trim().toLowerCase())
  if (duplicate) throw new Error('A medicine with this batch number already exists.')

  return addDoc(medicinesCollection, {
    ...medicine,
    pharmacyId,
    medicineName: medicine.medicineName.trim(),
    batchNumber: medicine.batchNumber.trim(),
    quantity: Number(medicine.quantity),
    sellingPrice: Number(medicine.sellingPrice),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function seedDemoInventory(pharmacyId) {
  const existing = await getDocs(query(medicinesCollection, where('pharmacyId', '==', pharmacyId)))
  const existingReturns = await getDocs(query(collection(db, 'returns'), where('pharmacyId', '==', pharmacyId)))
  const existingByBatch = new Map(existing.docs.map((item) => [item.data().batchNumber, item]))
  const samples = [
    ['Amoxicillin', '500mg', 'AMX2026B04', 120, 'units', '2026-09-30', 8.5, 'MediCore Pharmaceuticals', '2-8 C'],
    ['Paracetamol', '500mg', 'PCM2026A12', 85, 'units', '2026-11-15', 2.0, 'MediCore Pharmaceuticals', '20-25 C'],
    ['Azithromycin', '250mg', 'AZM2026D03', 60, 'units', '2026-12-20', 12.0, 'MediCore Pharmaceuticals', '20-25 C'],
    ['Paracetamol', '500mg', 'PCM001', 50, 'tablets', dateWithOffset(120), 2.0, 'Medico Labs'],
    ['Amoxicillin', '500mg', 'AMX002', 36, 'capsules', dateWithOffset(42), 8.5, 'Northstar Labs'],
    ['Azithromycin', '250mg', 'AZI003', 28, 'tablets', dateWithOffset(18), 12.0, 'Cureline'],
    ['Cetirizine', '10mg', 'CET004', 64, 'tablets', dateWithOffset(240), 1.5, 'WellSpring'],
    ['Pantoprazole', '40mg', 'PAN005', 40, 'tablets', dateWithOffset(-4), 6.0, 'Medico Labs'],
    ['ORS Sachet', '21g', 'ORS006', 80, 'sachets', dateWithOffset(310), 4.0, 'HydraCare'],
    ['Metformin', '500mg', 'MET007', 45, 'tablets', dateWithOffset(55), 3.25, 'Northstar Labs'],
  ]
  let added = 0
  await Promise.all(samples.map(async ([medicineName, strength, batchNumber, quantity, unit, expiryDate, sellingPrice, manufacturerName, storageRequirement]) => {
    const existingMedicine = existingByBatch.get(batchNumber)
    const medicineRef = existingMedicine?.ref || doc(db, 'medicines', `demo-${pharmacyId}-${batchNumber}`)
    if (existingMedicine) {
      if (!existingMedicine.data().isDemo || (existingMedicine.data().returnStatus !== 'RETURN_REQUESTED' && existingMedicine.data().returnStatus !== 'AVAILABLE')) {
        await updateDoc(medicineRef, { medicineName, strength, quantity, unit, expiryDate, sellingPrice, manufacturerName, storageRequirement: storageRequirement || existingMedicine.data().storageRequirement || 'Store as labelled', isDemo: true, returnStatus: batchNumber === 'PAN005' ? 'AVAILABLE' : existingMedicine.data().returnStatus, updatedAt: serverTimestamp() })
      }
      return
    }
    await setDoc(medicineRef, { pharmacyId, medicineName, strength, batchNumber, quantity, unit, expiryDate, sellingPrice, manufacturerName, storageRequirement: storageRequirement || 'Store as labelled', isDemo: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    added += 1
  }))
  const legacyAutomaticReturn = existingReturns.docs.find((item) => item.data().batchNumber === 'AZI003')
  if (legacyAutomaticReturn) {
    await updateDoc(legacyAutomaticReturn.ref, { status: 'RETURN_REQUESTED', source: 'AUTO_EXPIRY', autoTriggered: true, triggerDaysRemaining: 5, expiryDate: dateWithOffset(5), reason: 'Expired', notes: 'Automatic expiry escalation at 5 days remaining.' })
  }
  return added
}

export async function resetDemoData({ pharmacyId = DEMO_PHARMACY.id } = {}) {
  if (!import.meta.env.DEV) throw new Error('Demo reset is available only in development builds.')
  const demoBatches = {
    PAN005: { medicineName: 'Pantoprazole', strength: '40mg', quantity: 10, source: 'MANUAL', autoTriggered: false, triggerDaysRemaining: null, reason: 'Approaching expiry' },
    AZI003: { medicineName: 'Azithromycin', strength: '250mg', quantity: 28, source: 'AUTO_EXPIRY', autoTriggered: true, triggerDaysRemaining: 5, reason: 'Expired' },
  }
  const [medicineSnapshot, returnSnapshot, disposalSnapshot, certificateSnapshot, eventSnapshot] = await Promise.all([
    getDocs(query(medicinesCollection, where('pharmacyId', '==', pharmacyId))),
    getDocs(query(collection(db, 'returns'), where('pharmacyId', '==', pharmacyId))),
    getDocs(collection(db, 'disposals')),
    getDocs(collection(db, 'certificates')),
    getDocs(collection(db, 'events')),
  ])
  const medicines = new Map(medicineSnapshot.docs.filter((item) => demoBatches[item.data().batchNumber]).map((item) => [item.data().batchNumber, item]))
  const returns = returnSnapshot.docs.filter((item) => demoBatches[item.data().batchNumber])
  const returnIds = new Set(returns.map((item) => item.id))
  const downstream = [
    ...disposalSnapshot.docs.filter((item) => returnIds.has(item.data().returnId) || item.data().isDemo === true),
    ...certificateSnapshot.docs.filter((item) => returnIds.has(item.data().returnId) || item.data().isDemo === true),
  ]
  const demoEvents = eventSnapshot.docs.filter((item) => returnIds.has(item.data().returnId) || item.data().isDemo === true)
  await Promise.all([...downstream, ...demoEvents].map((item) => deleteDoc(item.ref)))
  await Promise.all(Object.entries(demoBatches).map(async ([batchNumber, demo]) => {
    const medicine = medicines.get(batchNumber)
    const medicineRef = medicine?.ref || doc(db, 'medicines', `demo-${pharmacyId}-${batchNumber}`)
    await setDoc(medicineRef, { pharmacyId, medicineName: demo.medicineName, strength: demo.strength, batchNumber, quantity: 0, returnedQuantity: demo.quantity, unit: 'tablets', expiryDate: dateWithOffset(demo.triggerDaysRemaining || 28), sellingPrice: batchNumber === 'PAN005' ? 6 : 12, manufacturerName: batchNumber === 'PAN005' ? 'Medico Labs' : 'Cureline', isDemo: true, returnStatus: 'RETURN_REQUESTED', updatedAt: serverTimestamp() }, { merge: true })
    const returnRef = returns.find((item) => item.data().batchNumber === batchNumber)?.ref || doc(collection(db, 'returns'))
    await setDoc(returnRef, { isDemo: true, pharmacyId, medicineId: medicineRef.id, medicineName: demo.medicineName, strength: demo.strength, batchNumber, quantity: demo.quantity, expectedQuantity: demo.quantity, condition: 'Sealed', reason: demo.reason, notes: demo.source === 'AUTO_EXPIRY' ? 'Automatic expiry escalation at 5 days remaining.' : 'Demo manual return waiting for distributor collection.', status: 'RETURN_REQUESTED', source: demo.source, autoTriggered: demo.autoTriggered, triggerDaysRemaining: demo.triggerDaysRemaining, expiryDate: dateWithOffset(demo.triggerDaysRemaining || 28), requestedAt: serverTimestamp(), requestedBy: 'demo-reset', distributorId: DEMO_DISTRIBUTOR.id, verificationStatus: 'PENDING', handoverVerificationStatus: null, handoverOtpHash: null, handoverOtpDemo: null, handoverOtpCreatedAt: null, handoverOtpExpiresAt: null, handoverOtpAttemptCount: 0, handoverOtpVerifiedAt: null, handoverVerified: false, handoverVerifiedBy: null, pickupScheduledAt: null, pickupDate: null, pickupTimeWindow: null, pickupReference: null, distributorName: DEMO_DISTRIBUTOR.name, collectorName: null, collectorPhone: null, collectorRole: null, assignedPerson: null, pickupNotes: null, receivedBatchNumber: null, receivedQuantity: null, difference: null, verifiedAt: null, verifiedBy: null, receivedCondition: null, verificationNotes: null, manufacturerId: null, manufacturerName: null, manufacturerReceivedBatchNumber: null, manufacturerReceivedQuantity: null, manufacturerVerificationStatus: null, manufacturerReceivedCondition: null, manufacturerVerificationNotes: null, manufacturerVerifiedAt: null, manufacturerVerifiedBy: null, disposalStatus: null, disposalId: null, wasteFacilityId: null, wasteFacilityName: null, wasteFacilityAuthorizationStatus: null, disposalScheduledAt: null, disposalTimeWindow: null, disposalReference: null, disposalNotes: null, disposalRecordedAt: null, disposalRecordedBy: null, beforeDisposalEvidence: null, afterDisposalEvidence: null, disposalCompletedAt: null, certificateId: null, certificateNumber: null, batchStatus: null, disputeReason: null, disputeNotes: null, disputedAt: null, disputedBy: null }, { merge: true })
  }))
  return { batches: Object.keys(demoBatches), removedDownstreamRecords: downstream.length, removedDemoEvents: demoEvents.length }
}

export async function completeSale({ medicine, quantity, user, pharmacyId }) {
  const saleQuantity = Number(quantity)
  if (!Number.isInteger(saleQuantity) || saleQuantity <= 0) throw new Error('Enter a whole number greater than zero.')

  const medicineRef = doc(db, 'medicines', medicine.id)
  const saleRef = doc(collection(db, 'sales'))
  const eventRef = doc(collection(db, 'events'))

  await runTransaction(db, async (transaction) => {
    const currentSnapshot = await transaction.get(medicineRef)
    if (!currentSnapshot.exists()) throw new Error('This medicine batch no longer exists.')
    const current = currentSnapshot.data()
    if (getExpiryStatus(current.expiryDate) === 'EXPIRED') throw new Error('SALE BLOCKED — This medicine batch has expired.')
    if (current.returnStatus === 'RETURN_REQUESTED') throw new Error('This batch is already reserved for return.')
    if (saleQuantity > current.quantity) throw new Error(`Insufficient stock. Only ${current.quantity} units are available.`)

    const totalAmount = saleQuantity * Number(current.sellingPrice)
    transaction.update(medicineRef, {
      quantity: current.quantity - saleQuantity,
      updatedAt: serverTimestamp(),
    })
    transaction.set(saleRef, {
      pharmacyId,
      medicineId: medicine.id,
      medicineName: current.medicineName,
      strength: current.strength || '',
      batchNumber: current.batchNumber,
      quantity: saleQuantity,
      unitPrice: Number(current.sellingPrice),
      totalAmount,
      soldAt: serverTimestamp(),
      soldBy: user.uid,
      status: 'COMPLETED',
    })
    transaction.set(eventRef, {
      eventType: 'SALE_COMPLETED',
      pharmacyId,
      medicineId: medicine.id,
      batchNumber: current.batchNumber,
      quantity: saleQuantity,
      timestamp: serverTimestamp(),
      userId: user.uid,
    })
  })
}

export async function createReturnRequest({ medicine, quantity, condition, reason, notes, user, pharmacyId }) {
  const returnQuantity = Number(quantity)
  if (!Number.isInteger(returnQuantity) || returnQuantity <= 0) throw new Error('Return quantity must be a whole number greater than zero.')

  const medicineRef = doc(db, 'medicines', medicine.id)
  const returnRef = doc(collection(db, 'returns'))
  const eventRef = doc(collection(db, 'events'))
  const returnId = `RET-${Date.now().toString().slice(-5)}`
  await runTransaction(db, async (transaction) => {
    const currentSnapshot = await transaction.get(medicineRef)
    if (!currentSnapshot.exists()) throw new Error('This medicine batch no longer exists.')
    const current = currentSnapshot.data()
    if (current.returnStatus === 'RETURN_REQUESTED') throw new Error('Return already requested for this batch.')
    if (returnQuantity > current.quantity) throw new Error(`Only ${current.quantity} units are available for return.`)

    transaction.update(medicineRef, {
      quantity: current.quantity - returnQuantity,
      returnedQuantity: (current.returnedQuantity || 0) + returnQuantity,
      returnStatus: 'RETURN_REQUESTED',
      updatedAt: serverTimestamp(),
    })
    transaction.set(returnRef, {
      returnId,
      pharmacyId,
      medicineId: medicine.id,
      medicineName: current.medicineName,
      strength: current.strength || '',
      batchNumber: current.batchNumber,
      quantity: returnQuantity,
      condition,
      reason,
      notes: notes.trim(),
      status: 'RETURN_REQUESTED',
      source: 'MANUAL',
      autoTriggered: false,
      expiryDate: current.expiryDate,
      requestedAt: serverTimestamp(),
      requestedBy: user.uid,
      distributorId: null,
      isDemo: Boolean(medicine.isDemo),
    })
    transaction.set(eventRef, {
      eventType: 'RETURN_REQUESTED',
      source: 'MANUAL',
      returnId: returnRef.id,
      pharmacyId,
      medicineId: medicine.id,
      medicineName: current.medicineName,
      batchNumber: current.batchNumber,
      quantity: returnQuantity,
      actor: user.uid,
      timestamp: serverTimestamp(),
    })
  })
  return returnId
}

async function hashValue(value) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function createHandoverOtp() {
  return '123456'
}

export async function generateHandoverVerification({ returnRequest, user, pharmacyId, distributorId, profile }) {
  if (profile?.role !== 'DISTRIBUTOR') throw new Error('Only the Distributor can generate a handover OTP.')
  const returnRef = doc(db, 'returns', returnRequest.id)
  const eventRef = doc(collection(db, 'events'))
  const now = new Date()
  let generatedOtp = null
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(returnRef)
    if (!snapshot.exists()) throw new Error('Return request was not found.')
    const current = snapshot.data()
    if (profile?.role === 'DISTRIBUTOR') {
      if (current.distributorId !== distributorId) throw new Error('This return is not assigned to your distributor account.')
    } else if (current.pharmacyId !== pharmacyId) throw new Error('This return is not part of your pharmacy workspace.')
    if (current.status !== 'PICKUP_SCHEDULED') throw new Error('Generate a handover verification after pickup is scheduled.')
    if (current.handoverVerified) throw new Error('Handover verification is already complete.')
    const existingExpiry = current.handoverOtpExpiresAt?.toDate?.() || current.handoverOtpExpiresAt
    const staleDemoOtp = import.meta.env.DEV && current.handoverOtpDemo !== '123456'
    if (current.handoverOtpHash && existingExpiry && existingExpiry > now && !staleDemoOtp) throw new Error('A handover verification is already active. Ask the collector for the code.')
    generatedOtp = createHandoverOtp()
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000)
    const otpHash = await hashValue(generatedOtp)
    transaction.update(returnRef, {
      handoverVerificationStatus: 'WAITING_FOR_DISTRIBUTOR_CODE',
      handoverOtpHash: otpHash,
      handoverOtpCreatedAt: serverTimestamp(),
      handoverOtpExpiresAt: expiresAt,
      handoverOtpAttemptCount: 0,
      handoverVerified: false,
      lastOtpGeneratedAt: serverTimestamp(),
      handoverOtpGeneratedBy: user.uid,
      handoverOtpDemo: import.meta.env.DEV || current.isDemo || returnRequest.isDemo ? generatedOtp : null,
    })
    transaction.set(eventRef, {
      eventType: 'HANDOVER_VERIFICATION_GENERATED',
      returnId: returnRequest.id,
      pharmacyId: current.pharmacyId,
      distributorId: current.distributorId || null,
      medicineId: current.medicineId,
      medicineName: current.medicineName,
      batchNumber: current.batchNumber,
      generatedBy: user.uid,
      timestamp: serverTimestamp(),
    })
  })
  return generatedOtp
}

export async function verifyHandoverOtp({ returnRequest, otp, user, pharmacyId }) {
  const returnRef = doc(db, 'returns', returnRequest.id)
  const eventRef = doc(collection(db, 'events'))
  const normalizedOtp = String(otp || '').trim()
  if (!/^\d{6}$/.test(normalizedOtp)) throw new Error('Enter the 6-digit handover code.')
  let invalidCode = false
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(returnRef)
    if (!snapshot.exists()) throw new Error('Return request was not found.')
    const current = snapshot.data()
    if (current.pharmacyId !== pharmacyId) throw new Error('This return is not part of your pharmacy workspace.')
    if (!current.distributorId) throw new Error('A distributor must be assigned before handover verification.')
    if (!['PICKUP_SCHEDULED', 'HANDOVER_VERIFIED'].includes(current.status)) throw new Error('Handover verification is only available for scheduled pickups.')
    if (current.handoverVerified) throw new Error('Handover has already been verified.')
    if (!current.handoverOtpHash) throw new Error('Handover verification has not been initiated.')
    if (current.handoverOtpExpiresAt?.toDate?.() < new Date() || (current.handoverOtpExpiresAt instanceof Date && current.handoverOtpExpiresAt < new Date())) throw new Error('HANDOVER CODE EXPIRED')
    const legacyDemoOtp = import.meta.env.DEV
      && (current.isDemo || current.handoverOtpDemo)
      && normalizedOtp === '123456'
      && current.handoverOtpDemo !== '123456'
    const matches = legacyDemoOtp || await hashValue(normalizedOtp) === current.handoverOtpHash
    if (!matches) {
      const attemptCount = (current.handoverOtpAttemptCount || 0) + 1
      transaction.update(returnRef, { handoverOtpAttemptCount: attemptCount, ...(attemptCount >= 5 ? { handoverOtpHash: null, handoverOtpDemo: null, handoverOtpExpiresAt: null, handoverVerificationStatus: 'OTP_INVALIDATED' } : {}) })
      invalidCode = true
      return
    }
    transaction.update(returnRef, {
      status: 'HANDOVER_VERIFIED',
      handoverVerificationStatus: 'VERIFIED',
      handoverVerified: true,
      handoverOtpVerifiedAt: serverTimestamp(),
      otpVerifiedAt: serverTimestamp(),
      handoverVerifiedBy: user.uid,
      handoverOtpHash: null,
      handoverOtpDemo: null,
      handoverOtpExpiresAt: null,
      handoverOtpInvalidatedAt: serverTimestamp(),
    })
    transaction.set(eventRef, {
      eventType: 'HANDOVER_VERIFICATION_SUCCESS',
      returnId: returnRequest.id,
      pharmacyId: current.pharmacyId,
      distributorId: current.distributorId || null,
      batchNumber: current.batchNumber,
      verifiedBy: user.uid,
      timestamp: serverTimestamp(),
    })
  })
  if (invalidCode) throw new Error('INVALID HANDOVER CODE')
}

export async function getDistributorHandoverOtp() {
  throw new Error('Production Distributor code delivery requires a trusted backend. Demo returns use the demo-only handoverOtpDemo field.')
}

export async function runAutoExpiryEscalation({ pharmacyId, medicines, returns, user }) {
  const activeReturnIds = new Set(returns.filter((item) => item.status !== 'RECEIVED' && item.status !== 'DISPUTE').map((item) => item.medicineId))
  const candidates = medicines.filter((medicine) => getDaysRemaining(medicine.expiryDate) <= 5 && Number(medicine.quantity) > 0 && !activeReturnIds.has(medicine.id) && medicine.returnStatus !== 'RETURN_REQUESTED')
  let created = 0
  for (const medicine of candidates) {
    const medicineRef = doc(db, 'medicines', medicine.id)
    const returnRef = doc(collection(db, 'returns'))
    const eventRef = doc(collection(db, 'events'))
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(medicineRef)
      if (!snapshot.exists()) return
      const current = snapshot.data()
      if (getDaysRemaining(current.expiryDate) > 5 || current.returnStatus === 'RETURN_REQUESTED' || Number(current.quantity) <= 0) return
      transaction.update(medicineRef, { quantity: 0, returnedQuantity: (current.returnedQuantity || 0) + current.quantity, returnStatus: 'RETURN_REQUESTED', updatedAt: serverTimestamp() })
      transaction.set(returnRef, { pharmacyId, medicineId: medicine.id, medicineName: current.medicineName, strength: current.strength || '', batchNumber: current.batchNumber, expiryDate: current.expiryDate, quantity: current.quantity, condition: 'Sealed', reason: 'Expired', notes: 'Automatic expiry escalation at 5 days remaining.', status: 'RETURN_REQUESTED', source: 'AUTO_EXPIRY', autoTriggered: true, triggerDaysRemaining: 5, requestedAt: serverTimestamp(), requestedBy: user.uid, distributorId: null })
      transaction.set(eventRef, { eventType: 'RETURN_REQUESTED', source: 'AUTO_EXPIRY', autoTriggered: true, triggerDaysRemaining: 5, returnId: returnRef.id, pharmacyId, medicineId: medicine.id, medicineName: current.medicineName, batchNumber: current.batchNumber, quantity: current.quantity, actor: user.uid, timestamp: serverTimestamp() })
      created += 1
    })
  }
  return created
}

export async function assignPickup({ returnRequest, pickupDate, pickupTimeWindow, pickupReference, distributorName, collectorName, collectorPhone, collectorRole, assignedPerson, notes, user, distributorId }) {
  const returnRef = doc(db, 'returns', returnRequest.id)
  const eventRef = doc(collection(db, 'events'))
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(returnRef)
    if (!snapshot.exists()) throw new Error('Return request was not found.')
    const current = snapshot.data()
    if (current.status === 'RECEIVED') throw new Error('Return already received.')
    if (current.status === 'DISPUTE') throw new Error('Resolve the discrepancy before scheduling pickup.')
    if (current.status === 'PICKUP_SCHEDULED') return
    transaction.update(returnRef, {
      status: 'PICKUP_SCHEDULED',
      distributorId,
      distributorName: distributorName.trim(),
      pickupScheduledAt: pickupDate,
      pickupDate,
      pickupTimeWindow: pickupTimeWindow.trim(),
      pickupReference: pickupReference.trim(),
      collectorName: collectorName.trim(),
      collectorPhone: collectorPhone.trim(),
      collectorRole: collectorRole.trim(),
      assignedPerson: assignedPerson.trim(),
      pickupNotes: notes.trim(),
      pickupAssignedBy: user.uid,
      updatedAt: serverTimestamp(),
    })
    transaction.set(eventRef, {
      eventType: 'PICKUP_SCHEDULED',
      returnId: returnRequest.id,
      pharmacyId: current.pharmacyId,
      distributorId,
      medicineId: current.medicineId,
      medicineName: current.medicineName,
      batchNumber: current.batchNumber,
      quantity: current.quantity,
      pickupDate,
      pickupReference: pickupReference.trim(),
      collectorName: collectorName.trim(),
      timestamp: serverTimestamp(),
    })
  })
}

export async function verifyReturnReceipt({ returnRequest, receivedBatchNumber, receivedQuantity, condition, verificationNotes, user, distributorId }) {
  const receivedQuantityNumber = Number(receivedQuantity)
  if (!Number.isInteger(receivedQuantityNumber) || receivedQuantityNumber <= 0) {
    throw new Error('Received quantity must be a whole number greater than zero.')
  }
  const returnRef = doc(db, 'returns', returnRequest.id)
  const eventRef = doc(collection(db, 'events'))
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(returnRef)
    if (!snapshot.exists()) throw new Error('Return request was not found.')
    const current = snapshot.data()
    if (current.status === 'RECEIVED') throw new Error('Return already received.')
    if (current.status === 'DISPUTE') throw new Error('This return is already on hold as a dispute.')
    if (current.status === 'PICKUP_SCHEDULED' || (current.status === 'VERIFICATION_PENDING' && !current.handoverVerified)) throw new Error('HANDOVER VERIFICATION REQUIRED')
    const expectedQuantity = Number(current.quantity)
    const expectedBatchNumber = current.batchNumber
    const difference = receivedQuantityNumber - expectedQuantity
    const batchMatches = expectedBatchNumber === receivedBatchNumber.trim()
    if (!batchMatches || difference !== 0) throw new Error('Verification does not match. Flag the discrepancy instead.')
    transaction.update(returnRef, {
      status: 'RECEIVED',
      verificationStatus: 'VERIFIED',
      verifiedAt: serverTimestamp(),
      verifiedBy: user.uid,
      distributorId,
      receivedBatchNumber: receivedBatchNumber.trim(),
      receivedQuantity: receivedQuantityNumber,
      difference,
      receivedCondition: condition,
      verificationNotes: verificationNotes.trim(),
      otpVerifiedAt: current.handoverOtpHash ? serverTimestamp() : null,
    })
    transaction.set(eventRef, {
      eventType: 'DISTRIBUTOR_RECEIPT_CONFIRMED',
      returnId: returnRequest.id,
      pharmacyId: current.pharmacyId,
      distributorId,
      medicineId: current.medicineId,
      medicineName: current.medicineName,
      batchNumber: expectedBatchNumber,
      expectedQuantity,
      receivedQuantity: receivedQuantityNumber,
      verifiedBy: user.uid,
      timestamp: serverTimestamp(),
    })
  })
}

export async function flagReturnDispute({ returnRequest, receivedBatchNumber, receivedQuantity, disputeReason, disputeNotes, user, distributorId }) {
  const receivedQuantityNumber = Number(receivedQuantity)
  if (!Number.isInteger(receivedQuantityNumber) || receivedQuantityNumber <= 0) {
    throw new Error('Received quantity must be a whole number greater than zero.')
  }
  const returnRef = doc(db, 'returns', returnRequest.id)
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(returnRef)
    if (!snapshot.exists()) throw new Error('Return request was not found.')
    const current = snapshot.data()
    if (current.status === 'RECEIVED') throw new Error('Return already received.')
    if ((current.status === 'PICKUP_SCHEDULED' || current.status === 'VERIFICATION_PENDING') && !current.handoverVerified) throw new Error('HANDOVER VERIFICATION REQUIRED')
    const expectedQuantity = Number(current.quantity)
    transaction.update(returnRef, {
      status: 'DISPUTE',
      verificationStatus: 'DISPUTE',
      distributorId,
      receivedBatchNumber: receivedBatchNumber.trim(),
      receivedQuantity: receivedQuantityNumber,
      difference: receivedQuantityNumber - expectedQuantity,
      disputeReason: disputeReason.trim(),
      disputeNotes: disputeNotes.trim(),
      disputedAt: serverTimestamp(),
      disputedBy: user.uid,
    })
  })
}

export function subscribeToManufacturerReturns(onData, onError) {
  return onSnapshot(collection(db, 'returns'), (snapshot) => {
    const returns = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => ['RECEIVED', 'MANUFACTURER_VERIFICATION_PENDING', 'MANUFACTURER_RECEIVED', 'ACCEPTED_FOR_DISPOSAL', 'DISPOSAL_SCHEDULED', 'DISPOSAL_IN_PROGRESS', 'DISPOSAL_COMPLETED', 'DESTROYED'].includes(item.status))
    onData(returns.sort((first, second) => (second.requestedAt?.seconds || 0) - (first.requestedAt?.seconds || 0)))
  }, onError)
}

export function subscribeToDisposals(onData, onError) {
  return onSnapshot(collection(db, 'disposals'), (snapshot) => {
    const disposals = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      .sort((first, second) => (second.createdAt?.seconds || 0) - (first.createdAt?.seconds || 0))
    onData(disposals)
  }, onError)
}

function assertManufacturer(profile) {
  if (profile?.role !== 'MANUFACTURER') throw new Error('Manufacturer authorization is required.')
}

export async function verifyManufacturerReturn({ returnRequest, receivedBatchNumber, receivedQuantity, condition, notes, user, profile }) {
  assertManufacturer(profile)
  const returnRef = doc(db, 'returns', returnRequest.id)
  const eventRef = doc(collection(db, 'events'))
  const quantity = Number(receivedQuantity)
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Manufacturer quantity must be a whole number greater than zero.')
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(returnRef)
    if (!snapshot.exists()) throw new Error('Return request was not found.')
    const current = snapshot.data()
    if (current.status === 'DISPUTE') throw new Error('This return has a pending dispute and cannot be verified.')
    if (['DISPOSAL_COMPLETED', 'DESTROYED'].includes(current.status)) throw new Error('This return is already closed.')
    const batch = receivedBatchNumber.trim()
    const difference = quantity - Number(current.quantity)
    if (batch !== current.batchNumber || difference !== 0) throw new Error('Manufacturer batch or quantity verification failed. Flag a discrepancy.')
    transaction.update(returnRef, {
      status: 'RECEIVED',
      pharmacyDeclaredQuantity: Number(current.quantity),
      distributorReceivedQuantity: Number(current.receivedQuantity ?? current.quantity),
      manufacturerVerifiedQuantity: quantity,
      manufacturerId: profile.manufacturerId,
      manufacturerName: profile.manufacturerName,
      manufacturerReceivedBatchNumber: batch,
      manufacturerReceivedQuantity: quantity,
      manufacturerVerificationStatus: 'VERIFIED',
      manufacturerReceivedCondition: condition,
      manufacturerVerificationNotes: notes.trim(),
      manufacturerVerifiedAt: serverTimestamp(),
      manufacturerVerifiedBy: user.uid,
    })
    transaction.set(eventRef, {
      eventType: 'MANUFACTURER_RECEIPT_CONFIRMED',
      returnId: returnRequest.id,
      pharmacyId: current.pharmacyId,
      distributorId: current.distributorId,
      manufacturerId: profile.manufacturerId,
      batchNumber: batch,
      quantity,
      timestamp: serverTimestamp(),
      actor: user.uid,
    })
  })
}

export async function acceptForDisposal({ returnRequest, user, profile }) {
  assertManufacturer(profile)
  const returnRef = doc(db, 'returns', returnRequest.id)
  const eventRef = doc(collection(db, 'events'))
  const disposalQuery = query(collection(db, 'disposals'), where('returnId', '==', returnRequest.id))
  const existingDisposals = await getDocs(disposalQuery)
  const existingDisposal = existingDisposals.docs[0]

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(returnRef)
    if (!snapshot.exists()) throw new Error('Return request was not found.')
    const current = snapshot.data()
    if (['DISPOSAL_COMPLETED', 'DESTROYED'].includes(current.status)) throw new Error('This return is already closed.')
    const verifiedQuantity = Number(current.manufacturerVerifiedQuantity ?? current.manufacturerReceivedQuantity ?? current.receivedQuantity ?? current.quantity)
    const disposalId = existingDisposal?.id || current.disposalId || doc(collection(db, 'disposals')).id
    const disposalRef = existingDisposal ? doc(db, 'disposals', existingDisposal.id) : doc(db, 'disposals', disposalId)

    if (!existingDisposal && !current.disposalId) {
      transaction.set(disposalRef, {
        disposalId,
        returnId: returnRequest.id,
        medicineId: current.medicineId,
        medicineName: current.medicineName,
        batchNumber: current.batchNumber,
        quantity: verifiedQuantity,
        manufacturerId: profile.manufacturerId,
        wasteFacilityId: current.wasteFacilityId || null,
        wasteFacilityName: current.wasteFacilityName || 'Not selected',
        facilityAuthorization: current.facilityAuthorization || current.wasteFacilityAuthorizationStatus || 'WF-DEMO-001',
        status: 'ACCEPTED_FOR_DISPOSAL',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isDemo: Boolean(current.isDemo),
      })
    }

    transaction.update(returnRef, {
      status: 'ACCEPTED_FOR_DISPOSAL',
      acceptedForDisposal: true,
      acceptedForDisposalAt: current.acceptedForDisposalAt || serverTimestamp(),
      acceptedForDisposalBy: current.acceptedForDisposalBy || user.uid,
      manufacturerVerifiedQuantity: verifiedQuantity,
      disposalId,
    })

    transaction.set(eventRef, {
      eventType: 'MANUFACTURER_ACCEPTED_FOR_DISPOSAL',
      returnId: returnRequest.id,
      disposalId,
      manufacturerId: profile.manufacturerId,
      batchNumber: current.batchNumber,
      quantity: verifiedQuantity,
      timestamp: serverTimestamp(),
      actor: user.uid,
    })
  })
}

export async function flagManufacturerDispute({ returnRequest, receivedBatchNumber, receivedQuantity, reason, notes, user, profile }) {
  assertManufacturer(profile)
  const returnRef = doc(db, 'returns', returnRequest.id)
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(returnRef)
    if (!snapshot.exists()) throw new Error('Return request was not found.')
    const current = snapshot.data()
    if (['DISPOSAL_COMPLETED', 'DESTROYED'].includes(current.status)) throw new Error('This return is already closed.')
    transaction.update(returnRef, { status: 'DISPUTE', verificationStatus: 'DISPUTED', manufacturerId: profile.manufacturerId, manufacturerReceivedBatchNumber: receivedBatchNumber.trim(), manufacturerReceivedQuantity: Number(receivedQuantity), manufacturerDisputeReason: reason.trim(), manufacturerDisputeNotes: notes.trim(), manufacturerDisputedAt: serverTimestamp(), manufacturerDisputedBy: user.uid })
  })
}

export async function scheduleDisposal({ returnRequest, facility, disposalDate, disposalTimeWindow, disposalReference, notes, user, profile }) {
  assertManufacturer(profile)
  const returnRef = doc(db, 'returns', returnRequest.id)
  const eventRef = doc(collection(db, 'events'))
  const existingDisposalSnapshot = await getDocs(query(collection(db, 'disposals'), where('returnId', '==', returnRequest.id)))
  const existingDisposal = existingDisposalSnapshot.docs[0]

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(returnRef)
    if (!snapshot.exists()) throw new Error('Return request was not found.')
    const current = snapshot.data()
    if (current.status !== 'ACCEPTED_FOR_DISPOSAL') throw new Error('Accept the return before scheduling disposal.')
    const disposalId = current.disposalId || existingDisposal?.id || doc(collection(db, 'disposals')).id
    const disposalRef = current.disposalId || existingDisposal ? doc(db, 'disposals', disposalId) : doc(db, 'disposals', disposalId)
    const quantity = Number(current.manufacturerVerifiedQuantity ?? current.manufacturerReceivedQuantity ?? current.receivedQuantity ?? current.quantity)
    const disposalData = {
      returnId: returnRequest.id,
      disposalId,
      medicineId: current.medicineId,
      medicineName: current.medicineName,
      batchNumber: current.batchNumber,
      quantity,
      manufacturerId: profile.manufacturerId,
      wasteFacilityId: facility.id,
      wasteFacilityName: facility.name,
      facilityAuthorization: facility.authorizationStatus || facility.authorization || 'WF-DEMO-001',
      batchStatus: 'DISPOSAL_SCHEDULED',
      status: 'DISPOSAL_SCHEDULED',
      scheduledAt: disposalDate,
      disposalTimeWindow,
      disposalReference: disposalReference.trim(),
      notes: notes.trim(),
      createdAt: current.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    if (current.disposalId || existingDisposal) {
      transaction.update(disposalRef, disposalData)
    } else {
      transaction.set(disposalRef, disposalData)
    }
    transaction.update(returnRef, {
      status: 'DISPOSAL_SCHEDULED',
      disposalId,
      wasteFacilityId: facility.id,
      wasteFacilityName: facility.name,
      facilityAuthorization: facility.authorizationStatus || facility.authorization || 'WF-DEMO-001',
      disposalScheduledAt: disposalDate,
      disposalTimeWindow,
      disposalReference: disposalReference.trim(),
      disposalNotes: notes.trim(),
      manufacturerId: profile.manufacturerId,
      scheduledBy: user.uid,
      manufacturerVerifiedQuantity: quantity,
    })
    transaction.set(eventRef, { eventType: 'DISPOSAL_SCHEDULED', returnId: returnRequest.id, manufacturerId: profile.manufacturerId, wasteFacilityId: facility.id, batchNumber: current.batchNumber, quantity, disposalDate, disposalReference: disposalReference.trim(), timestamp: serverTimestamp(), actor: user.uid })
  })
}

export async function recordDisposalEvidence({ returnRequest, evidenceType, capturedAt, user, profile }) {
  assertManufacturer(profile)
  const returnRef = doc(db, 'returns', returnRequest.id)
  const eventRef = doc(collection(db, 'events'))
  const field = evidenceType === 'BEFORE_DISPOSAL' ? 'beforeDisposalEvidence' : 'afterDisposalEvidence'
  const eventType = evidenceType === 'BEFORE_DISPOSAL' ? 'BEFORE_DISPOSAL_EVIDENCE_CAPTURED' : 'AFTER_DISPOSAL_EVIDENCE_CAPTURED'
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(returnRef)
    if (!snapshot.exists()) throw new Error('Return request was not found.')
    const current = snapshot.data()
    if (!['DISPOSAL_SCHEDULED', 'DISPOSAL_IN_PROGRESS'].includes(current.status)) throw new Error('Disposal is not ready for evidence.')
    transaction.update(returnRef, { status: evidenceType === 'BEFORE_DISPOSAL' ? 'DISPOSAL_IN_PROGRESS' : 'AFTER_DISPOSAL_EVIDENCE_CAPTURED', [field]: { evidenceType, capturedAt, capturedBy: user.uid, localOnly: true } })
    transaction.set(eventRef, { eventType, returnId: returnRequest.id, manufacturerId: profile.manufacturerId, batchNumber: current.batchNumber, timestamp: serverTimestamp(), capturedBy: user.uid, localOnly: true })
  })
}

export async function recordPhysicalDisposal({ returnRequest, user, profile }) {
  assertManufacturer(profile)
  const returnRef = doc(db, 'returns', returnRequest.id)
  const eventRef = doc(collection(db, 'events'))
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(returnRef)
    if (!snapshot.exists()) throw new Error('Return request was not found.')
    const current = snapshot.data()
    if (current.status !== 'DISPOSAL_IN_PROGRESS' || !current.beforeDisposalEvidence) throw new Error('Capture before-disposal evidence before recording disposal.')
    if (current.disposalRecordedAt) return
    transaction.update(returnRef, { disposalRecordedAt: serverTimestamp(), disposalRecordedBy: user.uid })
    transaction.set(eventRef, { eventType: 'DISPOSAL_PROCESS_RECORDED', returnId: returnRequest.id, manufacturerId: profile.manufacturerId, batchNumber: current.batchNumber, timestamp: serverTimestamp(), actor: user.uid })
  })
}

export async function completeDisposal({ returnRequest, user, profile }) {
  assertManufacturer(profile)
  const returnRef = doc(db, 'returns', returnRequest.id)
  const eventRef = doc(collection(db, 'events'))
  const certificateNumber = `DWC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
  const existingCertificateQuery = query(collection(db, 'certificates'), where('returnId', '==', returnRequest.id))
  const existingCertificateSnapshot = await getDocs(existingCertificateQuery)
  const existingCertificate = existingCertificateSnapshot.docs[0]

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(returnRef)
    if (!snapshot.exists()) throw new Error('Return request was not found.')
    const current = snapshot.data()
    if (current.status === 'DESTROYED' || current.certificateId) throw new Error('Disposal is already completed.')
    if (current.status !== 'AFTER_DISPOSAL_EVIDENCE_CAPTURED' || !current.beforeDisposalEvidence || !current.afterDisposalEvidence || !current.disposalId || !current.disposalRecordedAt) throw new Error('Before and after live evidence plus a recorded disposal are required.')

    const disposalRef = doc(db, 'disposals', current.disposalId)
    const certificateRef = existingCertificate ? doc(db, 'certificates', existingCertificate.id) : doc(collection(db, 'certificates'))
    const certificateId = certificateRef.id
    const successfulQuantity = Number(current.manufacturerVerifiedQuantity ?? current.manufacturerReceivedQuantity ?? current.receivedQuantity ?? current.quantity)

    transaction.update(returnRef, {
      status: 'DESTROYED',
      disposalStatus: 'DISPOSAL_COMPLETED',
      disposalCompletedAt: serverTimestamp(),
      disposalCompletedBy: user.uid,
      destroyedQuantity: successfulQuantity,
      certificateId,
      certificateNumber,
      batchStatus: 'DESTROYED',
      finalStatus: 'DESTROYED',
    })
    transaction.update(disposalRef, {
      status: 'DISPOSAL_COMPLETED',
      disposalCompletedAt: serverTimestamp(),
      disposalCompletedBy: user.uid,
      destroyedQuantity: successfulQuantity,
      beforeEvidence: current.beforeDisposalEvidence,
      afterEvidence: current.afterDisposalEvidence,
      completedAt: serverTimestamp(),
    })

    if (!existingCertificate) {
      transaction.set(certificateRef, {
        certificateId,
        certificateNumber,
        returnId: returnRequest.id,
        disposalId: current.disposalId,
        manufacturerId: profile.manufacturerId,
        manufacturerName: profile.manufacturerName,
        manufacturerVerifiedBy: current.manufacturerVerifiedBy || user.uid,
        manufacturerVerifiedAt: current.manufacturerVerifiedAt || serverTimestamp(),
        medicineId: current.medicineId,
        medicineName: current.medicineName,
        pharmacyDeclaredQuantity: Number(current.quantity),
        distributorReceivedQuantity: Number(current.receivedQuantity ?? current.quantity),
        manufacturerVerifiedQuantity: successfulQuantity,
        quantityDestroyed: successfulQuantity,
        destroyedQuantity: successfulQuantity,
        batchNumber: current.batchNumber,
        distributorId: current.distributorId,
        wasteFacilityId: current.wasteFacilityId,
        wasteFacilityName: current.wasteFacilityName,
        facilityAuthorization: current.facilityAuthorization || current.wasteFacilityAuthorizationStatus || 'WF-DEMO-001',
        disposalReference: current.disposalReference,
        disposalScheduledAt: current.disposalScheduledAt,
        disposalDate: current.disposalScheduledAt,
        disposalCompletedAt: serverTimestamp(),
        issuedAt: serverTimestamp(),
        issuedBy: user.uid,
        status: 'DESTROYED',
        createdAt: serverTimestamp(),
      })
      transaction.set(eventRef, { eventType: 'DISPOSAL_COMPLETED', returnId: returnRequest.id, manufacturerId: profile.manufacturerId, batchNumber: current.batchNumber, certificateId, certificateNumber, timestamp: serverTimestamp(), actor: user.uid })
      transaction.set(doc(collection(db, 'events')), { eventType: 'DESTRUCTION_CERTIFICATE_ISSUED', returnId: returnRequest.id, manufacturerId: profile.manufacturerId, batchNumber: current.batchNumber, certificateId, certificateNumber, timestamp: serverTimestamp(), actor: user.uid })
      return
    }

    transaction.set(eventRef, { eventType: 'DISPOSAL_COMPLETED', returnId: returnRequest.id, manufacturerId: profile.manufacturerId, batchNumber: current.batchNumber, certificateId: existingCertificate.id, certificateNumber: existingCertificate.data().certificateNumber || certificateNumber, timestamp: serverTimestamp(), actor: user.uid })
  })
}

export function subscribeToCertificates(onData, onError) {
  return onSnapshot(collection(db, 'certificates'), (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError)
}

export async function getUserDocument(uid) {
  const snapshot = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)))
  return snapshot.docs[0]?.data() || null
}

export async function updateMedicine(medicineId, updates) {
  return updateDoc(doc(db, 'medicines', medicineId), { ...updates, updatedAt: serverTimestamp() })
}
