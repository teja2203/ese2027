/* Port of legacy header(title, sub) — page header for every screen. */

export function ScreenHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="nt-pagehead">
      <div className="nt-pagehead-kicker">ESE // STUDY OS</div>
      <h1 className="display">{title}</h1>
      {sub ? <div className="nt-pagehead-sub">{sub}</div> : null}
    </header>
  )
}