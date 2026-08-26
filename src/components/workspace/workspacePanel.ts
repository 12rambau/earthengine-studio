export const workspacePanelIds = [
  'primary-sidebar',
  'secondary-sidebar',
  'editor',
  'bottom-panel',
] as const

export type WorkspacePanelId = (typeof workspacePanelIds)[number]

export function getWorkspacePanelId (panelId: string | null): WorkspacePanelId | null {
  return workspacePanelIds.includes(panelId as WorkspacePanelId) ? panelId as WorkspacePanelId : null
}
