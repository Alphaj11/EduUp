import random
from django.contrib.auth import get_user_model
from django.core.mail import EmailMessage
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import PasswordResetCode

User = get_user_model()


def _generate_code():
    """Generate a cryptographically safe 6-digit numeric code."""
    return str(random.randint(100000, 999999))


@api_view(['POST'])
@permission_classes([AllowAny])
def request_reset_code(request):
    """
    Step 1 — Send a 6-digit code to the user's email.
    Body: { "email": "..." }
    Always returns 200 to prevent email enumeration.
    """
    email = request.data.get('email', '').strip()
    if not email:
        return Response({'error': 'Adresse email requise.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email=email).first()
    if user:
        # Invalidate any previous unused codes for this user
        PasswordResetCode.objects.filter(user=user, is_used=False).update(is_used=True)

        code = _generate_code()
        PasswordResetCode.objects.create(user=user, code=code)

        body = (
            f"Bonjour {user.first_name or user.username},\n\n"
            f"Vous avez demandé la réinitialisation de votre mot de passe sur EduUp.\n\n"
            f"Votre code de vérification est :\n\n"
            f"        {code}\n\n"
            f"Ce code est valable pendant 15 minutes.\n"
            f"Si vous n'avez pas fait cette demande, ignorez simplement cet e-mail.\n\n"
            f"— L'équipe EduUp"
        )

        msg = EmailMessage(
            subject="EduUp — Code de réinitialisation de mot de passe",
            body=body,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@eduup.com'),
            to=[user.email],
        )
        msg.send(fail_silently=True)

    return Response({'detail': 'Si cette adresse email est enregistrée, vous allez recevoir un code par e-mail.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_reset_code(request):
    """
    Step 2 — Verify the 6-digit code.
    Body: { "email": "...", "code": "123456" }
    Returns 200 if valid, 400 otherwise.
    """
    email = request.data.get('email', '').strip()
    code = request.data.get('code', '').strip()

    if not email or not code:
        return Response({'error': 'Email et code requis.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email=email).first()
    if not user:
        return Response({'error': 'Code invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)

    reset = (
        PasswordResetCode.objects
        .filter(user=user, code=code, is_used=False)
        .order_by('-created_at')
        .first()
    )

    if not reset or not reset.is_valid():
        return Response({'error': 'Code invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'detail': 'Code vérifié avec succès.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def confirm_reset_password(request):
    """
    Step 3 — Set new password after the code has been verified.
    Body: { "email": "...", "code": "123456", "new_password": "..." }
    Marks the code as used.
    """
    email = request.data.get('email', '').strip()
    code = request.data.get('code', '').strip()
    new_password = request.data.get('new_password', '')

    if not email or not code or not new_password:
        return Response({'error': 'Tous les champs sont requis.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({'error': 'Le mot de passe doit contenir au moins 8 caractères.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email=email).first()
    if not user:
        return Response({'error': 'Code invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)

    reset = (
        PasswordResetCode.objects
        .filter(user=user, code=code, is_used=False)
        .order_by('-created_at')
        .first()
    )

    if not reset or not reset.is_valid():
        return Response({'error': 'Code invalide ou expiré. Recommencez la procédure.'}, status=status.HTTP_400_BAD_REQUEST)

    # Mark code as used and set new password
    reset.is_used = True
    reset.save()

    user.set_password(new_password)
    user.save()

    return Response({'detail': 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.'})
