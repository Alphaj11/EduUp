from django.core.management.base import BaseCommand
from api.models import Subject, Level, User


class Command(BaseCommand):
    help = 'Peuple la base avec les matières, niveaux et un compte admin EduUp'

    def handle(self, *args, **kwargs):
        # ─── MATIÈRES ────────────────────────────────────────────────
        matieres = [
            'Mathématiques', 'Physique-Chimie', 'Sciences de la Vie et de la Terre',
            'Français', 'Anglais', 'Espagnol', 'Philosophie', 'Histoire-Géographie',
            'Économie', 'Comptabilité', 'Informatique', 'Algorithmique',
            'Biologie', 'Géologie', 'Littérature', 'Latin', 'Arts plastiques',
            'Musique', 'Éducation physique', 'Chimie', 'Physique',
            'Sciences économiques et sociales', 'Technologie',
        ]
        created_m = 0
        for nom in matieres:
            _, created = Subject.objects.get_or_create(name=nom)
            if created:
                created_m += 1
        self.stdout.write(self.style.SUCCESS(f'✅ {created_m} matières créées ({len(matieres)} au total)'))

        # ─── NIVEAUX ─────────────────────────────────────────────────
        niveaux = [
            'CP', 'CE1', 'CE2', 'CM1', 'CM2',
            '6ème', '5ème', '4ème', '3ème',
            '2nde', '1ère', 'Terminale',
            'Licence 1', 'Licence 2', 'Licence 3',
            'Master 1', 'Master 2',
            'BTS', 'BEP', 'CAP',
        ]
        created_n = 0
        for nom in niveaux:
            _, created = Level.objects.get_or_create(name=nom)
            if created:
                created_n += 1
        self.stdout.write(self.style.SUCCESS(f'✅ {created_n} niveaux créés ({len(niveaux)} au total)'))

        # ─── COMPTES TEST ─────────────────────────────────────────────
        test_accounts = [
            {
                'email': 'admin@eduup.cm',
                'username': 'admin_eduup',
                'password': 'admin',
                'first_name': 'Admin',
                'last_name': 'EduUp',
                'role': 'teacher',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'email': 'etudiant.test@eduup.cm',
                'username': 'etudiant_test',
                'password': 'admin',
                'first_name': 'Sophie',
                'last_name': 'Mbarga',
                'role': 'student',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'email': 'prof.test@eduup.cm',
                'username': 'prof_test',
                'password': 'admin',
                'first_name': 'Jean-Pierre',
                'last_name': 'Nkolo',
                'role': 'teacher',
                'is_staff': False,
                'is_superuser': False,
            },
        ]

        for acc in test_accounts:
            existing = User.objects.filter(email=acc['email']).first()
            if existing:
                existing.set_password(acc['password'])
                existing.is_staff = acc['is_staff']
                existing.is_superuser = acc['is_superuser']
                existing.save()
                self.stdout.write(self.style.WARNING(
                    f"ℹ️  {acc['email']} déjà existant → mot de passe réinitialisé à '{acc['password']}'"
                ))
            else:
                u = User.objects.create_user(
                    username=acc['username'],
                    email=acc['email'],
                    password=acc['password'],
                    first_name=acc['first_name'],
                    last_name=acc['last_name'],
                )
                u.role = acc['role']
                u.is_staff = acc['is_staff']
                u.is_superuser = acc['is_superuser']
                u.save()
                self.stdout.write(self.style.SUCCESS(
                    f"✅ {acc['email']} créé — mdp: {acc['password']}"
                ))

        self.stdout.write(self.style.SUCCESS('\n🎉 Base de données peuplée avec succès !'))
        self.stdout.write('')
        self.stdout.write('  Comptes de test :')
        self.stdout.write('  → Admin     : admin@eduup.cm        / admin  (panel: /admin/)')
        self.stdout.write('  → Étudiant  : etudiant.test@eduup.cm / admin')
        self.stdout.write('  → Répétiteur: prof.test@eduup.cm     / admin')
