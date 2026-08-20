/* ══════════════════════════════════════════════════════════════
   inbox.ts — in-app notification feed (ported from legacy).
   Native-first (AndroidESE methods), web fallback to INBOX_KEY.
   ══════════════════════════════════════════════════════════════ */

import * as S from './storage'
import { bridge } from './bridge'
import { commit, state } from './state'
import { toast } from 'sonner'

export interface InboxItem {
  id: string
  type?: string
  title: string
  message: string
  route?: string
  blockId?: string | null
  planId?: string | null
  focusSessionId?: string | null
  dedupeKey?: string
  createdAt?: number
  readAt?: number | null
  deletedAt?: number | null
}

export function notificationRecords(): InboxItem[] {
  if (window.AndroidESE?.getInAppNotifications) {
    const value = S.parseDomain<unknown>(window.AndroidESE.getInAppNotifications(), [])
    return Array.isArray(value) ? (value as InboxItem[]) : []
  }
  return (S.loadJSON<InboxItem[]>(S.INBOX_KEY, []) as InboxItem[])
    .filter((item) => !item.deletedAt)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

export function unreadNotificationCount(): number {
  if (window.AndroidESE?.getUnreadNotificationCount) return Number(window.AndroidESE.getUnreadNotificationCount()) || 0
  return notificationRecords().filter((item) => !item.readAt).length
}

export function recordInAppNotification(
  title: string,
  body: string,
  type?: string,
  route?: string,
  related?: { blockId?: string | null; planId?: string | null; focusSessionId?: string | null }
) {
  const normalizedType = type || 'study'
  const payload: InboxItem = {
    id: `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: normalizedType,
    title,
    message: body,
    route: route || 'today',
    blockId: related?.blockId || null,
    planId: related?.planId || null,
    focusSessionId: related?.focusSessionId || null,
    dedupeKey: `${normalizedType}:${related?.blockId || title}:${S.todayKey()}`,
    createdAt: Date.now()
  }
  if (window.AndroidESE?.createInAppNotification) {
    try {
      window.AndroidESE.createInAppNotification(JSON.stringify(payload))
    } catch {
      /* native dropped it — ignore */
    }
    return
  }
  const all = S.loadJSON<InboxItem[]>(S.INBOX_KEY, [])
  const existing = all.findIndex((item) => item.dedupeKey === payload.dedupeKey)
  if (existing >= 0) all[existing] = { ...all[existing], ...payload }
  else all.unshift(payload)
  S.saveJSON(S.INBOX_KEY, all.slice(0, 100))
}

export function setNotificationReadLocal(id: string, read: boolean) {
  if (window.AndroidESE?.setNotificationRead) {
    bridge('setNotificationRead', id, read)
    return
  }
  const all = S.loadJSON<InboxItem[]>(S.INBOX_KEY, []).map((item) =>
    item.id === id ? { ...item, readAt: read ? Date.now() : null } : item
  )
  S.saveJSON(S.INBOX_KEY, all)
  commit()
}

export function markAllNotificationsReadLocal() {
  if (window.AndroidESE?.markAllNotificationsRead) {
    bridge('markAllNotificationsRead')
    return
  }
  S.saveJSON(
    S.INBOX_KEY,
    S.loadJSON<InboxItem[]>(S.INBOX_KEY, []).map((item) => ({ ...item, readAt: item.readAt || Date.now() }))
  )
  commit()
}

export function deleteNotificationLocal(id: string) {
  if (window.AndroidESE?.deleteInAppNotification) {
    bridge('deleteInAppNotification', id)
    return
  }
  S.saveJSON(
    S.INBOX_KEY,
    S.loadJSON<InboxItem[]>(S.INBOX_KEY, []).map((item) => (item.id === id ? { ...item, deletedAt: Date.now() } : item))
  )
  commit()
}

/* ── session notifications (legacy notify/askNotifPermission port) ── */
export function notifSupported(): boolean {
  return !!(
    window.AndroidESE?.postNotification ||
    window.Capacitor?.isNativePlatform?.() ||
    window.Capacitor?.Plugins?.LocalNotifications ||
    'Notification' in window
  )
}

export function askNotifPermission(): Promise<string> {
  if (!notifSupported()) return Promise.resolve('unsupported')
  if (window.AndroidESE?.requestNotificationPermission) {
    const result = (window.AndroidESE.requestNotificationPermission as unknown as () => string)()
    if (result !== 'pending') return Promise.resolve(result)
    return new Promise((resolve) => {
      let checks = 0
      const poll = setInterval(() => {
        const status = (window.AndroidESE?.notificationPermission as unknown as () => string | undefined)?.()
        if (status !== 'pending' || checks++ > 120) {
          clearInterval(poll)
          resolve(status === 'pending' ? 'denied' : status || 'denied')
        }
      }, 250)
    })
  }
  if (window.Capacitor?.isNativePlatform?.() || window.Capacitor?.Plugins?.LocalNotifications) {
    const LN = window.Capacitor?.Plugins?.LocalNotifications as unknown as {
      requestPermissions?: () => Promise<{ display?: string }>
    }
    if (LN?.requestPermissions) {
      return LN.requestPermissions()
        .then((res) => (res.display === 'granted' ? 'granted' : 'denied'))
        .catch(() => 'denied')
    }
  }
  if (typeof Notification !== 'undefined' && Notification.permission !== 'default')
    return Promise.resolve(Notification.permission)
  return new Promise((res) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      res(typeof Notification !== 'undefined' ? Notification.permission : 'granted')
    }
    try {
      if (typeof Notification !== 'undefined' && Notification.requestPermission) {
        const r = Notification.requestPermission(finish)
        if (r && r.then) r.then(finish).catch(finish)
      } else finish()
    } catch {
      finish()
    }
    let n = 0
    const iv = setInterval(() => {
      n++
      if ((typeof Notification !== 'undefined' && Notification.permission !== 'default') || n > 40) {
        clearInterval(iv)
        finish()
      }
    }, 500)
  })
}

let nativeFocusStartedRef = false
export function setNativeFocusStarted(v: boolean) {
  nativeFocusStartedRef = v
}

export function notify(title: string, body: string, kind?: string) {
  const route = /focus/i.test(kind || '') ? 'focus' : /progress|achievement/i.test(kind || '') ? 'progress' : 'today'
  recordInAppNotification(title, body, kind || 'study', route, undefined)
  if (!state.notif || !notifSupported()) return
  if (window.AndroidESE?.postNotification) {
    if (kind === 'focus-phase' && nativeFocusStartedRef) return
    const nativeKind = kind || (/achievement/i.test(title) ? 'achievement' : /day|week|progress/i.test(title) ? 'progress' : 'session')
    window.AndroidESE.postNotification(title, body, nativeKind)
    return
  }
  if (window.Capacitor?.Plugins?.LocalNotifications) {
    const LN = window.Capacitor.Plugins.LocalNotifications as unknown as {
      schedule: (o: { notifications: Array<{ title: string; body: string; id: number }> }) => Promise<void>
    }
    LN.schedule({
      notifications: [{ title, body, id: Math.floor(Math.random() * 1e9) }]
    }).catch(() => undefined)
    return
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title, { body })
    } catch {
      /* webview may reject — ignore */
    }
  }
}

/* ── notification preference toggles (legacy 863-927 port) ── */
export function notifOn(): boolean {
  if (window.AndroidESE?.notificationPermission) {
    const nativePref = window.AndroidESE.sessionNotificationsEnabled
      ? window.AndroidESE.sessionNotificationsEnabled()
      : state.notif
    return !!state.notif && !!nativePref && window.AndroidESE.notificationPermission() === 'granted'
  }
  if (window.Capacitor?.isNativePlatform?.() || window.Capacitor?.Plugins?.LocalNotifications) return !!state.notif
  return (
    state.notif && notifSupported() && typeof Notification !== 'undefined' && Notification.permission === 'granted'
  )
}

export function toggleNotif(): void {
  if (!notifSupported()) {
    toast('Notifications not supported on this device')
    return
  }
  if (!notifOn()) {
    state.notif = true
    S.saveJSON(S.NOTIF_KEY, true)
    askNotifPermission().then((p) => {
      if (p === 'granted') {
        if (window.AndroidESE?.setSessionNotificationsEnabled) window.AndroidESE.setSessionNotificationsEnabled(true)
        toast('Session completion alerts on')
        notify('Notifications enabled', 'Session and break completion alerts are ready.', 'session')
      } else if (p === 'denied') {
        state.notif = false
        S.saveJSON(S.NOTIF_KEY, false)
        if (window.AndroidESE?.setSessionNotificationsEnabled) window.AndroidESE.setSessionNotificationsEnabled(false)
        toast('Blocked — enable notifications for this app in Android Settings')
      } else {
        toast('Waiting for permission…')
      }
      commit()
    })
    commit()
  } else {
    state.notif = false
    S.saveJSON(S.NOTIF_KEY, false)
    if (window.AndroidESE?.setSessionNotificationsEnabled) window.AndroidESE.setSessionNotificationsEnabled(false)
    toast('Session completion alerts off')
    commit()
  }
}

export function dailyRemindersOn(): boolean {
  return !!window.AndroidESE?.dailyRemindersEnabled && window.AndroidESE.dailyRemindersEnabled()
}

export function toggleDailyReminders(): void {
  if (!window.AndroidESE?.setDailyRemindersEnabled) {
    toast('Daily reminders are available in the Android app')
    return
  }
  if (dailyRemindersOn()) {
    window.AndroidESE.setDailyRemindersEnabled(false)
    toast('Daily study reminders off')
    commit()
    return
  }
  askNotifPermission().then((p) => {
    const setDaily = window.AndroidESE?.setDailyRemindersEnabled as unknown as ((on: boolean) => boolean) | undefined
    if (p === 'granted' && setDaily && setDaily(true)) toast('Daily study reminders scheduled')
    else toast(p === 'pending' ? 'Waiting for permission…' : 'Notifications are blocked in Android Settings')
    commit()
  })
}

export interface MissedFocusSettings {
  quietStartHour: number
  quietEndHour: number
  delayMinutes: number
  dailyLimit: number
  noFocusHour: number
}

export function missedFocusRemindersOn(): boolean {
  return !!window.AndroidESE?.missedFocusRemindersEnabled && window.AndroidESE.missedFocusRemindersEnabled()
}

export function missedFocusSettings(): MissedFocusSettings {
  if (!window.AndroidESE?.getMissedFocusSettings) {
    return { quietStartHour: 22, quietEndHour: 7, delayMinutes: 30, dailyLimit: 2, noFocusHour: 20 }
  }
  return S.parseDomain<MissedFocusSettings>(window.AndroidESE.getMissedFocusSettings(), {
    quietStartHour: 22,
    quietEndHour: 7,
    delayMinutes: 30,
    dailyLimit: 2,
    noFocusHour: 20
  })
}

export function toggleMissedFocusReminders(): void {
  if (!window.AndroidESE?.setMissedFocusRemindersEnabled) {
    toast('Missed-focus reminders are available in the Android app')
    return
  }
  const next = !missedFocusRemindersOn()
  const setMissed = window.AndroidESE?.setMissedFocusRemindersEnabled as unknown as ((on: boolean) => boolean) | undefined
  if (setMissed && setMissed(next)) {
    toast(next ? 'Missed-focus follow-ups on' : 'Missed-focus follow-ups off')
    commit()
  } else {
    askNotifPermission().then(() => commit())
    toast('Allow notifications first')
  }
}

/* ── distraction logging (strict mode) ── */
export function logDistraction() {
  const k = S.todayKey()
  const e = state.log[k] || { sessions: 0, minutes: 0 }
  e.distract = (e.distract || 0) + 1
  state.log[k] = e
  S.saveJSON(S.LOG_KEY, state.log)
  commit()
}