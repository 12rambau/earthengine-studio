import type { FirebaseUserProfile } from '@/services/userPersistence'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as signOutFromFirebase,
  type User,
} from 'firebase/auth'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { firebaseAuth, firebaseAuthReady } from '@/services/firebase'
import {
  googleCloudProjectReadScope,
  googleEarthEngineScope,
} from '@/services/googleProjects'

/** Describes the current Google authorization phase exposed to the application UI. */
export type GoogleAuthStatus = 'authenticated' | 'authorizing' | 'ready' | 'unconfigured'

/** Manages Firebase Authentication and the short-lived Google API token used by Earth Engine services. */
export const useGoogleAuthStore = defineStore('google-auth', () => {
  /** Keeps the short-lived bearer token available for future authorized Google service calls. */
  const accessToken = ref<string | null>(null)

  /** Describes the last user-visible OAuth failure without persisting sensitive provider details. */
  const error = ref<string | null>(null)

  /** Holds the account claims that may be displayed in the workspace header. */
  const profile = ref<FirebaseUserProfile | null>(null)

  /** Tracks whether Firebase is configured, authorizing an account, or has restored an authenticated user. */
  const status = ref<GoogleAuthStatus>(firebaseAuth ? 'ready' : 'unconfigured')

  /** Releases the Firebase observer before replacing it during application initialization. */
  let stopAuthStateObserver: (() => void) | undefined

  /** Indicates whether the application has a local or deployed Firebase configuration. */
  const isConfigured = computed(() => Boolean(firebaseAuth))

  /** Indicates when the account selector or profile request is in progress. */
  const isLoading = computed(() => status.value === 'authorizing')

  /** Starts the Firebase Auth observer so a persisted user session is restored after application startup. */
  async function initialize () {
    stopAuthStateObserver?.()

    if (!firebaseAuth) {
      clearSession()
      status.value = 'unconfigured'
      return
    }

    try {
      await firebaseAuthReady
      stopAuthStateObserver = onAuthStateChanged(firebaseAuth, synchronizeAuthenticatedUser)
    } catch {
      clearSession()
      error.value = 'Firebase Authentication could not restore the current user.'
    }
  }

  /** Opens Firebase's Google account selector and retains the granted Earth Engine access token only in memory. */
  async function signInWithGoogle () {
    if (!firebaseAuth) {
      error.value = 'Firebase Authentication is not configured.'
      status.value = 'unconfigured'
      return
    }

    error.value = null
    status.value = 'authorizing'
    const provider = new GoogleAuthProvider()
    provider.addScope(googleCloudProjectReadScope)
    provider.addScope(googleEarthEngineScope)
    provider.setCustomParameters({ prompt: 'select_account' })

    try {
      await firebaseAuthReady
      const result = await signInWithPopup(firebaseAuth, provider)
      const credential = GoogleAuthProvider.credentialFromResult(result)

      accessToken.value = credential?.accessToken ?? null
      profile.value = createFirebaseUserProfile(result.user)
      status.value = 'authenticated'
    } catch (signInError) {
      error.value = signInError instanceof Error ? signInError.message : 'Google sign-in was interrupted.'
      status.value = profile.value ? 'authenticated' : 'ready'
    }
  }

  /** Signs out of Firebase and removes the ephemeral Google API token from the current browser session. */
  async function signOut () {
    if (firebaseAuth) {
      try {
        await signOutFromFirebase(firebaseAuth)
      } catch (signOutError) {
        error.value = signOutError instanceof Error ? signOutError.message : 'Unable to sign out from Firebase.'
        return
      }
    }

    clearSession()
  }

  /** Clears identity and access token state while preserving Firebase's configured but signed-out state. */
  function clearSession () {
    accessToken.value = null
    error.value = null
    profile.value = null
    status.value = isConfigured.value ? 'ready' : 'unconfigured'
  }

  /** Synchronizes Vue state with Firebase's persisted authentication result and drops stale provider tokens on account changes. */
  function synchronizeAuthenticatedUser (user: User | null) {
    if (!user) {
      clearSession()
      return
    }

    if (profile.value?.subject !== user.uid) {
      accessToken.value = null
    }

    error.value = null
    profile.value = createFirebaseUserProfile(user)
    status.value = 'authenticated'
  }

  return {
    accessToken,
    error,
    isConfigured,
    isLoading,
    initialize,
    profile,
    signInWithGoogle,
    signOut,
    status,
  }
})

/** Converts Firebase Auth's user model to the profile shape rendered by the workspace and persisted in Firestore. */
function createFirebaseUserProfile (user: User): FirebaseUserProfile {
  const email = user.email ?? ''

  return {
    email,
    emailVerified: user.emailVerified,
    name: user.displayName?.trim() || email || 'Google user',
    picture: user.photoURL ?? undefined,
    subject: user.uid,
  }
}
