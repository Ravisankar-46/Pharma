import {
  addDoc,
  collection,
  doc,
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

export const DEMO_PHARMACY = {
  id: 'PHARMACY_DEMO_001',
  name: 'Greenleaf Pharmacy',
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
  return getDaysRemaining(medicine.expiryDate) <= 30
    && Number(medicine.quantity) > 0
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

export async function createDemoAccount() {
  return createUserWithEmailAndPassword(
    auth,
    DEMO_ACCOUNT.email,
    DEMO_ACCOUNT.password,
  )
}

export async function logOut() {
  return signOut(auth)
}

export async function ensureUserProfile(user) {
  const profile = {
    uid: user.uid,
    name: user.displayName || 'Pharmacy team',
    email: user.email || '',
    role: 'PHARMACY',
    pharmacyId: DEMO_PHARMACY.id,
    pharmacyName: DEMO_PHARMACY.name,
    createdAt: serverTimestamp(),
  }
  await setDoc(doc(db, 'users', user.uid), profile, { merge: true })
  return profile
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
  const existingBatches = new Set(existing.docs.map((item) => item.data().batchNumber))
  const samples = [
    ['Paracetamol', '500mg', 'PCM001', 50, 'tablets', dateWithOffset(120), 2.0, 'Medico Labs'],
    ['Amoxicillin', '500mg', 'AMX002', 36, 'capsules', dateWithOffset(42), 8.5, 'Northstar Labs'],
    ['Azithromycin', '250mg', 'AZI003', 28, 'tablets', dateWithOffset(18), 12.0, 'Cureline'],
    ['Cetirizine', '10mg', 'CET004', 64, 'tablets', dateWithOffset(240), 1.5, 'WellSpring'],
    ['Pantoprazole', '40mg', 'PAN005', 40, 'tablets', dateWithOffset(-4), 6.0, 'Medico Labs'],
    ['ORS Sachet', '21g', 'ORS006', 80, 'sachets', dateWithOffset(310), 4.0, 'HydraCare'],
    ['Metformin', '500mg', 'MET007', 45, 'tablets', dateWithOffset(55), 3.25, 'Northstar Labs'],
  ]
  const newSamples = samples.filter((sample) => !existingBatches.has(sample[2]))
  await Promise.all(newSamples.map(([medicineName, strength, batchNumber, quantity, unit, expiryDate, sellingPrice, manufacturerName]) => addMedicine({
    pharmacyId,
    medicineName,
    strength,
    batchNumber,
    quantity,
    unit,
    expiryDate,
    sellingPrice,
    manufacturerName,
  })))
  return newSamples.length
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
  await runTransaction(db, async (transaction) => {
    const currentSnapshot = await transaction.get(medicineRef)
    if (!currentSnapshot.exists()) throw new Error('This medicine batch no longer exists.')
    const current = currentSnapshot.data()
    if (current.returnStatus === 'RETURN_REQUESTED') throw new Error('Return already requested for this batch.')
    if (returnQuantity > current.quantity) throw new Error(`Only ${current.quantity} units are available for return.`)
    if (getDaysRemaining(current.expiryDate) > 30) throw new Error('This batch is not yet eligible for return.')

    transaction.update(medicineRef, {
      quantity: current.quantity - returnQuantity,
      returnedQuantity: (current.returnedQuantity || 0) + returnQuantity,
      returnStatus: 'RETURN_REQUESTED',
      updatedAt: serverTimestamp(),
    })
    transaction.set(returnRef, {
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
      requestedAt: serverTimestamp(),
      requestedBy: user.uid,
      distributorId: null,
    })
  })
}

export async function getUserDocument(uid) {
  const snapshot = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)))
  return snapshot.docs[0]?.data() || null
}

export async function updateMedicine(medicineId, updates) {
  return updateDoc(doc(db, 'medicines', medicineId), { ...updates, updatedAt: serverTimestamp() })
}
