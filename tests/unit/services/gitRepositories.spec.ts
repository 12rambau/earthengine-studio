import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  connectGitRepository,
  createGitRepositoryScript,
  fetchGitRepositoryFiles,
  type GitRepository,
} from '@/services/gitRepositories'

describe('Git repository service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('connects a GitHub repository and resolves its default branch from authenticated metadata', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      json: async () => ({
        default_branch: 'main',
        full_name: 'example/earth-engine-scripts',
        html_url: 'https://github.com/example/earth-engine-scripts',
        name: 'earth-engine-scripts',
      }),
      ok: true,
    })
    vi.stubGlobal('fetch', fetchStub)

    const repository = await connectGitRepository({
      provider: 'github',
      repositoryUrl: 'https://github.com/example/earth-engine-scripts.git',
    }, 'github-token')

    expect(fetchStub).toHaveBeenCalledWith('https://api.github.com/repos/example/earth-engine-scripts', expect.objectContaining({
      headers: expect.any(Headers),
    }))
    expect(repository).toMatchObject({
      defaultBranch: 'main',
      projectPath: 'example/earth-engine-scripts',
      provider: 'github',
    })
  })

  it('shows only JavaScript blobs from a GitHub repository tree', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      json: async () => ({
        tree: [
          { path: 'README.md', type: 'blob' },
          { path: 'scripts/analysis.js', type: 'blob' },
          { path: 'scripts/helpers', type: 'tree' },
          { path: 'scripts/map.JS', type: 'blob' },
        ],
      }),
      ok: true,
    })
    vi.stubGlobal('fetch', fetchStub)
    const repository: GitRepository = {
      apiUrl: 'https://api.github.com',
      defaultBranch: 'main',
      id: 'github:example/earth-engine-scripts',
      name: 'earth-engine-scripts',
      projectPath: 'example/earth-engine-scripts',
      provider: 'github',
      repositoryUrl: 'https://github.com/example/earth-engine-scripts',
      webUrl: 'https://github.com/example/earth-engine-scripts',
    }

    const files = await fetchGitRepositoryFiles(repository, 'github-token')

    expect(files).toEqual([
      { path: 'scripts/analysis.js' },
      { path: 'scripts/map.JS' },
    ])
  })

  it('creates a JavaScript file through GitLab with a provider commit request', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      json: async () => ({}),
      ok: true,
    })
    vi.stubGlobal('fetch', fetchStub)
    const repository: GitRepository = {
      apiUrl: 'https://gitlab.example/api/v4',
      defaultBranch: 'main',
      id: 'gitlab:https://gitlab.example/group/scripts',
      name: 'scripts',
      projectId: '42',
      projectPath: 'group/scripts',
      provider: 'gitlab',
      repositoryUrl: 'https://gitlab.example/group/scripts',
      webUrl: 'https://gitlab.example/group/scripts',
    }

    await createGitRepositoryScript(repository, 'gitlab-token', 'analysis/ndvi.js', 'Map.centerObject(point)')

    expect(fetchStub).toHaveBeenCalledWith(
      'https://gitlab.example/api/v4/projects/42/repository/files/analysis%2Fndvi.js',
      expect.objectContaining({
        body: JSON.stringify({
          branch: 'main',
          commit_message: 'Create analysis/ndvi.js',
          content: 'Map.centerObject(point)',
        }),
        method: 'POST',
      }),
    )
  })
})
