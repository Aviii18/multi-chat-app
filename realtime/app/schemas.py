from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# Shared fields between request and response
class MessageBase(BaseModel):
    content: str
    file: Optional[str] = None
    sender_id: int
    room_id: int
# Schema for creating a new message (client → server)
class MessageCreate(MessageBase):
    pass
# Schema for reading a message (server → client)
class MessageResponse(MessageBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True  # ✅ Pydantic v2 replacement for orm_mode




class RoomBase(BaseModel):
    name: str
    is_private: int = 0  # default = public
class RoomCreate(RoomBase):
    pass
class RoomResponse(RoomBase):
    id: int

    class Config:
        orm_mode = True

