import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchEarthEngineAsset,
  fetchEarthEngineAssetFeatures,
  fetchEarthEngineAssetPage,
} from '@/services/earthEngineAssets'

describe('Earth Engine asset service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the complete metadata required to preview an image asset by its ID', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      json: async () => ({
        bands: [{
          dataType: { precision: 'INT16', range: { max: 10_000, min: 0 } },
          grid: {
            affineTransform: { scaleX: 10, scaleY: -10 },
            crsCode: 'EPSG:32631',
            dimensions: { height: 10_980, width: 10_980 },
          },
          id: 'B4',
        }],
        name: 'projects/example/assets/image',
        properties: { description: 'Red band image' },
        sizeBytes: '240000000',
        startTime: '2026-01-01T00:00:00Z',
        type: 'IMAGE',
      }),
      ok: true,
    })
    vi.stubGlobal('fetch', fetchStub)

    const asset = await fetchEarthEngineAsset('access-token', 'projects/example/assets/image')

    expect(fetchStub.mock.calls[0][0].toString()).toBe('https://earthengine.googleapis.com/v1/projects/example/assets/image')
    expect(fetchStub).toHaveBeenCalledWith(expect.any(URL), {
      headers: { Authorization: 'Bearer access-token' },
    })
    expect(asset).toMatchObject({
      bands: [{
        dataType: { precision: 'INT16', range: { max: 10_000, min: 0 } },
        grid: { crsCode: 'EPSG:32631', dimensions: { height: 10_980, width: 10_980 } },
        id: 'B4',
      }],
      name: 'projects/example/assets/image',
      properties: { description: 'Red band image' },
      type: 'IMAGE',
    })
  })

  it('loads a bounded image-collection page and reports that more child images exist', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      json: async () => ({
        assets: [{ name: 'projects/example/assets/collection/image-1', type: 'IMAGE' }],
        nextPageToken: 'next-page',
      }),
      ok: true,
    })
    vi.stubGlobal('fetch', fetchStub)

    const page = await fetchEarthEngineAssetPage('access-token', 'projects/example/assets/collection', 100)

    expect(fetchStub.mock.calls[0][0].toString()).toBe('https://earthengine.googleapis.com/v1/projects/example/assets/collection:listAssets?pageSize=100')
    expect(page).toEqual({
      assets: [{ name: 'projects/example/assets/collection/image-1', type: 'IMAGE' }],
      nextPageToken: 'next-page',
    })
  })

  it('loads a bounded feature sample for a FeatureCollection preview', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      json: async () => ({
        features: [{
          geometry: { coordinates: [2.35, 48.85], type: 'Point' },
          properties: { name: 'Paris', population: 2_148_000 },
          type: 'Feature',
        }],
      }),
      ok: true,
    })
    vi.stubGlobal('fetch', fetchStub)

    const features = await fetchEarthEngineAssetFeatures('access-token', 'projects/example/assets/cities', 20)

    expect(fetchStub.mock.calls[0][0].toString()).toBe('https://earthengine.googleapis.com/v1/projects/example/assets/cities:listFeatures?pageSize=20')
    expect(features).toEqual([{
      geometry: { coordinates: [2.35, 48.85], type: 'Point' },
      properties: { name: 'Paris', population: 2_148_000 },
      type: 'Feature',
    }])
  })
})
