import os
import requests
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from .models import SupportTicket
from .serializers import SupportTicketSerializer

class SupportTicketViewSet(viewsets.ModelViewSet):
    serializer_class = SupportTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == 'admin':
            return SupportTicket.objects.all().order_by('-created_at')
        return SupportTicket.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def resolve(self, request, pk=None):
        ticket = self.get_object()
        ticket.is_resolved = True
        ticket.save()
        return Response(SupportTicketSerializer(ticket).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def chatbot_query(request):
    """
    Query Gemini API for EduUp user guide support.
    """
    user_message = request.data.get('message', '')
    history = request.data.get('history', [])  # list of {text: str, isBot: bool}
    
    if not user_message:
        return Response({'error': 'Message requis.'}, status=status.HTTP_400_BAD_REQUEST)
        
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        # Fallback response if API Key is not set
        reply = (
            "Bonjour ! Je suis EduBot, votre guide d'utilisation.\n\n"
            "*(Note : L'API Gemini n'est pas encore configurée. Voici les réponses courantes)*\n\n"
        )
        msg_lower = user_message.lower()
        if 'prix' in msg_lower or 'tarif' in msg_lower:
            reply += "Les tarifs varient de 2000 XAF à 10 000 XAF par heure en zone CEMAC selon les tuteurs."
        elif 'paiement' in msg_lower or 'money' in msg_lower:
            reply += "Nous acceptons Orange Money (OM) et MTN Mobile Money (MoMo) pour les recharges et retraits via GeniusPay."
        elif 'présentiel' in msg_lower or 'code' in msg_lower:
            reply += "Pour les cours en présentiel, l'élève doit générer un code de validation à 6 chiffres (valable 30 min) à la fin de la séance. Le professeur le valide ensuite sur son dashboard pour percevoir les fonds."
        elif 'classe' in msg_lower or 'virtuelle' in msg_lower or 'ligne' in msg_lower:
            reply += "Les cours en ligne lancent automatiquement une visio Jitsi. Les fonds sont débloqués dès que la visio est quittée ou fermée."
        else:
            reply += "Je suis EduBot, je peux répondre à vos questions d'utilisation. Si vous avez un bug technique, veuillez cliquer sur 'Signaler un problème' pour contacter nos administrateurs."
            
        return Response({'response': reply})

    # Prepare conversation history format for Gemini API
    contents = []
    
    # System Instruction
    system_instruction = (
        "Vous êtes EduBot, l'assistant virtuel et guide d'utilisation de la plateforme EduUp en zone CEMAC.\n"
        "EduUp met en relation élèves et professeurs particuliers.\n"
        "Voici le guide d'utilisation :\n"
        "1. Inscription : Rôle Étudiant ou Enseignant. Les profs remplissent leur profil et attendent la validation de l'admin.\n"
        "2. Portefeuille : Rechargement via Mobile Money (GeniusPay). Lors d'une réservation, l'argent est bloqué sous séquestre (escrow balance).\n"
        "3. Cours en Ligne : Un lien Jitsi est créé. Le cours se termine automatiquement quand on quitte la visio.\n"
        "4. Cours en Présentiel : L'élève génère un code à 6 chiffres à la fin du cours et le donne au professeur, qui le valide pour recevoir ses fonds.\n"
        "5. Retrait : Les profs retirent leurs fonds vers leur Mobile Money (20% de commission plateforme).\n\n"
        "Répondez avec politesse, concision, et en français. Si l'utilisateur rencontre un bug technique, suggérez-lui d'utiliser le bouton 'Signaler un problème' dans la fenêtre de chat pour créer un ticket."
    )

    # Convert history
    for item in history:
        role = "model" if item.get('isBot') else "user"
        contents.append({
            "role": role,
            "parts": [{"text": item.get('text', '')}]
        })
        
    # Append current message
    contents.append({
        "role": "user",
        "parts": [{"text": user_message}]
    })

    # Call Gemini API
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 800
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers={'Content-Type': 'application/json'}, timeout=10)
        response.raise_for_status()
        res_data = response.json()
        
        candidates = res_data.get('candidates', [])
        if candidates:
            parts = candidates[0].get('content', {}).get('parts', [])
            if parts:
                ai_reply = parts[0].get('text', '')
                return Response({'response': ai_reply})
                
        return Response({'response': "Désolé, je n'ai pas pu générer de réponse pour le moment."})
    except Exception as e:
        return Response({'response': f"Une erreur s'est produite lors de la communication avec l'assistant virtuel : {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)
