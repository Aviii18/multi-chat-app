from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
import re
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
        return (
            Room.objects.filter(Q(is_private=False) | Q(members=u))
            .distinct()
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        # Make creator the owner and member
        room = serializer.save(created_by=self.request.user)
        room.members.add(self.request.user)

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
        u = request.user

        # Prevent leaving if you're not a member (no-op)
        if not room.members.filter(id=u.id).exists():
            return Response({"status": "left"})

        # If the owner leaves, auto-transfer ownership to another member (if any)
        is_owner = (room.created_by_id == u.id)
        room.members.remove(u)

        if is_owner:
            new_owner = room.members.order_by('id').first()
            room.created_by = new_owner  # can be None if no members left
            room.save(update_fields=["created_by"])

        return Response({"status": "left"})

    @action(detail=True, methods=["post"])
    def invite(self, request, pk=None):
        room = self.get_object()
        if not room.is_private:
            return Response({"detail": "Invites are for private rooms only."}, status=400)
        # (Optional) Only owner can invite; uncomment to enforce:
        # if room.created_by_id != request.user.id:
        #     raise PermissionDenied("Only the room owner can invite members.")
        username = request.data.get("username")
        try:
            u = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=404)
        room.members.add(u)
        return Response({"status": "invited"})

    @action(detail=True, methods=["post"])
    def remove_member(self, request, pk=None):
        """
        Owner-only: remove a member from a PRIVATE room.
        Body: { "username": "<member-to-remove>" }
        """
        room = self.get_object()

        if not room.is_private:
            return Response({"detail": "Removing members applies to private rooms only."}, status=400)

        if room.created_by_id != request.user.id:
            raise PermissionDenied("Only the room owner can remove members.")

        username = request.data.get("username")
        if not username:
            return Response({"detail": "username is required"}, status=400)

        try:
            target = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=404)

        if target.id == room.created_by_id:
            return Response({"detail": "Owner cannot be removed."}, status=400)

        if not room.members.filter(id=target.id).exists():
            return Response({"detail": "User is not a member of this room."}, status=400)

        room.members.remove(target)
        return Response({"status": "removed"})

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        room = self.get_object()
        members = list(room.members.all())
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
    
    def list(self, request, *args, **kwargs):
        """
        Cursor-like pagination using integer IDs:
        ?room=<id> (required)
        ?limit=50            (default 50, max 200)
        ?before_id=<msg_id>  -> older messages than this id
        ?after_id=<msg_id>   -> newer than this id (rarely used; kept for completeness)
        """
        qs = super().get_queryset()  # already filtered to rooms you can access
        room_id = request.query_params.get("room")
        if not room_id:
            return Response([], status=200)

        # base filter for this room
        qs = qs.filter(room_id=room_id)

        try:
            limit = int(request.query_params.get("limit", 50))
        except ValueError:
            limit = 50
        limit = max(1, min(limit, 200))

        before_id = request.query_params.get("before_id")
        after_id = request.query_params.get("after_id")

        if after_id:
            try:
                after_id = int(after_id)
            except ValueError:
                after_id = None
            items = list(qs.filter(id__gt=after_id).order_by("id")[:limit]) if after_id else []
        elif before_id:
            try:
                before_id = int(before_id)
            except ValueError:
                before_id = None
            if before_id:
                older = list(qs.filter(id__lt=before_id).order_by("-id")[:limit])
                older.reverse()
                items = older
            else:
                items = []
        else:
            latest = list(qs.order_by("-id")[:limit])
            latest.reverse()
            items = latest

        ser = self.get_serializer(items, many=True)
        return Response(ser.data, status=200)



@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def signup(request):
    
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""

    if not username or not password:
        return Response({"detail": "username and password required"}, status=400)

    if re.search(r"\s", username):
        return Response({"detail": "username cannot contain spaces"}, status=400)

    if len(password) < 8:
        return Response({"detail": "password must be at least 8 characters"}, status=400)

    if User.objects.filter(username__iexact=username).exists():
        return Response({"detail": "username already exists"}, status=400)

    user = User.objects.create_user(username=username, password=password)
    return Response(
        {"id": user.id, "username": user.username, "message": "Signup successful"},
        status=status.HTTP_201_CREATED,
    )



# NEW: heartbeat endpoint to update "last seen"
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def heartbeat(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    profile.last_seen_at = timezone.now()
    profile.save(update_fields=["last_seen_at"])
    return Response({"status": "ok"})
