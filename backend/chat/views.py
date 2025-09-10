from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Room, Message, RoomState, UserProfile
from .serializers import RoomSerializer, MessageSerializer

REQUIRE_MEMBERSHIP = getattr(settings, "CHAT_REQUIRE_MEMBERSHIP_FOR_PUBLIC", True)

User = get_user_model()


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all().order_by("-created_at")
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        # Public or private (where member); DISTINCT to avoid duplicates from M2M join
        return (
            Room.objects.filter(Q(is_private=False) | Q(members=u))
            .distinct()
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        room = serializer.save()
        room.members.add(self.request.user)  # auto-member creator

    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        room = self.get_object()
        if room.is_private:
            return Response({"detail": "Cannot self-join a private room."}, status=403)
        room.members.add(request.user)
        return Response({"status": "joined"})

    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        room = self.get_object()
        room.members.remove(request.user)
        return Response({"status": "left"})

    @action(detail=True, methods=["post"])
    def invite(self, request, pk=None):
        room = self.get_object()
        if not room.is_private:
            return Response({"detail": "Invites are for private rooms only."}, status=400)
        username = request.data.get("username")
        try:
            u = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=404)
        room.members.add(u)
        return Response({"status": "invited"})

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        room = self.get_object()  # respects get_queryset
        members = list(room.members.all())
        # attach last_seen_at
        profiles = {p.user_id: p.last_seen_at for p in UserProfile.objects.filter(user__in=members)}
        data = [
            {"id": u.id, "username": u.username, "last_seen_at": profiles.get(u.id)}
            for u in members
        ]
        return Response(data)

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        """Mark room as read 'now' for the current user (drives unread badges)."""
        room = self.get_object()
        state, _ = RoomState.objects.get_or_create(user=request.user, room=room)
        state.last_read_at = timezone.now()
        state.save(update_fields=["last_read_at"])
        return Response({"status": "ok"})


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.select_related("room", "sender").all().order_by("timestamp")
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _member_rooms_qs(self, user):
        return Room.objects.filter(members=user).distinct()

    def _public_or_member_rooms_qs(self, user):
        return Room.objects.filter(Q(is_private=False) | Q(members=user)).distinct()

    def get_queryset(self):
        qs = super().get_queryset()
        u = self.request.user
        if REQUIRE_MEMBERSHIP:
            allowed_rooms = self._member_rooms_qs(u)
        else:
            allowed_rooms = self._public_or_member_rooms_qs(u)

        room_id = self.request.query_params.get("room")
        qs = qs.filter(room_id__in=allowed_rooms.values_list("id", flat=True))
        if room_id:
            qs = qs.filter(room_id=room_id)
        return qs

    def perform_create(self, serializer):
        room = serializer.validated_data["room"]
        u = self.request.user
        is_member = room.members.filter(id=u.id).exists()
        if REQUIRE_MEMBERSHIP and not is_member:
            raise PermissionDenied("Join the room to post.")
        if room.is_private and not is_member:
            raise PermissionDenied("Not a member of this private room.")
        serializer.save(sender=u)

    # NEW: edit message (only by sender)
    def perform_update(self, serializer):
        msg = self.get_object()
        if msg.sender != self.request.user:
            raise PermissionDenied("You can edit only your messages.")
        serializer.save(edited_at=timezone.now())

    # NEW: delete message (only by sender)
    def destroy(self, request, *args, **kwargs):
        msg = self.get_object()
        if msg.sender != request.user:
            raise PermissionDenied("You can delete only your messages.")
        return super().destroy(request, *args, **kwargs)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def signup(request):
    username = request.data.get("username")
    password = request.data.get("password")
    if not username or not password:
        return Response({"detail": "username and password required"}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"detail": "username already exists"}, status=400)
    user = User.objects.create_user(username=username, password=password)
    return Response({"id": user.id, "username": user.username}, status=status.HTTP_201_CREATED)


# NEW: heartbeat endpoint to update "last seen"
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def heartbeat(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    profile.last_seen_at = timezone.now()
    profile.save(update_fields=["last_seen_at"])
    return Response({"status": "ok"})
