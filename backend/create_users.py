import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import User, TeacherProfile

# Nettoyage
User.objects.filter(username__in=['admin', 'student1', 'teacher1']).delete()

# Création des utilisateurs
User.objects.create_superuser('admin', 'admin@test.com', 'admin')
u1 = User.objects.create_user('student1', 'student1@test.com', 'student1', role='student')
u2 = User.objects.create_user('teacher1', 'teacher1@test.com', 'teacher1', role='teacher')
TeacherProfile.objects.create(user=u2)

print("Test users successfully created!")
