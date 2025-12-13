# Moodle MCP Server - Version Étendue

Un serveur MCP (Model Context Protocol) qui permet aux LLMs d'interagir avec la plateforme Moodle pour gérer les cours, étudiants, devoirs, quiz, fichiers et ressources pédagogiques. Cette version étendue inclut des fonctionnalités avancées pour la correction automatique d'examens et la gestion complète du contenu des cours.

## 🚀 Nouvelles Fonctionnalités (v0.2.0)

### 📚 Gestion du Contenu du Cours
- `get_course_contents` - Récupère le contenu complet du cours avec toutes les sections et modules
- `get_course_modules` - Liste tous les modules (activités et ressources) avec filtrage par type
- `get_section_contents` - Obtient le contenu détaillé d'une section spécifique

### 📁 Gestion des Fichiers et Ressources
- `get_course_files` - Liste tous les fichiers du cours (PDFs, documents, présentations)
- `download_file` - Télécharge un fichier spécifique depuis Moodle
- `search_files` - Recherche de fichiers par nom ou extension
- `get_module_details` - Informations détaillées sur un module spécifique

### ✅ Correction Automatique d'Examens
- `get_all_submissions_with_files` - Récupère toutes les soumissions avec fichiers pour correction
- `batch_provide_feedback` - Fournit feedback et notes à plusieurs étudiants simultanément
- `generate_grades_report` - Génère des rapports de notes (JSON, CSV, Markdown)

## 📋 Fonctionnalités Existantes

### Gestion des Étudiants
- `get_students` - Liste des étudiants inscrits au cours

### Gestion des Devoirs
- `get_assignments` - Liste de tous les devoirs
- `get_submissions` - Soumissions des étudiants
- `get_submission_content` - Contenu détaillé d'une soumission
- `provide_feedback` - Fournir feedback et note à un étudiant

### Gestion des Quiz
- `get_quizzes` - Liste de tous les quiz
- `get_quiz_grade` - Note d'un étudiant sur un quiz

## 🎯 Cas d'Usage Principal

Ce serveur est conçu pour faciliter le workflow suivant :

1. **L'enseignant dépose un sujet d'examen** sur Moodle (fichier PDF, DOCX, etc.)
2. **Les étudiants téléchargent le sujet** et rédigent leurs copies
3. **Les étudiants déposent leurs copies** sur Moodle (fichiers ou texte en ligne)
4. **Claude récupère toutes les copies** via `get_all_submissions_with_files`
5. **Claude corrige automatiquement** en analysant les réponses
6. **Claude fournit les notes et feedbacks** via `batch_provide_feedback`
7. **Claude génère un rapport** via `generate_grades_report`

## 🛠️ Installation

### Prérequis

- Node.js (v14 ou supérieur)
- Token API Moodle avec permissions appropriées
- ID du cours Moodle

### Installation Rapide

```bash
# Cloner le dépôt
git clone https://github.com/your-username/moodle-mcp-server.git
cd moodle-mcp-server

# Installer les dépendances
npm install

# Compiler
npm run build
```

### Installation avec le Script Automatique

```bash
# Rendre le script exécutable
chmod +x install-moodle-extended.sh

# Lancer l'installation
./install-moodle-extended.sh
```

### Configuration

Créez un fichier `.env` avec :

```env
MOODLE_API_URL=https://votre-moodle.com/webservice/rest/server.php
MOODLE_API_TOKEN=votre_token_api
MOODLE_COURSE_ID=123
```

## 💻 Configuration avec Claude Desktop

### Linux

Fichier : `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "moodle-server": {
      "command": "node",
      "args": [
        "/home/serge/mcp-servers/moodle-mcp-server/build/index.js"
      ],
      "env": {
        "MOODLE_API_URL": "https://formation.ec2lt.sn/webservice/rest/server.php",
        "MOODLE_API_TOKEN": "votre_token",
        "MOODLE_COURSE_ID": "400"
      }
    }
  }
}
```

### macOS

Fichier : `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "moodle-server": {
      "command": "/usr/local/bin/node",
      "args": [
        "/path/to/moodle-mcp-server/build/index.js"
      ],
      "env": {
        "MOODLE_API_URL": "https://votre-moodle.com/webservice/rest/server.php",
        "MOODLE_API_TOKEN": "votre_token",
        "MOODLE_COURSE_ID": "123"
      }
    }
  }
}
```

### Windows

Fichier : `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "moodle-server": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "C:\\path\\to\\moodle-mcp-server\\build\\index.js"
      ],
      "env": {
        "MOODLE_API_URL": "https://votre-moodle.com/webservice/rest/server.php",
        "MOODLE_API_TOKEN": "votre_token",
        "MOODLE_COURSE_ID": "123"
      }
    }
  }
}
```

## 📖 Exemples d'Utilisation

### Exemple 1 : Lister tous les fichiers PDF du cours

```
Claude, utilise le serveur Moodle pour :
1. Lister tous les fichiers PDF disponibles dans le cours
2. Me montrer ceux qui contiennent "examen" dans leur nom
```

### Exemple 2 : Correction automatique d'un examen

```
Claude, voici le processus de correction :
1. Récupère toutes les soumissions du devoir ID 142
2. Pour chaque étudiant, télécharge sa copie
3. Analyse les réponses selon le barème suivant : [...]
4. Fournis les notes et feedbacks à tous les étudiants
5. Génère un rapport de notes en format Markdown
```

### Exemple 3 : Explorer le contenu du cours

```
Claude :
1. Montre-moi toutes les sections du cours
2. Liste les modules de la section 3
3. Affiche les fichiers disponibles dans cette section
```

### Exemple 4 : Télécharger un document

```
Claude, trouve le fichier "sujet_examen_final.pdf" dans le cours 
et télécharge-le pour que je puisse l'analyser.
```

## 🔧 Développement

### Mode Watch (auto-rebuild)

```bash
npm run watch
```

### Débogage avec MCP Inspector

```bash
npm run inspector
```

L'Inspector fournit une URL pour accéder aux outils de débogage dans votre navigateur.

### Tests

```bash
# Vérifier la compilation
npm run build

# Tester avec l'Inspector
npm run inspector

# Démarrer le serveur manuellement
npm start
```

## 🔑 Obtenir un Token API Moodle

1. Connectez-vous à votre site Moodle en tant qu'administrateur
2. Allez dans **Administration du site > Plugins > Services web > Gérer les jetons**
3. Créez un nouveau jeton avec les permissions nécessaires :
   - `core_enrol_get_enrolled_users`
   - `core_course_get_contents`
   - `mod_assign_get_assignments`
   - `mod_assign_get_submissions`
   - `mod_assign_get_submission_status`
   - `mod_assign_save_grade`
   - `mod_assign_get_grades`
   - `mod_quiz_get_quizzes_by_courses`
   - `mod_quiz_get_user_best_grade`
4. Copiez le jeton généré dans votre fichier `.env`

## 🔒 Sécurité

- Ne partagez jamais votre fichier `.env` ou votre token API Moodle
- Assurez-vous que le serveur MCP n'a accès qu'aux cours nécessaires
- Utilisez un token avec les permissions minimales requises
- Vérifiez régulièrement les logs pour détecter toute activité suspecte

## 📊 Architecture

```
moodle-mcp-server/
├── src/
│   └── index.ts          # Code source principal (étendu)
├── build/                # Code compilé
├── node_modules/         # Dépendances
├── package.json          # Configuration npm
├── tsconfig.json         # Configuration TypeScript
├── .env                  # Variables d'environnement (à créer)
└── README.md            # Documentation
```

## 🐛 Résolution de Problèmes

### Le serveur ne démarre pas

```bash
# Vérifier les variables d'environnement
echo $MOODLE_API_URL
echo $MOODLE_API_TOKEN
echo $MOODLE_COURSE_ID

# Recompiler
npm run build

# Vérifier les logs
journalctl -f
```

### Erreur d'authentification API

- Vérifiez que votre token est valide
- Assurez-vous que le token a les permissions nécessaires
- Testez l'URL API avec curl :

```bash
curl "https://votre-moodle.com/webservice/rest/server.php?wstoken=VOTRE_TOKEN&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json"
```

### Les fichiers ne se téléchargent pas

- Vérifiez que l'URL du fichier contient le token
- Assurez-vous que le fichier est visible pour l'utilisateur associé au token
- Vérifiez les permissions du module/ressource dans Moodle

### Claude ne voit pas les nouveaux outils

1. Redémarrez complètement Claude Desktop
2. Vérifiez le fichier de configuration JSON
3. Vérifiez que le serveur est bien compilé (`build/index.js` existe)
4. Testez avec l'Inspector : `npm run inspector`

## 📝 Changelog

### Version 0.2.0 (2024)

**Nouvelles fonctionnalités :**
- ✅ Gestion complète du contenu du cours
- ✅ Téléchargement de fichiers depuis Moodle
- ✅ Recherche de fichiers
- ✅ Correction automatique en batch
- ✅ Génération de rapports de notes (JSON/CSV/Markdown)
- ✅ Récupération de toutes les soumissions avec fichiers

**Améliorations :**
- Meilleure gestion des erreurs
- Documentation étendue
- Exemples d'utilisation détaillés
- Script d'installation automatique

### Version 0.1.0 (Initial)

- Gestion basique des étudiants
- Gestion des devoirs et soumissions
- Gestion des quiz
- Feedback individuel

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

[MIT](LICENSE)

## 👨‍💻 Auteurs

- Version initiale : [Votre nom]
- Version étendue : Développée avec l'assistance de Claude (Anthropic)

## 🙏 Remerciements

- Anthropic pour le SDK MCP
- La communauté Moodle pour l'API Web Services
- Tous les contributeurs

## 📞 Support

Pour toute question ou problème :

- Ouvrez une issue sur GitHub
- Consultez la documentation Moodle : https://docs.moodle.org/
- Documentation MCP : https://modelcontextprotocol.io/

---

**Note :** Ce serveur nécessite une instance Moodle avec les Web Services activés et un token API valide. Assurez-vous d'avoir les permissions appropriées avant utilisation.
