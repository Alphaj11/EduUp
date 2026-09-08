"""
seed_more_data: adds 3 more teacher profiles and more course request announcements
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import Subject, Level, TeacherProfile, CourseRequest

User = get_user_model()

NEW_TEACHERS = [
    {
        'email': 'prof.amina@eduup.cm',
        'username': 'prof_amina',
        'first_name': 'Amina',
        'last_name': 'Bello',
        'city': 'Yaoundé',
        'country': 'CM',
        'bio': "Professeure de Français et de Littérature, 7 ans d'expérience. Prépare aux épreuves du BAC et aux concours administratifs.",
        'experience_years': 7,
        'hourly_rate': 4000,
        'academic_title': 'Mme',
        'teacher_type': 'fonctionnaire',
        'subjects': ['Français', 'Littérature', 'Philosophie', 'Histoire-Géographie'],
        'levels': ['3ème', '2nde', '1ère', 'Terminale', 'Licence 1'],
    },
    {
        'email': 'prof.claude@eduup.cm',
        'username': 'prof_claude',
        'first_name': 'Claude',
        'last_name': 'Mvondo',
        'city': 'Douala',
        'country': 'CM',
        'bio': "Ingénieur en Informatique et formateur certifié. Spécialiste en programmation Python, web et bases de données.",
        'experience_years': 4,
        'hourly_rate': 5500,
        'academic_title': 'Mr',
        'teacher_type': 'prive',
        'subjects': ['Informatique', 'Algorithmique', 'Mathématiques', 'Sciences économiques et sociales'],
        'levels': ['Terminale', 'Licence 1', 'Licence 2', 'Licence 3', 'Master 1', 'BTS'],
    },
    {
        'email': 'prof.sylvie@eduup.cm',
        'username': 'prof_sylvie',
        'first_name': 'Sylvie',
        'last_name': 'Ngono',
        'city': 'Yaoundé',
        'country': 'CM',
        'bio': "Professeure de Sciences (SVT, Chimie) avec 10 ans d'expérience. Taux de réussite au BAC S : 96%.",
        'experience_years': 10,
        'hourly_rate': 4500,
        'academic_title': 'Dr',
        'teacher_type': 'fonctionnaire',
        'subjects': ['Sciences de la Vie et de la Terre', 'Biologie', 'Chimie', 'Physique-Chimie', 'Géologie'],
        'levels': ['4ème', '3ème', '2nde', '1ère', 'Terminale', 'Licence 1'],
    },
]

EXTRA_COORDS = [
    (3.8620, 11.5180, "Mvog-Mbi, Yaoundé"),
    (3.8450, 11.5350, "Melen, Yaoundé"),
    (4.0620, 9.7550, "Bonanjo, Douala"),
    (3.8210, 11.4880, "Ekounou, Yaoundé"),
    (3.8900, 11.5080, "Obili, Yaoundé"),
    (4.0400, 9.7800, "Makepe, Douala"),
]

EXTRA_REQUESTS = [
    {
        'student_email': 'etudiant.test@eduup.cm',
        'subject_names': ['Sciences de la Vie et de la Terre', 'Chimie'],
        'level_name': 'Terminale',
        'rhythm': '3 séances par semaine, mardi/jeudi/samedi 14h-16h',
        'coord_idx': 0,
    },
    {
        'student_email': 'eleve.paul@eduup.cm',
        'subject_names': ['Informatique', 'Algorithmique'],
        'level_name': 'BTS',
        'rhythm': '2 séances par semaine, soir 19h-21h',
        'coord_idx': 1,
    },
    {
        'student_email': 'parent.nguema@eduup.cm',
        'subject_names': ['Français', 'Histoire-Géographie'],
        'level_name': '3ème',
        'rhythm': '4 séances par semaine, 15h-17h',
        'coord_idx': 2,
    },
    {
        'student_email': 'eleve.marie@eduup.cm',
        'subject_names': ['Mathématiques', 'Physique-Chimie'],
        'level_name': 'Terminale',
        'rhythm': '3 séances par semaine, mercredi/vendredi/dimanche',
        'coord_idx': 3,
    },
    {
        'student_email': 'etudiant.test@eduup.cm',
        'subject_names': ['Biologie', 'Géologie'],
        'level_name': 'Licence 1',
        'rhythm': '2 séances par semaine, weekend uniquement',
        'coord_idx': 4,
    },
    {
        'student_email': 'parent.nguema@eduup.cm',
        'subject_names': ['Mathématiques'],
        'level_name': 'CM2',
        'rhythm': '5 séances par semaine, 16h-18h',
        'coord_idx': 5,
    },
]


class Command(BaseCommand):
    help = 'Ajoute 3 profs et plus d\'annonces de cours'

    def handle(self, *args, **kwargs):
        self.stdout.write("\n=== Ajout de profs et d'annonces supplémentaires ===\n")

        # 1. Create teacher accounts
        for acc in NEW_TEACHERS:
            user, created = User.objects.get_or_create(
                email=acc['email'],
                defaults={
                    'username': acc['username'],
                    'first_name': acc['first_name'],
                    'last_name': acc['last_name'],
                    'role': 'teacher',
                    'city': acc['city'],
                    'country': acc['country'],
                }
            )
            if created:
                user.set_password('admin')
                user.save()
                self.stdout.write(self.style.SUCCESS(f"✅ Prof créé : {acc['email']} (mdp: admin)"))
            else:
                self.stdout.write(self.style.WARNING(f"ℹ️  Prof existant : {acc['email']}"))

            # Set up teacher profile
            profile, _ = TeacherProfile.objects.get_or_create(user=user)
            profile.bio = acc['bio']
            profile.experience_years = acc['experience_years']
            profile.hourly_rate = acc['hourly_rate']
            profile.academic_title = acc['academic_title']
            profile.teacher_type = acc['teacher_type']
            profile.is_certified = True
            profile.accepts_online = True
            profile.accepts_in_person = True
            profile.status = 'approved'

            profile.subjects.clear()
            for subj_name in acc['subjects']:
                subj = Subject.objects.filter(name=subj_name).first()
                if subj:
                    profile.subjects.add(subj)

            profile.levels.clear()
            for lvl_name in acc['levels']:
                lvl = Level.objects.filter(name=lvl_name).first()
                if lvl:
                    profile.levels.add(lvl)

            profile.save()
            self.stdout.write(self.style.SUCCESS(f"   Profil configuré pour {acc['first_name']} {acc['last_name']}"))

        # Make sure CM2 level exists
        Level.objects.get_or_create(name='CM2')

        # 2. Create extra course requests
        created_count = 0
        for req_data in EXTRA_REQUESTS:
            try:
                student = User.objects.get(email=req_data['student_email'])
                lat, lon, address = EXTRA_COORDS[req_data['coord_idx']]

                existing = CourseRequest.objects.filter(
                    student=student,
                    latitude=lat,
                    longitude=lon,
                    status='open'
                ).first()
                if existing:
                    self.stdout.write(self.style.WARNING(f"ℹ️  Annonce similaire déjà existante pour {student.first_name} à {address}"))
                    continue

                level = Level.objects.filter(name=req_data['level_name']).first()
                if not level:
                    self.stdout.write(self.style.ERROR(f"❌ Niveau '{req_data['level_name']}' introuvable"))
                    continue

                course_req = CourseRequest.objects.create(
                    student=student,
                    level=level,
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
                    f"✅ Annonce : {student.first_name} cherche {', '.join(req_data['subject_names'])} — {req_data['level_name']} ({address})"
                ))
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"❌ Élève introuvable : {req_data['student_email']}"))

        total_requests = CourseRequest.objects.filter(status='open').count()
        total_teachers = TeacherProfile.objects.filter(status='approved').count()

        self.stdout.write(self.style.SUCCESS(f"\n🎉 {created_count} nouvelles annonces créées"))
        self.stdout.write(f"📊 Total : {total_requests} annonces ouvertes, {total_teachers} profs approuvés")
        self.stdout.write("\nNouveaux comptes profs :")
        for acc in NEW_TEACHERS:
            self.stdout.write(f"  → {acc['email']} / admin  ({acc['first_name']} {acc['last_name']})")
