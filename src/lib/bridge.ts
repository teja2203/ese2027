/* ══════════════════════════════════════════════════════════════
   bridge.ts — typed AndroidESE bridge contract.
   The Kotlin @JavascriptInterface surface is a frozen ABI: names
   and arities below are taken verbatim from legacy/js/app.v63.js
   call sites (55 methods). Do NOT rename or re-arg them — the APK
   would break silently. Web fallbacks are no-ops / safe defaults.
   ══════════════════════════════════════════════════════════════ */

export interface AndroidESE {
  /* ── focus / fullscreen ── */
  startNativeFocus(
    workMins: number,
    breakMins: number,
    loop: boolean,
    strict: boolean,
    soundMode: string,
    soundVolume: number,
    remainingSecs: number
  ): void
  pauseNativeFocus(): void
  stopNativeFocus(): void
  skipNativeFocus(): void
  setFullscreen(on: boolean): void

  /* ── notifications ── */
  postNotification(title: string, body: string, kind: string): void
  requestNotificationPermission(): void
  notificationPermission(): string
  openNotificationSettings(): void
  sessionNotificationsEnabled(): boolean
  setSessionNotificationsEnabled(on: boolean): void
  dailyRemindersEnabled(): boolean
  setDailyRemindersEnabled(on: boolean): void
  missedFocusRemindersEnabled(): boolean
  setMissedFocusRemindersEnabled(on: boolean): void
  getMissedFocusSettings(): string
  setMissedFocusSettings(
    quietStartHour: number,
    quietEndHour: number,
    delayMinutes: number,
    dailyLimit: number,
    noFocusHour: number
  ): void

  /* ── in-app inbox ── */
  getInAppNotifications(): string
  getUnreadNotificationCount(): number
  createInAppNotification(json: string): void
  setNotificationRead(id: string, read: boolean): void
  markAllNotificationsRead(): void
  deleteInAppNotification(id: string): void

  /* ── backup / auth ── */
  saveBackup(json: string): void
  readLatestBackup(): string
  getBackupStatus(): string
  shareBackup(json: string, filename: string): boolean | string
  setAuthSession(accessToken: string, refreshToken: string): void
  signOutSupabase(): void

  /* ── domain records ── */
  getPlans(): string
  savePlan(json: string): void
  getFocusSessions(): string
  restoreFocusSession(json: string): void

  /* ── app/site blocking ── */
  getInstalledApps(): string
  getBlockedApps(): string
  setBlockedApp(pkg: string, name: string, on: boolean): void
  removeBlockedApp(pkg: string): void
  setBlockedAppLimit(pkg: string, minutes: number): void
  setBlockShortsOnly(pkg: string, on: boolean): void
  setAllowFirstShort(pkg: string, on: boolean): void
  setRemindersEnabled(pkg: string, on: boolean): void
  setBlockStrict(pkg: string, days: number): void
  getBlockedWebsites(): string
  setBlockedWebsite(domain: string, on: boolean): void
  setWebBlockingEnabled(on: boolean): void
  setWebsiteStrict(days: number): void
  getBlockingStatus(): string
  getBlockingStats(): string
  refreshUsageStats(): void
  getScheduleBlocking(): string
  setScheduleBlocking(on: boolean, appsJson: string): void

  /* ── permissions ── */
  isAccessibilityEnabled(): boolean
  canDrawOverlays(): boolean
  isUsageStatsGranted(): boolean
  isIgnoringBatteryOptimizations(): boolean
  openAccessibilitySettings(): void
  openOverlaySettings(): void
  openUsageStatsSettings(): void
  openBatterySettings(): void
}

declare global {
  interface Window {
    AndroidESE?: Partial<AndroidESE>
    /* native → web */
    eseOpenRoute?: (route: string) => void
    /* signed-in check for the cloud-sync row (legacy eseSyncUser) */
    eseSyncUser?: () => boolean
    /* web → native (provided by the native shell) */
    eseRequestCloudSync?: () => void
    /* called by Kotlin on every back press; returning true consumes it */
    eseHandleAndroidBack?: () => boolean
    /* supabase client bound by supabase.ts */
    sbAuth?: { signOut: () => Promise<unknown> }
    Capacitor?: {
      isNativePlatform: () => boolean
      Plugins?: Record<string, unknown>
    }
  }
}

/** Safe call helper: optional-chains every method so the web build and
 *  older APKs degrade to no-ops instead of throwing. */
export function bridge<T extends keyof AndroidESE>(
  method: T,
  ...args: Parameters<NonNullable<AndroidESE[T]>>
): void {
  const fn = window.AndroidESE?.[method] as
    | ((...a: Parameters<NonNullable<AndroidESE[T]>>) => unknown)
    | undefined
  if (typeof fn === 'function') {
    try {
      fn(...args)
    } catch (e) {
      console.error(`AndroidESE.${String(method)} failed`, e)
    }
  }
}

/** Safe getter: returns the native return value or a fallback. */
export function bridgeGet<T extends keyof AndroidESE>(
  method: T,
  fallback: ReturnType<NonNullable<AndroidESE[T]>>
): ReturnType<NonNullable<AndroidESE[T]>> {
  const fn = window.AndroidESE?.[method] as
    | ((...a: Parameters<NonNullable<AndroidESE[T]>>) => ReturnType<NonNullable<AndroidESE[T]>>)
    | undefined
  if (typeof fn === 'function') {
    try {
      return fn(...([] as Parameters<NonNullable<AndroidESE[T]>>))
    } catch (e) {
      console.error(`AndroidESE.${String(method)} failed`, e)
    }
  }
  return fallback
}

export const isNative = (): boolean => !!window.AndroidESE

/** Host functions that only exist in the native shell. */
export const requestCloudSync = (): void => {
  window.eseRequestCloudSync?.()
}
export const openRoute = (route: string): void => {
  window.eseOpenRoute?.(route)
}
