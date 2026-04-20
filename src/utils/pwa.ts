export type ManualInstallMode = 'none' | 'ios' | 'safari-desktop'

const APPLE_MOBILE_PATTERN = /iPad|iPhone|iPod/
const SAFARI_PATTERN = /Safari/
const OTHER_IOS_BROWSERS_PATTERN = /CriOS|EdgiOS|FxiOS|OPiOS/
const OTHER_DESKTOP_BROWSERS_PATTERN =
  /Chrome|Chromium|Edg|OPR|Firefox|Arc|Brave|SamsungBrowser/

export function isIosDevice(userAgent: string, maxTouchPoints = 0) {
  return (
    APPLE_MOBILE_PATTERN.test(userAgent) ||
    (userAgent.includes('Macintosh') && maxTouchPoints > 1)
  )
}

export function isSafariDesktop(userAgent: string, maxTouchPoints = 0) {
  if (isIosDevice(userAgent, maxTouchPoints)) {
    return false
  }

  return (
    userAgent.includes('Macintosh') &&
    SAFARI_PATTERN.test(userAgent) &&
    !OTHER_DESKTOP_BROWSERS_PATTERN.test(userAgent)
  )
}

export function getManualInstallMode(userAgent: string, maxTouchPoints = 0) {
  if (isIosDevice(userAgent, maxTouchPoints)) {
    return 'ios'
  }

  if (isSafariDesktop(userAgent, maxTouchPoints)) {
    return 'safari-desktop'
  }

  return 'none'
}

export function isStandaloneDisplay({
  displayModeStandalone,
  navigatorStandalone = false,
}: {
  displayModeStandalone: boolean
  navigatorStandalone?: boolean
}) {
  return displayModeStandalone || navigatorStandalone
}

export function isIosSafari(userAgent: string, maxTouchPoints = 0) {
  return (
    isIosDevice(userAgent, maxTouchPoints) &&
    SAFARI_PATTERN.test(userAgent) &&
    !OTHER_IOS_BROWSERS_PATTERN.test(userAgent)
  )
}
