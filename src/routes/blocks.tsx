/* ══════════════════════════════════════════════════════════════
   blocks.tsx — BLOCKS tab (legacy renderProtection port, K1-K8).
   Thin React shell over AndroidESE: permission banner, app limits
   (wheels/limit sheets/add app), shorts block, website shield,
   schedule blocking, strict-mode picker. Web fallback = offline
   guard card (K1). Native truth is re-read on every render and
   every mutation — never cached (K8).
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from 'react'
import { onBack, state } from '../lib/state'
import * as S from '../lib/storage'
import { isNative } from '../lib/bridge'
import { SLOTS } from '../data'
import { toast } from 'sonner'
import { ScreenHeader } from '../components/screen-header'
import { Switch } from '../components/ui/switch'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../components/ui/drawer'
import { ChevronRight, Lock, Search, Settings2, Shield, TriangleAlert, X } from 'lucide-react'
import { computeStreak } from '../lib/stats'

/* ── helpers (verbatim logic from legacy renderProtection) ── */
const SHORTS_REGEX = /youtube|instagram|facebook|tiktok|snapchat/
const DISTRACT_RE =
  /youtube|instagram|facebook|whatsapp|tiktok|snapchat|netflix|amazon|flipkart|myntra|discord|telegram|twitter|x\.com|reddit|chess|pubg|freefire|hotstar|prime|spotify|zomato|swiggy|shorts|reels|jio|games|game|ludo|candy|tinder|bumble|twitch|mega/
const SUGGESTED_SITES = [
  { label: 'Instagram', domain: 'instagram.com' },
  { label: 'YouTube', domain: 'youtube.com' },
  { label: 'Facebook', domain: 'facebook.com' },
  { label: 'Discord', domain: 'discord.com' }
]

function strictDeadlineTs(days: number): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 23, 59, 59, 999).getTime()
}

function fmtTill(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  let h = d.getHours() % 12
  if (h === 0) h = 12
  const timeStr = h + ':' + d.getMinutes().toString().padStart(2, '0') + ' ' + (d.getHours() >= 12 ? 'PM' : 'AM')
  if (diff === 0) return 'today ' + timeStr
  if (diff === 1) return 'tomorrow ' + timeStr
  if (diff < 7) return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ' ' + timeStr
  return d.getDate() + '/' + (d.getMonth() + 1) + ' ' + timeStr
}

function tillDayTxt(days: number): string {
  if (days <= 1) return 'today 11:59 PM'
  if (days === 2) return 'tomorrow 11:59 PM'
  return (
    ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
      new Date(strictDeadlineTs(days)).getDay()
    ] + ' 11:59 PM'
  )
}

function appAvatar(pkg: string, name: string): string {
  return ((name || pkg || '?').charAt(0) || '?').toUpperCase()
}

function suggestedLimit(smap: Record<string, AppStat>, pkg: string): number {
  const st = smap[pkg] || {}
  const spent = Number(st.spentTodayMin || 0)
  return Math.max(15, Math.min(120, Math.round(Math.max(spent * 1.5, 20) / 5) * 5))
}

interface AppStat {
  packageName?: string
  appName?: string
  isEnabled?: boolean
  spentTodayMin?: number
  dailyLimitMin?: number | null
  blockShortsOnly?: boolean
  allowFirstShort?: boolean
  remindersEnabled?: boolean
  strictUntilTs?: number
}

interface BlocksData {
  accessOk: boolean
  overlayOk: boolean
  webOn: boolean
  usageGranted: boolean
  batteryOk: boolean
  webStrictUntilTs: number
  blockedApps: Map<string, string>
  blockedSites: Set<string>
  smap: Record<string, AppStat>
  allApps: Array<{ packageName: string; appName: string }>
  schedOn: boolean
  schedApps: Map<string, string>
}

function readBlocksData(): BlocksData {
  const empty: BlocksData = {
    accessOk: false,
    overlayOk: false,
    webOn: false,
    usageGranted: false,
    batteryOk: false,
    webStrictUntilTs: 0,
    blockedApps: new Map(),
    blockedSites: new Set(),
    smap: {},
    allApps: [],
    schedOn: false,
    schedApps: new Map()
  }
  const A = window.AndroidESE
  if (!A) return empty

  /* K8: re-read native truth — rows mutate Room directly */
  const rawApps = S.parseDomain<Array<{ packageName?: string; appName?: string }>>(A.getBlockedApps?.() ?? '', [])
  const blockedApps = new Map<string, string>()
  rawApps.forEach((a) => {
    if (a.packageName) blockedApps.set(a.packageName, a.appName || a.packageName)
  })
  const rawSites = S.parseDomain<Array<{ domain?: string; isEnabled?: boolean }>>(A.getBlockedWebsites?.() ?? '', [])
  const blockedSites = new Set<string>()
  rawSites.forEach((s) => {
    if (s.isEnabled !== false && s.domain) blockedSites.add(s.domain.toLowerCase().trim())
  })

  const status = S.parseDomain<Record<string, unknown>>(A.getBlockingStatus?.() ?? '', {})
  const accessOk =
    status.accessibilityEnabled !== undefined
      ? !!status.accessibilityEnabled
      : A.isAccessibilityEnabled
        ? A.isAccessibilityEnabled()
        : false
  const overlayOk =
    status.overlayAllowed !== undefined ? !!status.overlayAllowed : A.canDrawOverlays ? A.canDrawOverlays() : true
  const webOn = status.webBlockingEnabled !== undefined ? !!status.webBlockingEnabled : true
  const usageGranted = !!(A.isUsageStatsGranted && A.isUsageStatsGranted())
  const batteryOk = !!(A.isIgnoringBatteryOptimizations && A.isIgnoringBatteryOptimizations())
  const webStrictUntilTs = Number(status.webStrictUntilTs || 0)

  const smap: Record<string, AppStat> = {}
  if (usageGranted) {
    const raw = S.parseDomain<AppStat[]>(A.getBlockingStats?.() ?? '', [])
    if (Array.isArray(raw)) raw.forEach((s) => s && s.packageName && (smap[s.packageName] = s))
  }

  let allApps: Array<{ packageName: string; appName: string }> = []
  try {
    const v = S.parseDomain<Array<{ packageName?: string; appName?: string }>>(A.getInstalledApps?.() ?? '', [])
    allApps = Array.isArray(v) ? v.map((a) => ({ packageName: a.packageName || '', appName: a.appName || '' })) : []
  } catch {
    allApps = []
  }

  let schedOn = false
  let schedApps = new Map<string, string>()
  try {
    const sc = S.parseDomain<{ enabled?: boolean; apps?: string }>(A.getScheduleBlocking?.() ?? '', {})
    schedOn = !!sc.enabled
    const list = S.parseDomain<Array<{ packageName?: string; appName?: string }>>(sc.apps ?? '[]', [])
    schedApps = new Map(
      (Array.isArray(list) ? list : []).map((a) => [a.packageName || '', a.appName || a.packageName || ''])
    )
  } catch {
    /* defaults stay off */
  }

  return {
    accessOk,
    overlayOk,
    webOn,
    usageGranted,
    batteryOk,
    webStrictUntilTs,
    blockedApps,
    blockedSites,
    smap,
    allApps,
    schedOn,
    schedApps
  }
}

/* ── sheet stack (legacy openSheets/closeTopSheet) ── */
type Sheet =
  | { kind: 'websites' }
  | { kind: 'websitesList' }
  | { kind: 'schedule' }
  | { kind: 'scheduleAdd' }
  | { kind: 'strict'; onConfirm: (days: number) => void }
  | { kind: 'app'; pkg: string; name: string }
  | { kind: 'wheel'; pkg: string; name: string; current: number | null; onDone?: () => void }
  | { kind: 'addApp' }

export function BlocksScreen() {
  const [version, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)
  const [stack, setStack] = useState<Sheet[]>([])
  const openSheet = (s: Sheet) => setStack((st) => [...st, s])
  const closeTop = () => setStack((st) => st.slice(0, -1))

  const native = isNative()
  const data = useMemo(() => readBlocksData(), [native, version])

  /* K8: usage-stats refresh + limit migration once per visit */
  const freshFlag = useRef(false)
  useEffect(() => {
    if (!native) return
    if (data.usageGranted && !freshFlag.current) {
      freshFlag.current = true
      try {
        window.AndroidESE?.refreshUsageStats?.()
      } catch {
        /* ignore */
      }
    }
    /* enforceLimits: migrate apps whose limit is missing/0 to suggested */
    try {
      data.blockedApps.forEach((_name, pkg) => {
        const st = data.smap[pkg] || {}
        const l = st.dailyLimitMin
        if (l === null || l === undefined || Number(l) <= 0) {
          window.AndroidESE?.setBlockedAppLimit?.(pkg, suggestedLimit(data.smap, pkg))
        }
      })
    } catch {
      /* ignore */
    }
  }, [native, data])

  /* poll native status while this screen is mounted */
  useEffect(() => {
    if (!native) return
    const iv = setInterval(refresh, 10000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [native])

  /* Android back closes the top sheet */
  useEffect(() => {
    if (stack.length === 0) return
    return onBack(() => {
      closeTop()
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stack.length])

  return (
    <div className="screen view" role="tabpanel" aria-label="Blocks">
      <div className="stagger">
        <ScreenHeader title="Blocks" sub="App Limits · Shorts · Website Shield" />

        {!native ? (
          <div className="card native-block-manager">
            <div className="blocks-empty">
              <div className="be-glyph">
                <Shield aria-hidden="true" />
              </div>
              <div className="be-title">NATIVE GUARD OFFLINE</div>
              <div className="be-sub">
                App &amp; website blocking lives in the installed Android app — the web shell can&apos;t lock the OS.
              </div>
              <div className="be-hint">Open the installed ESE2027 Android app to arm the shield</div>
            </div>
          </div>
        ) : (
          <div className="card native-block-manager">
            {renderBanner(data)}
            <BlockSection label="App Limits" right={<AddAppButton onClick={() => openSheet({ kind: 'addApp' })} />}>
              {data.blockedApps.size === 0 ? (
                <div className="bl-empty">No apps blocked yet — tap ADD APP to set daily limits on distracting apps.</div>
              ) : (
                Array.from(data.blockedApps.keys()).map((pkg) => {
                  const name = data.blockedApps.get(pkg) || pkg
                  const st = data.smap[pkg] || {}
                  const enabled = st.isEnabled === undefined ? true : st.isEnabled
                  const spent = Number(st.spentTodayMin || 0)
                  const limit = st.dailyLimitMin === null || st.dailyLimitMin === undefined ? null : Number(st.dailyLimitMin)
                  const sub = data.usageGranted
                    ? limit !== null
                      ? spent + 'm spent / ' + limit + 'm'
                      : spent + 'm spent / ' + suggestedLimit(data.smap, pkg) + 'm'
                    : 'Blocked'
                  const over = limit !== null && spent >= limit
                  const strictActive = Number(st.strictUntilTs || 0) > Date.now()
                  const filledBase = limit !== null ? limit : suggestedLimit(data.smap, pkg)
                  const filled = filledBase > 0 ? Math.round(24 * Math.min(1, spent / filledBase)) : 0
                  return (
                    <div
                      key={pkg}
                      className="bl-approw press"
                      style={{ borderColor: over ? 'var(--acc)' : 'var(--line)' }}
                      onClick={() => openSheet({ kind: 'app', pkg, name })}
                    >
                      <div className="bl-av">{appAvatar(pkg, name)}</div>
                      <div className="bl-amain">
                        <div className="bl-at">
                          <span className="bl-aname">{name}</span>
                          {over ? <span className="bl-badge hot">OVER</span> : null}
                          {!enabled ? <span className="bl-badge">PAUSED</span> : null}
                        </div>
                        <div className="bl-asub">
                          {sub}
                          {st.blockShortsOnly ? ' · shorts-only' : ''}
                        </div>
                        {data.usageGranted ? (
                          <div className="nt-seg bl-seg">
                            {Array.from({ length: 24 }, (_, i) => (
                              <i key={i} className={i < filled ? 'on' : ''} />
                            ))}
                          </div>
                        ) : null}
                        {strictActive ? (
                          <div className="bl-strictline">
                            <Lock size={12} aria-hidden="true" />
                            STRICT MODE IS ON TILL {fmtTill(Number(st.strictUntilTs || 0))}
                          </div>
                        ) : null}
                      </div>
                      <div className="bl-actions">
                        <button
                          className="bl-ico press"
                          aria-label={'Settings for ' + name}
                          title={'Settings for ' + name}
                          onClick={(e) => {
                            e.stopPropagation()
                            openSheet({ kind: 'app', pkg, name })
                          }}
                        >
                          <Settings2 size={16} aria-hidden="true" />
                        </button>
                        <span onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={enabled}
                            disabled={strictActive}
                            onCheckedChange={(on) => {
                              try {
                                const r = S.parseDomain<{ blocked_by_strict?: boolean; error?: boolean; strict_until?: number }>(
                                  String(window.AndroidESE?.setBlockedApp?.(pkg, name, on) ?? '{}'),
                                  {}
                                )
                                if (r.blocked_by_strict) toast('Strict mode is on till ' + fmtTill(r.strict_until || 0) + ' — cannot turn off')
                                else if (r.error) toast('Could not update ' + name)
                                else toast(on ? 'App lock ON' : 'App lock OFF')
                              } catch {
                                /* ignore */
                              }
                              refresh()
                            }}
                          />
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </BlockSection>

            {shortsPicks(data).length > 0 && (
              <BlockSection label="Block Shorts">
                {shortsPicks(data).map((item) => {
                  const st = data.smap[item.pkg] || {}
                  const on = !!st.blockShortsOnly
                  const strictActive = Number(st.strictUntilTs || 0) > Date.now()
                  return (
                    <div key={item.pkg} className="bl-row press" onClick={() => openSheet({ kind: 'app', pkg: item.pkg, name: item.name })}>
                      <div className="bl-av">{appAvatar(item.pkg, item.name)}</div>
                      <div className="bl-amain">
                        <div className="bl-rowhead">
                          <span className="bl-aname">{item.name} Shorts</span>
                          <ChevronRight size={16} className="bl-chev" aria-hidden="true" />
                        </div>
                        <div className="bl-dotline">
                          <span className="bl-dot" style={{ background: on ? 'var(--green, #34C759)' : 'var(--ink-3)' }} />
                          <span className="bl-asub">{on ? 'Blocking' : 'Not blocking'}</span>
                          {strictActive ? <span className="bl-badge hot">STRICT</span> : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </BlockSection>
            )}

            <BlockSection label="Other blocks">
              <div
                className="bl-row press"
                onClick={() => openSheet({ kind: 'websites' })}
              >
                <div className="bl-amain">
                  <div className="bl-aname">Block Websites</div>
                  <div className="bl-asub">{data.blockedSites.size} blocked</div>
                </div>
                <ChevronRight size={16} className="bl-chev" aria-hidden="true" />
              </div>
              <div className="bl-row press" onClick={() => openSheet({ kind: 'schedule' })}>
                <div className="bl-amain">
                  <div className="bl-aname">Schedule Block</div>
                  <div className="bl-asub">
                    {data.schedOn
                      ? data.schedApps.size
                        ? data.schedApps.size + ' apps · auto during study slots'
                        : 'On · no apps picked'
                      : 'Off'}
                  </div>
                </div>
                <ChevronRight size={16} className="bl-chev" aria-hidden="true" />
              </div>
            </BlockSection>
          </div>
        )}
      </div>

      {stack.length > 0 && (
        <Drawer open onOpenChange={(v) => !v && closeTop()}>
          <DrawerContent className="bl-sheet">
            <DrawerHeader>
              <DrawerTitle className="display bl-sheet-title">{sheetTitle(stack[stack.length - 1])}</DrawerTitle>
            </DrawerHeader>
            {renderSheet(stack[stack.length - 1], {
              data,
              openSheet,
              closeTop,
              refresh,
              schedApps: data.schedApps,
              schedOn: data.schedOn
            })}
          </DrawerContent>
        </Drawer>
      )}
    </div>
  )
}

function shortsPicks(data: BlocksData): Array<{ pkg: string; name: string }> {
  const pick: Array<{ pkg: string; name: string }> = [
    { pkg: 'com.google.android.youtube', name: 'YouTube' },
    { pkg: 'com.instagram.android', name: 'Instagram' }
  ]
  Array.from(data.blockedApps.keys())
    .filter((pkg) => SHORTS_REGEX.test(pkg))
    .forEach((pkg) => {
      if (!pick.some((p) => p.pkg === pkg)) pick.push({ pkg, name: data.blockedApps.get(pkg) || pkg })
    })
  return pick
}

function renderBanner(data: BlocksData) {
  const rows: Array<{ txt: string; fn: () => void }> = []
  if (!data.accessOk) rows.push({ txt: 'Accessibility needed to lock apps & detect pages', fn: () => window.AndroidESE?.openAccessibilitySettings?.() })
  else if (!data.overlayOk) rows.push({ txt: 'Allow display-over-other-apps for the lock screen', fn: () => window.AndroidESE?.openOverlaySettings?.() })
  else if (!data.usageGranted) rows.push({ txt: 'Enable usage access for per-app daily counters', fn: () => window.AndroidESE?.openUsageStatsSettings?.() })
  else if (!data.batteryOk) rows.push({ txt: 'Let the app run in the background without battery limits', fn: () => window.AndroidESE?.openBatterySettings?.() })
  if (rows.length === 0) return null
  return (
    <div className="bl-banner">
      {rows.map((r, i) => (
        <button key={i} className="bl-permrow press" onClick={r.fn} aria-label={`Grant ${r.txt}`}>
          <span className="bl-permtxt">
            <TriangleAlert size={14} className="bl-warn" aria-hidden="true" />
            {r.txt}
          </span>
          <span className="bl-grant">GRANT</span>
        </button>
      ))}
    </div>
  )
}

function BlockSection({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <div className="bl-sec">
        <span>{label}</span>
        {right}
      </div>
      {children}
    </>
  )
}

function AddAppButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="bl-miniacc press" onClick={onClick} aria-label="Add app">
      ADD APP
    </button>
  )
}

function sheetTitle(s: Sheet): string {
  switch (s.kind) {
    case 'websites':
      return 'Block Websites'
    case 'websitesList':
      return 'Blocked Websites'
    case 'schedule':
      return 'Schedule Block'
    case 'scheduleAdd':
      return 'Add apps to Schedule Block'
    case 'strict':
      return 'Strict mode'
    case 'app':
      return s.name + ' limit'
    case 'wheel':
      return s.name + ' · Usage limit'
    case 'addApp':
      return 'Select an app to add limit'
  }
}

/* ── sheet bodies ── */
function renderSheet(
  s: Sheet,
  ctx: {
    data: BlocksData
    openSheet: (s: Sheet) => void
    closeTop: () => void
    refresh: () => void
    schedApps: Map<string, string>
    schedOn: boolean
  }
) {
  switch (s.kind) {
    case 'websites':
      return <WebsitesSheet ctx={ctx} />
    case 'websitesList':
      return <WebsitesListSheet ctx={ctx} />
    case 'schedule':
      return <ScheduleSheet ctx={ctx} />
    case 'scheduleAdd':
      return <ScheduleAddSheet ctx={ctx} />
    case 'strict':
      return <StrictPicker s={s} ctx={ctx} />
    case 'app':
      return <AppSheet s={s} ctx={ctx} />
    case 'wheel':
      return <LimitWheel s={s} ctx={ctx} />
    case 'addApp':
      return <AddAppSheet ctx={ctx} />
  }
}

function LockCard({ untilTs, msg }: { untilTs: number; msg: string }) {
  return (
    <div className="bl-lock">
      <div className="bl-lock-title">You cannot turn off or edit the block till {fmtTill(untilTs)}</div>
      <div className="bl-lock-sub">{msg}</div>
    </div>
  )
}

function WebsitesSheet({ ctx }: { ctx: Parameters<typeof renderSheet>[1] }) {
  const webStrictActive = ctx.data.webStrictUntilTs > Date.now()
  if (webStrictActive) return <LockCard untilTs={ctx.data.webStrictUntilTs} msg="Strict mode is on — website blocking is locked until then." />
  return (
    <div className="bl-sheetbody">
      <div className="bl-row press" onClick={() => ctx.openSheet({ kind: 'websitesList' })}>
        <div className="bl-amain">
          <div className="bl-aname">Websites</div>
          <div className="bl-asub">{ctx.data.blockedSites.size} blocked</div>
        </div>
        <ChevronRight size={16} className="bl-chev" aria-hidden="true" />
      </div>
      <ToggleRow
        title="Website blocking"
        desc={ctx.data.webOn ? 'ON — blocked sites are filtered everywhere' : 'OFF — blocked sites are reachable'}
        checked={ctx.data.webOn}
        onToggle={(on) => {
          try {
            const r = window.AndroidESE?.setWebBlockingEnabled?.(on) as unknown as string | undefined
            if (r === 'blocked_by_strict') toast('Strict mode is on — you cannot turn off the block')
            else toast(on ? 'Website blocking on' : 'Website blocking paused')
          } catch {
            /* ignore */
          }
          setTimeout(ctx.refresh, 400)
        }}
      />
      <ToggleRow
        title="Strict mode"
        desc="You cannot turn off or edit the block"
        checked={false}
        onToggle={(on) => {
          if (!on) return
          ctx.openSheet({
            kind: 'strict',
            onConfirm: (days) => {
              try {
                const r = S.parseDomain<{ untilTs?: number }>(String(window.AndroidESE?.setWebsiteStrict?.(days) ?? '{}'), {})
                toast('Strict mode on till ' + fmtTill(Number(r.untilTs || 0)))
              } catch {
                /* ignore */
              }
              ctx.closeTop()
              ctx.refresh()
            }
          })
        }}
      />
      <button
        className="bl-offbtn press"
        onClick={() => {
          try {
            const r = window.AndroidESE?.setWebBlockingEnabled?.(!ctx.data.webOn) as unknown as string | undefined
            if (r === 'blocked_by_strict') {
              toast('Strict mode is on — you cannot turn off the block')
              return
            }
            toast(ctx.data.webOn ? 'Website blocking paused' : 'Website blocking on')
          } catch {
            /* ignore */
          }
          ctx.closeTop()
          ctx.refresh()
        }}
      >
        {ctx.data.webOn ? 'TURN OFF BLOCK' : 'RESUME BLOCKING'}
      </button>
    </div>
  )
}

function WebsitesListSheet({ ctx }: { ctx: Parameters<typeof renderSheet>[1] }) {
  const [query, setQuery] = useState('')
  const sites = Array.from(ctx.data.blockedSites).sort()
  const addSite = (val: string) => {
    const clean = val.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')
    if (!clean) return
    if (ctx.data.blockedSites.has(clean)) {
      toast(clean + ' is already blocked')
      setQuery('')
      return
    }
    ctx.data.blockedSites.add(clean)
    setQuery('')
    toast('✓ Blocked ' + clean)
    try {
      window.AndroidESE?.setBlockedWebsite?.(clean, true)
    } catch {
      /* ignore */
    }
    ctx.refresh()
  }
  return (
    <div className="bl-sheetbody">
      <div className="bl-inputwrap">
        <Search size={14} className="bl-inputico" aria-hidden="true" />
        <input
          className="bl-input"
          placeholder="Type/Paste Site URL to add"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addSite(query)
          }}
        />
      </div>
      {sites.length === 0 ? (
        <div className="bl-empty">No websites blocked yet.</div>
      ) : (
        <>
          <div className="bl-listhead">
            <span className="bl-listlabel">Blocked Websites ({sites.length})</span>
            <button
              className="bl-dellink press"
              onClick={() => {
                if (window.confirm('Are you sure you want to remove all ' + sites.length + ' websites?')) {
                  sites.forEach((d) => {
                    try {
                      window.AndroidESE?.setBlockedWebsite?.(d, false)
                    } catch {
                      /* ignore */
                    }
                  })
                  ctx.data.blockedSites.clear()
                  toast('All blocked websites removed')
                  ctx.refresh()
                }
              }}
            >
              DELETE ALL
            </button>
          </div>
          {sites.map((domain) => (
            <div key={domain} className="bl-siterow">
              <span className="bl-sitename">{domain}</span>
              <button
                className="bl-ico press"
                aria-label={'Delete ' + domain}
                title={'Delete ' + domain}
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete ' + domain + '?')) {
                    ctx.data.blockedSites.delete(domain)
                    toast(domain + ' removed from blocked websites')
                    try {
                      window.AndroidESE?.setBlockedWebsite?.(domain, false)
                    } catch {
                      /* ignore */
                    }
                    ctx.refresh()
                  }
                }}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </>
      )}
      <div className="bl-sughead">Suggested</div>
      {SUGGESTED_SITES.map((sug) => {
        const added = ctx.data.blockedSites.has(sug.domain)
        return (
          <div key={sug.domain} className="bl-siterow">
            <span className="bl-sitename">{sug.domain}</span>
            <button
              className={'bl-addbtn press' + (added ? ' added' : '')}
              onClick={() => {
                if (added) {
                  ctx.data.blockedSites.delete(sug.domain)
                  toast(sug.domain + ' removed from blocked websites')
                  try {
                    window.AndroidESE?.setBlockedWebsite?.(sug.domain, false)
                  } catch {
                    /* ignore */
                  }
                } else {
                  ctx.data.blockedSites.add(sug.domain)
                  toast('✓ Blocked ' + sug.domain)
                  try {
                    window.AndroidESE?.setBlockedWebsite?.(sug.domain, true)
                  } catch {
                    /* ignore */
                  }
                }
                ctx.refresh()
              }}
            >
              {added ? 'ADDED ✓' : 'ADD'}
            </button>
          </div>
        )
      })}
      <button className="btn btn-acc press bl-done" onClick={ctx.closeTop} aria-label="Close block editor">
        DONE
      </button>
    </div>
  )
}

function ScheduleSheet({ ctx }: { ctx: Parameters<typeof renderSheet>[1] }) {
  const sOn = ctx.data.schedOn
  const apps = ctx.data.schedApps
  return (
    <div className="bl-sheetbody">
      <ToggleRow
        title="Schedule Block"
        desc={sOn ? 'ON — chosen apps lock automatically during study slots' : 'OFF — apps below stay open during study slots'}
        checked={sOn}
        onToggle={(on) => {
          try {
            window.AndroidESE?.setScheduleBlocking?.(
              on,
              JSON.stringify(Array.from(apps.entries()).map(([p, n]) => ({ packageName: p, appName: n })))
            )
          } catch {
            /* ignore */
          }
          ctx.refresh()
        }}
      />
      <div className="bl-info">
        Study slots come from your Plan (Slot 1–5: {SLOTS.map((s) => s.time).join(' · ')}). While a slot is live, the
        apps below are locked with the shield overlay — the schedule is the shield window.
      </div>
      {apps.size === 0 ? (
        <div className="bl-empty">No apps picked yet — tap ADD APPS below.</div>
      ) : (
        Array.from(apps.entries()).map(([pkg, name]) => (
          <div key={pkg} className="bl-siterow">
            <span className="bl-sitename">{name}</span>
            <button
              className="bl-removebtn press"
              onClick={() => {
                apps.delete(pkg)
                try {
                  window.AndroidESE?.setScheduleBlocking?.(
                    ctx.data.schedOn,
                    JSON.stringify(Array.from(apps.entries()).map(([p, n]) => ({ packageName: p, appName: n })))
                  )
                } catch {
                  /* ignore */
                }
                ctx.refresh()
              }}
            >
              REMOVE
            </button>
          </div>
        ))
      )}
      <button className="bl-addappbtn press" onClick={() => ctx.openSheet({ kind: 'scheduleAdd' })} aria-label="Add apps">
        ADD APPS
      </button>
    </div>
  )
}

function ScheduleAddSheet({ ctx }: { ctx: Parameters<typeof renderSheet>[1] }) {
  const [q, setQ] = useState('')
  const ql = q.toLowerCase()
  const apps = ctx.data.allApps.filter(
    (a) => !ctx.data.schedApps.has(a.packageName) && (!ql || (a.appName + ' ' + a.packageName).toLowerCase().includes(ql))
  )
  const add = (a: { packageName: string; appName: string }) => {
    ctx.data.schedApps.set(a.packageName, a.appName)
    try {
      window.AndroidESE?.setScheduleBlocking?.(
        ctx.data.schedOn,
        JSON.stringify(Array.from(ctx.data.schedApps.entries()).map(([p, n]) => ({ packageName: p, appName: n })))
      )
    } catch {
      /* ignore */
    }
    ctx.refresh()
  }
  return (
    <div className="bl-sheetbody">
      <div className="bl-inputwrap">
        <Search size={14} className="bl-inputico" aria-hidden="true" />
        <input
          className="bl-input"
          placeholder="Search apps"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {apps.length === 0 ? (
        <div className="bl-empty">No matching applications found.</div>
      ) : (
        apps.slice(0, 60).map((a) => (
          <div key={a.packageName} className="bl-siterow">
            <span className="bl-sitename">{a.appName}</span>
            <button className="bl-addbtn press" onClick={() => add(a)} aria-label={`Add ${a.appName}`}>
              ADD
            </button>
          </div>
        ))
      )}
    </div>
  )
}

function StrictPicker({ s, ctx }: { s: Extract<Sheet, { kind: 'strict' }>; ctx: Parameters<typeof renderSheet>[1] }) {
  const [sel, setSel] = useState(1)
  return (
    <div className="bl-sheetbody">
      <div className="bl-strictq">How long do you want to enable strict mode?</div>
      <div className="bl-wheel">
        <div className="bl-wheellist">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <div
              key={d}
              className={'bl-wheelitem' + (d === sel ? ' on' : '')}
              onClick={() => setSel(d)}
            >
              {d} {d === 1 ? 'day' : 'days'}
            </div>
          ))}
        </div>
      </div>
      <div className="bl-strictinfo">You cannot turn off or edit the block till {tillDayTxt(sel)}</div>
      <button
        className="btn btn-acc press bl-done"
        onClick={() => {
          ctx.closeTop()
          s.onConfirm(sel)
        }}
      >
        CONFIRM
      </button>
    </div>
  )
}

function AppSheet({ s, ctx }: { s: Extract<Sheet, { kind: 'app' }>; ctx: Parameters<typeof renderSheet>[1] }) {
  const { pkg, name } = s
  const st = ctx.data.smap[pkg] || {}
  const limit = st.dailyLimitMin === null || st.dailyLimitMin === undefined ? null : Number(st.dailyLimitMin)
  const strictUntil = Number(st.strictUntilTs || 0)
  const strictActive = strictUntil > Date.now()
  const spent = Number(st.spentTodayMin || 0)
  const ref = limit !== null ? limit : suggestedLimit(ctx.data.smap, pkg)
  const over = limit !== null && spent >= limit
  const filled = Math.round(24 * Math.min(1, spent / ref))
  const streak = computeStreak(state).count

  if (strictActive) {
    return <LockCard untilTs={strictUntil} msg="Strict mode is on — settings are locked until then." />
  }

  return (
    <div className="bl-sheetbody">
      <div className="bl-hero">
        <div className="bl-heroleft">
          <div className="bl-herobignum" style={{ color: over ? 'var(--acc)' : 'var(--ink)' }}>
            {ctx.data.usageGranted ? spent : '—'}
          </div>
          <div className="bl-herokey">MIN TODAY</div>
        </div>
        <div className="bl-heroright">
          <div className="bl-heroref">{ref}m</div>
          <div className="bl-herokey">DAILY LIMIT</div>
        </div>
      </div>
      <div className="nt-seg bl-seg">
        {Array.from({ length: 24 }, (_, i) => (
          <i key={i} className={i < filled ? 'on' : ''} />
        ))}
      </div>
      {streak > 0 ? (
        <div className="bl-streakline">
          <span className="bl-flame">🔥</span>
          <span>{streak}-day streak — don&apos;t break it</span>
        </div>
      ) : null}

      <div className="bl-row press bl-limitrow" onClick={() => ctx.openSheet({ kind: 'wheel', pkg, name, current: limit, onDone: ctx.refresh })}>
        <span className="bl-aname">Limit</span>
        <span className="bl-limitval">{limit !== null ? limit + 'm' : suggestedLimit(ctx.data.smap, pkg) + 'm'}</span>
      </div>

      <ToggleRow
        title="Show reminders before limit"
        desc=""
        checked={st.remindersEnabled === undefined ? true : !!st.remindersEnabled}
        onToggle={(on) => {
          try {
            window.AndroidESE?.setRemindersEnabled?.(pkg, on)
            toast(on ? 'Reminders on' : 'Reminders off')
          } catch {
            /* ignore */
          }
          ctx.refresh()
        }}
      />
      <ToggleRow
        title="Strict mode"
        desc="You cannot use the app once the limit is reached"
        checked={false}
        onToggle={(on) => {
          if (!on) return
          ctx.openSheet({
            kind: 'strict',
            onConfirm: (days) => {
              try {
                const r = S.parseDomain<{ untilTs?: number }>(String(window.AndroidESE?.setBlockStrict?.(pkg, days) ?? '{}'), {})
                toast('Strict mode on till ' + fmtTill(Number(r.untilTs || 0)))
              } catch {
                /* ignore */
              }
              ctx.closeTop()
              ctx.closeTop()
              ctx.refresh()
            }
          })
        }}
      />

      <button
        className="bl-offbtn press"
        onClick={() => {
          try {
            const r = S.parseDomain<{ blocked_by_strict?: boolean; error?: boolean; strict_until?: number }>(
              String(window.AndroidESE?.removeBlockedApp?.(pkg) ?? '{}'),
              {}
            )
            if (r.blocked_by_strict) toast('Strict mode is on till ' + fmtTill(r.strict_until || 0) + ' — cannot turn off')
            else if (r.error) toast('Could not remove ' + name)
            else toast(name + ' removed from App Limits')
          } catch {
            /* ignore */
          }
          ctx.closeTop()
          ctx.refresh()
        }}
      >
        TURN OFF BLOCK
      </button>
    </div>
  )
}

function LimitWheel({ s, ctx }: { s: Extract<Sheet, { kind: 'wheel' }>; ctx: Parameters<typeof renderSheet>[1] }) {
  const st = ctx.data.smap[s.pkg] || {}
  const spent = Number(st.spentTodayMin || 0)
  const suggested = Math.max(15, Math.min(120, Math.round(Math.max(spent * 1.5, 20) / 5) * 5))
  const values = useMemo(() => {
    const v: number[] = []
    for (let x = 5; x <= 120; x += 5) v.push(x)
    if (s.current !== null && s.current !== undefined && !v.includes(s.current)) v.push(s.current)
    v.sort((a, b) => a - b)
    return v
  }, [s.current])
  const [sel, setSel] = useState(s.current !== null && s.current !== undefined ? s.current : suggested)
  return (
    <div className="bl-sheetbody">
      <div className="bl-wheel bl-wheeltall">
        <div className="bl-wheellist">
          {values.map((v) => (
            <div key={v} className={'bl-wheelitem' + (v === sel ? ' on' : '')} onClick={() => setSel(v)}>
              {v}
            </div>
          ))}
        </div>
      </div>
      <div className="bl-wheelunit">mins</div>
      <div className="bl-wheelsug">Suggested limit is {suggested}m based on usage.</div>
      <button
        className="btn btn-acc press bl-done"
        onClick={() => {
          try {
            const r = S.parseDomain<{ blocked_by_strict?: boolean; error?: boolean; strict_until?: number }>(
              String(window.AndroidESE?.setBlockedAppLimit?.(s.pkg, sel) ?? '{}'),
              {}
            )
            if (r.blocked_by_strict) toast('Strict mode is on till ' + fmtTill(r.strict_until || 0) + ' — cannot change')
            else if (r.error) toast('Could not update ' + s.name)
            else toast(s.name + ' capped at ' + sel + 'm/day')
          } catch {
            /* ignore */
          }
          ctx.closeTop()
          ctx.refresh()
          if (s.onDone) s.onDone()
        }}
      >
        CONFIRM
      </button>
    </div>
  )
}

function AddAppSheet({ ctx }: { ctx: Parameters<typeof renderSheet>[1] }) {
  const [q, setQ] = useState('')
  const ql = q.toLowerCase()
  const apps = ctx.data.allApps.filter(
    (a) => !ql || (a.appName + ' ' + a.packageName).toLowerCase().includes(ql)
  )
  const distracting = apps.filter((a) => !ctx.data.blockedApps.has(a.packageName) && DISTRACT_RE.test(a.packageName + ' ' + a.appName))
  const others = apps.filter((a) => !ctx.data.blockedApps.has(a.packageName) && !DISTRACT_RE.test(a.packageName + ' ' + a.appName))
  const add = (a: { packageName: string; appName: string }) => {
    try {
      window.AndroidESE?.setBlockedApp?.(a.packageName, a.appName, true)
      window.AndroidESE?.setBlockedAppLimit?.(a.packageName, suggestedLimit(ctx.data.smap, a.packageName))
      toast('Added ' + a.appName + ' · ' + suggestedLimit(ctx.data.smap, a.packageName) + 'm limit')
    } catch {
      /* ignore */
    }
    if (!ctx.data.blockedApps.has(a.packageName)) ctx.data.blockedApps.set(a.packageName, a.appName)
    ctx.closeTop()
    ctx.refresh()
    ctx.openSheet({ kind: 'app', pkg: a.packageName, name: a.appName })
  }
  const group = (label: string, arr: Array<{ packageName: string; appName: string }>) => {
    if (arr.length === 0) return null
    return (
      <>
        <div className="bl-sughead">{label}</div>
        {arr.slice(0, 60).map((a) => {
          const st = ctx.data.smap[a.packageName] || {}
          const mins = ctx.data.usageGranted ? Number(st.spentTodayMin || 0) + ' min' : '—'
          return (
            <div key={a.packageName} className="bl-siterow">
              <div className="bl-appmeta">
                <div className="bl-sitename">{a.appName}</div>
                <div className="bl-asub">{mins}</div>
              </div>
              <button className="bl-addbtn press" onClick={() => add(a)} aria-label={`Add ${a}`}>
                ADD
              </button>
            </div>
          )
        })}
      </>
    )
  }
  return (
    <div className="bl-sheetbody">
      <div className="bl-inputwrap">
        <Search size={14} className="bl-inputico" aria-hidden="true" />
        <input
          className="bl-input"
          placeholder="Search apps"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {distracting.length === 0 && others.length === 0 ? (
        <div className="bl-empty">No matching applications found.</div>
      ) : (
        <>
          {group('Distracting', distracting)}
          {group('Others', others)}
        </>
      )}
    </div>
  )
}

function ToggleRow({
  title,
  desc,
  checked,
  disabled,
  onToggle
}: {
  title: string
  desc: string
  checked: boolean
  disabled?: boolean
  onToggle: (on: boolean) => void
}) {
  return (
    <div className="bl-togglerow">
      <div className="bl-amain">
        <div className="bl-aname">{title}</div>
        {desc ? <div className="bl-asub">{desc}</div> : null}
      </div>
      <span onClick={(e) => e.stopPropagation()}>
        <Switch checked={checked} disabled={disabled} onCheckedChange={onToggle} />
      </span>
    </div>
  )
}