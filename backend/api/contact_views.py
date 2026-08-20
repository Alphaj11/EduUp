from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.core.mail import EmailMessage
from django.conf import settings

@api_view(['POST'])
@permission_classes([AllowAny])
def submit_contact(request):
    data = request.data
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    subject = data.get('subject')
    message = data.get('message')
    
    if not all([first_name, last_name, email, subject, message]):
        return Response({'error': 'Tous les champs sont obligatoires.'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        full_message = f"Nouveau message de contact de la plateforme EduUp.\n\nNom: {first_name} {last_name}\nEmail: {email}\nObjet: {subject}\n\nMessage:\n{message}"
        
        email_message = EmailMessage(
            subject=f"Contact EduUp: {subject}",
            body=full_message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@eduup.com'),
            to=['contact.ttf@gmail.com'],
            reply_to=[email],
        )
        email_message.send(fail_silently=True)
        return Response({'success': 'Votre message a été envoyé avec succès.'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
