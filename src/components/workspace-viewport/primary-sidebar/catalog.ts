/** Identifies one catalog or collection link exposed by the public Earth Engine STAC API. */
export interface CatalogEntry {
  href: string
  title: string
}

/** Defines the visual distinction used for a public Earth Engine asset type. */
export interface CatalogAssetPresentation {
  color?: string
  icon: string
}

/** Represents one public community catalog dataset. */
export interface CommunityDataset {
  docs: string
  id: string
  thematic_group: string
  title: string
  type: string
}

/** Groups the public community datasets displayed below one thematic tree node. */
export interface CommunityTheme {
  datasets: CommunityDataset[]
  title: string
}

/** Describes the links present in Earth Engine's public STAC catalogs. */
interface StacCatalog {
  'gee:publisher'?: {
    type?: string
  }
  'gee:type'?: string
  'links': {
    href: string
    rel: string
    title?: string
  }[]
}

/** Provides the public Earth Engine STAC catalog root. */
export const catalogUrl = 'https://earthengine-stac.storage.googleapis.com/catalog/catalog.json'

/** Provides the public Awesome GEE Community Catalog manifest. */
const communityCatalogUrl = 'https://raw.githubusercontent.com/samapriya/awesome-gee-community-datasets/master/community_datasets.json'

/** Caches public STAC JSON requests so publisher classification and tree construction share each response. */
const catalogJsonRequests = new Map<string, Promise<unknown>>()

/**
 * Fetches public catalog JSON and fails rather than leaving a branch in its loading state indefinitely.
 */
async function fetchCatalogJson<T> (url: string, timeout = 10_000): Promise<T> {
  const request = catalogJsonRequests.get(url) ?? fetch(url, { signal: AbortSignal.timeout(timeout) })
    .then(async response => {
      if (!response.ok) {
        throw new Error(`Catalog request failed with HTTP ${response.status}`)
      }

      return response.json()
    })

  catalogJsonRequests.set(url, request)

  return request as Promise<T>
}

/**
 * Fetches direct child entries from a public STAC catalog or provider catalog.
 */
export async function fetchCatalogEntries (url: string) {
  const catalog = await fetchCatalogJson<StacCatalog>(url)

  return catalog.links
    .filter(link => link.rel === 'child')
    .map(link => ({ href: link.href, title: link.title ?? link.href }))
}

/** Retrieves an official collection's Earth Engine asset type for its leaf icon. */
export async function fetchCatalogAssetType (url: string) {
  const catalog = await fetchCatalogJson<StacCatalog>(url)

  return catalog['gee:type']
}

/** Maps Earth Engine asset types to the compact catalog icon and its semantic color. */
export function getCatalogAssetPresentation (type: string | undefined): CatalogAssetPresentation {
  switch (type?.toLowerCase()) {
    case 'image': {
      return { color: '#fbc02d', icon: 'mdi-image' }
    }
    case 'image_collection':
    case 'imagecollection': {
      return { color: '#7e57c2', icon: 'mdi-image-multiple' }
    }
    case 'feature_collection':
    case 'featurecollection':
    case 'table': {
      return { color: '#43a047', icon: 'mdi-table' }
    }
    default: {
      return { icon: 'mdi-database-outline' }
    }
  }
}

/**
 * Identifies publisher providers dynamically from their public STAC metadata so no provider list is hardcoded.
 */
export async function fetchPublisherHrefs (providers: CatalogEntry[]) {
  const catalogs = await Promise.allSettled(
    providers.map(async provider => ({
      href: provider.href,
      catalog: await fetchCatalogJson<StacCatalog>(provider.href, 5000),
    })),
  )

  return new Set(catalogs.flatMap(result => {
    return result.status === 'fulfilled' && result.value.catalog['gee:publisher']?.type === 'PUBLISHER'
      ? [result.value.href]
      : []
  }))
}

/**
 * Fetches the unauthenticated community-dataset manifest.
 */
export function fetchCommunityDatasets () {
  return fetchCatalogJson<CommunityDataset[]>(communityCatalogUrl, 15_000)
}

/**
 * Warms the public catalog requests needed by the tree without allowing a failed branch to delay application startup.
 */
export async function preloadCatalog () {
  const [providersResult] = await Promise.allSettled([
    fetchCatalogEntries(catalogUrl),
    fetchCommunityDatasets(),
  ])

  if (providersResult.status !== 'fulfilled') {
    return
  }

  await Promise.allSettled(providersResult.value.map(async provider => {
    const collections = await fetchCatalogEntries(provider.href)

    await Promise.allSettled(collections.map(collection => fetchCatalogAssetType(collection.href)))
  }))
}

/**
 * Groups community datasets by theme and keeps one entry for each external documentation page.
 */
export function buildCommunityThemes (datasets: CommunityDataset[]) {
  const themesByTitle = new Map<string, CommunityDataset[]>()
  const documentationUrls = new Set<string>()

  for (const dataset of datasets) {
    if (documentationUrls.has(dataset.docs)) {
      continue
    }

    documentationUrls.add(dataset.docs)
    const title = dataset.thematic_group || 'Other'
    const theme = themesByTitle.get(title) ?? []

    theme.push(dataset)
    themesByTitle.set(title, theme)
  }

  const themes = [...themesByTitle].map(([title, themeDatasets]) => ({
    datasets: themeDatasets,
    title,
  }))

  themes.sort((first, second) => first.title.localeCompare(second.title))

  return themes
}

/**
 * Builds the official Earth Engine public catalog URL for one collection identifier.
 */
export function getDatasetCatalogUrl (datasetId: string) {
  return `https://developers.google.com/earth-engine/datasets/catalog/${datasetId.replaceAll('/', '_')}`
}
