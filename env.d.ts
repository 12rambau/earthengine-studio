/// <reference types="vite/client" />
/// <reference types="vite-plugin-vue-layouts-next/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_APP_ID?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_USE_FIREBASE_EMULATORS?: string
}

declare module '@google/earthengine' {
  /** Describes the narrow client API used to convert the Earth Engine algorithm registry response. */
  interface EarthEngineClient {
    /** Converts the REST ListAlgorithms response into the package's algorithm registry shape. */
    rpc_convert: {
      algorithms: (response: unknown) => unknown
    }
  }

  /** Exposes the stateful Earth Engine browser client installed from npm. */
  const earthEngine: EarthEngineClient

  export default earthEngine
}
