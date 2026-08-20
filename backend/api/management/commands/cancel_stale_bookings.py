from django.core.management.base import BaseCommand
from api.services import cancel_stale_bookings_service

class Command(BaseCommand):
    help = "Cancel stale bookings that have passed their scheduled time/grace period without validation"

    def handle(self, *args, **options):
        self.stdout.write("Checking for stale bookings to cancel...")
        count = cancel_stale_bookings_service()
        self.stdout.write(self.style.SUCCESS(f"Successfully cancelled {count} stale bookings."))
