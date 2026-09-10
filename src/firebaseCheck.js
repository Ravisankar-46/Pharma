import { app, auth, db } from './firebase'

export const firebaseServices = { app, auth, db }

if (!app || !auth || !db) {
  throw new Error('Firebase services failed to initialize')
}