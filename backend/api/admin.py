from django.contrib import admin
from .models import User, Subject, Level, TeacherProfile, Booking, Review, Message, Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'type', 'title', 'is_read', 'created_at')
    list_filter = ('type', 'is_read', 'created_at')

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'city', 'country')
    list_filter = ('role', 'country')

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name',)

@admin.register(Level)
class LevelAdmin(admin.ModelAdmin):
    list_display = ('name',)

@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'academic_title', 'teacher_type', 'status', 'experience_years', 'hourly_rate', 'is_certified')
    list_filter = ('status', 'teacher_type', 'is_certified', 'is_civil_servant')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('identity_document', 'bac_diploma', 'last_diploma', 'civil_servant_certificate')

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('student', 'teacher', 'subject', 'date', 'status')
    list_filter = ('status', 'date')

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('booking', 'rating', 'created_at')

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'receiver', 'timestamp', 'is_read')
