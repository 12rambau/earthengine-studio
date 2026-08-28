/** Represents a Google Cloud project accessible through the current OAuth account. */
export interface GoogleCloudProject {
  id: string
  name: string
  number?: string
}

/** Requests read-only access to the current account's visible Google Cloud projects. */
export const googleCloudProjectReadScope = 'https://www.googleapis.com/auth/cloud-platform.read-only'

/** Lists every Google Cloud project the current account can view through Cloud Resource Manager. */
export async function fetchGoogleCloudProjects (accessToken: string): Promise<GoogleCloudProject[]> {
  const projects: GoogleCloudProject[] = []
  let pageToken: string | undefined

  do {
    const requestUrl = new URL('https://cloudresourcemanager.googleapis.com/v1/projects')
    requestUrl.searchParams.set('pageSize', '1000')

    if (pageToken) {
      requestUrl.searchParams.set('pageToken', pageToken)
    }

    const response = await fetch(requestUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error('Unable to retrieve Google Cloud projects. Ensure Cloud Resource Manager is enabled and project access was granted.')
    }

    const page = parseGoogleCloudProjectPage(await response.json())
    projects.push(...page.projects)
    pageToken = page.nextPageToken
  } while (pageToken)

  const sortedProjects = [...projects]

  // The configured TypeScript library does not yet include the non-mutating Array.prototype.toSorted API.
  // eslint-disable-next-line unicorn/no-array-sort
  return sortedProjects.sort((firstProject, secondProject) => {
    return firstProject.name.localeCompare(secondProject.name) || firstProject.id.localeCompare(secondProject.id)
  })
}

/** Represents the project fields returned by one Cloud Resource Manager result page. */
interface GoogleCloudProjectPage {
  nextPageToken?: string
  projects: GoogleCloudProject[]
}

/** Validates a Cloud Resource Manager response while ignoring malformed individual project entries. */
function parseGoogleCloudProjectPage (payload: unknown): GoogleCloudProjectPage {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Google returned an invalid Cloud project list.')
  }

  const page = payload as Record<string, unknown>
  const projects = Array.isArray(page.projects)
    ? page.projects.flatMap(project => parseGoogleCloudProject(project))
    : []

  return {
    nextPageToken: getString(page.nextPageToken),
    projects,
  }
}

/** Converts one valid Google Cloud Resource Manager project into application data. */
function parseGoogleCloudProject (payload: unknown): GoogleCloudProject[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return []
  }

  const project = payload as Record<string, unknown>
  const id = getString(project.projectId)

  if (!id) {
    return []
  }

  return [{
    id,
    name: getString(project.name) ?? id,
    number: getString(project.projectNumber),
  }]
}

/** Narrows optional response fields to non-empty strings. */
function getString (value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}
