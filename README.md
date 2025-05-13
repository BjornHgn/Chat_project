# 🛡️ SecureChat - Application de Chat Sécurisé et Crypté

## 📝 Description

SecureChat est une application de messagerie sécurisée utilisant le chiffrement de bout en bout pour garantir la confidentialité des conversations. L'application propose un mode normal et un mode anonyme qui ne stocke pas les messages sur le serveur.

## 🔐 Fonctionnalités de Sécurité

✅ **Chiffrement de bout en bout utilisant TweetNaCl et CryptoJS**
✅ **Mode anonyme** pour des conversations qui ne laissent aucune trace
✅ **Gestion des clés** avec stockage sécurisé des clés privées
✅ **Authentification avec tokens** JWT et sessions sécurisées
✅ **Actualisation automatique** des tokens pour une sécurité prolongée

## 🛠️ Architecture Technique

**Backend (Python/Flask)**
Flask pour l'API REST
**Flask-SocketIO** pour la communication en temps réel
**PostgreSQL** pour le stockage des données
**SQLAlchemy** comme ORM
**Werkzeug** pour la gestion des mots de passe
**Cryptography** pour les opérations cryptographiques

**Frontend (React)**
React pour l'interface utilisateur
**TweetNaCl** et **CryptoJS** pour le chiffrement côté client
**Socket.IO-client** pour la communication en temps réel
**zxcvbn** pour l'analyse de la force des mots de passe

## 🚀 Installation

**Prérequis**
Python 3.8+ installé
Node.js et npm installés
PostgreSQL installé et configuré

**Installation du Backend**
Clonez le dépôt et accédez au dossier backend

```shell
git clone [url-du-repo]
cd Chat_project/backend
```

Créez et activez un environnement virtuel

```shell
python -m venv venv
# Sur Windows
venv\Scripts\activate
# Sur Linux/Mac
source venv/bin/activate
```

Installez les dépendances

```shell
pip install -r requirements.txt
```

Créez une base de données PostgreSQL

```shell
createdb securechat
```

Configurez le fichier .env dans le dossier backend

```
SECRET_KEY=votre-clé-secrète
JWT_SECRET_KEY=votre-clé-jwt
SQLALCHEMY_DATABASE_URI=postgresql://[username]:[password]@localhost/securechat
```

Initialisez la base de données

```shell
flask db init
flask db migrate
flask db upgrade
```

**Installation du Frontend**

Accédez au dossier frontend

```shell
cd ../frontend
```

Installez les dépendances

```shell
npm install
```

Créez un fichier .env dans le dossier frontend pour configurer l'URL de l'API

```
REACT_APP_API_URL=http://localhost:5000
```

## 🖥️ Lancement de l'Application

Lancement du Backend

```shell
cd backend
py app.py
```

Lancement du Frontend

```shell
cd frontend
npm start
```

L'application sera accessible à l'adresse http://localhost:3000

## 📱 Utilisation

**Inscription/Connexion** : Créez un compte ou connectez-vous
**Liste des utilisateurs** : Sélectionnez un utilisateur pour démarrer une conversation
**Mode anonyme** : Activez cette option pour des conversations qui ne sont pas stockées sur le serveur
**Envoi de messages** : Les messages sont automatiquement chiffrés avant l'envoi

## 🔒 Comment fonctionne le chiffrement

À l'inscription, une paire de clés asymétriques est générée pour chaque utilisateur
La clé privée est chiffrée avec le mot de passe de l'utilisateur et stockée localement
Pour chaque message :
Le message est chiffré avec la clé publique du destinataire
Seul le destinataire peut le déchiffrer avec sa clé privée
En mode anonyme, les messages ne sont jamais stockés sur le serveur

## ⚠️ Limites actuelles

Le rafraîchissement de la page efface les messages non stockés
Pas encore de support pour les messages multimédias
Interface adaptée prioritairement aux ordinateurs de bureau

## 🤝 Contribution

Ce projet a été développé par :

**Hougen Bjorn**
**Luu Vincent**
**Missaoui Mathys**