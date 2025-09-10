# Realtime Chat Frontend (Dark Theme)

React + Bootstrap dark UI for your Django (REST + JWT) and FastAPI (WebSocket) backend.

## Quick Start

1) Copy `.env.template` to `.env` and set:
VITE_API_BASE=http://localhost:8000/api

VITE_WS_URL=ws://localhost:9000/ws


2) Install deps and run:
npm i
npm run dev

3) REST APIs used:
- `GET /rooms/`
- `GET /messages/?room=<id>`
- `POST /messages/` (supports multipart)

4) WebSocket events:
- Connect to `${VITE_WS_URL}?room_id=<id>&username=<name>`
- Events:
  - `message:new`
  - `user:typing`
  - `user:online`
  - `user:offline`
