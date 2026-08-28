import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  fetchGoogleUserProfile,
  type GoogleUserProfile,
} from '@/services/googleProfile'

/** Describes the current Google authorization phase exposed to the application UI. */
export type GoogleAuthStatus = 'authenticated' | 'authorizing' | 'ready' | 'unconfigured'

/** Manages a non-persistent browser OAuth session for the signed-in Google account. */
export const useGoogleAuthStore = defineStore('google-auth', () => {
  /** Reads the public web-client identifier injected by Vite without treating it as a secret. */
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

  /** Keeps the short-lived bearer token available for future authorized Google service calls. */
  const accessToken = ref<string | null>(null)

  /** Describes the last user-visible OAuth failure without persisting sensitive provider details. */
  const error = ref<string | null>(null)

  /** Holds the account claims that may be displayed in the workspace header. */
  const profile = ref<GoogleUserProfile | null>(null)

  /** Tracks whether the client is ready to request authorization or has an active profile. */
  const status = ref<GoogleAuthStatus>(clientId ? 'ready' : 'unconfigured')

  /** Indicates whether the Vue Google Sign-In plugin can initialize a browser OAuth client. */
  const isConfigured = computed(() => Boolean(clientId))

  /** Indicates when the account selector or profile request is in progress. */
  const isLoading = computed(() => status.value === 'authorizing')

  /** Marks an explicit user-initiated authorization attempt, rejecting it when the app is not configured. */
  function startAuthorization () {
    if (!isConfigured.value) {
      error.value = 'Google sign-in is not configured.'
      status.value = 'unconfigured'
      return false
    }

    error.value = null
    status.value = 'authorizing'
    return true
  }

  /** Clears the local OAuth session without revoking the user's Google account consent. */
  function signOut () {
    accessToken.value = null
    error.value = null
    profile.value = null
    status.value = isConfigured.value ? 'ready' : 'unconfigured'
  }

  /** Resolves the authorized account profile after vue3-google-signin returns an access token. */
  async function loadProfile (newAccessToken: string) {
    accessToken.value = newAccessToken

    try {
      profile.value = await fetchGoogleUserProfile(newAccessToken)
      status.value = 'authenticated'
    } catch {
      accessToken.value = null
      error.value = 'Unable to retrieve the Google account profile.'
      profile.value = null
      status.value = 'ready'
    }
  }

  /** Returns the UI to a retryable state when vue3-google-signin reports an authorization failure. */
  function reportAuthorizationFailure (message?: string) {
    error.value = message ?? 'Google sign-in was interrupted.'
    status.value = isConfigured.value ? 'ready' : 'unconfigured'
  }

  return {
    accessToken,
    error,
    isConfigured,
    isLoading,
    loadProfile,
    profile,
    reportAuthorizationFailure,
    signOut,
    startAuthorization,
    status,
  }
})
