from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
import uuid

from .models import Wallet, Transaction
from .serializers import WalletSerializer, TransactionSerializer
from .services import GeniusPayService, get_currency_for_country

class WalletViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WalletSerializer

    @action(detail=False, methods=['get'])
    def me(self, request):
        wallet = request.user.wallet
        return Response(WalletSerializer(wallet).data)

    @action(detail=False, methods=['post'])
    def deposit(self, request):
        """
        Initiate a deposit via GeniusPay. Returns a checkout_url.
        """
        amount = request.data.get('amount')
        if_phone = request.user.phone_number
        if not amount or float(amount) <= 0:
            return Response({'error': 'Montant invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        if not if_phone:
            return Response({'error': 'Vous devez renseigner votre numéro de téléphone dans votre profil.'}, status=status.HTTP_400_BAD_REQUEST)

        reference = f"DEP-{uuid.uuid4().hex[:8].upper()}"
        
        currency = get_currency_for_country(request.user.country)
        
        redirect_base_url = request.data.get('redirect_base_url', 'http://localhost:5173')
        
        try:
            # We don't specify payment_method so the user selects on the GeniusPay checkout page.
            gp_response = GeniusPayService.create_checkout_session(
                amount=amount,
                currency=currency,
                phone=if_phone,
                customer_name=f"{request.user.first_name} {request.user.last_name}",
                customer_email=request.user.email,
                description=f"Dépôt EduUp - {request.user.username}",
                metadata={"user_id": request.user.id, "type": "deposit", "reference": reference},
                success_url=f"{redirect_base_url}/payment-callback?payment=success&ref={reference}",
                error_url=f"{redirect_base_url}/payment-callback?payment=error&ref={reference}",
            )

            # Handle different API response formats
            gp_data = gp_response.get('data', gp_response)
            checkout_url = gp_data.get('checkout_url') or gp_data.get('payment_url') or gp_response.get('checkout_url')
            gp_ref = gp_data.get('reference') or gp_response.get('reference') or reference

            if not checkout_url:
                raise Exception(f"URL de paiement introuvable dans la réponse GeniusPay. Réponse: {gp_response}")

            # Create pending transaction
            Transaction.objects.create(
                user=request.user,
                amount=amount,
                transaction_type='deposit',
                status='pending',
                reference_id=gp_ref,
                description="Dépôt par Mobile Money / Carte"
            )

            return Response({
                'checkout_url': checkout_url,
                'reference': gp_ref
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=False, methods=['post'])
    def withdraw(self, request):
        """
        Initiate a withdrawal. Takes 20% platform fee.
        """
        amount = float(request.data.get('amount', 0))
        if amount <= 0:
            return Response({'error': 'Montant invalide.'}, status=status.HTTP_400_BAD_REQUEST)
            
        wallet = request.user.wallet
        if wallet.balance < amount:
            return Response({'error': 'Solde insuffisant.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not request.user.phone_number:
            return Response({'error': 'Vous devez renseigner votre numéro de téléphone dans votre profil.'}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate Fees
        fee_amount = amount * 0.20
        net_amount = amount - fee_amount
        reference = f"WTH-{uuid.uuid4().hex[:8].upper()}"

        try:
            with transaction.atomic():
                # Deduct total amount from wallet immediately
                wallet.balance -= amount
                wallet.save()

                # Record Withdrawal Transaction
                tx = Transaction.objects.create(
                    user=request.user,
                    amount=-amount,
                    transaction_type='withdrawal',
                    status='pending',
                    reference_id=reference,
                    description=f"Retrait vers {request.user.phone_number} (net: {net_amount} {get_currency_for_country(request.user.country)})"
                )
                
                # Record Platform Fee
                Transaction.objects.create(
                    user=request.user,
                    amount=fee_amount,
                    transaction_type='platform_fee',
                    status='completed',
                    description=f"Commission 20% retenue sur le retrait {reference}"
                )

                # Initialize Payout with GeniusPay
                gp_response = GeniusPayService.initiate_payout(
                    amount=net_amount,
                    currency=get_currency_for_country(request.user.country),
                    phone=request.user.phone_number,
                    description=f"Retrait EduUp - {request.user.username}"
                )
                
                # If payout successful/pending
                tx.status = 'completed' # marking completed instantly for mockup if no webhook handles payouts
                tx.save()

            return Response({'message': 'Demande de retrait initiée avec succès!', 'net_amount': net_amount, 'fee': fee_amount})
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def confirm_deposit(self, request):
        """
        Manually confirm a pending deposit by reference after verifying with GeniusPay.
        """
        reference = request.data.get('reference') or request.query_params.get('ref')
        if not reference:
            return Response({'error': 'Référence manquante.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tx = Transaction.objects.get(
                reference_id=reference,
                user=request.user,
                transaction_type='deposit',
                status='pending'
            )
        except Transaction.DoesNotExist:
            return Response({'error': 'Transaction introuvable ou déjà traitée.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            # REAL CHECK with GeniusPay
            gp_res = GeniusPayService.verify_payment(reference)
            # Response handling based on doc: gp_res['data']['transaction']['status'] or gp_res['data']['status']
            gp_data = gp_res.get('data', gp_res)
            # Some responses have a nested 'transaction' object
            gp_tx = gp_data.get('transaction', gp_data)
            gp_status = gp_tx.get('status', '').lower()

            if gp_status not in ('completed', 'success', 'approved', 'paid'):
                return Response({
                    'error': f"Le paiement n'est pas encore validé par GeniusPay. Statut actuel: {gp_status}",
                    'gp_status': gp_status
                }, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                tx.status = 'completed'
                tx.save()
                wallet = request.user.wallet
                wallet.balance += tx.amount
                wallet.save()

            return Response({
                'message': 'Dépôt confirmé avec succès !',
                'new_balance': float(wallet.balance)
            })

        except Exception as e:
            return Response({'error': f"Erreur lors de la vérification GeniusPay: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)


class GeniusPayWebhookView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Receive GeniusPay asynchronous notifications about payment completion.
        Payload structure (from GeniusPay docs):
        {
          "event": "payment.success",
          "timestamp": "...",
          "data": {
            "transaction": {
              "reference": "MTX-...",
              "status": "completed",
              ...
            }
          }
        }
        """
        # Signature Verification (header: X-GeniusPay-Signature)
        signature = request.headers.get('X-GeniusPay-Signature', '')
        if signature and not GeniusPayService.verify_webhook_signature(request.body, signature):
            return Response({'error': 'Invalid signature'}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data
        event = payload.get('event', '')

        # Correctly parse the nested data → transaction structure
        data = payload.get('data', {})
        gp_tx = data.get('transaction', data)  # fallback to data itself if flat structure
        gp_ref = gp_tx.get('reference')
        gp_status = gp_tx.get('status', '')

        if not gp_ref:
            return Response(status=status.HTTP_200_OK)

        try:
            tx = Transaction.objects.get(reference_id=gp_ref, transaction_type='deposit')
        except Transaction.DoesNotExist:
            return Response(status=status.HTTP_200_OK)

        # Idempotency check
        if tx.status == 'completed':
            return Response(status=status.HTTP_200_OK)

        if event == 'payment.success' or gp_status == 'completed':
            with transaction.atomic():
                tx.status = 'completed'
                tx.save()

                # Credit the user's wallet with the deposited amount
                wallet = tx.user.wallet
                wallet.balance += tx.amount
                wallet.save()

        elif event in ('payment.failed', 'payment.cancelled') or gp_status in ('failed', 'cancelled'):
            tx.status = 'failed'
            tx.save()

        return Response(status=status.HTTP_200_OK)

class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TransactionSerializer

    def get_queryset(self):
        return self.request.user.transactions.all()
