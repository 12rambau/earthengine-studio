import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { firestore } from './firebase'

/** Defines the public Firebase Auth claims mirrored into the current user's Firestore profile document. */
export interface FirebaseUserProfile {
  email: string
  emailVerified: boolean
  name: string
  picture?: string
  subject: string
}

/** Represents the persisted workspace settings returned from a user's Firestore document. */
export interface FirestoreUserPreferences {
  layout: unknown
  theme: unknown
}

/** Mirrors public Auth profile data in the user's Firestore document for user-owned application features. */
export async function upsertFirebaseUserProfile (profile: FirebaseUserProfile) {
  await setDoc(doc(requireFirestore(), 'users', profile.subject), {
    displayName: profile.name,
    email: profile.email,
    emailVerified: profile.emailVerified,
    photoUrl: profile.picture ?? null,
    uid: profile.subject,
    updatedAt: serverTimestamp(),
  })
}

/** Reads the structured workspace preferences belonging to one Firebase Auth user. */
export async function fetchFirestoreUserPreferences (userId: string): Promise<FirestoreUserPreferences | null> {
  const preferencesDocument = await getDoc(doc(requireFirestore(), 'users', userId, 'settings', 'workspace'))

  if (!preferencesDocument.exists()) {
    return null
  }

  const preferences = preferencesDocument.data()

  return {
    layout: preferences.layout,
    theme: preferences.theme,
  }
}

/** Stores the full current workspace layout and appearance settings for one Firebase Auth user. */
export async function saveFirestoreUserPreferences (
  userId: string,
  preferences: { layout: object, theme: string },
) {
  await setDoc(doc(requireFirestore(), 'users', userId, 'settings', 'workspace'), {
    layout: preferences.layout,
    theme: preferences.theme,
    updatedAt: serverTimestamp(),
  })
}

/** Returns the initialized Firestore client or rejects persistence when production config is absent. */
function requireFirestore () {
  if (!firestore) {
    throw new Error('Firebase is not configured.')
  }

  return firestore
}
