import React, { useEffect, useRef, useState } from 'react'
import RoomList from '../components/RoomList.jsx'
import ChatWindow from '../components/ChatWindow.jsx'
import MessageInput from '../components/MessageInput.jsx'
import TypingIndicator from '../components/TypingIndicator.jsx'
import CreateRoomModal from '../components/CreateRoomModal.jsx'
import InviteUser from '../components/InviteUser.jsx'
import MembersSidebar from '../components/MembersSidebar.jsx'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Chat() {
  const { user, isAuthenticated } = useAuth()
  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const topCursorRef = useRef(null)     // earliest loaded message id
  const scrollBoxRef = useRef(null)     // .scroll-area element
  const [typingWho, setTypingWho] = useState([])
  const [onlineMap, setOnlineMap] = useState({})
  const [showCreate, setShowCreate] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [members, setMembers] = useState([])
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const wsRef = useRef(null)
  const heartbeatRef = useRef(null)

  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:9000/ws'
  
  useEffect(() => {
    const h = (e) => {
      const { username } = e.detail || {}
      if (username) setMembers(prev => prev.filter(m => m.username !== username))
    }
    window.addEventListener('members:removed', h)
    return () => window.removeEventListener('members:removed', h)
  }, [])

  const refreshRooms = () =>
    api.get('/rooms/').then(res => {
      const arr = Array.isArray(res.data) ? res.data : []
      // dedupe by id just in case
      const byId = new Map(arr.map(r => [r.id, r]))
      setRooms([...byId.values()])
      // DO NOT touch activeRoom here — prevents effect loop
    }).catch(console.error)

  const setUnreadZero = (roomId) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, unread_count: 0 } : r))
  }

  // heartbeat: update last_seen periodically
  useEffect(() => {
    if (!isAuthenticated) return
    const beat = async () => { try { await api.post('/me/heartbeat/') } catch {} }
    beat() // immediate once
    heartbeatRef.current = setInterval(beat, 45000)
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current) }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    refreshRooms()
  }, [isAuthenticated])

  // When selecting a room: load messages & members; mark as read
  useEffect(() => {
    if (!activeRoom) return
    if (activeRoom.is_member) {
      api.get('/messages/', { params: { room: activeRoom.id, limit: 50 }})
     .then(res => {
       const arr = res.data || []
       setMessages(arr)
       setHasMore(arr.length >= 50)
       topCursorRef.current = arr.length ? arr[0].id : null
       // on first load, stick to bottom
       requestAnimationFrame(() => {
         const el = scrollBoxRef.current
         if (el) el.scrollTop = el.scrollHeight
       })
     })
    } else {
      setMessages([])
    }
    api.get(`/rooms/${activeRoom.id}/members/`).then(res => setMembers(res.data || [])).catch(() => setMembers([]))
    setOnlineUsers(new Set())
    // mark as read (updates unread badge)
    api.post(`/rooms/${activeRoom.id}/read/`)
    .then(() => setUnreadZero(activeRoom.id))
    .catch(() => { })
  }, [activeRoom])

  // WebSocket connection per room (only if member)
  useEffect(() => {
    if (!activeRoom || !activeRoom.is_member) return
    const tok = localStorage.getItem('token')
    const url = `${WS_URL}?room_id=${activeRoom.id}&username=${encodeURIComponent(user?.username || '')}&token=${encodeURIComponent(tok || '')}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'user:online', room_id: activeRoom.id, user: user?.username }))
    }
    ws.onclose = () => {
      setTypingWho([])
      setOnlineUsers(prev => {
        const next = new Set(prev); next.delete(user?.username); return next
      })
    }
    ws.onerror = (e) => console.error('WS error', e)
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.type === 'message:new') {
          const msg = data.payload
          if (msg?.room !== activeRoom.id) {
            // message for another room → refresh rooms to update unread badge
            refreshRooms()
            return
          }
          setMessages(prev => (msg?.id && prev.some(m => m.id === msg.id)) ? prev : [...prev, msg])
        } else if (data.type === 'message:update') {
          const msg = data.payload
          setMessages(prev => prev.map(m => m.id === msg.id ? msg : m))
        } else if (data.type === 'message:delete') {
          const { id } = data.payload || {}
          if (id) setMessages(prev => prev.filter(m => m.id !== id))
        } else if (data.type === 'user:typing') {
          setTypingWho(prev => {
            const name = data.user
            if (!name || prev.includes(name)) return prev
            return [...prev, name]
          })
          setTimeout(() => {
            setTypingWho(prev => prev.filter(n => n !== data.user))
          }, 3000)
        } else if (data.type === 'user:online') {
          setOnlineMap(prev => ({ ...prev, [activeRoom.id]: true }))
          setOnlineUsers(prev => { const next = new Set(prev); if (data.user) next.add(data.user); return next })
        } else if (data.type === 'user:offline') {
          setOnlineMap(prev => ({ ...prev, [activeRoom.id]: false }))
          setOnlineUsers(prev => { const next = new Set(prev); if (data.user) next.delete(data.user); return next })
        }
      } catch (e) {
        console.warn('Bad WS payload', e)
      }
    }

    return () => {
      try { ws.send(JSON.stringify({ type: 'user:offline', room_id: activeRoom.id, user: user?.username })) } catch {}
      ws.close()
    }
  }, [activeRoom, user])

  const sendMessage = async (content) => {
    if (!activeRoom) return
    const tmpId = (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))
    const tmp = { _tmpId: tmpId, content, room: activeRoom.id, sender: { id: user?.id, username: user?.username }, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, tmp])
    try {
      const { data } = await api.post('/messages/', { room: activeRoom.id, content })
      setMessages(prev => prev.map(m => (m._tmpId === tmpId ? data : m)))
      wsRef.current?.send(JSON.stringify({ type: 'message:new', room_id: activeRoom.id, payload: data }))
      // since we just viewed/sent, mark room read to reset unread
      await api.post(`/rooms/${activeRoom.id}/read/`)
      setUnreadZero(activeRoom.id)
    } catch (e) {
      console.error(e)
      setMessages(prev => prev.filter(m => m._tmpId !== tmpId))
    }
  }

  const sendTyping = () => {
    wsRef.current?.send(JSON.stringify({ type: 'user:typing', room_id: activeRoom?.id, user: user?.username }))
  }

  const attachFile = async (file) => {
  if (!activeRoom) return

  // 1) Optimistic bubble so the user sees it instantly (with a preview URL)
  const tmpId = (crypto?.randomUUID?.() ?? String(Date.now()))
  const tmpURL = URL.createObjectURL(file)
  const optimistic = {
    _tmpId: tmpId,
    room: activeRoom.id,
    content: file.name,
    file: tmpURL, // temporary preview until server returns the real URL
    sender: { id: user?.id, username: user?.username }, // so the name shows now
    timestamp: new Date().toISOString()
  }
  setMessages(prev => [...prev, optimistic])

  // 2) Build FormData and upload (let axios set the multipart boundary)
  const form = new FormData()
  form.append('room', activeRoom.id)
  form.append('file', file)
  form.append('content', file.name)

  try {
    const { data } = await api.post('/messages/', form /* no headers here */)

    // Replace optimistic with the real, saved message (has a stable id + final file URL)
    setMessages(prev => prev.map(m => (m._tmpId === tmpId ? data : m)))

    // Free the temporary object URL
    URL.revokeObjectURL(tmpURL)

    // Broadcast to peers
    wsRef.current?.send(JSON.stringify({
      type: 'message:new',
      room_id: activeRoom.id,
      payload: data
    }))

    // Mark room as read and zero the badge locally
    await api.post(`/rooms/${activeRoom.id}/read/`)
    setUnreadZero(activeRoom.id)
    setActiveRoom(prev => (prev && prev.id === activeRoom.id) ? { ...prev, unread_count: 0 } : prev)

  } catch (e) {
    console.error(e)
    // Roll back optimistic message on failure + clean preview URL
    setMessages(prev => prev.filter(m => m._tmpId !== tmpId))
    URL.revokeObjectURL(tmpURL)
  }
  }

  // NEW: Edit / Delete handlers
  const editMessage = async (msg, newContent) => {
    try {
      const { data } = await api.patch(`/messages/${msg.id}/`, { content: newContent })
      setMessages(prev => prev.map(m => (m.id === msg.id ? data : m)))
      wsRef.current?.send(JSON.stringify({ type: 'message:update', room_id: activeRoom.id, payload: data }))
    } catch (e) {
      console.error('Edit failed', e?.response?.data || e.message)
    }
  }

  const deleteMessage = async (msg) => {
    try {
      await api.delete(`/messages/${msg.id}/`)
      setMessages(prev => prev.filter(m => m.id !== msg.id))
      wsRef.current?.send(JSON.stringify({ type: 'message:delete', room_id: activeRoom.id, payload: { id: msg.id } }))
    } catch (e) {
      console.error('Delete failed', e?.response?.data || e.message)
    }
  }

  const joinRoom = async () => {
    if (!activeRoom || activeRoom.is_private) return
    try {
      await api.post(`/rooms/${activeRoom.id}/join/`)
      const { data } = await api.get(`/rooms/${activeRoom.id}/`)
      setActiveRoom(data)
      await api.get(`/rooms/${activeRoom.id}/members/`).then(res => setMembers(res.data || []))
    } catch (e) {
      console.error('Join failed', e?.response?.data || e.message)
    }
  }

  const leaveRoom = async () => {
    if (!activeRoom) return
    try {
      await api.post(`/rooms/${activeRoom.id}/leave/`)
      const { data } = await api.get(`/rooms/${activeRoom.id}/`)
      setActiveRoom(data)
      await api.get(`/rooms/${activeRoom.id}/members/`).then(res => setMembers(res.data || []))
      setMessages([])
      refreshRooms()
    } catch (e) {
      console.error('Leave failed', e?.response?.data || e.message)
    }
  }

  const onRoomCreated = async (room) => {
    await refreshRooms()
    setActiveRoom(room)
  }

  const loadOlder = async () => {
    if (!activeRoom || !hasMore || loadingOlder || !topCursorRef.current) return
    setLoadingOlder(true)
    const el = scrollBoxRef.current
    const prevHeight = el ? el.scrollHeight : 0
    try {
      const { data } = await api.get('/messages/', {
        params: { room: activeRoom.id, limit: 50, before_id: topCursorRef.current }
      })
      const older = data || []
      if (older.length === 0) {
        setHasMore(false)
      } else {
        setMessages(prev => [...older, ...prev])
        topCursorRef.current = older[0].id
        // keep viewport steady after prepending
        requestAnimationFrame(() => {
          const nowHeight = el ? el.scrollHeight : 0
          if (el) el.scrollTop = nowHeight - prevHeight + el.scrollTop
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingOlder(false)
    }
  }


  return (
    <>
      <div className="row g-3" style={{ height: '100vh' }}>
        <div className="col-12 col-md-4 col-lg-3 h-100 min-h-0">
          <div className="card p-2 h-100 overflow-hidden" style={{minHeight: 0}}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0">Rooms</h5>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-light" onClick={refreshRooms}>⟳</button>
                <button className="btn btn-sm btn-primary" onClick={() => setShowCreate(true)}>＋ New</button>
              </div>
            </div>
            <div className="roomlist-scroll h-100 min-h-0">
              <RoomList rooms={rooms} activeRoomId={activeRoom?.id} onSelect={setActiveRoom} onlineMap={onlineMap} />
            </div>
          </div>
        </div>

        <div className="col-12 col-md-8 col-lg-9 h-100 min-h-0">
          <div className="card p-2 h-100 d-flex position-relative overflow-hidden" style={{minHeight: 0}}>
            {activeRoom ? (
              <>
                <div className="border-bottom pb-2 d-flex flex-wrap gap-2 justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <h5 className="m-0">{activeRoom.name} {activeRoom.is_private ? '🔒' : ''}</h5>
                    <button className="btn btn-sm btn-outline-light" onClick={()=> setShowMembers(v=>!v)}>
                      {showMembers ? 'Hide' : 'Members'}
                    </button>
                  </div>
                  <div className="d-flex gap-2">
                    {/* new: leave available for ANY room if you're a member; join only for public */}
                    {activeRoom.is_member && (
                      <button className="btn btn-sm btn-outline-warning" onClick={leaveRoom}>Leave</button>
                    )}
                    {!activeRoom.is_private && !activeRoom.is_member && (
                      <button className="btn btn-sm btn-success" onClick={joinRoom}>Join</button>
                    )}
                    {activeRoom.is_private && activeRoom.is_owner ? <InviteUser roomId={activeRoom.id} /> : null}
                  </div>
                </div>
                <div className="flex-grow-1 d-flex flex-column min-h-0">
                  {!activeRoom.is_member ? (
                    <div className="h-100 d-flex align-items-center justify-content-center text-secondary">
                      Join this room to view and send messages.
                    </div>
                  ) : (
                    <>
                      <ChatWindow
                        messages={messages}
                        user={user}
                        typingWho={typingWho}
                        onEditMessage={editMessage}
                        onDeleteMessage={deleteMessage}
                        scrollRef={scrollBoxRef}
                        onLoadOlder={loadOlder}
                        hasMore={hasMore}
                        loadingOlder={loadingOlder}
                      />
                      <div className="mt-2">
                        <TypingIndicator who={typingWho} />
                        <MessageInput onSend={sendMessage} onTyping={sendTyping} onAttach={attachFile} />
                      </div>
                    </>
                  )}
                </div>

                <MembersSidebar
                  open={showMembers}
                  members={members}
                  onlineUsers={onlineUsers}
                  me={user?.username}
                  onClose={()=> setShowMembers(false)}
                  roomId={activeRoom.id}
                  isOwner={!!activeRoom.is_owner}
                  ownerUsername={activeRoom.created_by?.username}
                />
              </>
            ) : (
              <div className="h-100 d-flex align-items-center justify-content-center text-secondary">
                Select a room or create a new one.
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateRoomModal open={showCreate} onClose={()=> setShowCreate(false)} onCreated={onRoomCreated} />
    </>
  )
}
