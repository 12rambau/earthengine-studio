/** Identifies one documented argument accepted by an Earth Engine algorithm. */
export interface ApiDocumentationArgument {
  details: string
  name: string
  type: string
}

/** Represents the algorithm metadata returned by the Earth Engine API registry. */
export interface ApiDocumentationEntry {
  args: ApiDocumentationArgument[]
  description: string
  id: string
  name: string
  returns: string
  usage: string
}

/** Retains the last loaded registry because API definitions are stable for a Google Cloud project. */
let cachedDocumentation: ApiDocumentationEntry[] | undefined

/** Identifies the Google Cloud project associated with the cached API registry. */
let cachedProjectId: string | undefined

/** Retrieves the complete active Earth Engine algorithm registry for an authorized Google Cloud project. */
export async function fetchEarthEngineApiDocumentation (accessToken: string, projectId: string) {
  if (cachedProjectId === projectId && cachedDocumentation) {
    return cachedDocumentation
  }

  const earthEngine = (await import('@google/earthengine')).default
  const requestUrl = new URL(`https://earthengine.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/algorithms`)
  requestUrl.searchParams.set('prettyPrint', 'false')
  const response = await fetch(requestUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Unable to retrieve Earth Engine API docs. Ensure the Earth Engine API is enabled for the selected project.')
  }

  const entries = parseApiDocumentationEntries(earthEngine.rpc_convert.algorithms(await response.json()))

  cachedDocumentation = entries
  cachedProjectId = projectId

  return entries
}

/** Converts the Earth Engine algorithm registry into the shared documentation metadata consumed by the sidebar. */
function parseApiDocumentationEntries (registry: unknown): ApiDocumentationEntry[] {
  if (!isRecord(registry)) {
    throw new Error('Earth Engine returned an invalid API documentation registry.')
  }

  return Object.entries(registry).flatMap(([algorithmName, signature]) => {
    if (!isRecord(signature) || signature.deprecated) {
      return []
    }

    const name = algorithmName.startsWith('ee.') ? algorithmName : `ee.${algorithmName}`
    const args = Array.isArray(signature.args)
      ? signature.args.flatMap(argument => parseApiDocumentationArgument(argument))
      : []

    return [{
      args,
      description: getString(signature.description) ?? '',
      id: name.toLowerCase().replaceAll('.', ''),
      name,
      returns: getString(signature.returns) ?? '',
      usage: `${name}(${args.map(argument => argument.name).join(', ')})`,
    }]
  })
}

/** Converts one valid algorithm argument from the remote registry into sidebar documentation metadata. */
function parseApiDocumentationArgument (argument: unknown): ApiDocumentationArgument[] {
  if (!isRecord(argument)) {
    return []
  }

  const name = getString(argument.name)

  return name
    ? [{
        details: getString(argument.description) ?? '',
        name,
        type: getString(argument.type) ?? '',
      }]
    : []
}

/** Narrows an unknown remote object into a record suitable for defensive property access. */
function isRecord (value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** Narrows optional registry fields to non-empty strings. */
function getString (value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}
