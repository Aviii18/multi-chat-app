# chat/models.py
from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()

class Room(models.Model):
    name = models.CharField(max_length=120, unique=True)
    is_private = models.BooleanField(default=False)
    members = models.ManyToManyField(User, blank=True, related_name="rooms")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "chat_room"

    def __str__(self):
        return self.name

def upload_to_message(instance, filename):
    return f"attachments/{instance.room_id}/{filename}"

class Message(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="messages")
    content = models.TextField(blank=True, default="")
    file = models.FileField(upload_to=upload_to_message, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["timestamp"]
        db_table = "chat_message"

    def __str__(self):
        return f"{self.sender} @ {self.room}: {self.content[:30]}"

class RoomState(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="states")
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "chat_room_state"
        unique_together = ("user", "room")

# ↓↓↓ CHANGE IS HERE: give the chat-side profile a unique reverse accessor
class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_profile",        # was "profile" → clashed with accounts.UserProfile
        related_query_name="chat_profile",  # avoid reverse query name clash too
    )
    last_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "chat_user_profile"
