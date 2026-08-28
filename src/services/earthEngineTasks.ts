/** Describes the metadata Earth Engine attaches to a long-running import or export operation. */
export interface EarthEngineOperationMetadata {
  createTime?: string
  description?: string
  endTime?: string
  startTime?: string
  state?: string
  type?: string
}

/** Represents one Earth Engine long-running operation displayed by the task panels. */
export interface EarthEngineOperation {
  done?: boolean
  error?: {
    code?: number
    message?: string
  }
  metadata?: EarthEngineOperationMetadata
  name: string
}

/** Identifies the import or export class rendered by a task-list tab. */
export type EarthEngineTaskFilter = 'export' | 'import'

/** Identifies the semantic output type used to select a task icon. */
export type EarthEngineTaskKind
  = 'classifier-export'
    | 'export'
    | 'image-export'
    | 'import'
    | 'map-export'
    | 'table-export'
    | 'unknown'
    | 'video-export'

/** Describes the valid fields of one Earth Engine operations-list result page. */
interface EarthEngineOperationPage {
  nextPageToken?: string
  operations: EarthEngineOperation[]
}

/** Limits background task refreshes to the same bounded scan size used by the extension. */
const maximumOperations = 1000

/** Provides the Earth Engine REST API root used by authenticated operation requests. */
const earthEngineApiUrl = 'https://earthengine.googleapis.com/v1'

/** Retrieves recent Earth Engine operations for a project, following result pages up to the task scan limit. */
export async function fetchEarthEngineOperations (accessToken: string, projectId: string): Promise<EarthEngineOperation[]> {
  const operations: EarthEngineOperation[] = []
  let pageToken: string | undefined

  do {
    const requestUrl = new URL(`${earthEngineApiUrl}/projects/${encodeURIComponent(projectId)}/operations`)
    requestUrl.searchParams.set('pageSize', String(Math.min(100, maximumOperations - operations.length)))

    if (pageToken) {
      requestUrl.searchParams.set('pageToken', pageToken)
    }

    const response = await fetch(requestUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error('Unable to retrieve Earth Engine tasks. Ensure the Earth Engine API is enabled and the selected project is accessible.')
    }

    const page = parseEarthEngineOperationPage(await response.json())
    operations.push(...page.operations)
    pageToken = page.nextPageToken
  } while (pageToken && operations.length < maximumOperations)

  return operations
}

/** Requests cancellation of a currently pending or running Earth Engine operation. */
export async function cancelEarthEngineOperation (accessToken: string, operationName: string) {
  const response = await fetch(`${earthEngineApiUrl}/${operationName}:cancel`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Unable to cancel this Earth Engine task.')
  }
}

/** Returns whether an operation belongs to the requested task list. */
export function matchesEarthEngineTaskFilter (operation: EarthEngineOperation, filter: EarthEngineTaskFilter) {
  return filter === 'export' ? isEarthEngineExportTask(operation) : isEarthEngineImportTask(operation)
}

/** Returns whether an operation is an Earth Engine export, including legacy tasks with no type metadata. */
export function isEarthEngineExportTask (operation: EarthEngineOperation) {
  const type = operation.metadata?.type?.toUpperCase() ?? ''

  return type.startsWith('EXPORT') || type === ''
}

/** Returns whether an operation represents an Earth Engine import or ingest. */
export function isEarthEngineImportTask (operation: EarthEngineOperation) {
  const type = operation.metadata?.type?.toUpperCase() ?? ''

  return type.startsWith('IMPORT') || type.startsWith('INGEST')
}

/** Derives the visible lifecycle state from operation metadata and completion state. */
export function getEarthEngineTaskState (operation: EarthEngineOperation) {
  return operation.metadata?.state ?? (operation.done ? 'SUCCEEDED' : 'PENDING')
}

/** Indicates whether a task remains active and should keep the panel's automatic refresh running. */
export function isEarthEngineTaskActive (operation: EarthEngineOperation) {
  return ['PENDING', 'RUNNING', 'CANCELLING'].includes(getEarthEngineTaskState(operation))
}

/** Identifies which active states expose the task cancellation action. */
export function isEarthEngineTaskCancellable (operation: EarthEngineOperation) {
  return ['PENDING', 'RUNNING'].includes(getEarthEngineTaskState(operation))
}

/** Maps an operation's server type to the task icon category used by the panel. */
export function getEarthEngineTaskKind (operation: EarthEngineOperation): EarthEngineTaskKind {
  switch (operation.metadata?.type?.toUpperCase()) {
    case 'EXPORT_CLASSIFIER': {
      return 'classifier-export'
    }
    case 'EXPORT_IMAGE': {
      return 'image-export'
    }
    case 'EXPORT_TABLE':
    case 'EXPORT_FEATURES': {
      return 'table-export'
    }
    case 'EXPORT_TILES': {
      return 'map-export'
    }
    case 'EXPORT_VIDEO': {
      return 'video-export'
    }
    default: {
      return isEarthEngineExportTask(operation)
        ? 'export'
        : (isEarthEngineImportTask(operation) ? 'import' : 'unknown')
    }
  }
}

/** Uses the server description when available, falling back to the stable operation identifier. */
export function getEarthEngineTaskDescription (operation: EarthEngineOperation) {
  return operation.metadata?.description ?? operation.name.split('/').pop() ?? operation.name
}

/** Produces the compact elapsed-time label displayed beside a started or completed task. */
export function getEarthEngineTaskElapsedTime (operation: EarthEngineOperation) {
  const startTime = operation.metadata?.startTime

  if (!startTime || startTime === '1970-01-01T00:00:00.000Z' || getEarthEngineTaskState(operation) === 'PENDING') {
    return ''
  }

  const elapsedMilliseconds = (operation.metadata?.endTime ? Date.parse(operation.metadata.endTime) : Date.now()) - Date.parse(startTime)

  if (!Number.isFinite(elapsedMilliseconds) || elapsedMilliseconds < 0) {
    return ''
  }

  const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000)

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s`
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m`
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)

  return elapsedHours < 24 ? `${elapsedHours}h` : `${Math.floor(elapsedHours / 24)}d`
}

/** Validates an operations-list page while discarding malformed individual operations. */
function parseEarthEngineOperationPage (payload: unknown): EarthEngineOperationPage {
  if (!isRecord(payload)) {
    throw new Error('Earth Engine returned an invalid task list.')
  }

  return {
    nextPageToken: getString(payload.nextPageToken),
    operations: Array.isArray(payload.operations)
      ? payload.operations.flatMap(operation => parseEarthEngineOperation(operation))
      : [],
  }
}

/** Converts a valid REST operation into the subset required by the task panels. */
function parseEarthEngineOperation (payload: unknown): EarthEngineOperation[] {
  if (!isRecord(payload)) {
    return []
  }

  const name = getString(payload.name)

  if (!name) {
    return []
  }

  return [{
    done: typeof payload.done === 'boolean' ? payload.done : undefined,
    error: parseEarthEngineOperationError(payload.error),
    metadata: parseEarthEngineOperationMetadata(payload.metadata),
    name,
  }]
}

/** Preserves a valid operation failure message for use in a task-row tooltip. */
function parseEarthEngineOperationError (payload: unknown) {
  if (!isRecord(payload)) {
    return undefined
  }

  const message = getString(payload.message)

  return message
    ? {
        code: typeof payload.code === 'number' ? payload.code : undefined,
        message,
      }
    : undefined
}

/** Preserves the operation metadata fields required to classify and render a task. */
function parseEarthEngineOperationMetadata (payload: unknown) {
  if (!isRecord(payload)) {
    return undefined
  }

  return {
    createTime: getString(payload.createTime),
    description: getString(payload.description),
    endTime: getString(payload.endTime),
    startTime: getString(payload.startTime),
    state: getString(payload.state),
    type: getString(payload.type),
  } satisfies EarthEngineOperationMetadata
}

/** Narrows a JSON value into a record suitable for defensive REST field access. */
function isRecord (value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** Narrows optional REST values to non-empty strings. */
function getString (value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}
