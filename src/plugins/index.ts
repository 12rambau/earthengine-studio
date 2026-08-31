// Types
import type { App } from 'vue'
import { createPinia } from 'pinia'
/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

import i18n from './i18n'
// Plugins
import vuetify from './vuetify'

/** Registers the application plugins used by the workspace. */
export function registerPlugins (app: App) {
  app.use(vuetify)
  app.use(createPinia())
  app.use(i18n)
}
