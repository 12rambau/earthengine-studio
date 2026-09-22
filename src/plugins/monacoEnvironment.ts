import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker'

/** Routes Monaco's background language and tokenization work to its JavaScript/TypeScript worker, and any other request to the base editor worker. */
self.MonacoEnvironment = {
  getWorker (_workerId: string, label: string) {
    return label === 'javascript' || label === 'typescript' ? new TsWorker() : new EditorWorker()
  },
}
