import React from 'react'
export default function TypingIndicator({ who }) {
  if (!who?.length) return null
  const list = who.join(', ')
  return <div className="typing-indicator mt-1">{list} typing...</div>
}
