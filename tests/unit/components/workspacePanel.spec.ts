import { describe, expect, it } from 'vitest'
import { getWorkspacePanelId } from '@/components/workspace/workspacePanel'

describe('getWorkspacePanelId', () => {
  it('accepts only known workspace panel identifiers', () => {
    expect(getWorkspacePanelId('editor')).toBe('editor')
    expect(getWorkspacePanelId('primary-sidebar')).toBe('primary-sidebar')
    expect(getWorkspacePanelId('unknown')).toBeNull()
    expect(getWorkspacePanelId(null)).toBeNull()
  })
})
