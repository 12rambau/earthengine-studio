<template>
  <div ref="containerElement" class="script-editor" />
</template>

<script lang="ts" setup>
  /** Hosts a single Monaco editor instance restricted to the supported languages, synchronized with one script's source. */
  import type { ScriptLanguage } from './scriptLanguage'
  import * as monaco from 'monaco-editor'
  import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useTheme } from 'vuetify'
  import '@/plugins/monacoEnvironment'

  const { language, modelValue } = defineProps<{
    /** Selects the Monaco language mode; anything outside the three supported languages renders as raw plain text. */
    language: ScriptLanguage

    /** Supplies the source displayed and edited by Monaco. */
    modelValue: string
  }>()

  const emit = defineEmits<{
    /** Emits the latest source after a user edit. */
    'update:modelValue': [value: string]
  }>()

  const containerElement = ref<HTMLDivElement | null>(null)
  const theme = useTheme()

  let editor: monaco.editor.IStandaloneCodeEditor | undefined

  /** Suppresses the change emission while a prop update replaces the editor's value programmatically. */
  let isApplyingExternalValue = false

  onMounted(() => {
    if (!containerElement.value) {
      return
    }

    editor = monaco.editor.create(containerElement.value, {
      automaticLayout: true,
      fontSize: 13,
      language,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      theme: theme.global.name.value === 'dark' ? 'vs-dark' : 'vs',
      value: modelValue,
    })

    editor.onDidChangeModelContent(() => {
      if (!isApplyingExternalValue) {
        // eslint-disable-next-line vue/custom-event-name-casing -- Vue reserves this camel-case event for v-model.
        emit('update:modelValue', editor?.getValue() ?? '')
      }
    })
  })

  onBeforeUnmount(() => {
    editor?.dispose()
  })

  /** Replaces the editor's value when the active script changes from outside a user keystroke. */
  watch(() => modelValue, value => {
    if (!editor || editor.getValue() === value) {
      return
    }

    isApplyingExternalValue = true
    editor.setValue(value)
    isApplyingExternalValue = false
  })

  /** Keeps Monaco's color theme aligned with the application's light or dark appearance. */
  watch(() => theme.global.name.value, name => {
    monaco.editor.setTheme(name === 'dark' ? 'vs-dark' : 'vs')
  })
</script>

<style scoped>
  .script-editor {
    block-size: 100%;
    inline-size: 100%;
  }
</style>
