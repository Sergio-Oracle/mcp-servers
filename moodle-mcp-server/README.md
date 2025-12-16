# Moodle MCP Server - Serveur MCP pour Moodle LMS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

Serveur MCP (Model Context Protocol) étendu pour intégrer Moodle LMS avec Claude Desktop, permettant la gestion automatisée de cours, la correction de devoirs assistée par IA, et bien plus encore.

## 🚀 Fonctionnalités Principales

### 📚 Gestion de Cours
- Liste des catégories et cours
- Contenu détaillé des cours (sections, modules, ressources)
- Gestion des étudiants inscrits
- Accès aux détails des modules et sections

### 📝 Devoirs et Évaluations
- Récupération des devoirs et soumissions
- Lecture du contenu des rendus étudiants
- Feedback et notation automatisés
- Correction en masse avec IA
- Génération de rapports de notes (CSV, JSON, Markdown)

### 📁 Gestion de Fichiers
- Liste et recherche de fichiers
- Téléchargement de ressources
- Filtrage par type (PDF, DOCX, PPTX, etc.)
- Accès aux fichiers joints aux soumissions

### 🎯 Quiz et Évaluations
- Liste des quiz disponibles
- Consultation des notes des étudiants
- Statistiques de performance

### 🤖 Correction Automatique Assistée par IA
- Récupération en masse des soumissions avec fichiers
- Analyse automatique du contenu
- Génération de feedbacks personnalisés
- Attribution de notes avec justification
- Publication automatique des corrections

## 🌐 Architecture Réseau

Ce serveur peut fonctionner en deux modes :

1. **Mode Local (stdio)** : Communication directe sur la même machine
2. **Mode Réseau (TCP/IP)** : Accessible depuis n'importe quelle machine du réseau via `socat`

```
┌─────────────────────┐         ┌──────────────────────┐
│  Claude Desktop     │         │   Serveur MCP        │
│  (Client Windows/   │  ncat   │   (Ubuntu/Linux)     │
│   Linux)            ├────────►│                      │
│                     │  TCP    │   socat :3000        │
│  IP: 192.168.1.X    │  :3000  │   ↓                  │
└─────────────────────┘         │   node build/index.js│
                                │   ↓                  │
                                │   Moodle API         │
                                │   formation.ec2lt.sn │
                                └──────────────────────┘
```

## 📋 Prérequis

### Sur le Serveur (hébergeant le MCP)
- Node.js 18.x ou supérieur
- npm 8.x ou supérieur
- socat (pour le mode réseau)
- Accès à une instance Moodle avec API activée

### Sur le Client (utilisant Claude Desktop)
- Claude Desktop installé
- **Windows** : Nmap (inclut ncat)
- **Linux/Ubuntu** : nmap (inclut ncat et nc)

## 🔧 Installation Rapide

### 1. Clone du dépôt
```bash
git clone https://github.com/Sergio-Oracle/mcp-servers.git
cd mcp-servers/moodle-mcp-server
```

### 2. Configuration
```bash
# Créer le fichier .env
cat > .env << EOF
MOODLE_API_URL=https://votre-moodle.com/webservice/rest/server.php
MOODLE_API_TOKEN=votre_token_api_ici
MOODLE_COURSE_ID=2
EOF
```

### 3. Installation et Compilation
```bash
npm install
npm run build
```

### 4. Démarrage

#### Mode Local (stdio)
```bash
node build/index.js
```

#### Mode Réseau (TCP sur port 3000)
```bash
# Installer socat
sudo apt install socat

# Lancer le serveur
./start-moodle-mcp.sh
```

### 5. Configuration Claude Desktop

#### Sur Windows
Fichier : `%APPDATA%\Claude\claude_desktop_config.json`
```json
{
  "mcpServers": {
    "moodle": {
      "command": "ncat",
      "args": ["192.168.1.181", "3000"]
    }
  }
}
```

#### Sur Ubuntu/Linux
Fichier : `~/.config/Claude/claude_desktop_config.json`
```json
{
  "mcpServers": {
    "moodle": {
      "command": "ncat",
      "args": ["192.168.1.181", "3000"]
    }
  }
}
```

**⚠️ Important :** Remplacez `192.168.1.181` par l'IP réelle de votre serveur.

## 📚 Documentation

- **[INSTALLATION-GUIDE.md](INSTALLATION-GUIDE.md)** - Guide d'installation complet (local et réseau)
- **[Guide-des-Outils-Moodel-mcp.md](Guide-des-Outils-Moodel-mcp.md)** - Documentation de tous les outils disponibles
- **[Start-here.md](Start-here.md)** - Guide de démarrage rapide
- **[Exemple-correction-auto.md](Exemple-correction-auto.md)** - Exemples de correction automatique

## 🛠️ Outils Disponibles (21 outils)

### Cours et Catégories
- `get_categories` - Liste des catégories de cours
- `get_courses_in_category` - Cours d'une catégorie
- `get_all_courses` - Tous les cours accessibles
- `get_course_details` - Détails d'un cours
- `get_course_contents` - Contenu complet d'un cours
- `get_course_modules` - Modules d'un cours
- `get_section_contents` - Contenu d'une section
- `get_module_details` - Détails d'un module

### Étudiants et Évaluations
- `get_students` - Liste des étudiants
- `get_assignments` - Liste des devoirs
- `get_submissions` - Soumissions de devoirs
- `get_submission_content` - Contenu d'une soumission
- `provide_feedback` - Donner un feedback
- `batch_provide_feedback` - Feedbacks en masse

### Quiz
- `get_quizzes` - Liste des quiz
- `get_quiz_grade` - Note d'un quiz

### Fichiers
- `get_course_files` - Liste des fichiers
- `search_files` - Recherche de fichiers
- `download_file` - Téléchargement de fichier

### Correction Automatique
- `get_all_submissions_with_files` - Toutes les soumissions avec fichiers
- `generate_grades_report` - Génération de rapports

## 💡 Exemples d'Utilisation

### Lister tous les cours
```
Claude, liste tous mes cours Moodle
```

### Correction automatique d'un devoir
```
Claude, récupère toutes les soumissions du devoir ID 10,
corrige-les automatiquement et génère un rapport de notes
```

### Rechercher des fichiers
```
Claude, trouve tous les fichiers PDF contenant "examen" dans le cours
```

### Générer un rapport de notes
```
Claude, génère un rapport CSV des notes pour le cours 15
```

## 🧪 Tests

```bash
# Tester avec l'inspector MCP
npm run inspector

# Tester la compilation
npm run build

# Vérifier la connexion Moodle API
curl "https://votre-moodle.com/webservice/rest/server.php?wstoken=VOTRE_TOKEN&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json"
```

## 🐛 Dépannage

### Le serveur ne démarre pas
```bash
# Vérifier que Node.js est installé
node --version

# Vérifier la compilation
ls -l build/index.js

# Vérifier les dépendances
npm install
```

### Connexion réseau impossible
```bash
# Vérifier que socat écoute sur le port 3000
sudo netstat -tlnp | grep 3000

# Tester la connexion depuis le client
ncat 192.168.1.181 3000

# Vérifier le pare-feu
sudo ufw allow 3000/tcp
```

### "Unknown tool" dans Claude Desktop
1. Vérifier la configuration JSON
2. Redémarrer complètement Claude Desktop
3. Vérifier que ncat/nc est installé et dans le PATH

## 🔒 Sécurité

### Recommandations
- Utilisez un token API Moodle avec permissions limitées
- Limitez l'accès au port 3000 par IP (pare-feu)
- Utilisez un VPN pour l'accès distant
- Ne partagez jamais votre token API publiquement
- Conservez le fichier `.env` hors du contrôle de version

### Configuration du pare-feu
```bash
# Ubuntu/UFW - Autoriser uniquement le sous-réseau local
sudo ufw allow from 192.168.1.0/24 to any port 3000

# CentOS/firewalld
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📝 License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👨‍💻 Auteur

**Serge (RTN)**
- EC2LT (École Centrale des Logiciels Libres et de Télécommunications)
- Email: contact@ec2lt.sn
- GitHub: [@Sergio-Oracle](https://github.com/Sergio-Oracle)

## 🙏 Remerciements

- [Anthropic](https://www.anthropic.com/) pour Claude et le protocole MCP
- [Moodle](https://moodle.org/) pour leur excellent LMS
- La communauté open source

## 📊 Statistiques

- **21 outils MCP** disponibles
- Support complet de l'API Moodle
- Correction automatique assistée par IA
- Mode réseau pour déploiement multi-machines
- Rapports en CSV, JSON, et Markdown

## 🔗 Liens Utiles

- [Documentation MCP](https://modelcontextprotocol.io/)
- [API Moodle](https://docs.moodle.org/dev/Web_services)
- [Claude Desktop](https://claude.ai/download)
- [Node.js](https://nodejs.org/)
- [Nmap (pour ncat)](https://nmap.org/)

---

**Version** : 0.3.0  
**Dernière mise à jour** : Décembre 2024  
**Status** : Production Ready ✅
