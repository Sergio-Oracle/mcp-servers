# ⚡ DÉMARRAGE RAPIDE - À EXÉCUTER MAINTENANT

**Temps estimé : 5 minutes**

---

## 🎯 OPTION ULTRA-RAPIDE (RECOMMANDÉ)

### Une seule commande pour tout installer :

```bash
chmod +x /home/claude/auto-install.sh && /home/claude/auto-install.sh
```

C'est tout ! Le script va :
- ✅ Sauvegarder vos fichiers actuels
- ✅ Installer le nouveau code
- ✅ Compiler
- ✅ Vérifier l'installation
- ✅ Vous donner les prochaines étapes

Ensuite :

```bash
# Redémarrer Claude Desktop
pkill -f claude
# Puis relancer Claude Desktop depuis le menu
```

---

## 📋 OU : INSTALLATION MANUELLE ÉTAPE PAR ÉTAPE

Si vous préférez le contrôle manuel :

### ÉTAPE 1 : Aller dans le projet (30 secondes)

```bash
cd /home/serge/mcp-servers/moodle-mcp-server
pwd
# Devrait afficher : /home/serge/mcp-servers/moodle-mcp-server
```

### ÉTAPE 2 : Sauvegarder l'ancien code (15 secondes)

```bash
cp src/index.ts src/index.ts.backup.$(date +%Y%m%d_%H%M%S)
ls -l src/index.ts.backup*
```

### ÉTAPE 3 : Installer le nouveau code (30 secondes)

```bash
cp /home/claude/moodle-extended-index.ts src/index.ts
```

### ÉTAPE 4 : Recompiler (1 minute)

```bash
rm -rf build
npm run build
```

**Résultat attendu :**
```
> moodle-mcp-server@0.1.0 build
> tsc && node -e "require('fs').chmodSync('build/index.js', '755')"
✅ Succès !
```

### ÉTAPE 5 : Vérifier (30 secondes)

```bash
ls -lh build/index.js
grep -c "get_course_contents" build/index.js
# Devrait afficher au moins 1
```

### ÉTAPE 6 : Tester (1 minute)

```bash
# Optionnel mais recommandé
npm run inspector
# Ouvrir le navigateur à l'URL indiquée
# Ctrl+C pour arrêter
```

### ÉTAPE 7 : Redémarrer Claude Desktop (1 minute)

```bash
pkill -f claude
sleep 5
# Puis relancer Claude Desktop depuis le menu Applications
```

### ÉTAPE 8 : Test dans Claude (1 minute)

Ouvrez Claude Desktop et tapez :

```
Claude, montre-moi tous les outils Moodle disponibles
```

Vous devriez voir **10 nouveaux outils** :
- ✨ get_course_contents
- ✨ get_course_modules
- ✨ get_course_files
- ✨ download_file
- ✨ search_files
- ✨ get_module_details
- ✨ get_section_contents
- ✨ get_all_submissions_with_files
- ✨ batch_provide_feedback
- ✨ generate_grades_report

---

## ✅ TESTS RAPIDES

### Test 1 : Contenu du cours

```
Claude, utilise get_course_contents pour me montrer 
toutes les sections et modules du cours Moodle
```

### Test 2 : Fichiers disponibles

```
Claude, liste tous les fichiers disponibles dans le cours
```

### Test 3 : Recherche

```
Claude, recherche les fichiers qui contiennent "examen" dans leur nom
```

---

## 🐛 EN CAS DE PROBLÈME

### Problème : "Unknown tool: get_course_contents"

**Solution :**
```bash
# Recompiler
cd /home/serge/mcp-servers/moodle-mcp-server
npm run build

# Vérifier que le build contient le nouveau code
grep "get_course_contents" build/index.js

# Redémarrer Claude Desktop COMPLÈTEMENT
pkill -9 -f claude
sleep 10
# Relancer Claude Desktop
```

### Problème : Compilation échoue

**Solution :**
```bash
# Nettoyer et réinstaller
cd /home/serge/mcp-servers/moodle-mcp-server
rm -rf node_modules package-lock.json build
npm install
npm run build
```

### Problème : Claude ne répond pas

**Solution :**
```bash
# Vérifier la configuration
cat ~/.config/Claude/claude_desktop_config.json

# S'assurer que le chemin est correct :
# /home/serge/mcp-servers/moodle-mcp-server/build/index.js
```

---

## 📁 FICHIERS DISPONIBLES

Tous les fichiers sont dans `/home/claude/` :

### Fichiers Principaux :
- ✅ **moodle-extended-index.ts** - Code source étendu
- ✅ **auto-install.sh** - Installation automatique
- ✅ **README-EXTENDED.md** - Documentation complète

### Documentation :
- ✅ **INSTALLATION-GUIDE.md** - Guide d'installation détaillé
- ✅ **COMMANDES-RECAP.md** - Toutes les commandes
- ✅ **EXEMPLE-CORRECTION-AUTO.md** - Exemple pratique complet
- ✅ **INDEX-FICHIERS.md** - Index de tous les fichiers

### Scripts :
- ✅ **test-installation.sh** - Tests automatiques
- ✅ **install-moodle-extended.sh** - Installation semi-auto

---

## 🎓 PREMIER CAS D'USAGE

Une fois l'installation confirmée, testez avec un cas simple :

```
Claude, voici ma première demande :

1. Liste toutes les sections du cours avec get_course_contents
2. Pour chaque section, montre-moi les modules disponibles
3. Liste tous les fichiers PDF du cours
4. Si tu trouves des devoirs, montre-moi leurs informations
```

---

## 📖 DOCUMENTATION À CONSULTER

### Ordre recommandé :

1. **START-HERE.md** (ce fichier) - Commandes de démarrage
2. **INSTALLATION-GUIDE.md** - Guide détaillé si besoin
3. **EXEMPLE-CORRECTION-AUTO.md** - Pour votre premier examen
4. **README-EXTENDED.md** - Documentation technique complète
5. **COMMANDES-RECAP.md** - Référence de toutes les commandes

---

## 🚀 WORKFLOW COMPLET DE CORRECTION

Une fois installé, voici comment corriger un examen :

```
Claude, voici mon workflow de correction automatique :

1. Liste les devoirs du cours avec get_assignments
2. Identifie le devoir "Examen Final" (ou l'ID que je te donne)
3. Récupère toutes les copies avec get_all_submissions_with_files
4. Pour chaque copie :
   a. Analyse le contenu
   b. Applique le barème de correction que je te fournis
   c. Génère une note et un feedback personnalisé
5. Soumets toutes les corrections avec batch_provide_feedback
6. Génère un rapport final avec generate_grades_report en format Markdown

Attends mes instructions pour le barème de correction.
```

---

## ⏱️ TEMPS D'INSTALLATION TOTAL

| Étape | Temps |
|-------|-------|
| Installation auto (auto-install.sh) | 2-3 min |
| OU Installation manuelle | 5 min |
| Redémarrage Claude Desktop | 1 min |
| Tests de vérification | 2 min |
| **TOTAL** | **5-8 minutes** |

---

## ✨ CE QUE VOUS POUVEZ FAIRE MAINTENANT

Avec le serveur étendu, vous pouvez :

### Gestion du Cours :
- 📚 Explorer tout le contenu du cours
- 📁 Lister et rechercher des fichiers
- 📥 Télécharger des ressources
- 🔍 Filtrer par type de module ou fichier

### Correction d'Examens :
- 📝 Récupérer toutes les copies en une fois
- ✅ Corriger automatiquement avec l'IA
- 📊 Générer des rapports de notes
- 💬 Fournir des feedbacks personnalisés en masse

### Analyse :
- 📈 Statistiques de classe
- 📉 Identification des difficultés communes
- 🎯 Suivi de la progression

---

## 🎉 C'EST PARTI !

Choisissez votre méthode :

### Option 1 - Ultra Rapide :
```bash
chmod +x /home/claude/auto-install.sh && /home/claude/auto-install.sh
```

### Option 2 - Manuelle :
Suivez les 8 étapes ci-dessus

---

## 📞 BESOIN D'AIDE ?

Si vous rencontrez un problème :

1. ✅ Lancez les tests : `./test-installation.sh`
2. ✅ Consultez : `INSTALLATION-GUIDE.md`
3. ✅ Vérifiez : `COMMANDES-RECAP.md`

---

**Prêt ? Lancez la commande et c'est parti ! 🚀**

---

*Version : 0.2.0*  
*Date : 2024-12-04*  
*Temps d'installation : 5 minutes*  
*Complexité : Facile ⭐*
