import type { FirebaseOptions } from 'firebase/app'
import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const demoFirebaseProjectId = 'demo-earthengine-studio'

/** Identifies whether this browser session must use the local Firebase services rather than a deployed project. */
export const isUsingFirebaseEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'false'

/** Holds the resolved Firebase configuration for either the local demo project or a deployed Firebase project. */
const firebaseConfiguration = getFirebaseConfiguration()

/** Contains the Firebase app only when a deployed configuration or the development emulator configuration is available. */
export const firebaseApp = getFirebaseApp()

/** Provides Firebase Authentication, including its managed and persistent browser session. */
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null

/** Provides the canonical user-data store for profile and workspace preferences. */
export const firestore = firebaseApp ? getFirestore(firebaseApp) : null

/** Finishes configuring persistent Auth state before an interactive sign-in may begin. */
export const firebaseAuthReady = firebaseAuth ? setPersistence(firebaseAuth, browserLocalPersistence) : Promise.resolve()

if (isUsingFirebaseEmulators && firebaseAuth && firestore) {
  connectAuthEmulator(firebaseAuth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080)
}

/** Builds either a developer-safe demo project config or the public config of a deployed Firebase project. */
function getFirebaseConfiguration (): FirebaseOptions | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim()
  const appId = import.meta.env.VITE_FIREBASE_APP_ID?.trim()
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim()
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim()

  if (!isUsingFirebaseEmulators && (!apiKey || !appId || !projectId)) {
    return null
  }

  const resolvedProjectId = projectId || demoFirebaseProjectId

  return {
    apiKey: apiKey || 'demo-api-key',
    appId: appId || `1:000000000000:web:${resolvedProjectId}`,
    authDomain: authDomain || `${resolvedProjectId}.firebaseapp.com`,
    projectId: resolvedProjectId,
  }
}

/** Reuses the existing Firebase app during Vite hot updates or creates it from the resolved public configuration. */
function getFirebaseApp () {
  if (!firebaseConfiguration) {
    return null
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfiguration)
}
