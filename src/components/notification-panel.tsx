import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { Dialog, DialogContent } from './ui/dialog'
import {
  notificationRecords,
  unreadNotificationCount,
  setNotificationReadLocal,
  markAllNotificationsReadLocal,
  deleteNotificationLocal,
  type InboxItem
} from '../lib/inbox'
import { isRoute, setNav } from '../lib/state'
import { escapeHtml } from '../lib/safe'

function fmtStamp(ts?: number) {
  return new Date(ts || Date.now()).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function NotificationPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [records, setRecords] = useState<InboxItem[]>([])
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!open) return
    setRecords(notificationRecords())
    setUnread(unreadNotificationCount())
  }, [open])

  const refresh = () => {
    setRecords(notificationRecords())
    setUnread(unreadNotificationCount())
  }

  const openItem = (item: InboxItem) => {
    setNotificationReadLocal(item.id, true)
    onOpenChange(false)
    if (item.route && isRoute(item.route)) setNav(item.route)
  }

  const markAll = () => {
    markAllNotificationsReadLocal()
    onOpenChange(false)
    refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="nt-overlay-card max-h-[78dvh] overflow-hidden">
        <div className="nt-overlay-header border-b border-[var(--line)] p-4 flex justify-between items-center">
          <div className="label mono">Mission feed</div>
          <div className="nt-overlay-title text-2xl">Notifications</div>
        </div>
        <div className="nt-overlay-row px-4 py-2.5 border-b border-[var(--line)]">
          <span className="mono text-[var(--ink-3)]">{unread} unread</span>
          <button className="nt-overlay-key ghost press text-sm" onClick={markAll}>
            MARK ALL READ
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {records.length ? (
            records.map((item) => (
              <article
                key={item.id}
                className={`nt-overlay-item flex items-stretch border-b border-[var(--line)] ${item.readAt ? 'opacity-55' : ''}`}
                data-notification-id={escapeHtml(item.id)}
              >
                <button
                  className="nt-overlay-item-link press flex flex-1 items-start gap-3 px-4 py-3 text-left"
                  aria-label={`Open notification: ${escapeHtml(item.title)}`}
                  onClick={() => openItem(item)}
                >
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${item.readAt ? 'bg-[var(--line-2)]' : 'bg-[var(--acc)]'}`}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <strong>{escapeHtml(item.title)}</strong>
                    <span className="text-xs text-[var(--ink-3)]">{escapeHtml(item.message)}</span>
                    <small className="mono">{fmtStamp(item.createdAt)}</small>
                  </span>
                </button>
                <button
                  className="nt-overlay-key ghost w-11 shrink-0 items-center justify-center text-[var(--ink-4)] hover:text-[var(--acc)]"
                  aria-label="Delete notification"
                  onClick={() => {
                    deleteNotificationLocal(item.id)
                    refresh()
                  }}
                >
                  <X className="size-3.5" />
                </button>
              </article>
            ))
          ) : (
            <div className="nt-overlay-empty flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Bell className="size-6 text-[var(--ink-4)]" />
              <strong className="text-sm text-[var(--ink-2)]">Nothing new</strong>
              <small className="text-xs text-[var(--ink-3)]">Your study updates will appear here.</small>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}