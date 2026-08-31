/** Represents the asset metadata needed to render one entry in the Earth Engine asset tree. */
export interface EarthEngineAsset {
  bands?: EarthEngineAssetBand[]
  description?: string
  endTime?: string
  featureCount?: string
  geometry?: unknown
  id?: string
  name: string
  properties?: Record<string, unknown>
  sizeBytes?: string
  startTime?: string
  title?: string
  type: string
  updateTime?: string
}

/** Describes the raster metadata for one band returned with a fully inspected image asset. */
export interface EarthEngineAssetBand {
  dataType?: {
    precision?: string
    range?: {
      max?: number
      min?: number
    }
  }
  grid?: {
    affineTransform?: {
      scaleX?: number
      scaleY?: number
    }
    crsCode?: string
    dimensions?: {
      height?: number
      width?: number
    }
  }
  id: string
}

/** Represents one feature row retrieved from a FeatureCollection asset. */
export interface EarthEngineAssetFeature {
  geometry?: unknown
  properties?: Record<string, unknown>
  type?: string
}

/** Describes one validated page returned by the Earth Engine asset-listing endpoint. */
export interface EarthEngineAssetPage {
  assets: EarthEngineAsset[]
  nextPageToken?: string
}

/** Provides the Earth Engine REST API root used by authenticated asset requests. */
const earthEngineApiUrl = 'https://earthengine.googleapis.com/v1'

/** Retrieves every direct child asset of a project or folder, transparently following REST result pages. */
export async function fetchEarthEngineAssets (accessToken: string, parent: string): Promise<EarthEngineAsset[]> {
  const assets: EarthEngineAsset[] = []
  let pageToken: string | undefined

  do {
    const page = await fetchEarthEngineAssetPage(accessToken, parent, 200, pageToken)
    assets.push(...page.assets)
    pageToken = page.nextPageToken
  } while (pageToken)

  return assets
}

/** Retrieves one bounded child-asset page for a collection preview without eagerly loading the entire collection. */
export async function fetchEarthEngineAssetPage (
  accessToken: string,
  parent: string,
  pageSize: number,
  pageToken?: string,
): Promise<EarthEngineAssetPage> {
  const requestUrl = new URL(`${earthEngineApiUrl}/${parent}:listAssets`)
  requestUrl.searchParams.set('pageSize', String(pageSize))

  if (pageToken) {
    requestUrl.searchParams.set('pageToken', pageToken)
  }

  const response = await fetch(requestUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Unable to retrieve Earth Engine assets. Ensure the Earth Engine API is enabled and the selected project is accessible.')
  }

  return parseEarthEngineAssetPage(await response.json())
}

/** Retrieves complete metadata for one Earth Engine asset using its canonical asset ID. */
export async function fetchEarthEngineAsset (accessToken: string, assetId: string): Promise<EarthEngineAsset> {
  const response = await fetch(new URL(`${earthEngineApiUrl}/${assetId}`), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Unable to retrieve Earth Engine asset details. Ensure the asset is accessible.')
  }

  const asset = parseEarthEngineAsset(await response.json())[0]

  if (!asset) {
    throw new Error('Earth Engine returned invalid asset details.')
  }

  return asset
}

/** Retrieves a bounded sample of features from a FeatureCollection asset for tabular inspection. */
export async function fetchEarthEngineAssetFeatures (
  accessToken: string,
  assetId: string,
  pageSize: number,
): Promise<EarthEngineAssetFeature[]> {
  const requestUrl = new URL(`${earthEngineApiUrl}/${assetId}:listFeatures`)
  requestUrl.searchParams.set('pageSize', String(pageSize))
  const response = await fetch(requestUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Unable to retrieve Earth Engine features. Ensure the asset is accessible.')
  }

  const payload = await response.json()

  if (!isRecord(payload)) {
    throw new Error('Earth Engine returned invalid feature data.')
  }

  return Array.isArray(payload.features)
    ? payload.features.flatMap(feature => parseEarthEngineAssetFeature(feature))
    : []
}

/** Validates one remote asset-list page while discarding malformed individual entries. */
function parseEarthEngineAssetPage (payload: unknown): EarthEngineAssetPage {
  if (!isRecord(payload)) {
    throw new Error('Earth Engine returned an invalid asset list.')
  }

  return {
    assets: Array.isArray(payload.assets)
      ? payload.assets.flatMap(asset => parseEarthEngineAsset(asset))
      : [],
    nextPageToken: getString(payload.nextPageToken),
  }
}

/** Converts a valid REST asset entry into the metadata required by the sidebar tree. */
function parseEarthEngineAsset (payload: unknown): EarthEngineAsset[] {
  if (!isRecord(payload)) {
    return []
  }

  const name = getString(payload.name)
  const type = getString(payload.type)

  return name && type
    ? [{
        bands: Array.isArray(payload.bands)
          ? payload.bands.flatMap(band => parseEarthEngineAssetBand(band))
          : undefined,
        description: getString(payload.description),
        endTime: getString(payload.endTime),
        featureCount: getString(payload.featureCount),
        geometry: payload.geometry,
        id: getString(payload.id),
        name,
        properties: getRecord(payload.properties),
        sizeBytes: getString(payload.sizeBytes),
        startTime: getString(payload.startTime),
        title: getString(payload.title),
        type,
        updateTime: getString(payload.updateTime),
      }]
    : []
}

/** Converts one valid image band from asset details into display-safe raster metadata. */
function parseEarthEngineAssetBand (payload: unknown): EarthEngineAssetBand[] {
  if (!isRecord(payload)) {
    return []
  }

  const id = getString(payload.id)

  if (!id) {
    return []
  }

  const dataType = getRecord(payload.dataType)
  const range = getRecord(dataType?.range)
  const grid = getRecord(payload.grid)
  const dimensions = getRecord(grid?.dimensions)
  const affineTransform = getRecord(grid?.affineTransform)

  return [{
    dataType: dataType
      ? {
          precision: getString(dataType.precision),
          range: range ? { max: getFiniteNumber(range.max), min: getFiniteNumber(range.min) } : undefined,
        }
      : undefined,
    grid: grid
      ? {
          affineTransform: affineTransform
            ? { scaleX: getFiniteNumber(affineTransform.scaleX), scaleY: getFiniteNumber(affineTransform.scaleY) }
            : undefined,
          crsCode: getString(grid.crsCode),
          dimensions: dimensions
            ? { height: getFiniteNumber(dimensions.height), width: getFiniteNumber(dimensions.width) }
            : undefined,
        }
      : undefined,
    id,
  }]
}

/** Converts one valid feature response into the properties and geometry required by a collection preview. */
function parseEarthEngineAssetFeature (payload: unknown): EarthEngineAssetFeature[] {
  if (!isRecord(payload)) {
    return []
  }

  return [{
    geometry: payload.geometry,
    properties: getRecord(payload.properties),
    type: getString(payload.type),
  }]
}

/** Narrows an unknown JSON value into a record suitable for defensive field access. */
function isRecord (value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** Narrows a JSON object value into a record while preserving individual property values for tabular display. */
function getRecord (value: unknown) {
  return isRecord(value) ? value : undefined
}

/** Narrows optional REST numeric values to finite numbers suitable for metadata presentation. */
function getFiniteNumber (value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** Narrows optional REST values to non-empty strings. */
function getString (value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}
