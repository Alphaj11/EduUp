#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --noinput

python manage.py migrate

# Seed initial data (subjects, levels, admin account)
PYTHONIOENCODING=utf-8 python manage.py seed_data

# Seed test student accounts + CourseRequests
PYTHONIOENCODING=utf-8 python manage.py seed_announcements

# Seed extra teacher profiles + more CourseRequests
PYTHONIOENCODING=utf-8 python manage.py seed_more_data
