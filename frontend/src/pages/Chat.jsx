import React, { useEffect, useRef, useState } from 'react'
import RoomList from '../components/RoomList.jsx'
import ChatWindow from '../components/ChatWindow.jsx'
import MessageInput from '../components/MessageInput.jsx'
import TypingIndicator from '../components/TypingIndicator.jsx'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Chat() {
  const { user, isAuthenticated } = useAuth()
  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [typingWho, setTypingWho] = useState([])
  const [onlineMap, setOnlineMap] = useState({})
  const wsRef = useRef(null)

  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:9000/ws'

  useEffect(() => {
    api.get('/rooms/').then(res => setRooms(res.data))
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
      ; (async () => {
        try {
          const { data } = await api.get('/rooms/')
          setRooms(data)
        } catch (err) {
          console.error('Failed to load rooms', err?.response?.data || err.message)
        }
      })()
  }, [isAuthenticated])


  useEffect(() => {
    if (!activeRoom) return
    api.get('/messages/', { params: { room: activeRoom.id }}).then(res => {
      setMessages(res.data || [])
    })
  }, [activeRoom])

  useEffect(() => {
    if (!activeRoom) return
    const url = `${WS_URL}?room_id=${activeRoom.id}&username=${encodeURIComponent(user?.username || '')}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'user:online', room_id: activeRoom.id, user: user?.username }))
    }
    ws.onclose = () => {
      setTypingWho([])
    }
    ws.onerror = (e) => {
      console.error('WS error', e)
    }
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.type === 'message:new') {
          setMessages(prev => [...prev, data.payload])
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
        } else if (data.type === 'user:offline') {
          setOnlineMap(prev => ({ ...prev, [activeRoom.id]: false }))
        }
      } catch (e) {
        console.warn('Bad WS payload', e)
      }
    }

    return () => {
      try {
        ws.send(JSON.stringify({ type: 'user:offline', room_id: activeRoom.id, user: user?.username }))
      } catch {}
      ws.close()
    }
  }, [activeRoom, user])

  const sendMessage = async (content) => {
    const tmp = { _tmpId: Math.random().toString(36).slice(2), content, room: activeRoom.id, sender_name: user?.username, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, tmp])
    try {
      const { data } = await api.post('/messages/', { room: activeRoom.id, content })
      wsRef.current?.send(JSON.stringify({ type: 'message:new', room_id: activeRoom.id, payload: data }))
    } catch (e) {
      console.error(e)
    }
  }

  const sendTyping = () => {
    wsRef.current?.send(JSON.stringify({ type: 'user:typing', room_id: activeRoom?.id, user: user?.username }))
  }

  const attachFile = async (file) => {
    const form = new FormData()
    form.append('room', activeRoom.id)
    form.append('file', file)
    form.append('content', file.name)
    try {
      const { data } = await api.post('/messages/', form, { headers: { 'Content-Type': 'multipart/form-data' }})
      wsRef.current?.send(JSON.stringify({ type: 'message:new', room_id: activeRoom.id, payload: data }))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="row g-3" style={{height: 'calc(100vh - 70px)'}}>
      <div className="col-12 col-md-4 col-lg-3">
        <div className="card p-2 h-100">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="m-0">Rooms</h5>
            <button className="btn btn-sm btn-outline-light" onClick={()=> api.get('/rooms/').then(res=>setRooms(res.data))}>⟳</button>
          </div>
          <RoomList rooms={rooms} activeRoomId={activeRoom?.id} onSelect={setActiveRoom} onlineMap={onlineMap} />
        </div>
      </div>
      <div className="col-12 col-md-8 col-lg-9">
        <div className="card p-2 h-100 d-flex">
          {activeRoom ? (
            <>
              <div className="border-bottom pb-2 d-flex justify-content-between align-items-center">
                <h5 className="m-0">{activeRoom.name}</h5>
              </div>
              <div className="flex-grow-1 d-flex flex-column">
                <ChatWindow messages={messages} user={user} typingWho={typingWho} />
                <div className="mt-2">
                  <TypingIndicator who={typingWho} />
                  <MessageInput onSend={sendMessage} onTyping={sendTyping} onAttach={attachFile} />
                </div>
              </div>
            </>
          ) : (
            <div className="h-100 d-flex align-items-center justify-content-center text-secondary">
              Select a room to start chatting.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
