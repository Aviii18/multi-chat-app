import asyncio
import websockets
import json
import sys

async def chat_client(room_id=1, user_id=1):
    uri = f"ws://127.0.0.1:9000/ws/{room_id}/{user_id}"
    async with websockets.connect(uri) as websocket:
        print(f"✅ Connected to {uri} (Room {room_id}, User {user_id})")

        # Task: Listen for incoming messages
        async def receive_messages():
            try:
                while True:
                    response = await websocket.recv()
                    print(f"\n📩 Received: {response}\n> ", end="")
            except websockets.exceptions.ConnectionClosed:
                print(f"\n❌ Connection closed for client {user_id}")

        asyncio.create_task(receive_messages())

        # Task: Send messages interactively
        try:
            while True:
                msg_text = input("> ").strip()
                if msg_text.lower() in ["exit", "quit"]:
                    print("👋 Exiting chat...")
                    break

                message = {
                    "content": msg_text,
                    "file": None
                }
                await websocket.send(json.dumps(message))
                print(f"📤 Sent: {message}")
        except KeyboardInterrupt:
            print("\n👋 Disconnected manually")

if __name__ == "__main__":
    # Run with: python test_ws.py <room_id> <user_id>
    room_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    user_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    asyncio.run(chat_client(room_id, user_id))
