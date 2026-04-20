import { describe, expect, it } from 'vitest'
import {
  getManualInstallMode,
  isIosDevice,
  isSafariDesktop,
  isStandaloneDisplay,
} from './pwa'

describe('pwa helpers', () => {
  it('detects iPhone and iPadOS user agents as iOS devices', () => {
    expect(
      isIosDevice(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(true)

    expect(
      isIosDevice(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        5,
      ),
    ).toBe(true)
  })

  it('identifies Safari on macOS for manual Add to Dock help', () => {
    expect(
      isSafariDesktop(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
      ),
    ).toBe(true)

    expect(
      isSafariDesktop(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      ),
    ).toBe(false)
  })

  it('returns the correct manual install mode for Apple platforms', () => {
    expect(
      getManualInstallMode(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('ios')

    expect(
      getManualInstallMode(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
      ),
    ).toBe('safari-desktop')

    expect(
      getManualInstallMode(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      ),
    ).toBe('none')
  })

  it('treats display mode or navigator standalone as installed mode', () => {
    expect(
      isStandaloneDisplay({
        displayModeStandalone: true,
      }),
    ).toBe(true)

    expect(
      isStandaloneDisplay({
        displayModeStandalone: false,
        navigatorStandalone: true,
      }),
    ).toBe(true)

    expect(
      isStandaloneDisplay({
        displayModeStandalone: false,
        navigatorStandalone: false,
      }),
    ).toBe(false)
  })
})
