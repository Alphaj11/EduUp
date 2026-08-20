from rest_framework import serializers
from .models import User, Subject, Level, TeacherProfile, Booking, Review, Message, GroupChat, Notification, CourseRequest, CourseInterest
from .services import get_currency_for_country
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed

# Redundant UserSerializer removed

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'

class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = '__all__'

class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'profile_picture', 'city', 'country', 'gender', 'phone_number')

class TeacherProfileSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    subjects_details = SubjectSerializer(source='subjects', many=True, read_only=True)
    levels_details = LevelSerializer(source='levels', many=True, read_only=True)
    
    class Meta:
        model = TeacherProfile
        fields = (
            'id', 'user', 'academic_title', 'bio', 'experience_years', 'subjects', 'levels',
            'hourly_rate', 'is_certified', 'rating', 'accepts_online', 'accepts_in_person',
            'subjects_details', 'levels_details', 'custom_subjects', 'status',
            'teacher_type', 'is_civil_servant', 'identity_document', 'bac_diploma',
            'last_diploma', 'civil_servant_certificate'
        )

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Use details for representation to return nested objects
        representation['subjects'] = representation.pop('subjects_details')
        representation['levels'] = representation.pop('levels_details')
        return representation

class UserSerializer(serializers.ModelSerializer):
    teacher_profile = TeacherProfileSerializer(required=False)
    currency = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'gender',
                  'city', 'country', 'phone_number', 'profile_picture', 'is_online', 'last_seen',
                  'teacher_profile', 'is_superuser', 'currency', 'is_active')
        read_only_fields = ('id', 'username', 'role', 'is_online', 'last_seen', 'is_superuser', 'currency', 'is_active')

    def get_currency(self, obj):
        return get_currency_for_country(obj.country)

    def to_internal_value(self, data):
        # Custom logic to handle nested teacher_profile from FormData
        # FormData sends nested fields like teacher_profile[bio]
        if hasattr(data, 'getlist'): # It's a QueryDict
            new_data = data.copy()
            teacher_profile = {}
            for key in data.keys():
                if key.startswith('teacher_profile['):
                    inner_key = key[key.find("[")+1:key.find("]")]
                    values = data.getlist(key)
                    teacher_profile[inner_key] = values if len(values) > 1 else values[0]
                    if key in new_data:
                        del new_data[key]
            
            if teacher_profile:
                # If teacher_profile already exists as a dict in data (unlikely with FormData), merge it
                existing = new_data.get('teacher_profile', {})
                if isinstance(existing, dict):
                    existing.update(teacher_profile)
                    new_data['teacher_profile'] = existing
                else:
                    new_data['teacher_profile'] = teacher_profile
            data = new_data
        return super().to_internal_value(data)

    def update(self, instance, validated_data):
        teacher_profile_data = validated_data.pop('teacher_profile', None)
        instance = super().update(instance, validated_data)
        
        if teacher_profile_data and instance.role == 'teacher':
            profile, created = TeacherProfile.objects.get_or_create(user=instance)
            subjects = teacher_profile_data.pop('subjects', None)
            levels = teacher_profile_data.pop('levels', None)
            
            for attr, value in teacher_profile_data.items():
                if hasattr(profile, attr):
                    setattr(profile, attr, value)
            profile.save()
            
            if subjects is not None:
                profile.subjects.set(subjects)
            if levels is not None:
                profile.levels.set(levels)
                
        return instance

class BookingSerializer(serializers.ModelSerializer):
    teacher_details = TeacherProfileSerializer(source='teacher', read_only=True)
    subject_details = SubjectSerializer(source='subject', read_only=True)
    student_details = UserSerializer(source='student', read_only=True)
    
    student = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    teacher = serializers.PrimaryKeyRelatedField(queryset=TeacherProfile.objects.all(), required=False)

    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = (
            'meeting_link', 'meeting_room_id', 'created_at',
            'session_started_at', 'session_ended_at', 'actual_duration_minutes',
            'validation_code', 'validation_code_expires_at', 'is_validated',
        )

    def validate_student(self, value):
        return value

class GroupChatSerializer(serializers.ModelSerializer):
    admin_details = UserSerializer(source='admin', read_only=True)
    members_details = UserSerializer(source='members', many=True, read_only=True)

    class Meta:
        model = GroupChat
        fields = '__all__'
        read_only_fields = ('admin', 'created_at')

class MessageBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ('id', 'content', 'timestamp', 'sender', 'is_sticker', 'sticker_url', 'file_attachment', 'is_call', 'call_type', 'call_status', 'call_room_id')

class MessageSerializer(serializers.ModelSerializer):
    sender_details = UserSerializer(source='sender', read_only=True)
    receiver_details = UserSerializer(source='receiver', read_only=True)
    group_details = GroupChatSerializer(source='group', read_only=True)
    reply_to_details = MessageBasicSerializer(source='reply_to', read_only=True)
    is_read = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ('sender', 'timestamp')

    def get_file_name(self, obj):
        if obj.file_attachment:
            import os
            return os.path.basename(obj.file_attachment.name)
        return None

    def get_is_read(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return obj.is_read
        
        if obj.group:
            # In groups, is_read means "I have read it"
            if obj.sender == request.user:
                return True
            return obj.read_receipts.filter(user=request.user).exists()
        
        return obj.is_read

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ('created_at',)

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ('created_at',)

from .models import Wallet, Transaction

class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ('balance', 'escrow_balance')

class TransactionSerializer(serializers.ModelSerializer):
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'status', 'reference_id')
    
    def get_user_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}" or obj.user.username

class CourseRequestSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)
    subjects_details = SubjectSerializer(source='subjects', many=True, read_only=True)
    level_details = LevelSerializer(source='level', read_only=True)

    class Meta:
        model = CourseRequest
        fields = '__all__'
        read_only_fields = ('student', 'created_at')

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['subjects'] = representation.pop('subjects_details', [])
        representation['level'] = representation.pop('level_details', None)
        return representation

class CourseInterestSerializer(serializers.ModelSerializer):
    course_request_details = CourseRequestSerializer(source='course_request', read_only=True)
    teacher_details = TeacherProfileSerializer(source='teacher', read_only=True)

    class Meta:
        model = CourseInterest
        fields = '__all__'
        read_only_fields = ('created_at', 'teacher')


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        user = self.user
        if user.role == 'teacher':
            if hasattr(user, 'teacher_profile'):
                if user.teacher_profile.status == 'pending':
                    raise AuthenticationFailed('Votre compte professeur est en attente d\'approbation par l\'administrateur.')
                elif user.teacher_profile.status == 'rejected':
                    raise AuthenticationFailed('Votre demande de compte professeur a été rejetée.')
        
        return data


from .models import SupportTicket

class SupportTicketSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = SupportTicket
        fields = '__all__'
        read_only_fields = ('created_at', 'user')

