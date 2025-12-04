# Guide des Outils Moodle MCP Server

## Vue d'ensemble

Ce document recense tous les outils disponibles dans le serveur MCP Moodle et fournit des exemples de questions à poser à Claude Desktop pour les utiliser efficacement.

---

## 📚 Table des Matières

1. [Catégories et Cours](#1-catégories-et-cours)
2. [Gestion des Étudiants](#2-gestion-des-étudiants)
3. [Devoirs et Évaluations](#3-devoirs-et-évaluations)
4. [Quiz](#4-quiz)
5. [Contenu de Cours](#5-contenu-de-cours)
6. [Fichiers et Ressources](#6-fichiers-et-ressources)
7. [Correction Automatique](#7-correction-automatique)
8. [Rapports et Statistiques](#8-rapports-et-statistiques)

---

## 1. Catégories et Cours

### 🏷️ `get_categories`
**Description**: Liste toutes les catégories de cours disponibles (ex: Licence 1, Master 2, etc.)

**Paramètres**:
- `parentId` (optionnel): ID de la catégorie parente

**Questions à poser à Claude Desktop**:
- "Montre-moi toutes les catégories de cours disponibles"
- "Liste les catégories de cours dans Moodle"
- "Quelles sont les catégories principales de cours ?"
- "Affiche-moi les sous-catégories de la catégorie 5"
- "Combien de catégories de cours existe-t-il ?"

---

### 📖 `get_courses_in_category`
**Description**: Liste tous les cours dans une catégorie spécifique

**Paramètres**:
- `categoryId` (requis): ID de la catégorie

**Questions à poser à Claude Desktop**:
- "Quels sont les cours dans la catégorie Master 2 ?"
- "Liste-moi tous les cours de la catégorie 3"
- "Montre-moi les cours disponibles dans la catégorie Licence 1"
- "Combien de cours y a-t-il dans la catégorie 7 ?"
- "Affiche les détails des cours de la catégorie informatique"

---

### 📚 `get_all_courses`
**Description**: Liste tous les cours auxquels l'utilisateur a accès

**Paramètres**: Aucun

**Questions à poser à Claude Desktop**:
- "Liste tous mes cours"
- "Quels sont tous les cours auxquels j'ai accès ?"
- "Montre-moi tous les cours disponibles"
- "Affiche la liste complète de mes cours"
- "Combien de cours sont disponibles pour moi ?"
- "Donne-moi un aperçu de tous les cours"

---

### 🔍 `get_course_details`
**Description**: Obtient les détails complets d'un cours spécifique

**Paramètres**:
- `courseId` (requis): ID du cours

**Questions à poser à Claude Desktop**:
- "Donne-moi les détails du cours 15"
- "Quelles sont les informations du cours de Mathématiques ?"
- "Montre-moi les détails complets du cours 42"
- "Affiche les propriétés du cours avec l'ID 8"
- "Quand commence et se termine le cours 25 ?"

---

## 2. Gestion des Étudiants

### 👥 `get_students`
**Description**: Obtient la liste des étudiants inscrits dans un cours

**Paramètres**:
- `courseId` (optionnel): ID du cours (utilise le cours par défaut si non spécifié)

**Questions à poser à Claude Desktop**:
- "Liste les étudiants de mon cours"
- "Combien d'étudiants sont inscrits au cours 15 ?"
- "Qui sont les étudiants du cours de Programmation ?"
- "Montre-moi tous les étudiants inscrits"
- "Donne-moi les noms et emails des étudiants"
- "Affiche la liste des élèves du cours 23"

---

## 3. Devoirs et Évaluations

### 📝 `get_assignments`
**Description**: Obtient la liste des devoirs/assignments dans un cours

**Paramètres**:
- `courseId` (optionnel): ID du cours

**Questions à poser à Claude Desktop**:
- "Quels sont les devoirs du cours ?"
- "Liste tous les assignments du cours 15"
- "Montre-moi les devoirs à corriger"
- "Quelles sont les échéances des devoirs ?"
- "Affiche tous les assignments avec leurs dates"
- "Combien de devoirs y a-t-il dans le cours ?"

---

### 📤 `get_submissions`
**Description**: Obtient les soumissions/rendus de devoirs dans un cours

**Paramètres**:
- `courseId` (optionnel): ID du cours
- `studentId` (optionnel): ID de l'étudiant
- `assignmentId` (optionnel): ID du devoir

**Questions à poser à Claude Desktop**:
- "Montre-moi toutes les soumissions du cours"
- "Quelles sont les soumissions du devoir 10 ?"
- "L'étudiant 42 a-t-il rendu son devoir ?"
- "Liste les rendus du devoir 8"
- "Qui a soumis le devoir 15 ?"
- "Affiche l'état des soumissions pour tous les étudiants"
- "Quels étudiants n'ont pas encore rendu le devoir ?"

---

### 📄 `get_submission_content`
**Description**: Obtient le contenu détaillé d'une soumission spécifique

**Paramètres**:
- `studentId` (requis): ID de l'étudiant
- `assignmentId` (requis): ID du devoir

**Questions à poser à Claude Desktop**:
- "Montre-moi le contenu de la soumission de l'étudiant 42 pour le devoir 10"
- "Qu'a écrit l'étudiant 25 dans son devoir ?"
- "Affiche le texte de la soumission de Marie pour le devoir 8"
- "Quels fichiers ont été soumis par l'étudiant 15 ?"
- "Lis-moi le contenu du rendu de l'étudiant 30"

---

### ✍️ `provide_feedback`
**Description**: Fournit un feedback sur une soumission de devoir

**Paramètres**:
- `studentId` (requis): ID de l'étudiant
- `assignmentId` (requis): ID du devoir
- `grade` (optionnel): Note numérique
- `feedback` (requis): Texte du feedback

**Questions à poser à Claude Desktop**:
- "Donne un feedback à l'étudiant 42 pour le devoir 10 avec la note 15/20"
- "Ajoute un commentaire pour l'étudiant 25 sur son devoir"
- "Note le devoir de l'étudiant 30 avec 18/20 et un feedback positif"
- "Écris un feedback constructif pour l'étudiant 8"

---

## 4. Quiz

### 🎯 `get_quizzes`
**Description**: Obtient la liste des quiz dans un cours

**Paramètres**:
- `courseId` (optionnel): ID du cours

**Questions à poser à Claude Desktop**:
- "Liste tous les quiz du cours"
- "Quels sont les quiz disponibles ?"
- "Montre-moi les quiz avec leurs dates"
- "Combien de quiz y a-t-il dans le cours 15 ?"
- "Affiche les quiz à venir"

---

### 📊 `get_quiz_grade`
**Description**: Obtient la note d'un étudiant pour un quiz spécifique

**Paramètres**:
- `studentId` (requis): ID de l'étudiant
- `quizId` (requis): ID du quiz

**Questions à poser à Claude Desktop**:
- "Quelle note a obtenu l'étudiant 42 au quiz 5 ?"
- "Montre-moi la note de Marie au dernier quiz"
- "L'étudiant 25 a-t-il une note pour le quiz 8 ?"
- "Affiche le résultat du quiz 3 pour l'étudiant 15"

---

## 5. Contenu de Cours

### 📑 `get_course_contents`
**Description**: Obtient le contenu complet d'un cours (sections, modules, ressources)

**Paramètres**:
- `courseId` (optionnel): ID du cours
- `includeContents` (optionnel, défaut: true): Inclure le contenu détaillé

**Questions à poser à Claude Desktop**:
- "Montre-moi tout le contenu du cours"
- "Quelles sont les sections du cours 15 ?"
- "Affiche la structure complète du cours"
- "Liste tous les modules et ressources du cours"
- "Donne-moi un aperçu du cours avec toutes ses sections"

---

### 🧩 `get_course_modules`
**Description**: Liste tous les modules (activités et ressources) d'un cours

**Paramètres**:
- `courseId` (optionnel): ID du cours
- `moduleType` (optionnel): Type de module (assign, quiz, resource, folder, page, etc.)

**Questions à poser à Claude Desktop**:
- "Liste tous les modules du cours"
- "Quels sont les devoirs (assign) du cours ?"
- "Montre-moi toutes les ressources (resource) disponibles"
- "Affiche tous les quiz du cours"
- "Combien de modules y a-t-il dans le cours ?"
- "Liste uniquement les pages du cours"

---

### 📋 `get_section_contents`
**Description**: Obtient le contenu d'une section spécifique

**Paramètres**:
- `courseId` (optionnel): ID du cours
- `sectionNumber` (requis): Numéro de la section (0, 1, 2, etc.)

**Questions à poser à Claude Desktop**:
- "Montre-moi le contenu de la section 1"
- "Qu'y a-t-il dans la section 3 du cours ?"
- "Affiche les modules de la première section"
- "Liste tout ce qui est dans la section 5"

---

### 🔎 `get_module_details`
**Description**: Obtient les détails d'un module spécifique

**Paramètres**:
- `courseId` (optionnel): ID du cours
- `moduleId` (requis): ID du module

**Questions à poser à Claude Desktop**:
- "Donne-moi les détails du module 125"
- "Montre-moi les informations complètes du module 42"
- "Qu'est-ce que le module 88 ?"
- "Affiche les propriétés du module 55"

---

## 6. Fichiers et Ressources

### 📁 `get_course_files`
**Description**: Liste tous les fichiers et ressources d'un cours

**Paramètres**:
- `courseId` (optionnel): ID du cours
- `fileType` (optionnel): Type de fichier (pdf, doc, docx, ppt, pptx, etc.)
- `sectionId` (optionnel): ID de la section pour filtrer

**Questions à poser à Claude Desktop**:
- "Liste tous les fichiers du cours"
- "Montre-moi tous les PDF disponibles"
- "Quels sont les documents Word dans le cours ?"
- "Affiche les PowerPoint de la section 2"
- "Combien de fichiers y a-t-il dans le cours ?"
- "Liste uniquement les PDF"

---

### 🔍 `search_files`
**Description**: Recherche des fichiers par nom ou extension

**Paramètres**:
- `courseId` (optionnel): ID du cours
- `searchTerm` (optionnel): Terme de recherche
- `fileExtension` (optionnel): Extension (pdf, docx, pptx, etc.)

**Questions à poser à Claude Desktop**:
- "Cherche les fichiers contenant 'examen' dans le cours"
- "Trouve tous les PDF avec le mot 'cours'"
- "Recherche les fichiers PowerPoint de 'chapitre 3'"
- "Y a-t-il un fichier nommé 'correction' ?"
- "Trouve tous les documents Excel"

---

### 💾 `download_file`
**Description**: Télécharge un fichier spécifique depuis Moodle

**Paramètres**:
- `fileUrl` (requis): URL du fichier
- `saveAs` (optionnel): Nom pour enregistrer le fichier

**Questions à poser à Claude Desktop**:
- "Télécharge le fichier à cette URL: [url]"
- "Récupère le PDF de correction"
- "Télécharge ce document et enregistre-le comme 'corrige.pdf'"
- "Peux-tu télécharger ce fichier ?"

---

## 7. Correction Automatique

### 📦 `get_all_submissions_with_files`
**Description**: Récupère toutes les soumissions d'un devoir avec leurs fichiers pour correction automatique

**Paramètres**:
- `courseId` (optionnel): ID du cours
- `assignmentId` (requis): ID du devoir

**Questions à poser à Claude Desktop**:
- "Récupère toutes les soumissions du devoir 10 pour correction"
- "Montre-moi tous les rendus du devoir 15 avec leurs fichiers"
- "Prépare la correction automatique du devoir 8"
- "Affiche toutes les soumissions avec les fichiers attachés"
- "Liste tous les étudiants qui ont rendu le devoir 5 avec leurs documents"

---

### ✅ `batch_provide_feedback`
**Description**: Fournit des feedbacks et notes à plusieurs étudiants en une seule fois

**Paramètres**:
- `feedbacks` (requis): Array d'objets avec studentId, assignmentId, grade, feedback

**Questions à poser à Claude Desktop**:
- "Enregistre ces feedbacks pour tous les étudiants"
- "Applique les corrections suivantes à tous les étudiants"
- "Note en masse les étudiants avec leurs feedbacks"
- "Publie tous ces feedbacks en une fois"

**Exemple d'utilisation**:
```
"Donne les feedbacks suivants :
- Étudiant 42, devoir 10, note 15, feedback: 'Bon travail'
- Étudiant 43, devoir 10, note 18, feedback: 'Excellent'
- Étudiant 44, devoir 10, note 12, feedback: 'À améliorer'"
```

---

## 8. Rapports et Statistiques

### 📊 `generate_grades_report`
**Description**: Génère un rapport de notes pour un cours ou un devoir spécifique

**Paramètres**:
- `courseId` (optionnel): ID du cours
- `assignmentId` (optionnel): ID du devoir (si non spécifié, génère pour tout le cours)
- `format` (optionnel): Format du rapport (json, csv, markdown)

**Questions à poser à Claude Desktop**:
- "Génère un rapport de notes pour le cours"
- "Crée un rapport CSV des notes du devoir 10"
- "Affiche les statistiques de tous les devoirs"
- "Génère un rapport Markdown des notes"
- "Quelle est la moyenne du devoir 8 ?"
- "Montre-moi un rapport complet du cours avec statistiques"
- "Crée un fichier CSV des notes pour Excel"

---

## 💡 Exemples de Workflows Complets

### Workflow 1: Correction d'un Devoir
```
1. "Liste tous les devoirs du cours"
2. "Récupère toutes les soumissions du devoir 10 avec fichiers"
3. "Montre-moi le contenu de la soumission de l'étudiant 42"
4. "Corrige automatiquement en utilisant Claude AI"
5. "Applique les feedbacks en masse pour tous les étudiants"
6. "Génère un rapport CSV des notes"
```

### Workflow 2: Exploration d'un Cours
```
1. "Liste tous mes cours"
2. "Donne-moi les détails du cours 15"
3. "Montre-moi le contenu complet du cours"
4. "Liste tous les étudiants inscrits"
5. "Quels sont les devoirs et leurs échéances ?"
6. "Affiche tous les PDF disponibles"
```

### Workflow 3: Suivi d'un Étudiant
```
1. "Liste les étudiants du cours"
2. "Quelles sont les soumissions de l'étudiant 42 ?"
3. "Montre-moi son contenu pour le devoir 10"
4. "Quelle note a-t-il au quiz 5 ?"
5. "Génère un rapport de ses performances"
```

### Workflow 4: Gestion de Fichiers
```
1. "Liste tous les fichiers du cours"
2. "Cherche les PDF contenant 'examen'"
3. "Télécharge le fichier de correction"
4. "Montre-moi tous les PowerPoint de la section 2"
```

---

## 🎯 Conseils d'Utilisation avec Claude Desktop

### Questions Naturelles
Claude Desktop comprend le langage naturel, donc vous pouvez poser des questions de manière conversationnelle :
- ❌ Évitez : "Exécute get_students avec courseId=15"
- ✅ Préférez : "Qui sont les étudiants du cours 15 ?"

### Combinaison d'Outils
Claude peut enchaîner plusieurs outils automatiquement :
- "Trouve tous les rendus du devoir 10 et corrige-les automatiquement"
- "Liste les PDF du cours et télécharge celui sur l'examen"

### Contexte
Vous pouvez faire référence aux résultats précédents :
- "Maintenant, télécharge le premier fichier de la liste"
- "Donne-moi plus de détails sur l'étudiant 42"

### Filtres et Recherches
Utilisez des descriptions naturelles pour filtrer :
- "Montre uniquement les étudiants qui n'ont pas rendu le devoir"
- "Liste les fichiers PDF de moins de 5 Mo"

---

## 📝 Notes Importantes

1. **Course ID par défaut** : Si vous avez configuré `MOODLE_COURSE_ID` dans vos variables d'environnement, vous n'avez pas besoin de spécifier le `courseId` pour la plupart des commandes.

2. **Permissions** : Assurez-vous que votre token API Moodle a les permissions nécessaires pour accéder aux informations demandées.

3. **Format des dates** : Les dates sont retournées au format ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ).

4. **IDs requis** : Certains outils nécessitent des IDs spécifiques. Utilisez d'abord les outils de listing pour obtenir ces IDs.

---

## 🔗 Ressources Complémentaires

- **Documentation Moodle API** : https://docs.moodle.org/dev/Web_services
- **MCP Protocol** : https://modelcontextprotocol.io
- **Configuration Claude Desktop** : Voir le fichier `INSTALLATION-GUIDE.md`

---

**Version** : 0.3.0  
**Dernière mise à jour** : Décembre 2024  
**Auteur** : Serge (RTN)
