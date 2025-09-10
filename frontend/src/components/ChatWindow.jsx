import React, { useEffect, useRef } from 'react'
import FileAttachment from './FileAttachment.jsx'

export default function ChatWindow({ messages, user, typingWho }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingWho])

  const isMine = (m) => {
    const me = user?.username
    if (!me) return false
    return (
      m?.sender?.username === me ||   // nested sender object
      m?.sender_name === me ||        // optimistic/local
      m?.sender === me ||             // plain string (fallback)
      (m?.sender_id && user?.id && m.sender_id === user.id) // id match
    )
  }

  return (
    <div className="d-flex flex-column h-100">
      <div className="scroll-area flex-grow-1 p-3">
        {messages.map((m) => {
          const mine = isMine(m)
          const who = mine ? 'You' : (m?.sender?.username || m?.sender_name || '')
          return (
            <div
              key={m.id || m._tmpId}
              className={`d-flex ${mine ? 'justify-content-end' : 'justify-content-start'}`}
            >
              <div className={`message-bubble ${mine ? 'message-out' : 'message-in'}`}>
                <div className="small text-secondary">{who}</div>
                <div>{m.content}</div>
                {m.file ? (
                  <div className="mt-1">
                    <FileAttachment fileUrl={m.file} />
                  </div>
                ) : null}
                <div className="small text-secondary mt-1">
                  {new Date(m.timestamp || Date.now()).toLocaleString()}
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
