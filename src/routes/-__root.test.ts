import { describe, expect, it } from 'vitest'
import { Route } from './__root'

describe('Root route head metadata', () => {
  it('includes the manifest link and Apple PWA metadata', () => {
    const head = Route.options.head?.()

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
