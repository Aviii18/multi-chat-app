import React, { useEffect, useRef } from 'react'
import FileAttachment from './FileAttachment.jsx'

export default function ChatWindow({ messages, user, typingWho, onEditMessage, onDeleteMessage }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingWho])

  const isMine = (m) => {
    const me = user?.username
    if (!me) return false
    return (
      m?.sender?.username === me ||
      m?.sender_name === me ||
      m?.sender === me ||
      (m?.sender_id && user?.id && m.sender_id === user.id)
    )
  }

  const maybeEdit = (m) => {
    const initial = m.content || ''
    const next = window.prompt('Edit message:', initial)
    if (next != null && next !== initial) {
      onEditMessage?.(m, next)
    }
  }

  const maybeDelete = (m) => {
    if (window.confirm('Delete this message?')) {
      onDeleteMessage?.(m)
    }
  }

  return (
    <div className="d-flex flex-column h-100 min-h-0">
      <div className="scroll-area flex-grow-1 p-3">
        {messages.map((m) => {
          const mine = isMine(m)
          const who = mine ? 'You' : (m?.sender?.username || m?.sender_name || '')
          return (
            <div key={m.id || m._tmpId} className={`d-flex ${mine ? 'justify-content-end' : 'justify-content-start'}`}>
              <div className={`message-bubble ${mine ? 'message-out' : 'message-in'}`}>
                <div className="d-flex justify-content-between align-items-center">
                  <div className="small text-secondary">{who}</div>
                  {mine && m.id ? (
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={() => maybeEdit(m)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger py-0 px-1" onClick={() => maybeDelete(m)}>Delete</button>
                    </div>
                  ) : null}
                </div>
                <div>{m.content}</div>
                {m.file ? <div className="mt-1"><FileAttachment fileUrl={m.file} /></div> : null}
                <div className="small text-secondary mt-1">
                  {new Date(m.timestamp || Date.now()).toLocaleString()}
                  {m.edited_at ? <span className="ms-2 fst-italic">(edited)</span> : null}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
