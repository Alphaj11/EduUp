from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from .serializers import UserSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    data = request.data
    if 'email' not in data or 'password' not in data or 'first_name' not in data or 'last_name' not in data:
        return Response({'detail': 'Veuillez remplir tous les champs obligatoires.'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        if User.objects.filter(email=data['email']).exists():
            return Response({'detail': 'Un utilisateur avec cet email existe déjà.'}, status=status.HTTP_400_BAD_REQUEST)
            
        username = data.get('username', data['email'])
        if User.objects.filter(username=username).exists():
            username = data['email'].split('@')[0] + "_" + str(User.objects.count())

        user = User.objects.create_user(
            username=username,
            email=data['email'],
            password=data['password'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            role=data.get('role', 'student'),
            gender=data.get('gender', 'M')
        )
        
        if user.role == 'teacher':
             from .models import TeacherProfile
             # Default title based on gender
             title = 'Mme' if user.gender == 'F' else 'Mr'
             tp = TeacherProfile.objects.create(user=user, academic_title=title)
             
             # Process teacher_profile data if provided
             import json
             teacher_profile_raw = data.get('teacher_profile', '{}')
             if isinstance(teacher_profile_raw, str):
                 try:
                     teacher_profile_data = json.loads(teacher_profile_raw)
                 except (json.JSONDecodeError, TypeError):
                     teacher_profile_data = {}
             else:
                 teacher_profile_data = teacher_profile_raw

             if teacher_profile_data:
                 tp.academic_title = teacher_profile_data.get('academic_title', title)
                 tp.experience_years = teacher_profile_data.get('experience_years', 0)
                 tp.teacher_type = teacher_profile_data.get('teacher_type', 'prive')
                 tp.is_civil_servant = tp.teacher_type == 'fonctionnaire'
                 tp.save()
                 
                 subjects = teacher_profile_data.get('subjects', [])
                 levels = teacher_profile_data.get('levels', [])
                 if subjects:
                     tp.subjects.set(subjects)
                 if levels:
                     tp.levels.set(levels)

             # Handle uploaded documents
             files = request.FILES
             if 'identity_document' in files:
                 tp.identity_document = files['identity_document']
             if 'bac_diploma' in files:
                 tp.bac_diploma = files['bac_diploma']
             if 'last_diploma' in files:
                 tp.last_diploma = files['last_diploma']
             if 'civil_servant_certificate' in files:
                 tp.civil_servant_certificate = files['civil_servant_certificate']
             tp.save()

        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    email = request.data.get('email')
    if not email:
        return Response({'detail': 'L\'adresse email est requise.'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(email=email).first()
        
        if user:
            # Simulate sending email for the demo. 
            # In production, we would use default_token_generator and send an email with the link.
            # print(f"Password reset link sent to {email}")
            pass
            
        # Always return success to prevent email enumeration
        return Response({'detail': 'Si cette adresse email existe, un lien de réinitialisation a été envoyé.'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
