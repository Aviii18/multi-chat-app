import React, { useState } from 'react'
import Picker from 'emoji-picker-react'

export default function MessageInput({ onSend, onTyping, onAttach }) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
    setShowEmoji(false)
  }

  const onEmojiClick = (emojiData) => {
    setText(prev => prev + (emojiData?.emoji || ''))
    onTyping?.()
  }

  return (
    <form onSubmit={submit} className="d-flex align-items-center gap-2">
      <button type="button" className="btn btn-outline-secondary" onClick={() => setShowEmoji(v=>!v)}>😊</button>
      {showEmoji ? (
        <div className="position-absolute" style={{bottom: '70px', zIndex: 10}}>
          <Picker onEmojiClick={onEmojiClick} theme="dark" />
        </div>
      ) : null}
      <input
        className="form-control"
        placeholder="Type a message..."
        value={text}
        onChange={e => { setText(e.target.value); onTyping?.(); }}
      />
      <label className="btn btn-outline-secondary mb-0">
        📎
        <input type="file" className="d-none" onChange={(e)=> onAttach?.(e.target.files?.[0])} />
      </label>
      <button className="btn btn-primary" type="submit">Send</button>
    </form>
  )
}
