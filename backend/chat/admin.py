# chat/admin.py
from django.contrib import admin
from .models import Room, Message, RoomState, UserProfile

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "is_private", "created_at")
    search_fields = ("name",)

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "room", "sender", "timestamp", "edited_at")
    search_fields = ("content", "sender__username", "room__name")
    list_filter = ("room",)

@admin.register(RoomState)
class RoomStateAdmin(admin.ModelAdmin):
    list_display = ("id", "room", "user", "last_read_at")
    list_filter = ("room", "user")

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "last_seen_at")
    search_fields = ("user__username",)
