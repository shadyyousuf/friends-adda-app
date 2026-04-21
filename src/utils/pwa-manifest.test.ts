import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

type ManifestIcon = {
  src: string
  sizes: string
  type: string
  purpose?: string
}

type ManifestShortcut = {
  name: string
  icons?: ManifestIcon[]
}

type ManifestScreenshot = {
  src: string
}

type PwaManifest = {
  icons: ManifestIcon[]
  shortcuts: ManifestShortcut[]
  screenshots: ManifestScreenshot[]
}

describe('pwa manifest', () => {
  it('uses opaque install icons for installed surfaces and keeps screenshots in /pwa', async () => {
    const manifestText = await readFile(
      new URL('../../public/manifest.json', import.meta.url),
      'utf8',
    )
    const manifest = JSON.parse(manifestText) as PwaManifest

    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: '/install-icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        }),
        expect.objectContaining({
          src: '/install-icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        }),
        expect.objectContaining({
          src: '/install-icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        }),
        expect.objectContaining({
          src: '/install-icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        }),
      ]),
    )

    expect(manifest.shortcuts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Create Event',
          icons: [expect.objectContaining({ src: '/install-icon-192.png' })],
        }),
        expect.objectContaining({
          name: 'Members',
          icons: [expect.objectContaining({ src: '/install-icon-192.png' })],
        }),
        expect.objectContaining({
          name: 'History',
          icons: [expect.objectContaining({ src: '/install-icon-192.png' })],
        }),
      ]),
    )

    expect(manifest.screenshots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: '/pwa/dashboard-seeded.svg' }),
        expect.objectContaining({ src: '/pwa/event-detail-seeded.svg' }),
      ]),
    )
  })
})
