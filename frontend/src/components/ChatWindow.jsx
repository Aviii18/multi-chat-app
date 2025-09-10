import React, { useEffect, useRef } from 'react'
import FileAttachment from './FileAttachment.jsx'

export default function ChatWindow({ messages, user, typingWho }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingWho])

  return (
    <div className="d-flex flex-column h-100">
      <div className="scroll-area flex-grow-1 p-3">
        {messages.map(m => (
          <div key={m.id || m._tmpId} className="d-flex">
            <div className={`message-bubble ${m.sender===user?.username || m.sender_id===user?.id ? 'message-out ms-auto' : 'message-in me-auto'}`}>
              <div className="small text-secondary">{m.sender?.username || m.sender_name || ''}</div>
              <div>{m.content}</div>
              {m.file ? <div className="mt-1"><FileAttachment fileUrl={m.file} /></div> : null}
              <div className="small text-secondary mt-1">{new Date(m.timestamp || Date.now()).toLocaleString()}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
