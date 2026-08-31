# Earth Engine Studio

Earth Engine Studio is a work-in-progress web application for shaping a focused workspace around Google Earth Engine workflows.

The project is at an early stage. The current application provides the frontend foundation, including the application shell and theme preferences. Mapping, data exploration, and Earth Engine integrations are still under active development.

## Stack

- Vue 3, TypeScript, and Vite
- Vuetify and UnoCSS
- Pinia and Vue I18n
- Vitest and Vue Test Utils

## Getting Started

Use a current Node.js 24 release and npm.

```bash
npm ci
npm run dev:firebase
```

The Vite application runs at `http://localhost:3000`. Firebase Emulator Suite runs alongside it, with Authentication on port `9099`, Cloud Firestore on port `8080`, and Emulator Suite UI on `http://localhost:4000`.

Firebase's Firestore emulator requires a Java JDK 11 or newer. Install a JDK before running `npm run dev:firebase`.

## Firebase User Data

Firebase Authentication is the canonical identity and session store. The Firebase SDK owns the persistent browser authentication state and its tokens; the application never copies Firebase ID tokens or refresh tokens to Firestore, cookies, `localStorage`, or IndexedDB.

Cloud Firestore stores non-sensitive, user-owned application data:

```text
users/{uid}
users/{uid}/settings/workspace
```

The user document mirrors only public Firebase Auth claims. The workspace settings document stores the selected theme and layout. [firestore.rules](firestore.rules) restricts these paths to their matching Firebase Auth UID and validates each supported setting.

The local development configuration uses the Firebase demo project `demo-earthengine-studio`, so no cloud project is contacted by default. Emulator data is exported into `.firebase-emulator-data/` whenever the emulators stop and restored on their next start. That directory is intentionally ignored by Git.

The local provider screen creates fake identities and cannot grant a valid Google API token. It tests Authentication, authorization rules, and Firestore persistence. Earth Engine and Google Cloud API calls require a real Google sign-in against a configured Firebase project.

## Firebase Project Setup

For a deployed Firebase project, create a Web App, enable Google as an Authentication sign-in provider, and create a Cloud Firestore database. Copy `.env.dist` to `.env.local`, set `VITE_USE_FIREBASE_EMULATORS=false`, and enter the public Web App configuration values from Firebase:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
```

These values identify the Firebase project but are not secrets. Firebase security is enforced by Authentication and Firestore Security Rules, not by hiding this client configuration.

## Google API Access

Firebase's Google provider requests Earth Engine and read-only Cloud Resource Manager scopes when the user explicitly connects or changes Google account. The provider access token remains in memory only and is used for the current browser session's Earth Engine and Google Cloud API calls. Firebase persists the application sign-in, but does not restore this Google API token after a browser restart; the user must reconnect Google services before an Earth Engine request on a restored session.

Enable the Cloud Resource Manager API for the Google Cloud project used by the connected account when project selection is needed.

Never add a Google client secret, Git token, or other credential to a `VITE_` variable. Persistent provider credentials require a future server-side integration.

## Quality Checks

```bash
npm run lint
npm test
npm run test:coverage
npm run build
```

`npm run test:coverage` writes HTML, JSON, and LCOV reports to `coverage/`.

## Project Structure

```text
src/
	components/    Vue components grouped by feature
	plugins/       Vuetify, Pinia, and i18n configuration
	stores/        Pinia stores
	styles/        Global style settings
tests/
	unit/          Unit tests for isolated behavior
	components/    Vue component tests
```

## Contributing

Issues and pull requests are welcome while the project takes shape. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md), include relevant unit and component tests, and ensure the quality checks pass before opening a pull request.

## License

Earth Engine Studio is licensed under the [Apache License 2.0](LICENSE).
