import { useAuth } from '../context/AuthContext.jsx'
import React, { useEffect, useRef, useState } from 'react'
import RoomList from '../components/RoomList.jsx'
import ChatWindow from '../components/ChatWindow.jsx'
import MessageInput from '../components/MessageInput.jsx'
import TypingIndicator from '../components/TypingIndicator.jsx'
import CreateRoomModal from '../components/CreateRoomModal.jsx'
import InviteUser from '../components/InviteUser.jsx'
import MembersSidebar from '../components/MembersSidebar.jsx'
import { api } from '../lib/api.js'

export default function Chat() {
  const { user, isAuthenticated, token } = useAuth?.() || {}
  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [typingWho, setTypingWho] = useState([])
  const [onlineMap, setOnlineMap] = useState({})
  const [showCreate, setShowCreate] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [members, setMembers] = useState([])
  const [onlineUsers, setOnlineUsers] = useState(new Set()) // usernames in this room
  const wsRef = useRef(null)

  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:9000/ws'

  const refreshRooms = () =>
    api.get('/rooms/').then(res => setRooms(res.data)).catch(console.error)

  useEffect(() => {
    if (!isAuthenticated) return
    refreshRooms()
  }, [isAuthenticated])

  useEffect(() => {
    if (!activeRoom) return
    if (activeRoom.is_member) {
      api.get('/messages/', { params: { room: activeRoom.id } }).then(res => {
        setMessages(res.data || [])
      })
    } else {
      setMessages([])
    }
    api.get(`/rooms/${activeRoom.id}/members/`).then(res => setMembers(res.data || [])).catch(() => setMembers([]))
    setOnlineUsers(new Set()) // reset per-room presence
  }, [activeRoom])

  useEffect(() => {
    if (!activeRoom || !activeRoom.is_member) return
    const tok = localStorage.getItem('token') // or token from context
    const url = `${WS_URL}?room_id=${activeRoom.id}&username=${encodeURIComponent(user?.username||'')}&token=${encodeURIComponent(tok||'')}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'user:online', room_id: activeRoom.id, user: user?.username }))
    }
    ws.onclose = () => {
      setTypingWho([])
      setOnlineUsers(prev => {
        const next = new Set(prev)
        next.delete(user?.username)
        return next
      })
    }
    ws.onerror = (e) => {
      console.error('WS error', e)
    }
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.type === 'message:new') {
          const msg = data.payload
          setMessages(prev => (msg?.id && prev.some(m => m.id === msg.id)) ? prev : [...prev, msg])
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
          setOnlineUsers(prev => {
            const next = new Set(prev)
            if (data.user) next.add(data.user)
            return next
          })
        } else if (data.type === 'user:offline') {
          setOnlineMap(prev => ({ ...prev, [activeRoom.id]: false }))
          setOnlineUsers(prev => {
            const next = new Set(prev)
            if (data.user) next.delete(data.user)
            return next
          })
        }
      } catch (e) {
        console.warn('Bad WS payload', e)
      }
    }

    return () => {
      try {
        ws.send(JSON.stringify({ type: 'user:offline', room_id: activeRoom.id, user: user?.username }))
      } catch { }
      ws.close()
    }
  }, [activeRoom, user])

  const sendMessage = async (content) => {
    if (!activeRoom) return
    const tmpId = (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))
    const tmp = { _tmpId: tmpId, content, room: activeRoom.id, sender_name: user?.username, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, tmp])
    try {
      const { data } = await api.post('/messages/', { room: activeRoom.id, content })
      setMessages(prev => prev.map(m => (m._tmpId === tmpId ? data : m)))
      wsRef.current?.send(JSON.stringify({ type: 'message:new', room_id: activeRoom.id, payload: data }))
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
    const form = new FormData()
    form.append('room', activeRoom.id)
    form.append('file', file)
    form.append('content', file.name)
    try {
      const { data } = await api.post('/messages/', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      wsRef.current?.send(JSON.stringify({ type: 'message:new', room_id: activeRoom.id, payload: data }))
      setMessages(prev => [...prev, data])
    } catch (e) {
      console.error(e)
    }
  }

  const joinRoom = async () => {
    if (!activeRoom || activeRoom.is_private) return
    try {
      await api.post(`/rooms/${activeRoom.id}/join/`)
      const { data } = await api.get(`/rooms/${activeRoom.id}/`) // fetch is_member from backend
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
    } catch (e) {
      console.error('Leave failed', e?.response?.data || e.message)
    }
  }

  const onRoomCreated = async (room) => {
    await refreshRooms()
    setActiveRoom(room) // auto-open
  }

  return (
    <>
      <div className="row g-3" style={{ height: 'calc(100vh - 70px)' }}>
        <div className="col-12 col-md-4 col-lg-3">
          <div className="card p-2 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0">Rooms</h5>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-light" onClick={refreshRooms}>⟳</button>
                <button className="btn btn-sm btn-primary" onClick={() => setShowCreate(true)}>＋ New</button>
              </div>
            </div>
            <RoomList rooms={rooms} activeRoomId={activeRoom?.id} onSelect={setActiveRoom} onlineMap={onlineMap} />
          </div>
        </div>

        <div className="col-12 col-md-8 col-lg-9">
          <div className="card p-2 h-100 d-flex position-relative">
            {activeRoom ? (
              <>
                <div className="border-bottom pb-2 d-flex flex-wrap gap-2 justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <h5 className="m-0">{activeRoom.name} {activeRoom.is_private ? '🔒' : ''}</h5>
                    <button className="btn btn-sm btn-outline-light" onClick={() => setShowMembers(v => !v)}>
                      {showMembers ? 'Hide' : 'Members'}
                    </button>
                  </div>
                  <div className="d-flex gap-2">
                    {!activeRoom.is_private ? (
                      activeRoom.is_member
                        ? <button className="btn btn-sm btn-outline-warning" onClick={leaveRoom}>Leave</button>
                        : <button className="btn btn-sm btn-success" onClick={joinRoom}>Join</button>
                    ) : null}
                    {activeRoom.is_private ? (
                      <InviteUser roomId={activeRoom.id} />
                    ) : null}
                  </div>
                </div>
                <div className="flex-grow-1 d-flex flex-column">
                  {!activeRoom.is_member ? (
                    <div className="h-100 d-flex align-items-center justify-content-center text-secondary">
                      Join this room to view and send messages.
                    </div>
                  ) : (
                    <>
                      <ChatWindow messages={messages} user={user} typingWho={typingWho} />
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
                  onClose={() => setShowMembers(false)}
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

      <CreateRoomModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={onRoomCreated} />
    </>
  )
}
