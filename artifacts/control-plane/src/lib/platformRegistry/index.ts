export {
  PLATFORM_PAGES,
  WORKSPACE_DISPLAY_LABELS,
  ARCHETYPE_META,
  getPlatformPageById,
  getPlatformPageByHref,
  getPagesByWorkspace,
  getPagesByArchetype,
  getWorkspaceForHref,
} from './platformRegistry'

export type {
  PlatformPageDefinition,
  WorkspaceId,
  ArchetypeId,
  PersonaId,
} from './platformRegistry'
