/** Identifies the Git hosting APIs supported by the scripts workspace. */
export type GitProvider = 'github' | 'gitlab'

/** Receives the repository endpoint and optional branch selected during a connection attempt. */
export interface GitRepositoryConnectionInput {
  branch?: string
  provider: GitProvider
  repositoryUrl: string
}

/** Describes a verified remote repository that can store Earth Engine JavaScript scripts. */
export interface GitRepository {
  apiUrl: string
  defaultBranch: string
  id: string
  name: string
  projectId?: string
  projectPath: string
  provider: GitProvider
  repositoryUrl: string
  webUrl: string
}

/** Represents one JavaScript file from a connected repository's recursive file tree. */
export interface GitRepositoryFile {
  path: string
}

/** Normalizes a provider repository URL and confirms its access token can inspect the remote repository. */
export async function connectGitRepository (
  input: GitRepositoryConnectionInput,
  accessToken: string,
): Promise<GitRepository> {
  const parsedUrl = parseGitRepositoryUrl(input)

  return input.provider === 'github'
    ? connectGitHubRepository(parsedUrl, input, accessToken)
    : connectGitLabRepository(parsedUrl, input, accessToken)
}

/** Retrieves all JavaScript files from a repository so its visible hierarchy can exclude non-script content. */
export async function fetchGitRepositoryFiles (
  repository: GitRepository,
  accessToken: string,
): Promise<GitRepositoryFile[]> {
  const files = repository.provider === 'github'
    ? await fetchGitHubRepositoryFiles(repository, accessToken)
    : await fetchGitLabRepositoryFiles(repository, accessToken)

  files.sort((first, second) => first.path.localeCompare(second.path))

  return files
}

/** Creates a new JavaScript file in the selected branch and records it through the provider's native commit API. */
export async function createGitRepositoryScript (
  repository: GitRepository,
  accessToken: string,
  path: string,
  content: string,
): Promise<void> {
  const scriptPath = getJavaScriptFilePath(path)
  const commitMessage = `Create ${scriptPath}`

  if (repository.provider === 'github') {
    await requestGitJson(
      `${repository.apiUrl}/repos/${repository.projectPath}/contents/${encodeRepositoryPath(scriptPath)}`,
      'github',
      accessToken,
      {
        body: JSON.stringify({
          branch: repository.defaultBranch,
          content: encodeBase64(content),
          message: commitMessage,
        }),
        method: 'PUT',
      },
    )
    return
  }

  await requestGitJson(
    `${repository.apiUrl}/projects/${repository.projectId}/repository/files/${encodeRepositoryPath(scriptPath)}`,
    'gitlab',
    accessToken,
    {
      body: JSON.stringify({
        branch: repository.defaultBranch,
        commit_message: commitMessage,
        content,
      }),
      method: 'POST',
    },
  )
}

/** Captures the provider-independent path and origin parsed from a supplied repository URL. */
interface ParsedRepositoryUrl {
  origin: string
  projectPath: string
  repositoryUrl: string
}

/** Parses a supported HTTPS repository URL, accepting GitHub and nested GitLab namespace paths. */
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

  const projectPath = repositoryUrl.pathname
    .replace(/\/+$/, '')
    .replace(/\.git$/, '')
    .replace(/^\//, '')

  if (!projectPath || projectPath.split('/').some(segment => !segment)) {
    throw new Error('Enter a repository URL including its owner or group and name.')
  }

  if (input.provider === 'github' && repositoryUrl.hostname !== 'github.com') {
    throw new Error('GitHub repositories must use a github.com URL.')
  }

  if (input.provider === 'github' && projectPath.split('/').length !== 2) {
    throw new Error('Enter a GitHub repository URL in the form https://github.com/owner/repository.')
  }

  return {
    origin: repositoryUrl.origin,
    projectPath,
    repositoryUrl: repositoryUrl.toString().replace(/\/$/, ''),
  }
}

/** Confirms access to a GitHub repository and resolves its default branch from the repository endpoint. */
async function connectGitHubRepository (
  parsedUrl: ParsedRepositoryUrl,
  input: GitRepositoryConnectionInput,
  accessToken: string,
): Promise<GitRepository> {
  const response = await requestGitJson<GitHubRepositoryResponse>(
    `https://api.github.com/repos/${parsedUrl.projectPath}`,
    'github',
    accessToken,
  )
  const defaultBranch = input.branch?.trim() || response.default_branch

  if (!defaultBranch) {
    throw new Error('This GitHub repository has no default branch.')
  }

  return {
    apiUrl: 'https://api.github.com',
    defaultBranch,
    id: `github:${response.full_name}`,
    name: response.name,
    projectPath: response.full_name,
    provider: 'github',
    repositoryUrl: parsedUrl.repositoryUrl,
    webUrl: response.html_url,
  }
}

/** Confirms access to a GitLab project and resolves its default branch from the provider's v4 API. */
async function connectGitLabRepository (
  parsedUrl: ParsedRepositoryUrl,
  input: GitRepositoryConnectionInput,
  accessToken: string,
): Promise<GitRepository> {
  const apiUrl = `${parsedUrl.origin}/api/v4`
  const response = await requestGitJson<GitLabRepositoryResponse>(
    `${apiUrl}/projects/${encodeURIComponent(parsedUrl.projectPath)}`,
    'gitlab',
    accessToken,
  )
  const defaultBranch = input.branch?.trim() || response.default_branch

  if (!defaultBranch) {
    throw new Error('This GitLab repository has no default branch.')
  }

  return {
    apiUrl,
    defaultBranch,
    id: `gitlab:${parsedUrl.origin}/${response.path_with_namespace}`,
    name: response.name,
    projectId: String(response.id),
    projectPath: response.path_with_namespace,
    provider: 'gitlab',
    repositoryUrl: parsedUrl.repositoryUrl,
    webUrl: response.web_url,
  }
}

/** Fetches GitHub's recursive tree and keeps only blob paths with a JavaScript file extension. */
async function fetchGitHubRepositoryFiles (
  repository: GitRepository,
  accessToken: string,
): Promise<GitRepositoryFile[]> {
  const response = await requestGitJson<GitHubTreeResponse>(
    `${repository.apiUrl}/repos/${repository.projectPath}/git/trees/${encodeURIComponent(repository.defaultBranch)}?recursive=1`,
    'github',
    accessToken,
  )

  return response.tree.flatMap(entry => entry.type === 'blob' && isJavaScriptFile(entry.path)
    ? [{ path: entry.path }]
    : [])
}

/** Fetches every GitLab tree page and keeps only blob paths with a JavaScript file extension. */
async function fetchGitLabRepositoryFiles (
  repository: GitRepository,
  accessToken: string,
): Promise<GitRepositoryFile[]> {
  const files: GitRepositoryFile[] = []
  let page = '1'

  do {
    const requestUrl = new URL(`${repository.apiUrl}/projects/${repository.projectId}/repository/tree`)
    requestUrl.searchParams.set('page', page)
    requestUrl.searchParams.set('per_page', '100')
    requestUrl.searchParams.set('recursive', 'true')
    requestUrl.searchParams.set('ref', repository.defaultBranch)
    const response = await requestGitResponse(requestUrl.toString(), 'gitlab', accessToken)
    const entries = await response.json() as GitLabTreeEntry[]

    files.push(...entries.flatMap(entry => entry.type === 'blob' && isJavaScriptFile(entry.path)
      ? [{ path: entry.path }]
      : []))
    page = response.headers.get('x-next-page') ?? ''
  } while (page)

  return files
}

/** Performs an authenticated provider request and parses the successful JSON response. */
async function requestGitJson<T> (
  requestUrl: string,
  provider: GitProvider,
  accessToken: string,
  requestInit?: RequestInit,
): Promise<T> {
  const response = await requestGitResponse(requestUrl, provider, accessToken, requestInit)

  return response.json() as Promise<T>
}

/** Performs an authenticated provider request and exposes headers for GitLab pagination. */
async function requestGitResponse (
  requestUrl: string,
  provider: GitProvider,
  accessToken: string,
  requestInit?: RequestInit,
): Promise<Response> {
  const headers = new Headers(requestInit?.headers)
  headers.set('Accept', 'application/json')

  if (requestInit?.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (accessToken.trim()) {
    headers.set(provider === 'github' ? 'Authorization' : 'PRIVATE-TOKEN', provider === 'github' ? `Bearer ${accessToken}` : accessToken)
  }

  const response = await fetch(requestUrl, { ...requestInit, headers })

  if (!response.ok) {
    throw new Error(`${provider === 'github' ? 'GitHub' : 'GitLab'} request failed with HTTP ${response.status}.`)
  }

  return response
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

/** Encodes each repository path segment without escaping directory separators required by the provider APIs. */
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

/** Defines the GitLab project fields needed to create a connected scripts repository. */
interface GitLabRepositoryResponse {
  default_branch?: string
  id: number
  name: string
  path_with_namespace: string
  web_url: string
}

/** Defines one GitLab tree entry returned by the recursive repository endpoint. */
interface GitLabTreeEntry {
  path: string
  type: string
}
