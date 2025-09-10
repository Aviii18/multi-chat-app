import React from 'react'

export default function FileAttachment({ fileUrl, name='file' }) {
  if (!fileUrl) return null
  const fname = name || fileUrl.split('/').pop()
  return (
    <a className="d-inline-flex align-items-center gap-2 text-decoration-none"
       href={fileUrl} target="_blank" rel="noreferrer">
      📎 <span className="text-info">{fname}</span>
    </a>
  )
}
