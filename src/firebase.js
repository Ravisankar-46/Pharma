import { getAuth } from 'firebase/auth'
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAY0d5bW2XNu303JJ3xHC5GxfjNumhygZg",
  authDomain: "pharmaloop-650b6.firebaseapp.com",
  projectId: "pharmaloop-650b6",
  storageBucket: "pharmaloop-650b6.firebasestorage.app",
  messagingSenderId: "993354597726",
  appId: '1:993354597726:web:0ecdff81812831dff6fbcf',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)