/** Represents the asset metadata needed to render one entry in the Earth Engine asset tree. */
export interface EarthEngineAsset {
  description?: string
  name: string
  title?: string
  type: string
  updateTime?: string
}

/** Describes one validated page returned by the Earth Engine asset-listing endpoint. */
interface EarthEngineAssetPage {
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
    const requestUrl = new URL(`${earthEngineApiUrl}/${parent}:listAssets`)
    requestUrl.searchParams.set('pageSize', '200')

    if (pageToken) {
      requestUrl.searchParams.set('pageToken', pageToken)
    }

    const response = await fetch(requestUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error('Unable to retrieve Earth Engine assets. Ensure the Earth Engine API is enabled and the selected project is accessible.')
    }

    const page = parseEarthEngineAssetPage(await response.json())
    assets.push(...page.assets)
    pageToken = page.nextPageToken
  } while (pageToken)

  return assets
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
        description: getString(payload.description),
        name,
        title: getString(payload.title),
        type,
        updateTime: getString(payload.updateTime),
      }]
    : []
}

/** Narrows an unknown JSON value into a record suitable for defensive field access. */
function isRecord (value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** Narrows optional REST values to non-empty strings. */
function getString (value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}
