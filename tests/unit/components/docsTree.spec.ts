import { describe, expect, it } from 'vitest'
import { type ApiDocumentationEntry, buildDocumentationTree, getApiDocumentationUrl } from '@/components/workspace-viewport/primary-sidebar/docsTree'

/** Provides representative registry entries for documentation tree assertions. */
const apiEntries: ApiDocumentationEntry[] = [
  {
    args: [],
    description: 'Returns image metadata.',
    id: 'eeimagegetinfo',
    name: 'ee.Image.getInfo',
    returns: 'Object',
    usage: 'ee.Image.getInfo()',
  },
  {
    args: [],
    description: 'Computes the absolute value of each pixel.',
    id: 'eeimageabs',
    name: 'ee.Image.abs',
    returns: 'Image',
    usage: 'ee.Image.abs()',
  },
]

describe('buildDocumentationTree', () => {
  it('hides the technical ee root and preserves dotted API hierarchy', () => {
    expect(buildDocumentationTree(apiEntries)).toEqual([
      {
        children: [
          {
            children: undefined,
            props: {
              href: 'https://developers.google.com/earth-engine/api_docs#eeimageabs',
              rel: 'noopener noreferrer',
              target: '_blank',
            },
            title: 'abs',
            value: 'ee.Image.abs',
          },
          {
            children: undefined,
            props: {
              href: 'https://developers.google.com/earth-engine/api_docs#eeimagegetinfo',
              rel: 'noopener noreferrer',
              target: '_blank',
            },
            title: 'getInfo',
            value: 'ee.Image.getInfo',
          },
        ],
        props: undefined,
        title: 'Image',
        value: 'ee.Image',
      },
    ])
  })
})

describe('getApiDocumentationUrl', () => {
  it('uses the algorithm name as the official documentation anchor', () => {
    expect(getApiDocumentationUrl('ee.Image.abs')).toBe(
      'https://developers.google.com/earth-engine/api_docs#eeimageabs',
    )
  })
})
