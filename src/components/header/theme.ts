export type ThemeName = 'system' | 'light' | 'dark'

export const themePreferenceKey = 'earthengine-studio.theme'

export const themeOptions: Array<{ icon: string, title: string, value: ThemeName }> = [
  { icon: 'mdi-theme-light-dark', title: 'Use device theme', value: 'system' },
  { icon: 'mdi-weather-sunny', title: 'Light theme', value: 'light' },
  { icon: 'mdi-weather-night', title: 'Dark theme', value: 'dark' },
]

export function isThemeName (themeName: string | null): themeName is ThemeName {
  return themeOptions.some(option => option.value === themeName)
}

export function resolveThemeName (themeName: ThemeName, prefersDark: boolean): 'light' | 'dark' {
  if (themeName === 'system') {
    return prefersDark ? 'dark' : 'light'
  }

  return themeName
}
