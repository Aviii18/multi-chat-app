from django.contrib.auth.models import User
from django.db import models

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    avatar = models.URLField(blank=True, null=True)
    bio = models.TextField(blank=True)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.username
