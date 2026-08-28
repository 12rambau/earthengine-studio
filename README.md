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
npm run dev
```

The development server runs at `http://localhost:3000` by default.

## Google OAuth

The account menu uses [`vue3-google-signin`](https://www.npmjs.com/package/vue3-google-signin), the Vue wrapper for Google Identity Services' OAuth token model, to request only `openid email profile`. It retains the resulting access token and profile only in memory for the current browser session.

1. Create a Google OAuth 2.0 **Web application** client in the Google Cloud console and configure the consent screen.
2. Add each application origin, such as `http://localhost:3000`, to the client's authorized JavaScript origins.
3. Copy `.env.example` to `.env.local` and set `VITE_GOOGLE_CLIENT_ID` to the web client ID.

The client ID is public. Never add a Google client secret to a `VITE_` variable. This frontend flow is sufficient for requesting browser API access and displaying a profile; a future backend must validate tokens before treating a request as an authenticated server session.

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
