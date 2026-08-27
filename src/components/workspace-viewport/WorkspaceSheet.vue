<template>
  <v-sheet
    :aria-label="title"
    class="workspace-sheet"
    :class="{ 'is-fullscreen': isFullscreen }"
    color="background"
    rounded="lg"
    tag="section"
  >
    <header class="d-flex align-center mx-1">
      <span class="text-medium-emphasis">{{ title }}</span>

      <v-spacer />

      <v-btn
        :aria-label="isFullscreen ? `Restore ${title}` : `Fullscreen ${title}`"
        class="text-medium-emphasis"
        density="compact"
        :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
        size="x-small"
        :title="isFullscreen ? `Restore ${title}` : `Fullscreen ${title}`"
        variant="text"
        @click="emit('toggle-fullscreen')"
      />

      <v-btn
        v-if="isClosable !== false"
        :aria-label="`Hide ${title}`"
        class="text-medium-emphasis"
        density="compact"
        icon="mdi-close"
        size="x-small"
        :title="`Hide ${title}`"
        variant="text"
        @click="emit('close')"
      />
    </header>

    <div class="workspace-sheet-content">
      <slot />
    </div>
  </v-sheet>
</template>

<script lang="ts" setup>
  /** Renders the shared titled surface, fullscreen control, and optional close control for a workspace area. */

  /** Declares the display and interaction controls shared by every workspace area. */
  withDefaults(defineProps<{
    /** Determines whether the area may be hidden from the workspace. */
    isClosable?: boolean

    /** Indicates that the area currently occupies the fullscreen workspace view. */
    isFullscreen: boolean

    /** Provides the accessible and visible title for the area. */
    title: string
  }>(), {
    isClosable: true,
  })

  /** Emits requests for the owning layout to hide or toggle the area. */
  const emit = defineEmits<{
    /** Requests that the owning layout hide this area. */
    'close': []

    /** Requests that the owning layout toggle this area's fullscreen state. */
    'toggle-fullscreen': []
  }>()
</script>

<style scoped>
  .workspace-sheet {
    display: grid;
    grid-template-rows: min-content minmax(0, 1fr);
  }
</style>
