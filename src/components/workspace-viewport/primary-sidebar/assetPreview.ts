import type {
  EarthEngineAsset,
  EarthEngineAssetBand,
  EarthEngineAssetFeature,
} from '@/services/earthEngineAssets'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

/** Represents one non-system asset property rendered in a preview table. */
export interface AssetPreviewProperty {
  name: string
  value: string
}

/** Represents one FeatureCollection column inferred from the first sampled feature. */
export interface FeatureCollectionColumn {
  name: string
  type: string
}

/** Uses the user-defined description property when present, otherwise returns the asset-level description. */
export function getAssetDescription (asset: EarthEngineAsset) {
  const propertyDescription = asset.properties?.description

  return typeof propertyDescription === 'string' && propertyDescription.trim()
    ? propertyDescription
    : asset.description
}

/** Parses an asset description as GitHub-flavored Markdown while stripping unsafe HTML before browser rendering. */
export function renderAssetDescription (asset: EarthEngineAsset) {
  return renderAssetMarkdown(getAssetDescription(asset))
}

/** Parses arbitrary Earth Engine Markdown while stripping unsafe HTML before browser rendering. */
export function renderAssetMarkdown (markdown: string | undefined) {
  return markdown ? DOMPurify.sanitize(marked.parse(markdown, { async: false })) : ''
}

/** Lists sorted user properties while omitting system metadata and the description displayed separately. */
export function getAssetPreviewProperties (asset: EarthEngineAsset): AssetPreviewProperty[] {
  const properties = Object.entries(asset.properties ?? {})
    .filter(([name]) => name !== 'description' && !name.startsWith('system:'))
  properties.sort(([firstName], [secondName]) => firstName.localeCompare(secondName))

  return properties
    .map(([name, value]) => ({ name, value: formatAssetValue(value) }))
}

/** Formats a serializable Earth Engine property value without losing object and list structure. */
export function formatAssetValue (value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/** Formats an Earth Engine timestamp in UTC while preserving an invalid source value for diagnosis. */
export function formatAssetTime (value: string | undefined) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'UTC',
  }).format(date)} UTC`
}

/** Formats an asset byte count using compact binary units when the API reports a valid numeric size. */
export function formatAssetSize (value: string | undefined) {
  const bytes = value ? Number(value) : Number.NaN

  if (!Number.isFinite(bytes) || bytes < 0) {
    return 'Not available'
  }

  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  const unitIndex = Math.min(Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)), units.length - 1)
  const amount = bytes / 1024 ** unitIndex

  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: unitIndex === 0 ? 0 : 1 }).format(amount)} ${units[unitIndex]}`
}

/** Formats an asset feature count or retains a clear unavailable state when the API omits it. */
export function formatAssetCount (value: string | undefined) {
  const count = value ? Number(value) : Number.NaN

  return Number.isFinite(count) ? new Intl.NumberFormat().format(count) : 'Not available'
}

/** Builds a concise dimensions label for one raster band. */
export function getBandDimensions (band: EarthEngineAssetBand) {
  const { height, width } = band.grid?.dimensions ?? {}

  return height && width ? `${width} x ${height} px` : 'Not available'
}

/** Builds a nominal-scale label from an image band's affine transform. */
export function getBandScale (band: EarthEngineAssetBand) {
  const scale = band.grid?.affineTransform?.scaleX

  return scale === undefined ? 'Not available' : Math.abs(scale).toLocaleString()
}

/** Builds a displayable numeric range for an image band when Earth Engine reports one. */
export function getBandRange (band: EarthEngineAssetBand) {
  const { max, min } = band.dataType?.range ?? {}

  return min === undefined || max === undefined ? 'Not available' : `${min.toLocaleString()} - ${max.toLocaleString()}`
}

/** Infers stable column names and primitive types from the first sampled FeatureCollection feature. */
export function getFeatureCollectionColumns (features: EarthEngineAssetFeature[]): FeatureCollectionColumn[] {
  const featureProperties = Object.entries(features[0]?.properties ?? {})
  featureProperties.sort(([firstName], [secondName]) => firstName.localeCompare(secondName))

  return featureProperties
    .map(([name, value]) => ({ name, type: getFeaturePropertyType(value) }))
}

/** Identifies the broad value category used for a sampled FeatureCollection property. */
function getFeaturePropertyType (value: unknown) {
  if (value === null || value === undefined) {
    return 'Unknown'
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'Integer' : 'Float'
  }

  if (typeof value === 'string') {
    return 'String'
  }

  if (typeof value === 'boolean') {
    return 'Boolean'
  }

  return Array.isArray(value) ? 'Array' : 'Object'
}
