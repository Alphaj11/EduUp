from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db.models import Sum, Q, Count
from django.utils import timezone
from django.http import HttpResponse
import csv
from .models import User, Booking, Transaction, Wallet
from .serializers import BookingSerializer, TransactionSerializer, UserSerializer

class AdminViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['post'])
    def trigger_cancellation(self, request):
        from .services import cancel_stale_bookings_service
        count = cancel_stale_bookings_service()
        return Response({'status': 'success', 'cancelled_count': count})

    @action(detail=False, methods=['get'])
    def pending_teachers(self, request):
        from .models import TeacherProfile
        from .serializers import TeacherProfileSerializer
        profiles = TeacherProfile.objects.filter(status='pending').select_related('user')
        return Response(TeacherProfileSerializer(profiles, many=True).data)

    @action(detail=False, methods=['post'])
    def approve_teacher(self, request):
        from .models import TeacherProfile
        profile_id = request.data.get('profile_id')
        try:
            profile = TeacherProfile.objects.get(id=profile_id, status='pending')
            profile.status = 'approved'
            profile.save()
            return Response({'status': 'Teacher approved'})
        except TeacherProfile.DoesNotExist:
            return Response({'error': 'Profile not found or not pending'}, status=404)

    @action(detail=False, methods=['post'])
    def reject_teacher(self, request):
        from .models import TeacherProfile
        profile_id = request.data.get('profile_id')
        try:
            profile = TeacherProfile.objects.get(id=profile_id, status='pending')
            profile.status = 'rejected'
            profile.save()
            return Response({'status': 'Teacher rejected'})
        except TeacherProfile.DoesNotExist:
            return Response({'error': 'Profile not found or not pending'}, status=404)

    @action(detail=False, methods=['get'])
    def pending_interests(self, request):
        from .models import CourseInterest
        from .serializers import CourseInterestSerializer
        interests = CourseInterest.objects.filter(status='pending').select_related('teacher', 'course_request')
        return Response(CourseInterestSerializer(interests, many=True).data)

    @action(detail=False, methods=['post'])
    def transmit_interest(self, request):
        from .models import CourseInterest, GroupChat, Message
        interest_id = request.data.get('interest_id')
        try:
            interest = CourseInterest.objects.get(id=interest_id, status='pending')
            interest.status = 'transmitted'
            interest.save()
            
            # Formulate the message and send it to the student as if from admin
            student = interest.course_request.student
            teacher_user = interest.teacher.user
            
            # Send notification/message to student
            msg_content = f"Bonjour {student.first_name}, le professeur {teacher_user.first_name} {teacher_user.last_name} est intéressé par votre demande de cours ({interest.course_request.level.name}). Allez sur son profil pour vérifier et le contacter : /teacher/{teacher_user.id}"
            
            Message.objects.create(
                sender=request.user,
                receiver=student,
                content=msg_content
            )
            
            # Create a GroupChat to link them? No, let student contact teacher directly.
            
            return Response({'status': 'Interest transmitted'})
        except CourseInterest.DoesNotExist:
            return Response({'error': 'Interest not found or not pending'}, status=404)


    @action(detail=False, methods=['get'])
    def stats(self, request):
        today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 1. Platform Commission
        fees_transactions = Transaction.objects.filter(transaction_type='platform_fee')
        total_commission = fees_transactions.aggregate(Sum('amount'))['amount__sum'] or 0

        # 2. Total in circulation (Wallets + Escrows)
        wallets = Wallet.objects.aggregate(Sum('balance'), Sum('escrow_balance'))
        total_balance = wallets['balance__sum'] or 0
        total_escrow = wallets['escrow_balance__sum'] or 0
        total_circulation = total_balance + total_escrow

        # 3. User counts
        total_users = User.objects.count()
        students_count = User.objects.filter(role='student').count()
        teachers_count = User.objects.filter(role='teacher').count()
        new_users_today = User.objects.filter(date_joined__gte=today).count()

        # 4. Booking stats
        total_bookings = Booking.objects.count()
        completed_bookings = Booking.objects.filter(status='completed').count()
        success_rate = (completed_bookings / total_bookings * 100) if total_bookings > 0 else 0

        # 5. Deposits vs Withdrawals
        total_deposits = Transaction.objects.filter(transaction_type='deposit', status='completed').aggregate(Sum('amount'))['amount__sum'] or 0
        total_withdrawals = abs(Transaction.objects.filter(transaction_type='withdrawal', status='completed').aggregate(Sum('amount'))['amount__sum'] or 0)

        return Response({
            'total_commission': total_commission,
            'total_circulation': total_circulation,
            'total_balance': total_balance,
            'total_escrow': total_escrow,
            'total_users': total_users,
            'students_count': students_count,
            'teachers_count': teachers_count,
            'new_users_today': new_users_today,
            'total_bookings': total_bookings,
            'completed_bookings': completed_bookings,
            'success_rate': round(success_rate, 1),
            'total_deposits': total_deposits,
            'total_withdrawals': total_withdrawals
        })

    @action(detail=False, methods=['get'])
    def list_users(self, request):
        role = request.query_params.get('role')
        users = User.objects.all()
        if role:
            users = users.filter(role=role)
        
        users = users.order_by('-date_joined')
        return Response(UserSerializer(users, many=True).data)

    @action(detail=False, methods=['get'])
    def export_users_csv(self, request):
        role = request.query_params.get('role')
        users = User.objects.all()
        if role:
            users = users.filter(role=role)
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="users_{role or "all"}_{timezone.now().date()}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'Pseudo', 'Email', 'Prénom', 'Nom', 'Rôle', 'Pays', 'Ville', 'Date Inscription'])
        
        for u in users:
            writer.writerow([u.id, u.username, u.email, u.first_name, u.last_name, u.role, u.country, u.city, u.date_joined])
            
        return response

    @action(detail=False, methods=['get'])
    def global_transactions(self, request):
        limit = int(request.query_params.get('limit', 50))
        txs = Transaction.objects.all().select_related('user').order_by('-created_at')[:limit]
        return Response(TransactionSerializer(txs, many=True).data)

    @action(detail=False, methods=['get'])
    def global_bookings(self, request):
        limit = int(request.query_params.get('limit', 50))
        bookings = Booking.objects.all().select_related('student', 'teacher__user', 'subject').order_by('-created_at')[:limit]
        return Response(BookingSerializer(bookings, many=True).data)

    @action(detail=False, methods=['post'])
    def create_admin(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        username = request.data.get('username')

        if not email or not password or not username:
            return Response({'error': "L'email, le pseudo et le mot de passe sont requis."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists() or User.objects.filter(username=username).exists():
            return Response({'error': 'Cet email ou pseudo est déjà pris.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='admin'
        )

        return Response({'message': 'Administrateur créé avec succès', 'id': user.id})

    @action(detail=False, methods=['post'])
    def toggle_user_status(self, request):
        user_id = request.data.get('user_id')
        try:
            user = User.objects.get(id=user_id)
            if user.is_superuser and user == request.user:
                return Response({'error': 'Vous ne pouvez pas vous suspendre vous-même.'}, status=status.HTTP_400_BAD_REQUEST)
            user.is_active = not user.is_active
            user.save()
            return Response({'status': 'Success', 'is_active': user.is_active})
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def delete_user(self, request):
        user_id = request.data.get('user_id')
        try:
            user = User.objects.get(id=user_id)
            if user.is_superuser and user == request.user:
                return Response({'error': 'Vous ne pouvez pas vous supprimer vous-même.'}, status=status.HTTP_400_BAD_REQUEST)
            user.delete()
            return Response({'status': 'Success', 'message': 'Utilisateur supprimé.'})
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
