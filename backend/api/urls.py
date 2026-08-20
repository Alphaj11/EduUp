from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    CustomTokenObtainPairView, TeacherProfileViewSet, BookingViewSet, MessageViewSet, 
    UserViewSet, SubjectViewSet, LevelViewSet, ReviewViewSet, GroupChatViewSet,
    NotificationViewSet, CourseRequestViewSet, CourseInterestViewSet
)
from .registration_view import register_user
from .password_reset_views import request_reset_code, verify_reset_code, confirm_reset_password
from .wallet_views import WalletViewSet, TransactionViewSet, GeniusPayWebhookView
from .admin_views import AdminViewSet
from .contact_views import submit_contact
from .chatbot_view import chatbot_query, SupportTicketViewSet

router = DefaultRouter()
router.register(r'admin', AdminViewSet, basename='admin')
router.register(r'teachers', TeacherProfileViewSet)
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'groups', GroupChatViewSet, basename='group')
router.register(r'users', UserViewSet, basename='user')
router.register(r'subjects', SubjectViewSet)
router.register(r'levels', LevelViewSet)
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'wallet', WalletViewSet, basename='wallet')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'course-requests', CourseRequestViewSet, basename='courserequest')
router.register(r'course-interests', CourseInterestViewSet, basename='courseinterest')
router.register(r'support-tickets', SupportTicketViewSet, basename='supportticket')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', register_user, name='register_user'),
    path('auth/password-reset/request/', request_reset_code, name='request_reset_code'),
    path('auth/password-reset/verify/', verify_reset_code, name='verify_reset_code'),
    path('auth/password-reset/confirm/', confirm_reset_password, name='confirm_reset_password'),
    path('webhooks/geniuspay/', GeniusPayWebhookView.as_view(), name='geniuspay_webhook'),
    path('contact/', submit_contact, name='submit_contact'),
    path('chatbot/', chatbot_query, name='chatbot_query'),
]
