<template>
  <v-menu
    eager
    location="bottom end"
    offset="0"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        :aria-label="accountMenuLabel"
        icon
        size="large"
        variant="text"
      >
        <v-avatar
          color="primary"
          :icon="profile?.picture ? undefined : 'mdi-account'"
          :image="profile?.picture"
          size="large"
        />
      </v-btn>
    </template>

    <v-list
      aria-label="User menu"
      min-width="224"
    >
      <template v-if="profile">
        <v-list-item
          aria-label="Signed in Google account"
          :subtitle="profile.email"
          :title="profile.name"
        >
          <template #prepend>
            <v-avatar
              color="primary"
              :icon="profile.picture ? undefined : 'mdi-account'"
              :image="profile.picture"
              size="small"
            />
          </template>
        </v-list-item>

        <v-divider />
      </template>

      <v-list-item
        v-else
        aria-label="Connect Google account"
        :disabled="!isConfigured || !isGoogleClientReady || isLoading"
        title="Connect Google account"
        @click="signInWithGoogle"
      >
        <template #prepend>
          <v-icon
            icon="mdi-google"
            size="small"
          />
        </template>
      </v-list-item>

      <v-list-item
        v-if="error"
        aria-live="polite"
        class="text-error"
        :subtitle="error"
        title="Google account unavailable"
      />

      <v-divider />

      <theme-selector-dialog />

      <layout-preference-dialog />

      <v-divider />

      <v-list-subheader>Help</v-list-subheader>

      <keyboard-shortcuts-dialog />

      <template v-if="profile">
        <v-divider />

        <v-list-item
          aria-label="Sign out from Google account"
          title="Sign out"
          @click="googleAuthStore.signOut"
        >
          <template #prepend>
            <v-icon
              icon="mdi-logout"
              size="small"
            />
          </template>
        </v-list-item>
      </template>
    </v-list>
  </v-menu>
</template>

<script lang="ts" setup>
  /** Groups appearance, layout, and keyboard preference dialogs beneath the account menu. */
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { useTokenClient } from 'vue3-google-signin'
  import { useGoogleAuthStore } from '@/stores/googleAuth'
  import KeyboardShortcutsDialog from './avatar-menu/KeyboardShortcutsDialog.vue'
  import LayoutPreferenceDialog from './avatar-menu/LayoutPreferenceDialog.vue'
  import ThemeSelectorDialog from './avatar-menu/ThemeSelectorDialog.vue'

  /** Holds the volatile Google OAuth session represented by this account menu. */
  const googleAuthStore = useGoogleAuthStore()

  /** Exposes the account details and connection state required by the menu template. */
  const { error, isConfigured, isLoading, profile } = storeToRefs(googleAuthStore)

  /** Provides an accessible menu label that identifies the connected user when available. */
  const accountMenuLabel = computed(() => {
    return profile.value ? `Open account menu for ${profile.value.name}` : 'Open user menu'
  })

  /** Initializes the plugin-managed OAuth token client only when a Google web client is configured. */
  const googleTokenClient = isConfigured.value
    ? useTokenClient({
      onError: response => googleAuthStore.reportAuthorizationFailure(response.error_description ?? response.error),
      onSuccess: response => void googleAuthStore.loadProfile(response.access_token),
    })
    : undefined

  /** Prevents the connection command until the plugin has loaded Google Identity Services. */
  const isGoogleClientReady = computed(() => googleTokenClient?.isReady.value ?? false)

  /** Opens the plugin-managed Google account selector from the menu's explicit user gesture. */
  function signInWithGoogle () {
    if (!googleTokenClient || !isGoogleClientReady.value) {
      googleAuthStore.reportAuthorizationFailure('Google sign-in is not ready.')
      return
    }

    if (googleAuthStore.startAuthorization()) {
      googleTokenClient.login({ prompt: 'select_account' })
    }
  }
</script>
