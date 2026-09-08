"""
Management command: seed_announcements
Creates test student accounts, sets up teacher profiles, and creates CourseRequests
so the teacher demandes map has data to show.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import Subject, Level, TeacherProfile, CourseRequest

User = get_user_model()

YAOUNDÉ_COORDS = [
    # Yaoundé centre
    (3.8480, 11.5021, "Quartier Bastos, Yaoundé"),
    # Biyem-Assi
    (3.8312, 11.4951, "Biyem-Assi, Yaoundé"),
    # Ngousso
    (3.8650, 11.5258, "Ngousso, Yaoundé"),
    # Douala (2ème grande ville)
    (4.0511, 9.7679, "Akwa, Douala"),
]

STUDENT_ACCOUNTS = [
    {
        'email': 'eleve.paul@eduup.cm',
        'username': 'eleve_paul',
        'first_name': 'Paul',
        'last_name': 'Essomba',
        'city': 'Yaoundé',
        'country': 'CM',
    },
    {
        'email': 'eleve.marie@eduup.cm',
        'username': 'eleve_marie',
        'first_name': 'Marie-Claire',
        'last_name': 'Ondoua',
        'city': 'Yaoundé',
        'country': 'CM',
    },
    {
        'email': 'parent.nguema@eduup.cm',
        'username': 'parent_nguema',
        'first_name': 'Robert',
        'last_name': 'Nguema',
        'city': 'Douala',
        'country': 'CM',
    },
]

REQUESTS = [
    {
        'student_email': 'eleve.paul@eduup.cm',
        'subject_names': ['Mathématiques', 'Physique-Chimie'],
        'level_name': 'Terminale',
        'rhythm': '3 séances par semaine, soir 18h-20h',
        'coord_idx': 0,
    },
    {
        'student_email': 'eleve.marie@eduup.cm',
        'subject_names': ['Informatique', 'Algorithmique'],
        'level_name': 'Licence 1',
        'rhythm': '2 séances par semaine, weekend',
        'coord_idx': 1,
    },
    {
        'student_email': 'parent.nguema@eduup.cm',
        'subject_names': ['Mathématiques'],
        'level_name': '3ème',
        'rhythm': '4 séances par semaine, 15h-17h',
        'coord_idx': 2,
    },
    {
        'student_email': 'eleve.paul@eduup.cm',
        'subject_names': ['Français', 'Philosophie'],
        'level_name': 'Terminale',
        'rhythm': '2 séances par semaine, samedi matin',
        'coord_idx': 3,
    },
]


class Command(BaseCommand):
    help = 'Crée des annonces de cours test pour la carte demandes du professeur'

    def handle(self, *args, **kwargs):
        self.stdout.write("\n=== Peuplement des annonces de cours ===\n")

        # 1. Create student accounts
        for acc in STUDENT_ACCOUNTS:
            user, created = User.objects.get_or_create(
                email=acc['email'],
                defaults={
                    'username': acc['username'],
                    'first_name': acc['first_name'],
                    'last_name': acc['last_name'],
                    'role': 'student',
                    'city': acc['city'],
                    'country': acc['country'],
                }
            )
            if created:
                user.set_password('admin')
                user.save()
                self.stdout.write(self.style.SUCCESS(f"✅ Élève créé : {acc['email']} (mdp: admin)"))
            else:
                self.stdout.write(self.style.WARNING(f"ℹ️  Élève existant : {acc['email']}"))

        # 2. Set up teacher profile for prof.test
        try:
            teacher_user = User.objects.get(email='prof.test@eduup.cm')
            teacher_user.city = 'Yaoundé'
            teacher_user.country = 'CM'
            teacher_user.save()

            profile, _ = TeacherProfile.objects.get_or_create(user=teacher_user)
            profile.bio = "Professeur de Mathématiques, Physique et Informatique avec 5 ans d'expérience. Spécialiste des classes de lycée et première année universitaire."
            profile.experience_years = 5
            profile.hourly_rate = 3500
            profile.is_certified = True
            profile.accepts_online = True
            profile.accepts_in_person = True
            profile.status = 'approved'
            profile.academic_title = 'Mr'
            profile.teacher_type = 'prive'

            # Add subjects that match the requests
            subject_names = ['Mathématiques', 'Physique-Chimie', 'Physique', 'Informatique', 'Algorithmique', 'Français', 'Philosophie']
            for name in subject_names:
                subj = Subject.objects.filter(name=name).first()
                if subj:
                    profile.subjects.add(subj)

            # Add levels that match the requests
            level_names = ['3ème', 'Terminale', 'Licence 1', 'Licence 2', '2nde', '1ère']
            for name in level_names:
                lvl = Level.objects.filter(name=name).first()
                if lvl:
                    profile.levels.add(lvl)

            profile.save()
            self.stdout.write(self.style.SUCCESS("✅ Profil enseignant (Jean-Pierre Nkolo) configuré"))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ prof.test@eduup.cm introuvable — lancez seed_data d'abord"))
            return

        # 3. Create CourseRequests
        created_count = 0
        for req_data in REQUESTS:
            try:
                student = User.objects.get(email=req_data['student_email'])
                lat, lon, address = YAOUNDÉ_COORDS[req_data['coord_idx']]

                # Check if a similar request already exists
                existing = CourseRequest.objects.filter(
                    student=student,
                    latitude=lat,
                    longitude=lon,
                    status='open'
                ).first()
                if existing:
                    self.stdout.write(self.style.WARNING(f"ℹ️  Annonce déjà existante pour {student.first_name}"))
                    continue

                course_req = CourseRequest.objects.create(
                    student=student,
                    level=Level.objects.filter(name=req_data['level_name']).first(),
                    rhythm=req_data['rhythm'],
                    latitude=lat,
                    longitude=lon,
                    address=address,
                    status='open',
                )
                for subj_name in req_data['subject_names']:
                    subj = Subject.objects.filter(name=subj_name).first()
                    if subj:
                        course_req.subjects.add(subj)

                course_req.save()
                created_count += 1
                self.stdout.write(self.style.SUCCESS(
                    f"✅ Annonce créée : {student.first_name} cherche {', '.join(req_data['subject_names'])} — {req_data['level_name']}"
                ))
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"❌ Élève introuvable : {req_data['student_email']}"))

        self.stdout.write(self.style.SUCCESS(f"\n🎉 {created_count} annonces créées"))
        self.stdout.write("\nComptes élèves test :")
        for acc in STUDENT_ACCOUNTS:
            self.stdout.write(f"  → {acc['email']} / admin")
        self.stdout.write("\nProfil prof configuré : prof.test@eduup.cm / admin")
        self.stdout.write("  Matières : Maths, Physique, Informatique, Algorithmique, Français, Philo")
        self.stdout.write("  Niveaux  : 3ème, Terminale, Licence 1, Licence 2")
