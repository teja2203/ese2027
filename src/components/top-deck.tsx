import { useEffect, useMemo } from 'react'
import { Bell, Flame, Headphones, Moon, Sun, UserRound } from 'lucide-react'
import { useSnapshot, state, setNav, cycleTheme, commit } from '../lib/state'
import { cd, computeStreak, ESE_DATE } from '../lib/stats'
import * as S from '../lib/storage'
import { unreadNotificationCount } from '../lib/inbox'
import { toast } from 'sonner'

export function TopDeck({ onOpenInbox }: { onOpenInbox: () => void }) {
  const theme = useSnapshot((s) => s.theme)
  const log = useSnapshot((s) => s.log)
  const freeze = useSnapshot((s) => s.freeze)

  const cdDate = useMemo(() => cd(ESE_DATE), [])
  const streakObj = useMemo(() => computeStreak(state), [log, freeze])

  const today = S.todayKey()
  const tlog = log[today] || { minutes: 0 }
  const isIce = streakObj.hasFrozen && tlog.minutes === 0
  const unread = useSnapshot(() => unreadNotificationCount())

  const cdToast = () => toast(`Target: ESE 2027 · ${cdDate.d} days remaining`)

  useEffect(() => {
    /* keep the badge fresh when the inbox changes while the app is open */
    const t = setInterval(() => {
      commit()
    }, 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="top-deck">
      <div className="td-left">
        <button
          className="nt-icon press td-profile-btn"
          aria-label="Profile & Settings"
          title="Profile & Settings"
          onClick={() => setNav('you')}
        >
          <UserRound />
        </button>
        <button className="nt-brand press nt-brand-hidden" aria-label="Show ESE 2027 target countdown" title="Target: ESE 2027" onClick={cdToast}>
          ESE<span className="sl">//</span>2027
        </button>
        <button className="nt-tag press" aria-label={`${cdDate.d} days to ESE 2027`} title="Days to ESE 2027" onClick={cdToast}>
          <span className="display">{cdDate.d}</span>
          <small>D</small>
        </button>
      </div>
      <div className="td-right">
        <button
          className={`nt-tag press streak-tag ${isIce ? 'ice-pill' : 'fire-pill'}`}
          aria-label={`${streakObj.count} day streak`}
          title="Streak Status"
          onClick={() => setNav('progress')}
        >
          <Flame />
          <span className="display">{streakObj.count}</span>
          <small>d</small>
        </button>
        <button className="nt-icon press notif-pill" aria-label="Open study notifications" title="Notifications" onClick={onOpenInbox}>
          <Bell />
          <span className="notif-badge" hidden={unread < 1}>
            {unread > 9 ? '9+' : String(unread)}
          </span>
        </button>
        <button className="nt-icon press sound-pill" aria-label="Open ambient focus audio controls" title="Toggle Ambient Audio">
          <Headphones />
        </button>
        <button
          className="nt-icon press theme-btn"
          aria-label="Toggle theme"
          title="Toggle theme"
          onClick={() => {
            cycleTheme(state)
            commit()
          }}
        >
          {S.isLightTheme(theme) ? <Moon /> : <Sun />}
        </button>
      </div>
    </div>
  )
}