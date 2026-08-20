import { BarChart3, CalendarDays, Home, Shield, Timer } from 'lucide-react'
import { useSnapshot, setNav, type Route } from '../lib/state'

const TABS: Array<[Route, string, typeof Home]> = [
  ['today', 'Today', Home],
  ['plan', 'Plan', CalendarDays],
  ['focus', 'Focus', Timer],
  ['progress', 'Progress', BarChart3],
  ['blocks', 'Blocks', Shield]
]

export function Nav() {
  const nav = useSnapshot((s) => s.nav)
  return (
    <nav className="navrail" aria-label="Primary">
      {TABS.map(([id, label, Icon]) => (
        <button
          key={id}
          className={`navbtn press${nav === id ? ' active' : ''}`}
          aria-label={label}
          aria-current={nav === id ? 'page' : 'false'}
          onClick={() => setNav(id)}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}