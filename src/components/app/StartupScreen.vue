<template>
  <main
    aria-busy="true"
    aria-label="Starting Earth Engine Studio"
    class="startup-screen"
    :class="{ 'startup-screen--dark': isDark }"
  >
    <img
      alt=""
      class="startup-screen-image"
      :src="isDark
        ? '/startup/forestry.webp'
        : '/startup/energy.webp'"
    >

    <div class="startup-screen-scrim" />

    <div class="startup-screen-content">
      <p class="startup-screen-title">Earth Engine Studio</p>
      <p class="startup-screen-status">Preparing your geospatial workspace...</p>

      <v-progress-circular
        aria-label="Loading workspace"
        color="white"
        indeterminate
        size="x-large"
        width="3"
      />
    </div>

    <a
      class="startup-screen-attribution"
      href="https://geopera.com/"
      rel="noopener noreferrer"
      target="_blank"
    >
      Imagery by Geopera
    </a>
  </main>
</template>

<script lang="ts" setup>
  /** Displays the themed full-screen application launch experience while workspace data is prepared. */

  defineProps<{
    /** Chooses the supplied forestry scene instead of the energy scene for the dark application theme. */
    isDark: boolean
  }>()
</script>

<style scoped>
  .startup-screen {
    background: #1d292d;
    color: white;
    display: grid;
    inset: 0;
    isolation: isolate;
    overflow: hidden;
    place-items: end start;
    position: fixed;
    z-index: 2000;
  }

  .startup-screen-image,
  .startup-screen-scrim {
    block-size: 100%;
    inline-size: 100%;
    inset: 0;
    position: absolute;
  }

  .startup-screen-image {
    object-fit: cover;
    z-index: -2;
  }

  .startup-screen-scrim {
    background: linear-gradient(90deg, rgb(0 0 0 / 68%) 0%, rgb(0 0 0 / 36%) 48%, rgb(0 0 0 / 12%) 100%);
    z-index: -1;
  }

  .startup-screen--dark .startup-screen-scrim {
    background: linear-gradient(90deg, rgb(0 0 0 / 72%) 0%, rgb(0 0 0 / 40%) 48%, rgb(0 0 0 / 16%) 100%);
  }

  .startup-screen-content {
    animation: startup-screen-enter 480ms ease-out both;
    display: grid;
    gap: 12px;
    margin: 0 24px 12vh;
    max-inline-size: min(480px, calc(100vw - 48px));
  }

  .startup-screen-attribution {
    align-self: end;
    color: inherit;
    font-size: 11px;
    justify-self: end;
    margin: 0 20px 16px;
    opacity: 0.72;
    text-decoration: none;
  }

  .startup-screen-attribution:hover,
  .startup-screen-attribution:focus-visible {
    opacity: 1;
    text-decoration: underline;
  }

  .startup-screen-title,
  .startup-screen-status {
    margin: 0;
  }

  .startup-screen-title {
    font-size: 36px;
    font-weight: 600;
    line-height: 1.1;
  }

  .startup-screen-status {
    font-size: 16px;
    line-height: 1.5;
    opacity: 0.86;
  }

  @keyframes startup-screen-enter {
    from {
      opacity: 0;
      transform: translateY(16px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 600px) {
    .startup-screen-content {
      margin-block-end: 14vh;
    }

    .startup-screen-title {
      font-size: 28px;
    }

    .startup-screen-attribution {
      margin: 0 16px 12px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .startup-screen-content {
      animation: none;
    }
  }
</style>
