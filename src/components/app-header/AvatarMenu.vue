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
        class="account-menu-activator"
        icon
        size="large"
        variant="text"
      >
        <v-avatar
          v-if="profile?.picture"
          class="profile-avatar"
          :image="profile.picture"
          size="large"
          variant="text"
        />

        <v-avatar
          v-else-if="profile"
          color="primary"
          size="large"
          :text="profileInitials"
        />

        <v-avatar
          v-else
          color="primary"
          icon="mdi-account"
          size="large"
        />
      </v-btn>
    </template>

    <v-list
      aria-label="User menu"
      min-width="224"
    >
      <v-list-subheader>User</v-list-subheader>

      <template v-if="profile">
        <v-list-item
          aria-label="Change Google account"
          :disabled="!isConfigured || isLoading"
          :subtitle="profile.email"
          :title="profile.name"
          @click="signInWithGoogle"
        >
          <template #prepend>
            <v-avatar
              v-if="profile.picture"
              class="profile-avatar"
              :image="profile.picture"
              size="large"
              variant="text"
            />

            <v-avatar
              v-else
              color="primary"
              size="large"
              :text="profileInitials"
            />
          </template>

          <template #append>
            <v-icon
              icon="mdi-account-switch-outline"
              size="small"
            />
          </template>
        </v-list-item>

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

      <v-list-item
        v-else
        aria-label="Connect Google account"
        :disabled="!isConfigured || isLoading"
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

      <v-list-subheader>Preferences</v-list-subheader>

      <theme-selector-dialog />

      <layout-preference-dialog />

      <v-divider />

      <v-list-subheader>Help</v-list-subheader>

      <keyboard-shortcuts-dialog />
    </v-list>
  </v-menu>
</template>

<script lang="ts" setup>
  /** Groups appearance, layout, and keyboard preference dialogs beneath the account menu. */
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
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

  /** Derives a compact fallback monogram from the connected account name when Google provides no photo. */
  const profileInitials = computed(() => {
    if (!profile.value) {
      return ''
    }

    return profile.value.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(namePart => namePart.charAt(0).toUpperCase())
      .join('')
  })

  /** Opens Firebase Authentication's Google account selector from the menu's explicit user gesture. */
  function signInWithGoogle () {
    void googleAuthStore.signInWithGoogle()
  }
</script>

<style scoped>
  .account-menu-activator :deep(.v-btn__overlay) {
    opacity: 0;
  }

  .profile-avatar :deep(.v-img) {
    transform: scale(1.08);
  }
</style>
