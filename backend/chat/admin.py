# chat/admin.py
from django.contrib import admin
from .models import Room, Message

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "is_private", "created_at")
    search_fields = ("name",)

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "room", "sender", "timestamp")
    search_fields = ("content", "sender__username", "room__name")
    list_filter = ("room",)
