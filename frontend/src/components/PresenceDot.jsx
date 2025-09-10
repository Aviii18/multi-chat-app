import React from 'react'
export default function PresenceDot({ online }) {
  return <span className="presence-dot" style={{backgroundColor: online ? '#28a745' : '#6c757d'}} />
}
