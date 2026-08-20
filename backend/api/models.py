from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid
import random
import string
import datetime

class User(AbstractUser):
    IS_TEACHER = 'teacher'
    IS_STUDENT = 'student'
    ROLE_CHOICES = [
        (IS_TEACHER, 'Teacher'),
        (IS_STUDENT, 'Student'),
    ]
    GENDER_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Féminin'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=IS_STUDENT)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='M')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=50, blank=True, null=True)
    city = models.CharField(max_length=50, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)


class Subject(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class Level(models.Model):
    name = models.CharField(max_length=50)
    
    def __str__(self):
        return self.name

class TeacherProfile(models.Model):
    TITLE_CHOICES = [
        ('Mr', 'Monsieur'),
        ('Mme', 'Madame'),
        ('Dr', 'Docteur'),
        ('Pr', 'Professeur'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    academic_title = models.CharField(max_length=10, choices=TITLE_CHOICES, default='Mr')
    bio = models.TextField(blank=True, default="")
    experience_years = models.PositiveIntegerField(default=0)
    subjects = models.ManyToManyField(Subject)
    levels = models.ManyToManyField(Level)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    is_certified = models.BooleanField(default=False)
    rating = models.FloatField(default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(5.0)])
    accepts_online = models.BooleanField(default=True)
    accepts_in_person = models.BooleanField(default=True)
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    custom_subjects = models.CharField(max_length=255, blank=True, default="")
    # Statut de l'enseignant
    TEACHER_TYPE_CHOICES = [
        ('fonctionnaire', 'Fonctionnaire de l\'État'),
        ('prive', 'Enseignant du secteur privé'),
        ('etudiant', 'Étudiant enseignant'),
    ]
    teacher_type = models.CharField(max_length=20, choices=TEACHER_TYPE_CHOICES, default='prive')
    is_civil_servant = models.BooleanField(default=False)  # kept for backward compat
    # Documents justificatifs
    identity_document = models.FileField(upload_to='teacher_docs/identity/', blank=True, null=True)
    bac_diploma = models.FileField(upload_to='teacher_docs/bac/', blank=True, null=True)
    last_diploma = models.FileField(upload_to='teacher_docs/diplomas/', blank=True, null=True)
    civil_servant_certificate = models.FileField(upload_to='teacher_docs/certificates/', blank=True, null=True)

class CourseRequest(models.Model):
    STATUS_CHOICES = [
        ('open', 'Ouvert'),
        ('pending', 'En traitement'),
        ('matched', 'Assigné'),
        ('cancelled', 'Annulé'),
    ]
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='course_requests')
    subjects = models.ManyToManyField(Subject, related_name='course_requests')
    level = models.ForeignKey(Level, on_delete=models.CASCADE, related_name='course_requests')
    rhythm = models.CharField(max_length=100, blank=True, null=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Request by {self.student.username} for {self.level.name}"

class CourseInterest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente de transmission'),
        ('transmitted', 'Transmis à l\'élève'),
        ('accepted', 'Accepté par l\'élève'),
        ('rejected', 'Refusé'),
    ]
    course_request = models.ForeignKey(CourseRequest, on_delete=models.CASCADE, related_name='interests')
    teacher = models.ForeignKey(TeacherProfile, on_delete=models.CASCADE, related_name='interests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('course_request', 'teacher')

    def __str__(self):
        return f"Interest by {self.teacher.user.username} for {self.course_request.id}"

class Booking(models.Model):
    COURSE_TYPE_CHOICES = [
        ('online', 'En ligne'),
        ('in_person', 'Présentiel'),
    ]
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('confirmed', 'Confirmé'),
        ('cancelled', 'Annulé'),
        ('completed', 'Terminé'),
    ]
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='student_bookings')
    teacher = models.ForeignKey(TeacherProfile, on_delete=models.CASCADE, related_name='teacher_bookings')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    date = models.DateField()
    time = models.TimeField()
    duration_hours = models.FloatField(default=1.0)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    course_type = models.CharField(max_length=20, choices=COURSE_TYPE_CHOICES, default='in_person')
    meeting_link = models.URLField(blank=True, null=True)
    meeting_room_id = models.UUIDField(default=uuid.uuid4, editable=False)
    location_note = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    payment_status = models.CharField(max_length=20, default='unpaid')

    # --- Online session tracking ---
    session_started_at = models.DateTimeField(null=True, blank=True)
    session_ended_at = models.DateTimeField(null=True, blank=True)
    actual_duration_minutes = models.IntegerField(null=True, blank=True)  # computed on end

    # --- In-person validation ---
    validation_code = models.CharField(max_length=6, null=True, blank=True)
    validation_code_expires_at = models.DateTimeField(null=True, blank=True)
    is_validated = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.course_type == 'online' and not self.meeting_link:
            self.meeting_link = f"https://meet.jit.si/eduup-{self.meeting_room_id}"
        super().save(*args, **kwargs)

    @property
    def start_datetime(self):
        """Combine date and time into a single datetime object."""
        return timezone.make_aware(datetime.datetime.combine(self.date, self.time))

    @property
    def end_datetime(self):
        """Combine date, time and duration into a single datetime object."""
        return self.start_datetime + datetime.timedelta(hours=self.duration_hours)

    @property
    def can_generate_validation_code(self):
        """Can only generate code 10 minutes before the end of the lesson.
        Increased buffer (15 mins total) to handle client-server clock drift and regional shifts.
        """
        now = timezone.now()
        # 5 minutes before end + 10 min buffer = 15 minutes total
        window_start = self.end_datetime - datetime.timedelta(minutes=15)
        return now >= window_start

    @property
    def is_grace_period_expired(self):
        """Check if the 24h grace period after the lesson end has passed."""
        return timezone.now() > (self.end_datetime + datetime.timedelta(hours=24))

    @property
    def is_expired(self):
        """Check if the lesson time has passed without being completed or cancelled."""
        if self.status in ['completed', 'cancelled']:
            return False
        return timezone.now() > self.start_datetime

    def generate_validation_code(self):
        """Generate a fresh 6-digit code valid for 30 minutes."""
        self.validation_code = ''.join(random.choices(string.digits, k=6))
        self.validation_code_expires_at = timezone.now() + timezone.timedelta(minutes=30)
        self.save(update_fields=['validation_code', 'validation_code_expires_at'])
        return self.validation_code

class Review(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE)
    rating = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class GroupChat(models.Model):
    name = models.CharField(max_length=255)
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='administered_groups')
    members = models.ManyToManyField(User, related_name='chat_groups')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages', null=True, blank=True)
    group = models.ForeignKey(GroupChat, on_delete=models.CASCADE, related_name='messages', null=True, blank=True)
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')
    content = models.TextField(blank=True)
    file_attachment = models.FileField(upload_to='chat_attachments/', null=True, blank=True)
    sticker_url = models.URLField(null=True, blank=True)
    is_sticker = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    
    # --- Call support ---
    is_call = models.BooleanField(default=False)
    call_type = models.CharField(max_length=10, choices=[('audio', 'Audio'), ('video', 'Video')], null=True, blank=True)
    call_status = models.CharField(max_length=20, choices=[
        ('started', 'En attente'), 
        ('ongoing', 'En cours'), 
        ('ended', 'Terminé'), 
        ('missed', 'Manqué'),
        ('declined', 'Refusé')
    ], default='started', null=True, blank=True)
    call_room_id = models.CharField(max_length=100, null=True, blank=True)

class GroupReadReceipt(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='read_receipts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_read_receipts')
    group = models.ForeignKey(GroupChat, on_delete=models.CASCADE, related_name='read_receipts')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user')


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('message', 'Nouveau Message'),
        ('booking_confirmed', 'Cours Confirmé'),
        ('booking_cancelled', 'Cours Annulé'),
        ('new_booking', 'Nouveau Cours'),
        ('incoming_call', 'Appel Entrant'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    content = models.TextField()
    related_id = models.IntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    escrow_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    
    def __str__(self):
        return f"Wallet of {self.user.username} - {self.balance} XOF"

class Transaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('deposit', 'Dépôt'),
        ('withdrawal', 'Retrait'),
        ('booking_hold', 'Montant bloqué (Réservation)'),
        ('booking_payout', 'Paiement (Cours validé)'),
        ('booking_refund', 'Remboursement (Cours annulé)'),
        ('platform_fee', 'Commission Plateforme'),
    ]
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('completed', 'Complété'),
        ('failed', 'Échoué'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reference_id = models.CharField(max_length=100, blank=True, null=True, unique=True) # GeniusPay reference
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    description = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.transaction_type} - {self.amount} XOF - {self.user.username}"

from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_wallet(sender, instance, created, **kwargs):
    if created:
        Wallet.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_wallet(sender, instance, **kwargs):
    if not hasattr(instance, 'wallet'):
        Wallet.objects.create(user=instance)
    else:
        instance.wallet.save()


class SupportTicket(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_tickets')
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Ticket #{self.id} by {self.user.username} - {'Resolved' if self.is_resolved else 'Open'}"


class PasswordResetCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_codes')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        """Code is valid for 15 minutes and not yet used."""
        expiry = self.created_at + datetime.timedelta(minutes=15)
        return not self.is_used and timezone.now() < expiry

    def __str__(self):
        return f"Reset code for {self.user.email} - {'used' if self.is_used else 'active'}"
