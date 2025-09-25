import React, { useEffect, useCallback } from 'react'
import clsx from 'clsx'

export default function ChatWindow({
  messages = [],
  user,
  typingWho = [],
  onEditMessage,
  onDeleteMessage,
  scrollRef,
  onLoadOlder,
  hasMore = false,
  loadingOlder = false,
}) {
  // Fire when near top to load older messages
  const onScroll = useCallback(
    (e) => {
      const el = e.currentTarget
      if (!el) return
      if (el.scrollTop <= 24 && hasMore && !loadingOlder) {
        onLoadOlder?.()
      }
    },
    [hasMore, loadingOlder, onLoadOlder]
  )

  // Auto-stick to bottom when new messages arrive and user is near bottom
  useEffect(() => {
    const el = scrollRef?.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }
  }, [messages, scrollRef])

  const list = Array.isArray(messages) ? messages : []

  return (
    <div className="d-flex flex-column h-100 min-h-0">
      <div
        ref={scrollRef}
        className="scroll-area flex-grow-1 p-3"
        onScroll={onScroll}
      >
        {loadingOlder && (
          <div className="text-center text-muted small mb-2">
            Loading older messages…
          </div>
        )}
        {hasMore && !loadingOlder && (
          <div className="text-center text-muted small mb-2">
            Scroll up to load older messages
          </div>
        )}

        {list.map((m, idx) => {
          const mine =
            m.sender?.username === user?.username ||
            m.sender_name === user?.username

          const displayName = mine
            ? 'You'
            : m.sender?.username || m.sender_name || 'Unknown'

          // Show name once for a run of messages from the same sender
          const prev = list[idx - 1]
          const prevSender = prev?.sender?.username || prev?.sender_name
          const showName = !mine && displayName && displayName !== prevSender

          return (
            <div
              key={m.id || m._tmpId}
              className={clsx(
                'd-flex mb-2',
                mine ? 'justify-content-end' : 'justify-content-start'
              )}
            >
              <div style={{ maxWidth: '70%' }}>
                {showName && (
                  <div className="small text-secondary mb-1">{displayName}</div>
                )}

                <div
                  className={clsx(
                    'p-2 rounded-3',
                    mine ? 'bg-primary text-white' : 'bg-dark text-light'
                  )}
                >
                  {m.file && (
                    <div className="mb-1">
                      <a
                        className="text-reset text-decoration-underline"
                        href={m.file}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {m.content || 'Attachment'}
                      </a>
                    </div>
                  )}

                  {m.content && (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  )}

                  <div className="text-end text-muted small mt-1">
                    {m.timestamp
                      ? new Date(m.timestamp).toLocaleTimeString()
                      : ''}
                    {m.edited_at ? ' (edited)' : ''}
                  </div>

                  {mine && m.id && (
                    <div className="mt-1 d-flex gap-2 justify-content-end">
                      <button
                        className="btn btn-sm btn-outline-light"
                        onClick={() => {
                          const nv = prompt('Edit message:', m.content || '')
                          if (nv !== null) onEditMessage?.(m, nv)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onDeleteMessage?.(m)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}