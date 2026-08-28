// Types
import type { App } from 'vue'
import { createPinia } from 'pinia'
import GoogleSignInPlugin from 'vue3-google-signin'
/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

import i18n from './i18n'
// Plugins
import vuetify from './vuetify'

/** Reads the public OAuth client identifier before conditionally registering the Vue Google Sign-In plugin. */
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

/** Registers application plugins and only enables browser OAuth when a Google web client is configured. */
export function registerPlugins (app: App) {
  app.use(vuetify)
  app.use(createPinia())
  app.use(i18n)

  if (googleClientId) {
    app.use(GoogleSignInPlugin, { clientId: googleClientId })
  }
}
