# EduUp - Plateforme de Tutorat d'Élite

EduUp est une application web de mise en relation entre étudiants et professeurs particuliers en zone CEMAC. Elle permet aux étudiants de trouver des professeurs qualifiés, de réserver des séances (en ligne ou en présentiel), et aux professeurs de gérer leurs élèves et leurs plannings de cours de manière automatisée.

## 🛠 L'Environnement Technique

- **Backend** : Django & Django REST Framework (Python)
- **Frontend** : React.js, Tailwind CSS, Framer Motion (Vite)
- **Base de données** : SQLite (par défaut, pour le développement) ou PostgreSQL
- **Authentification** : JWT (JSON Web Tokens)
- **Salle de classe virtuelle** : Jitsi Meet (intégré via iFrame)

---

## 📋 Prérequis

Avant de télécharger et de lancer le projet, assurez-vous d'avoir installé sur votre machine :
- [Python 3.10+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/) (inclut npm)
- Git (optionnel, pour cloner le projet)

---

## 🚀 Installation & Exécution (Pas à Pas)

Le projet est divisé en deux parties : le Backend (API) et le Frontend (Interface Utilisateur). Il vous faudra ouvrir **deux terminaux séparés** pour lancer les deux serveurs en même temps.

### Étape 1 : Démarrer le Backend (Django)

1. Ouvrez un terminal et naviguez dans le dossier `backend` du projet :
   ```bash
   cd chemin/vers/EduUp/backend
   ```

2. Créez un environnement virtuel (recommandé) :
   ```bash
   python -m venv venv
   ```

3. Activez l'environnement virtuel :
   - **Sous Windows** :
     ```bash
     venv\Scripts\activate
     ```
   - **Sous macOS / Linux** :
     ```bash
     source venv/bin/activate
     ```

4. Installez toutes les dépendances listées dans le fichier `requirements.txt` :
   ```bash
   pip install -r requirements.txt
   ```
   *(Note : les requirements sont déjà générés de manière exhaustive avec toutes les bibliothèques comme Django, djangorestframework, djangorestframework-simplejwt, django-cors-headers, etc.)*

5. Appliquez les migrations de la base de données :
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. (Optionnel) Créez un superutilisateur pour accéder à l'interface d'administration `/admin` :
   ```bash
   python manage.py createsuperuser
   ```

7. Démarrez le serveur de développement backend :
   ```bash
   python manage.py runserver
   ```
   Le backend sera alors accessible sur `http://localhost:8000`. Laissez ce terminal ouvert.

---

### Étape 2 : Démarrer le Frontend (React)

1. Ouvrez un **nouveau terminal** et naviguez dans le dossier `frontend` :
   ```bash
   cd chemin/vers/EduUp/frontend
   ```

2. Installez toutes les dépendances Node.js (listées dans le `package.json`) :
   ```bash
   npm install
   ```

3. Lancez le serveur de développement frontend via Vite :
   ```bash
   npm run dev
   ```

4. Le terminal vous affichera l'URL locale à ouvrir dans votre navigateur (typiquement `http://localhost:5173`). Cliquez sur le lien ou copiez-le dans votre navigateur.

---

## 📱 Tester sur votre Réseau Local (Mobile, autre PC)

Pour tester l'application sur un autre appareil connecté au même réseau Wi-Fi que vous (comme un téléphone portable ou une tablette), suivez ces étapes spécifiques :

**Condition :** Obtenez l'adresse IP locale de votre machine (ex: `192.168.1.166`).

### 1. Configuration du Backend (Django)
Au lieu de démarrer le serveur avec `python manage.py runserver` (qui n'écoute que sur localhost), vous devez lui dire d'écouter sur toutes les interfaces réseau :
```bash
python manage.py runserver 0.0.0.0:8000
```
*(Le backend est déjà configuré pour accepter les requêtes de `192.168.1.166` dans `ALLOWED_HOSTS` et `CORS_ALLOWED_ORIGINS` n'inclut que localhost par défaut, mais `CORS_ALLOW_ALL_ORIGINS = True` permet les requêtes locales).*

### 2. Configuration du Frontend (React)
Le frontend doit savoir où joindre le backend, et il doit lui-même être accessible sur le réseau.

1. Créez un fichier `.env` à la racine du dossier `frontend/` (s'il n'existe pas).
2. Ajoutez cette ligne en remplaçant par votre adresse IP :
   ```env
   VITE_API_BASE_URL=http://192.168.1.166:8000/api/
   ```
3. Démarrez Vite avec l'option `--host` pour l'exposer sur votre réseau local :
   ```bash
   npm run dev -- --host
   ```

**Accès :** Sur votre téléphone ou autre ordinateur, ouvrez votre navigateur et tapez : `http://192.168.1.166:5173`. L'application fonctionnera parfaitement et communiquera avec le backend de votre machine principale.

---

🎉 **Félicitations, l'application fonctionne !**

---

## 📌 Utilisation de l'Application

### 1. S'inscrire & Se connecter
- Naviguez vers la page d'accueil puis cliquez sur `Commencer`. 
- Vous pouvez choisir de vous inscrire en tant que **Étudiant** ou **Professeur**.
- Si vous êtes professeur, assurez-vous de bien remplir votre profil (`/profile`) pour ajouter vos matières académiques, titres, tarifs et descriptions afin d'apparaître sur la page de recherche.

### 2. Espace Administrateur (Django)
Vous pouvez gérer toute l'application depuis le panneau d'administration de Django (ajouter des matières, niveaux scolaires, voir les réservations, etc.) :
1. Assurez-vous d'avoir créé un superutilisateur à l'étape 1.6.
2. Accédez à : `http://localhost:8000/admin/`
3. Connectez-vous et gérez vos données.

### 3. Salles de Cours Virtuelles
Les séances réservées au format "En ligne" génèrent automatiquement un lien vers une salle de classe virtuelle sécurisée. Elle est accessible via le bouton `Rejoindre` sur chaque tableau de bord, à l'heure du cours.

---

## 📁 Structure du Projet

```text
EduUp/
│
├── backend/                  # API Django
│   ├── api/                  # Configuration principale (settings, urls)
│   ├── core/                 # Application métier (models, views, serializers)
│   ├── media/                # Fichiers uploadés (photos de profils, pièces jointes)
│   ├── db.sqlite3            # Base de données locale
│   ├── manage.py             # Script de gestion Django
│   └── requirements.txt      # Liste des dépendances Python
│
├── frontend/                 # Client React / Vite
│   ├── src/
│   │   ├── api/              # Axios instance configuration
│   │   ├── components/       # Composants UI réutilisables (Navbar, Footer, Modals)
│   │   ├── context/          # Contexte global (AuthContext par exemple)
│   │   ├── pages/            # Pages de l'application (Dashboard, Login, Profile)
│   │   └── App.jsx           # Routeur principal
│   ├── package.json          # Liste des dépendances Node.js
│   ├── tailwind.config.js    # Configuration du design system
│   └── index.html            # Point d'entrée de l'application
│
└── README.md                 # Documentation
```
