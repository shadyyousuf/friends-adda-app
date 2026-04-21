import { describe, expect, it, vi } from 'vitest'

vi.mock('../hooks/usePwaUpdate', () => ({
  usePwaUpdate: () => ({
    isOfflineReady: false,
    isUpdateReady: false,
    isUpdating: false,
    applyUpdate: async () => {},
  }),
}))

import { Route } from './__root'

describe('Root route head metadata', () => {
  it('includes the manifest link and Apple PWA metadata', async () => {
    const head = await Route.options.head?.({} as never)

    expect(head).toBeDefined()
    expect(head?.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rel: 'manifest', href: '/manifest.json' }),
        expect.objectContaining({ rel: 'icon', href: '/logo.png' }),
        expect.objectContaining({ rel: 'icon', href: '/favicon.ico' }),
        expect.objectContaining({ rel: 'apple-touch-icon', href: '/logo1024.png' }),
      ]),
    )
    expect(head?.meta).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'mobile-web-app-capable',
          content: 'yes',
        }),
        expect.objectContaining({
          name: 'apple-mobile-web-app-capable',
          content: 'yes',
        }),
        expect.objectContaining({
          name: 'apple-mobile-web-app-title',
          content: 'Friends Adda',
        }),
        expect.objectContaining({
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'black-translucent',
        }),
      ]),
    )
  })
})
