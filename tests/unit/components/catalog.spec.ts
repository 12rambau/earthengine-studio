import { describe, expect, it } from 'vitest'
import {
  buildCommunityThemes,
  type CommunityDataset,
  getCatalogAssetPresentation,
  getDatasetCatalogUrl,
} from '@/components/workspace-viewport/primary-sidebar/catalog'

describe('buildCommunityThemes', () => {
  it('groups datasets by theme and keeps one entry for each documentation page', () => {
    const datasets: CommunityDataset[] = [
      {
        docs: 'https://example.com/flood',
        id: 'projects/example/flood',
        thematic_group: 'Hydrology',
        title: 'Flood extent',
        type: 'image',
      },
      {
        docs: 'https://example.com/flood',
        id: 'projects/example/flood-mask',
        thematic_group: 'Hydrology',
        title: 'Flood mask',
        type: 'image',
      },
      {
        docs: 'https://example.com/forest',
        id: 'projects/example/forest',
        thematic_group: 'Land cover',
        title: 'Forest cover',
        type: 'image_collection',
      },
    ]

    expect(buildCommunityThemes(datasets)).toEqual([
      {
        datasets: [
          {
            docs: 'https://example.com/flood',
            id: 'projects/example/flood',
            thematic_group: 'Hydrology',
            title: 'Flood extent',
            type: 'image',
          },
        ],
        title: 'Hydrology',
      },
      {
        datasets: [
          {
            docs: 'https://example.com/forest',
            id: 'projects/example/forest',
            thematic_group: 'Land cover',
            title: 'Forest cover',
            type: 'image_collection',
          },
        ],
        title: 'Land cover',
      },
    ])
  })
})

describe('getDatasetCatalogUrl', () => {
  it('converts the Earth Engine collection identifier to the public catalog path', () => {
    expect(getDatasetCatalogUrl('MODIS/061/MOD13Q1')).toBe(
      'https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD13Q1',
    )
  })
})

describe('getCatalogAssetPresentation', () => {
  it('maps Earth Engine asset types to distinct icons and colors', () => {
    expect(getCatalogAssetPresentation('image')).toEqual({ color: '#fbc02d', icon: 'mdi-image' })
    expect(getCatalogAssetPresentation('image_collection')).toEqual({ color: '#7e57c2', icon: 'mdi-image-multiple' })
    expect(getCatalogAssetPresentation('feature_collection')).toEqual({ color: '#43a047', icon: 'mdi-table' })
    expect(getCatalogAssetPresentation('table')).toEqual({ color: '#43a047', icon: 'mdi-table' })
  })
})
