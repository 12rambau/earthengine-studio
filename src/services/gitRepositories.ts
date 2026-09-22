/** Receives the repository endpoint selected during a connection attempt. */
export interface GitRepositoryConnectionInput {
  repositoryUrl: string
}

/** Describes a verified GitHub repository that can store Earth Engine JavaScript scripts. */
export interface GitRepository {
  apiUrl: string
  defaultBranch: string
  id: string
  name: string
  projectPath: string
  repositoryUrl: string
  webUrl: string
}

/** Represents one JavaScript file from a connected repository's recursive file tree. */
export interface GitRepositoryFile {
  path: string
}

/** Normalizes a GitHub repository URL and confirms its access token can inspect the remote repository. */
export async function connectGitRepository (
  input: GitRepositoryConnectionInput,
  accessToken: string,
): Promise<GitRepository> {
  const parsedUrl = parseGitRepositoryUrl(input)
  const response = await requestGitJson<GitHubRepositoryResponse>(
    `https://api.github.com/repos/${parsedUrl.projectPath}`,
    accessToken,
  )
  const defaultBranch = response.default_branch

  if (!defaultBranch) {
    throw new Error('This GitHub repository has no default branch.')
  }

  return {
    apiUrl: 'https://api.github.com',
    defaultBranch,
    id: `github:${response.full_name}`,
    name: response.name,
    projectPath: response.full_name,
    repositoryUrl: parsedUrl.repositoryUrl,
    webUrl: response.html_url,
  }
}

/** Retrieves all JavaScript files from a repository so its visible hierarchy can exclude non-script content. */
export async function fetchGitRepositoryFiles (
  repository: GitRepository,
  accessToken: string,
): Promise<GitRepositoryFile[]> {
  const response = await requestGitJson<GitHubTreeResponse>(
    `${repository.apiUrl}/repos/${repository.projectPath}/git/trees/${encodeURIComponent(repository.defaultBranch)}?recursive=1`,
    accessToken,
  )

  const files = response.tree.flatMap(entry => entry.type === 'blob' && isJavaScriptFile(entry.path)
    ? [{ path: entry.path }]
    : [])
  files.sort((first, second) => first.path.localeCompare(second.path))

  return files
}

/** Creates a new JavaScript file on the repository's default branch and records it through GitHub's contents API. */
export async function createGitRepositoryScript (
  repository: GitRepository,
  accessToken: string,
  path: string,
  content: string,
): Promise<void> {
  const scriptPath = getJavaScriptFilePath(path)

  await requestGitJson(
    `${repository.apiUrl}/repos/${repository.projectPath}/contents/${encodeRepositoryPath(scriptPath)}`,
    accessToken,
    {
      body: JSON.stringify({
        branch: repository.defaultBranch,
        content: encodeBase64(content),
        message: `Create ${scriptPath}`,
      }),
      method: 'PUT',
    },
  )
}

/** Captures the path parsed from a supplied GitHub repository URL. */
interface ParsedRepositoryUrl {
  projectPath: string
  repositoryUrl: string
}

/** Parses a supported HTTPS GitHub repository URL. */
function parseGitRepositoryUrl (input: GitRepositoryConnectionInput): ParsedRepositoryUrl {
  let repositoryUrl: URL

  try {
    repositoryUrl = new URL(input.repositoryUrl.trim())
  } catch {
    throw new Error('Enter a complete HTTPS repository URL.')
  }

  if (repositoryUrl.protocol !== 'https:') {
    throw new Error('Repository URLs must use HTTPS.')
  }

  if (repositoryUrl.hostname !== 'github.com') {
    throw new Error('GitHub repositories must use a github.com URL.')
  }

  const projectPath = repositoryUrl.pathname
    .replace(/\/+$/, '')
    .replace(/\.git$/, '')
    .replace(/^\//, '')

  if (projectPath.split('/').length !== 2 || projectPath.split('/').some(segment => !segment)) {
    throw new Error('Enter a GitHub repository URL in the form https://github.com/owner/repository.')
  }

  return {
    projectPath,
    repositoryUrl: repositoryUrl.toString().replace(/\/$/, ''),
  }
}

/** Performs an authenticated GitHub request and parses the successful JSON response. */
async function requestGitJson<T> (
  requestUrl: string,
  accessToken: string,
  requestInit?: RequestInit,
): Promise<T> {
  const headers = new Headers(requestInit?.headers)
  headers.set('Accept', 'application/json')

  if (requestInit?.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (accessToken.trim()) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(requestUrl, { ...requestInit, headers })

  if (!response.ok) {
    throw new Error(`GitHub request failed with HTTP ${response.status}.`)
  }

  return response.json() as Promise<T>
}

/** Validates that a new repository file is a normalized JavaScript path rather than a traversal or unsupported file type. */
function getJavaScriptFilePath (path: string) {
  const normalizedPath = path.trim().replace(/^\/+/, '')

  if (!normalizedPath || normalizedPath.split('/').some(segment => !segment || segment === '.' || segment === '..')) {
    throw new Error('Enter a valid repository-relative script path.')
  }

  if (!isJavaScriptFile(normalizedPath)) {
    throw new Error('Script files must use the .js extension.')
  }

  return normalizedPath
}

/** Identifies JavaScript files displayed by the workspace filesystem. */
function isJavaScriptFile (path: string) {
  return path.toLowerCase().endsWith('.js')
}

/** Encodes each repository path segment without escaping directory separators required by GitHub's API. */
function encodeRepositoryPath (path: string) {
  return path.split('/').map(segment => encodeURIComponent(segment)).join('%2F')
}

/** Base64-encodes UTF-8 source code for GitHub's repository contents endpoint. */
function encodeBase64 (content: string) {
  const bytes = new TextEncoder().encode(content)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCodePoint(byte)
  }

  return btoa(binary)
}

/** Defines the GitHub repository fields needed to create a connected scripts repository. */
interface GitHubRepositoryResponse {
  default_branch?: string
  full_name: string
  html_url: string
  name: string
}

/** Defines the GitHub tree fields needed to display JavaScript files. */
interface GitHubTreeResponse {
  tree: Array<{
    path: string
    type: string
  }>
}
