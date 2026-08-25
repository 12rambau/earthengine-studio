<template>
  <v-app class="studio-shell">
    <v-app-bar
      class="studio-header"
      :elevation="0"
      height="56"
    >
      <div class="studio-header__brand">
        <v-icon
          color="primary"
          icon="mdi-earth"
          size="22"
        />
        <span>Earth Engine Studio</span>
      </div>

      <v-spacer />

      <v-tooltip text="Toggle theme">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            aria-label="Toggle theme"
            icon="mdi-theme-light-dark"
            variant="text"
            @click="$vuetify.theme.cycle()"
          />
        </template>
      </v-tooltip>
    </v-app-bar>

    <v-main class="studio-main">
      <main
        class="studio-canvas"
        aria-label="Workspace canvas"
      />
    </v-main>
  </v-app>
</template>
