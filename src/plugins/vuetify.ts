/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Composables
import { createVuetify } from 'vuetify'
// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  defaults: {
    VBtn: {
      density: 'compact',
    },
    VCard: {
      density: 'compact',
    },
    VList: {
      density: 'compact',
    },
    VListItem: {
      density: 'compact',
      slim: true,
    },
  },
  theme: {
    defaultTheme: 'system',
    themes: {
      light: {
        colors: {
          'workspace-background': '#edf3ff',
        },
      },
      dark: {
        colors: {
          'workspace-background': '#202124',
        },
      },
    },
  },
})
