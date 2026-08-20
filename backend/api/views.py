from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from .serializers import (
    UserSerializer, TeacherProfileSerializer, SubjectSerializer,
    LevelSerializer, BookingSerializer, MessageSerializer, ReviewSerializer,
    GroupChatSerializer, NotificationSerializer
)
from django.utils import timezone
from .models import User, Subject, Level, TeacherProfile, Booking, Review, Message, GroupChat, Notification, GroupReadReceipt, Transaction


class IsAdminOrSelf(permissions.BasePermission):
    """Allow access only to admin users or the user themselves."""
    def has_object_permission(self, request, view, obj):
        return request.user.is_staff or obj == request.user


from django_filters import rest_framework as dj_filters

class TeacherProfileFilter(dj_filters.FilterSet):
    min_rate = dj_filters.NumberFilter(field_name="hourly_rate", lookup_expr='gte')
    max_rate = dj_filters.NumberFilter(field_name="hourly_rate", lookup_expr='lte')
    subject = dj_filters.NumberFilter(field_name="subjects__id")
    level = dj_filters.NumberFilter(field_name="levels__id")
    country = dj_filters.CharFilter(field_name="user__country", lookup_expr='icontains')
    city = dj_filters.CharFilter(field_name="user__city", lookup_expr='icontains')

    class Meta:
        model = TeacherProfile
        fields = ['is_certified', 'subject', 'level', 'min_rate', 'max_rate', 'country', 'city']

class TeacherProfileViewSet(viewsets.ModelViewSet):
    """Access to teacher profiles. Read for all, update for the teacher themselves."""
    queryset = TeacherProfile.objects.select_related('user').prefetch_related('subjects', 'levels').all()
    serializer_class = TeacherProfileSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TeacherProfileFilter
    
    def get_permissions(self):
        if self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_update(self, serializer):
        # Ensure only the owner can update
        profile = self.get_object()
        if profile.user != self.request.user:
            raise permissions.PermissionDenied("You cannot update another teacher's profile.")
        serializer.save()

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        """Retrieve the profile of the currently authenticated teacher."""
        profile = TeacherProfile.objects.filter(user=request.user).first()
        if not profile:
            return Response({'error': 'Teacher profile not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)
    search_fields = ['user__first_name', 'user__last_name', 'bio']
    ordering_fields = ['hourly_rate', 'rating']


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'teacher':
            user_bookings = Booking.objects.filter(teacher__user=user)
        else:
            user_bookings = Booking.objects.filter(student=user)

        return user_bookings.select_related(
            'student', 'teacher__user', 'subject'
        ).order_by('-date', '-time')

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        from django.db import transaction
        from decimal import Decimal
        
        user = self.request.user
        
        with transaction.atomic():
            if user.role == 'teacher':
                teacher_profile = user.teacher_profile
                student_id = self.request.data.get('student')
                student = User.objects.get(id=student_id)
            else:
                student = user
                teacher_id = self.request.data.get('teacher')
                teacher_profile = TeacherProfile.objects.get(id=teacher_id)
                
            duration_hours = Decimal(str(self.request.data.get('duration_hours', 1.0)))
            price = teacher_profile.hourly_rate * duration_hours
            
            student_wallet = student.wallet
            if student_wallet.balance < price:
                raise ValidationError({"detail": f"Solde insuffisant pour réserver (Prix : {price} XOF, Solde : {student_wallet.balance} XOF)."})
                
            student_wallet.balance -= price
            student_wallet.escrow_balance += price
            student_wallet.save()

            if user.role == 'teacher':
                booking = serializer.save(teacher=teacher_profile, price=price)
            else:
                booking = serializer.save(student=student, price=price)
                
            Transaction.objects.create(
                user=student,
                amount=-price,
                transaction_type='booking_hold',
                status='completed',
                booking=booking,
                description=f"Fonds sécurisés pour le cours {booking.subject.name} (Pr. {teacher_profile.user.first_name})"
            )
            
        # Create notification for the OTHER party
        if user.role == 'teacher':
            Notification.objects.create(
                user=booking.student,
                type='new_booking',
                title="Nouvelle Séance Programmée",
                content=f"Dr. {user.last_name} a programmé une nouvelle séance de {booking.subject.name} pour vous.",
                related_id=booking.id
            )
        else:
            Notification.objects.create(
                user=booking.teacher.user,
                type='new_booking',
                title="Nouveau Cours Demandé",
                content=f"{booking.student.first_name} souhaite réserver un cours de {booking.subject.name}.",
                related_id=booking.id
            )

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def update_status(self, request, pk=None):
        """Allow teacher or student to update booking status with automated notifications."""
        booking = self.get_object()
        user = request.user
        is_teacher = booking.teacher.user == user
        is_student = booking.student == user

        if not (is_teacher or is_student):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get('status')
        if new_status not in ['confirmed', 'cancelled', 'completed']:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        # Teachers can confirm, cancel, or complete
        # Students can only cancel (usually)
        if is_student and new_status != 'cancelled':
            return Response({'error': 'Students can only cancel sessions.'}, status=status.HTTP_403_FORBIDDEN)

        old_status = booking.status
        
        from django.db import transaction
        with transaction.atomic():
            if new_status == 'cancelled' and old_status != 'cancelled' and booking.payment_status != 'refunded':
                student_wallet = booking.student.wallet
                student_wallet.escrow_balance -= booking.price
                student_wallet.balance += booking.price
                student_wallet.save()
                
                Transaction.objects.create(
                    user=booking.student,
                    amount=booking.price,
                    transaction_type='booking_refund',
                    status='completed',
                    booking=booking,
                    description=f"Remboursement de la réservation {booking.subject.name}"
                )
                booking.payment_status = 'refunded'
                
            # If manual completion by teacher (though typically via online validation or code)
            elif new_status == 'completed' and old_status != 'completed' and booking.payment_status != 'paid':
                student_wallet = booking.student.wallet
                teacher_wallet = booking.teacher.user.wallet
                student_wallet.escrow_balance -= booking.price
                teacher_wallet.balance += booking.price
                student_wallet.save()
                teacher_wallet.save()
                
                Transaction.objects.create(
                    user=booking.teacher.user,
                    amount=booking.price,
                    transaction_type='booking_payout',
                    status='completed',
                    booking=booking,
                    description=f"Paiement cours validé {booking.subject.name} (Elève: {booking.student.first_name})"
                )
                booking.payment_status = 'paid'

            booking.status = new_status
            booking.save(update_fields=['status', 'payment_status'])

        # Notify the OTHER party
        recipient = booking.student if is_teacher else booking.teacher.user
        
        titles = {
            'confirmed': "Cours Confirmé !",
            'cancelled': "Cours Annulé",
            'completed': "Cours Terminé"
        }
        
        content = ""
        if new_status == 'confirmed':
            content = f"Votre cours de {booking.subject.name} avec {user.first_name} est confirmé."
        elif new_status == 'cancelled':
            sender_name = user.first_name if is_student else f"Dr. {user.last_name}"
            content = f"Le cours de {booking.subject.name} avec {sender_name} a été annulé."
        elif new_status == 'completed':
            content = f"Le cours de {booking.subject.name} avec {user.first_name} est désormais marqué comme terminé."

        if content:
            Notification.objects.create(
                user=recipient,
                type=f'booking_{new_status}',
                title=titles.get(new_status, "Mise à jour du cours"),
                content=content,
                related_id=booking.id
            )

        return Response(BookingSerializer(booking).data)

    # ────────────────────────────────────────────────
    # ONLINE SESSION TRACKING
    # ────────────────────────────────────────────────

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def start_session(self, request, pk=None):
        """Record session start time for an online booking."""
        booking = self.get_object()
        user = request.user
        is_student = booking.student == user
        is_teacher = booking.teacher.user == user
        if not (is_student or is_teacher):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        if booking.course_type != 'online':
            return Response({'error': 'Only for online bookings'}, status=status.HTTP_400_BAD_REQUEST)
        if not booking.session_started_at:
            booking.session_started_at = tz.now()
            booking.save(update_fields=['session_started_at'])
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def end_session(self, request, pk=None):
        """Record session end time and compute actual duration."""
        booking = self.get_object()
        user = request.user
        is_student = booking.student == user
        is_teacher = booking.teacher.user == user
        if not (is_student or is_teacher):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        if booking.course_type != 'online':
            return Response({'error': 'Only for online bookings'}, status=status.HTTP_400_BAD_REQUEST)

        from django.db import transaction
        with transaction.atomic():
            booking.session_ended_at = timezone.now()
            if booking.session_started_at:
                delta = booking.session_ended_at - booking.session_started_at
                booking.actual_duration_minutes = int(delta.total_seconds() / 60)
                
            if booking.status != 'completed' and booking.payment_status != 'paid':
                student_wallet = booking.student.wallet
                teacher_wallet = booking.teacher.user.wallet
                student_wallet.escrow_balance -= booking.price
                teacher_wallet.balance += booking.price
                student_wallet.save()
                teacher_wallet.save()
                Transaction.objects.create(
                    user=booking.teacher.user,
                    amount=booking.price,
                    transaction_type='booking_payout',
                    status='completed',
                    booking=booking,
                    description=f"Paiement visio {booking.subject.name} ({booking.student.first_name})"
                )
                booking.payment_status = 'paid'

            booking.status = 'completed'
            booking.save(update_fields=['session_ended_at', 'actual_duration_minutes', 'status', 'payment_status'])

        # Notify both parties
        Notification.objects.create(
            user=booking.student,
            type='booking_confirmed',
            title="Séance Terminée",
            content=f"Votre cours de {booking.subject.name} avec {booking.teacher.user.first_name} est terminé. Durée: {booking.actual_duration_minutes or 0} min.",
            related_id=booking.id
        )
        Notification.objects.create(
            user=booking.teacher.user,
            type='booking_confirmed',
            title="Séance Terminée",
            content=f"Votre cours de {booking.subject.name} avec {booking.student.first_name} est terminé. Durée: {booking.actual_duration_minutes or 0} min.",
            related_id=booking.id
        )
        return Response(BookingSerializer(booking).data)

    # ────────────────────────────────────────────────
    # IN-PERSON VALIDATION CODE
    # ────────────────────────────────────────────────

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def generate_validation_code(self, request, pk=None):
        """Student generates a 6-digit code to confirm in-person course completion."""
        booking = self.get_object()
        if booking.student != request.user:
            return Response({'error': 'Seul l\'élève peut générer le code.'}, status=status.HTTP_403_FORBIDDEN)
        if booking.course_type != 'in_person':
            return Response({'error': 'Only for in-person bookings'}, status=status.HTTP_400_BAD_REQUEST)
        if booking.status != 'confirmed':
            return Response({'error': 'Le cours doit être confirmé.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Security: can only generate code IF 5 minutes before lesson end
        if not booking.can_generate_validation_code:
            return Response({
                'error': 'Vous pourrez générer le code 5 minutes avant la fin prévue du cours.',
                'end_time_approx': (booking.end_datetime - timezone.timedelta(minutes=5)).strftime('%H:%M')
            }, status=status.HTTP_400_BAD_REQUEST)

        code = booking.generate_validation_code()
        return Response({
            'code': code,
            'expires_at': booking.validation_code_expires_at.isoformat(),
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def validate_in_person(self, request, pk=None):
        """Teacher submits the code provided by the student to validate the in-person course."""
        booking = self.get_object()
        if booking.teacher.user != request.user:
            return Response({'error': 'Seul le professeur peut valider.'}, status=status.HTTP_403_FORBIDDEN)
        if booking.course_type != 'in_person':
            return Response({'error': 'Only for in-person bookings'}, status=status.HTTP_400_BAD_REQUEST)
        if booking.is_validated:
            return Response({'error': 'Ce cours a déjà été validé.'}, status=status.HTTP_400_BAD_REQUEST)

        submitted_code = request.data.get('code', '').strip()
        if not submitted_code:
            return Response({'error': 'Code requis.'}, status=status.HTTP_400_BAD_REQUEST)
        if booking.validation_code != submitted_code:
            return Response({'error': 'Code incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Security: can only validate IF lesson start time has passed (with 10min buffer)
        if timezone.now() < (booking.start_datetime - timezone.timedelta(minutes=10)):
            return Response({'error': 'Vous ne pouvez valider le cours qu\'à l\'approche de l\'heure de début.'}, status=status.HTTP_400_BAD_REQUEST)

        if not booking.validation_code_expires_at or timezone.now() > booking.validation_code_expires_at:
            return Response({'error': 'Code expiré. Demandez à l\'élève d\'en générer un nouveau.'}, status=status.HTTP_400_BAD_REQUEST)

        # All good — mark as validated + completed
        from django.db import transaction
        with transaction.atomic():
            if booking.status != 'completed' and booking.payment_status != 'paid':
                student_wallet = booking.student.wallet
                teacher_wallet = booking.teacher.user.wallet
                student_wallet.escrow_balance -= booking.price
                teacher_wallet.balance += booking.price
                student_wallet.save()
                teacher_wallet.save()
                Transaction.objects.create(
                    user=booking.teacher.user,
                    amount=booking.price,
                    transaction_type='booking_payout',
                    status='completed',
                    booking=booking,
                    description=f"Paiement code validé {booking.subject.name} ({booking.student.first_name})"
                )
                booking.payment_status = 'paid'

            booking.is_validated = True
            booking.status = 'completed'
            booking.validation_code = None  # invalidate after use
            booking.save(update_fields=['is_validated', 'status', 'validation_code', 'payment_status'])

        # Notify student
        Notification.objects.create(
            user=booking.student,
            type='booking_confirmed',
            title="Cours Validé ✓",
            content=f"Votre cours de {booking.subject.name} avec {booking.teacher.user.first_name} a été validé et marqué comme terminé.",
            related_id=booking.id
        )

        return Response(BookingSerializer(booking).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAdminUser()]
        # chat_contacts and other custom actions allow any authenticated user
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get', 'patch', 'put', 'delete'], url_path='me')
    def me(self, request):
        if request.method == 'GET':
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        elif request.method == 'DELETE':
            request.user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['patch'], url_path='presence')
    def presence(self, request):
        """Update user online/offline status."""
        from django.utils import timezone
        is_online = request.data.get('is_online', False)
        request.user.is_online = is_online
        if not is_online:
            request.user.last_seen = timezone.now()
        request.user.save(update_fields=['is_online', 'last_seen'])
        return Response({'is_online': request.user.is_online, 'last_seen': request.user.last_seen})

    @action(detail=False, methods=['get'], url_path='chat-contacts', permission_classes=[permissions.IsAuthenticated])
    def chat_contacts(self, request):
        """Return all users excluding the current user so they can start new chats."""
        users = User.objects.exclude(id=request.user.id).order_by('first_name', 'last_name')
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)



class GroupChatViewSet(viewsets.ModelViewSet):
    serializer_class = GroupChatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return GroupChat.objects.filter(members=self.request.user)

    def perform_create(self, serializer):
        group = serializer.save(admin=self.request.user)
        group.members.add(self.request.user)

    @action(detail=True, methods=['post'])
    def add_members(self, request, pk=None):
        group = self.get_object()
        if group.admin != request.user:
            return Response({'error': 'Only admin can add members'}, status=status.HTTP_403_FORBIDDEN)
        user_ids = request.data.get('user_ids', [])
        users = User.objects.filter(id__in=user_ids)
        group.members.add(*users)
        return Response(GroupChatSerializer(group).data)

    @action(detail=True, methods=['post'])
    def remove_members(self, request, pk=None):
        group = self.get_object()
        if group.admin != request.user:
            return Response({'error': 'Only admin can remove members'}, status=status.HTTP_403_FORBIDDEN)
        user_ids = request.data.get('user_ids', [])
        # Admin should not be able to remove themselves via this endpoint (use leave_group)
        users = User.objects.filter(id__in=user_ids).exclude(id=request.user.id)
        group.members.remove(*users)
        return Response(GroupChatSerializer(group).data)

    @action(detail=True, methods=['post'])
    def leave_group(self, request, pk=None):
        group = self.get_object()
        if request.user == group.admin:
            # WhatsApp logic: if admin leaves, the group is either deleted OR a new admin is assigned.
            # Simple approach for now: deleting if admin leaves.
            group.delete()
            return Response({'status': 'Group deleted as admin left'}, status=status.HTTP_204_NO_CONTENT)
        group.members.remove(request.user)
        return Response({'status': 'Left group'})

    def destroy(self, request, *args, **kwargs):
        group = self.get_object()
        if group.admin != request.user:
            return Response({'error': 'Only admin can delete the group'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Message.objects.filter(
            models.Q(sender=user) | 
            models.Q(receiver=user) | 
            models.Q(group__members=user)
        ).distinct()
        
        # Filter by conversation partner or group
        with_user = self.request.query_params.get('conversation_with')
        with_group = self.request.query_params.get('group')
        
        if with_user:
            qs = qs.filter(
                models.Q(sender=user, receiver_id=with_user) |
                models.Q(sender_id=with_user, receiver=user)
            )
        elif with_group:
            qs = qs.filter(group_id=with_group)
            
        return qs.select_related('sender', 'receiver', 'group').order_by('timestamp')

    def perform_create(self, serializer):
        # Security: always force sender to the authenticated user
        message = serializer.save(sender=self.request.user)

        # Create notification for receiver(s)
        if message.receiver:
            Notification.objects.create(
                user=message.receiver,
                type='message',
                title=f"Message de {message.sender.first_name}",
                content="[Sticker]" if message.is_sticker else (message.content[:100] + ('...' if len(message.content) > 100 else '')),
                related_id=message.sender.id
            )
        elif message.group:
            for member in message.group.members.exclude(id=self.request.user.id):
                Notification.objects.create(
                    user=member,
                    type='message',
                    title=f"Group {message.group.name}",
                    content=f"{message.sender.first_name}: " + ("[Sticker]" if message.is_sticker else (message.content[:100] + ('...' if len(message.content) > 100 else ''))),
                    related_id=message.group.id
                )

    @action(detail=False, methods=['post'])
    def initiate_call(self, request):
        """Initiate an audio or video call."""
        user = request.user
        receiver_id = request.data.get('receiver_id')
        group_id = request.data.get('group_id')
        call_type = request.data.get('call_type', 'video') 
        
        if not receiver_id and not group_id:
            return Response({'error': 'Un destinataire ou un groupe est requis.'}, status=status.HTTP_400_BAD_REQUEST)
            
        import uuid
        room_id = f"eduup-call-{uuid.uuid4()}"
        
        msg_data = {
            'sender': user,
            'is_call': True,
            'call_type': call_type,
            'call_status': 'started',
            'call_room_id': room_id,
            'content': f"Appel {call_type} entrant..."
        }
        if receiver_id:
            msg_data['receiver_id'] = receiver_id
        else:
            msg_data['group_id'] = group_id
            
        message = Message.objects.create(**msg_data)
        
        # Notify recipient(s)
        if receiver_id:
            Notification.objects.create(
                user_id=receiver_id,
                type='incoming_call',
                title=f"Appel {call_type} de {user.first_name}",
                content=f"Cliquez pour répondre.",
                related_id=message.id
            )
        elif group_id:
            group = GroupChat.objects.get(id=group_id)
            for member in group.members.exclude(id=user.id):
                Notification.objects.create(
                    user=member,
                    type='incoming_call',
                    title=f"Appel groupé : {group.name}",
                    content=f"{user.first_name} a lancé un appel.",
                    related_id=message.id
                )
                
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def respond_to_call(self, request, pk=None):
        """Update the status of an active call (accept, decline, end)."""
        message = self.get_object()
        if not message.is_call:
            return Response({'error': 'Ce message n\'est pas un appel.'}, status=status.HTTP_400_BAD_REQUEST)
            
        new_status = request.data.get('status') 
        if new_status not in ['ongoing', 'declined', 'ended', 'missed']:
            return Response({'error': 'Statut invalide.'}, status=status.HTTP_400_BAD_REQUEST)
            
        message.call_status = new_status
        message.save(update_fields=['call_status'])
        return Response(MessageSerializer(message).data)

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        """Mark a message as read. Only the receiver can do this."""
        message = self.get_object()
        if message.receiver == request.user or (message.group and request.user in message.group.members.all()):
            message.is_read = True
            message.save()
            return Response(MessageSerializer(message).data)
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    @action(detail=False, methods=['patch'])
    def mark_conversation_read(self, request):
        """Mark all messages from a partner or group as read."""
        user = request.user
        partner_id = request.data.get('partner_id')
        group_id = request.data.get('group_id')

        if partner_id:
            Message.objects.filter(
                receiver=user,
                sender_id=partner_id,
                is_read=False
            ).update(is_read=True)
        elif group_id:
            # Mark messages in that group as read for the user context using GroupReadReceipt
            unread_messages = Message.objects.filter(
                group_id=group_id
            ).exclude(sender=user).exclude(read_receipts__user=user)
            
            receipts = [
                GroupReadReceipt(message=msg, user=user, group_id=group_id)
                for msg in unread_messages
            ]
            GroupReadReceipt.objects.bulk_create(receipts, ignore_conflicts=True)
        
        return Response({'status': 'Conversation marked as read'})

    @action(detail=False, methods=['get'])
    def conversations(self, request):
        """Return a list of unique conversation partners and groups with last message."""
        user = request.user
        messages = Message.objects.filter(
            models.Q(sender=user) | 
            models.Q(receiver=user) | 
            models.Q(group__members=user)
        ).select_related('sender', 'receiver', 'group').order_by('-timestamp')
        
        seen = {}
        for msg in messages:
            if msg.group:
                key = f"group_{msg.group.id}"
                if key not in seen:
                    # WhatsApp style unread logic for groups:
                    # Any message in the group NOT sent by the user AND NOT in user's GroupReadReceipt
                    unread_count = Message.objects.filter(
                        group=msg.group
                    ).exclude(sender=user).exclude(read_receipts__user=user).count()
                    
                    seen[key] = {
                        'is_group': True,
                        'group': GroupChatSerializer(msg.group).data,
                        'last_message': msg.content or ('Appel' if msg.is_call else ('Sticker' if msg.is_sticker else ('Attachment' if msg.file_attachment else ''))),
                        'last_time': msg.timestamp,
                        'unread_count': unread_count, 
                    }
            else:
                partner = msg.receiver if msg.sender == user else msg.sender
                if partner and partner.id:
                    key = f"user_{partner.id}"
                    if key not in seen:
                        unread_count = Message.objects.filter(sender=partner, receiver=user, is_read=False).count()
                        seen[key] = {
                            'is_group': False,
                            'partner': UserSerializer(partner).data,
                            'last_message': msg.content or ('Appel' if msg.is_call else ('Attachment' if msg.file_attachment else '')),
                            'last_time': msg.timestamp,
                            'unread_count': unread_count,
                        }
        # Check for any active incoming call for this user (status='started', not sent by user)
        active_call = Message.objects.filter(
            is_call=True,
            call_status='started'
        ).filter(
            models.Q(receiver=user) | models.Q(group__members=user)
        ).exclude(sender=user).first()

        # Check for any ongoing call involving this user (accepted call)
        ongoing_call = Message.objects.filter(
            is_call=True,
            call_status='ongoing'
        ).filter(
            models.Q(sender=user) | models.Q(receiver=user) | models.Q(group__members=user)
        ).first()

        active_call_data = MessageSerializer(active_call, context={'request': request}).data if active_call else None
        ongoing_call_data = MessageSerializer(ongoing_call, context={'request': request}).data if ongoing_call else None

        return Response({
            'conversations': list(seen.values()),
            'active_call': active_call_data,
            'ongoing_call': ongoing_call_data,
        })

    @action(detail=False, methods=['delete'])
    def delete_conversation(self, request):
        """Delete all messages with a user or in a group for the current user."""
        user = request.user
        partner_id = request.query_params.get('conversation_with') or request.query_params.get('partner_id')
        group_id = request.query_params.get('group')

        if partner_id:
            Message.objects.filter(
                (models.Q(sender=user, receiver_id=partner_id) | 
                 models.Q(sender_id=partner_id, receiver=user))
            ).delete()
        elif group_id:
            # Simple approach: delete for everyone in the group if any member deletes? 
            # Better: a soft-delete per user, but let's keep it simple as EduUp is small.
            Message.objects.filter(group_id=group_id).delete()
        else:
            return Response({'error': 'Specify conversation_with or group'}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer


class LevelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Level.objects.all()
    serializer_class = LevelSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(booking__student=self.request.user)

    def perform_create(self, serializer):
        booking = serializer.validated_data.get('booking')
        if booking.student != self.request.user:
            raise permissions.PermissionDenied("You can only review your own bookings.")
        serializer.save()

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['patch'])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'All notifications marked as read'})
    @action(detail=False, methods=['delete'])
    def delete_all(self, request):
        Notification.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

from .models import CourseRequest, CourseInterest
from .serializers import CourseRequestSerializer, CourseInterestSerializer
import math

# Rough haversine for basic distance filtering if needed
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # radius of Earth in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

class CourseRequestViewSet(viewsets.ModelViewSet):
    serializer_class = CourseRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = CourseRequest.objects.all()

        if user.role == 'student':
            # Students only see their own requests
            return qs.filter(student=user).order_by('-created_at')
            
        elif user.role == 'teacher':
            try:
                profile = user.teacher_profile
                # Strict Filtering: Level must match AND at least one subject must match
                # open status only
                qs = qs.filter(
                    status='open',
                    level__in=profile.levels.all(),
                    subjects__in=profile.subjects.all()
                ).distinct()
                
                return qs.order_by('-created_at')
            except TeacherProfile.DoesNotExist:
                return CourseRequest.objects.none()
                
        return CourseRequest.objects.none()

    def perform_create(self, serializer):
        # A student creates a request
        serializer.save(student=self.request.user, status='open')

    @action(detail=False, methods=['get'])
    def map_points(self, request):
        """Returns open requests for the teacher, filtered optionally by distance if teacher lat/lng provided."""
        queryset = self.get_queryset()
        
        # Optional distance filter if we have teacher location sent in query params
        teacher_lat = request.query_params.get('lat')
        teacher_lon = request.query_params.get('lon')
        max_dist = request.query_params.get('radius', 50) # default 50km
        
        requests_data = self.get_serializer(queryset, many=True).data
        
        if teacher_lat and teacher_lon:
            try:
                t_lat = float(teacher_lat)
                t_lon = float(teacher_lon)
                m_dist = float(max_dist)
                filtered = []
                for req in requests_data:
                    r_lat = req.get('latitude')
                    r_lon = req.get('longitude')
                    if r_lat and r_lon:
                        dist = haversine(t_lat, t_lon, float(r_lat), float(r_lon))
                        if dist <= m_dist:
                            filtered.append(req)
                return Response(filtered)
            except ValueError:
                pass # Return all if parse fails
        
        return Response(requests_data)


class CourseInterestViewSet(viewsets.ModelViewSet):
    serializer_class = CourseInterestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'teacher':
            try:
                return CourseInterest.objects.filter(teacher=user.teacher_profile).order_by('-created_at')
            except TeacherProfile.DoesNotExist:
                return CourseInterest.objects.none()
        elif user.role == 'student':
            # student views interests transmitted to them
            return CourseInterest.objects.filter(
                course_request__student=user, 
                status='transmitted'
            ).order_by('-created_at')
        return CourseInterest.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != 'teacher':
            raise permissions.PermissionDenied("Seuls les professeurs peuvent créer des intérêts.")
        try:
            profile = user.teacher_profile
            # 1. Save with 'transmitted' status automatically
            interest = serializer.save(teacher=profile, status='transmitted')
            
            # 2. Get student and send message
            student = interest.course_request.student
            subjects = ", ".join([s.name for s in profile.subjects.all()])
            
            msg_content = (
                f"Bonjour ! Je suis très intéressé(e) par votre demande de cours.\n"
                f"📍 Localisation : {user.city}, {user.country}\n"
                f"🎓 Expérience : {profile.experience_years} ans\n"
                f"📚 Spécialités : {subjects}\n\n"
                f"Retrouvez mon profil complet et acceptez mon offre dans votre espace 'Offres Reçues'."
            )
            
            Message.objects.create(
                sender=user,
                receiver=student,
                content=msg_content
            )
            
            # 3. Send notification to student
            Notification.objects.create(
                user=student,
                title="Nouvelle offre de professeur",
                content=f"{user.first_name} {user.last_name} est intéressé(e) par votre demande de cours.",
                type="message"
            )
            
        except TeacherProfile.DoesNotExist:
            raise permissions.PermissionDenied("Profil de professeur introuvable.")

    @action(detail=True, methods=['post'])
    def accept_offer(self, request, pk=None):
        interest = self.get_object()
        if interest.course_request.student != request.user:
            return Response({'error': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
            
        interest.status = 'accepted'
        interest.save()
        
        # Optional: Close the course request
        # interest.course_request.status = 'assigned'
        # interest.course_request.save()
        
        # Notify the teacher
        Notification.objects.create(
            user=interest.teacher.user,
            title="Offre acceptée",
            content=f"{request.user.first_name} a accepté votre offre pour sa demande de cours. Vous pouvez maintenant finaliser la réservation.",
            type="message"
        )
        return Response({'status': 'Offre acceptée'})

    @action(detail=True, methods=['post'])
    def reject_offer(self, request, pk=None):
        interest = self.get_object()
        if interest.course_request.student != request.user:
            return Response({'error': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
            
        interest.status = 'rejected'
        interest.save()
        
        return Response({'status': 'Offre refusée'})

from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

