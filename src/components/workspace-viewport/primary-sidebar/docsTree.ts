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

/** Describes an item rendered by Vuetify's hierarchical documentation tree. */
export interface DocumentationTreeItem {
  children?: DocumentationTreeItem[]
  props?: {
    href: string
    rel: 'noopener noreferrer'
    target: '_blank'
  }
  title: string
  value: string
}

/** Retains hierarchy and API metadata while a flat algorithm registry is converted into tree items. */
interface DocumentationTreeNode {
  children: Map<string, DocumentationTreeNode>
  entry?: ApiDocumentationEntry
  title: string
  value: string
}

/** Points documentation leaves to the official Earth Engine API reference. */
const apiDocumentationUrl = 'https://developers.google.com/earth-engine/api_docs'

/**
 * Builds the official Earth Engine API reference URL for one dotted algorithm name.
 */
export function getApiDocumentationUrl (name: string) {
  return `${apiDocumentationUrl}#${name.toLowerCase().replaceAll('.', '')}`
}

/**
 * Converts an internal documentation node into the shape consumed by Vuetify's tree view.
 */
function toDocumentationTreeItem (node: DocumentationTreeNode): DocumentationTreeItem {
  const childNodes = [...node.children.values()]

  childNodes.sort((first, second) => first.title.localeCompare(second.title))

  const children = childNodes.map(child => toDocumentationTreeItem(child))

  return {
    children: children.length > 0 ? children : undefined,
    props: node.entry && children.length === 0
      ? {
          href: getApiDocumentationUrl(node.entry.name),
          rel: 'noopener noreferrer',
          target: '_blank',
        }
      : undefined,
    title: node.title,
    value: node.value,
  }
}

/**
 * Builds the extension's dotted API hierarchy for the web tree view and hides the technical `ee` root.
 */
export function buildDocumentationTree (entries: ApiDocumentationEntry[]) {
  const root: DocumentationTreeNode = {
    children: new Map(),
    title: '',
    value: '',
  }

  for (const entry of entries) {
    let node = root
    const names = entry.name.split('.')

    for (const [index, title] of names.entries()) {
      const value = names.slice(0, index + 1).join('.')
      const child = node.children.get(title) ?? {
        children: new Map(),
        title,
        value,
      }

      node.children.set(title, child)
      node = child
    }

    node.entry = entry
  }

  const rootChildren = [...(root.children.get('ee') ?? root).children.values()]

  rootChildren.sort((first, second) => first.title.localeCompare(second.title))

  return rootChildren.map(node => toDocumentationTreeItem(node))
}
