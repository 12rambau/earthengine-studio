<template>
  <v-dialog
    v-model="isOpen"
    location="top"
    location-strategy="connected"
    max-width="calc(100vw - 112px)"
    origin="overlap"
    target=".catalog-search-field .v-field"
    transition="dialog-scale-transition"
    viewport-margin="0"
    width="360"
  >
    <template #activator="{ props }">
      <v-list-item
        v-bind="props"
        aria-label="Manage connected services"
        :subtitle="connectedSubtitle"
        title="Connected services"
      >
        <template #prepend>
          <v-icon
            icon="mdi-lan-connect"
            size="small"
          />
        </template>
      </v-list-item>
    </template>

    <v-card
      aria-label="Connected services dialog"
      rounded="md"
    >
      <v-sheet
        class="d-flex align-center justify-center"
        color="primary"
        height="24"
      >
        <span style="color: rgb(var(--v-theme-on-primary))">Connected services</span>
      </v-sheet>

      <v-list aria-label="Connected services">
        <v-list-item
          v-for="provider in connectedProviders"
          :key="provider.id"
          :aria-label="`Log out from ${provider.label}`"
          :subtitle="provider.username ?? undefined"
          :title="provider.label"
          @click="provider.disconnect"
        >
          <template #prepend>
            <v-icon
              :icon="provider.icon"
              size="small"
            />
          </template>

          <template #append>
            <v-icon
              icon="mdi-logout"
              size="small"
            />
          </template>
        </v-list-item>

        <v-list-item
          v-if="connectedProviders.length === 0"
          disabled
          subtitle="Only your Google account is connected"
          title="No optional service connected"
        />
      </v-list>

      <v-card-text class="pt-0">
        <v-dialog
          v-model="isAddServiceOpen"
          location="top"
          location-strategy="connected"
          max-width="calc(100vw - 112px)"
          origin="overlap"
          target=".catalog-search-field .v-field"
          transition="dialog-scale-transition"
          viewport-margin="0"
          width="320"
        >
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              aria-label="Connect to services"
              block
              :disabled="availableProviders.length === 0"
              prepend-icon="mdi-plus"
              text="Connect to services"
              variant="tonal"
            />
          </template>

          <v-card
            aria-label="Connect a new service dialog"
            rounded="md"
          >
            <v-sheet
              class="d-flex align-center justify-center"
              color="primary"
              height="24"
            >
              <span style="color: rgb(var(--v-theme-on-primary))">New service</span>
            </v-sheet>

            <v-list aria-label="Available services">
              <v-list-item
                v-for="provider in availableProviders"
                :key="provider.id"
                :aria-label="`Connect ${provider.label}`"
                :disabled="provider.isConnecting"
                :subtitle="provider.isConnecting ? 'Connecting…' : 'Not connected'"
                :title="provider.label"
                @click="provider.connect"
              >
                <template #prepend>
                  <v-icon
                    :icon="provider.icon"
                    size="small"
                  />
                </template>

                <template #append>
                  <v-icon
                    icon="mdi-login-variant"
                    size="small"
                  />
                </template>
              </v-list-item>

              <v-list-item
                v-if="availableProviders.length === 0"
                disabled
                title="All services are already connected"
              />

              <v-list-item
                v-if="connectionError"
                aria-live="polite"
                class="text-error"
                :subtitle="connectionError"
                title="Connection failed"
              />
            </v-list>
          </v-card>
        </v-dialog>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  /** Lets the user connect or log out of optional Git services (currently GitHub) from a single place. */
  import { storeToRefs } from 'pinia'
  import { computed, ref, watch } from 'vue'
  import { useGitRepositoriesStore } from '@/stores/gitRepositories'

  /** Controls whether the connected services list is displayed as a dialog. */
  const isOpen = ref(false)

  /** Controls whether the "New service" picker is displayed as a nested dialog. */
  const isAddServiceOpen = ref(false)

  /** Owns the connection state for every supported Git service. */
  const gitRepositoriesStore = useGitRepositoriesStore()

  /** Exposes the uniform list of Git service descriptors to the template. */
  const { gitProviders } = storeToRefs(gitRepositoriesStore)

  /** Lists services that already have an active session. */
  const connectedProviders = computed(() => gitProviders.value.filter(provider => provider.username !== null))

  /** Lists services still available to connect, excluding any already connected to prevent duplicate sessions. */
  const availableProviders = computed(() => gitProviders.value.filter(provider => provider.username === null))

  /** Summarizes the connected service count for the activator's subtitle. */
  const connectedSubtitle = computed(() => {
    return connectedProviders.value.length > 0
      ? connectedProviders.value.map(provider => provider.label).join(', ')
      : 'None'
  })

  /** Surfaces the first connection error among the available services. */
  const connectionError = computed(() => availableProviders.value.find(provider => provider.error)?.error ?? null)

  /** Closes the "New service" picker once a service transitions from available to connected. */
  watch(connectedProviders, (currentlyConnected, previouslyConnected) => {
    if (isAddServiceOpen.value && currentlyConnected.length > previouslyConnected.length) {
      isAddServiceOpen.value = false
    }
  })
</script>
