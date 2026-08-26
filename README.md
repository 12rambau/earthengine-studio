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
