# Guide d'Installation Rapide - Moodle MCP Server Étendu

## 🚀 Installation en 5 Minutes

### Étape 1 : Préparation (1 min)

```bash
# Aller dans le répertoire du serveur
cd /home/serge/mcp-servers/moodle-mcp-server

# Vérifier que vous êtes dans le bon dossier
pwd
# Devrait afficher: /home/serge/mcp-servers/moodle-mcp-server
```

### Étape 2 : Récupération des Nouveaux Fichiers (1 min)

**Option A - Copie manuelle depuis ce chat :**

1. Copiez le contenu du nouveau `index.ts` depuis ce chat
2. Ouvrez le fichier : `nano src/index.ts`
3. Remplacez tout le contenu par le nouveau code
4. Sauvegardez : `Ctrl+O`, `Entrée`, `Ctrl+X`

**Option B - Via les fichiers créés :**

```bash
# Sauvegarde de l'ancien fichier
cp src/index.ts src/index.ts.backup.$(date +%Y%m%d_%H%M%S)

# Copie du nouveau fichier (si vous l'avez téléchargé)
# Remplacez /chemin/vers/ par le chemin réel
cp /chemin/vers/moodle-extended-index.ts src/index.ts
```

### Étape 3 : Compilation (1 min)

```bash
# Nettoyer l'ancien build
rm -rf build

# Recompiler
npm run build
```

**Résultat attendu :**
```
> moodle-mcp-server@0.1.0 build
> tsc && node -e "require('fs').chmodSync('build/index.js', '755')"
✅ Compilation réussie !
```

### Étape 4 : Vérification (1 min)

```bash
# Vérifier que le nouveau build existe
ls -lh build/index.js

# Devrait afficher quelque chose comme:
# -rwxr-xr-x 1 serge serge 125K Dec  4 10:30 build/index.js
```

### Étape 5 : Test avec l'Inspector (1 min)

```bash
# Lancer l'inspector
npm run inspector
```

**Résultat attendu :**
```
Server running on http://127.0.0.1:5173
```

Ouvrez votre navigateur à l'adresse indiquée et vérifiez que vous voyez les nouveaux outils.

### Étape 6 : Redémarrage de Claude Desktop

```bash
# Tuer tous les processus Claude
pkill -f claude

# Ou redémarrer manuellement Claude Desktop depuis le menu
```

## ✅ Vérification de l'Installation

Une fois Claude Desktop redémarré, testez en lui demandant :

```
Claude, montre-moi tous les outils Moodle disponibles
```

Vous devriez voir les **nouveaux outils** :
- ✨ get_course_contents
- ✨ get_course_modules
- ✨ get_course_files
- ✨ download_file
- ✨ search_files
- ✨ get_all_submissions_with_files
- ✨ batch_provide_feedback
- ✨ generate_grades_report
- ✨ get_module_details
- ✨ get_section_contents

## 🧪 Tests Fonctionnels

### Test 1 : Lister le contenu du cours

```
Claude, utilise get_course_contents pour me montrer 
toutes les sections et modules du cours Moodle
```

### Test 2 : Lister les fichiers

```
Claude, liste tous les fichiers PDF disponibles dans le cours
```

### Test 3 : Rechercher un fichier

```
Claude, recherche les fichiers qui contiennent "examen" dans leur nom
```

### Test 4 : Voir les soumissions (si un devoir existe)

```
Claude, récupère toutes les soumissions du devoir ID [ID]
avec leurs fichiers attachés
```

## 🐛 Résolution de Problèmes

### Problème : "Unknown tool: get_course_contents"

**Solution :**
1. Vérifiez que la compilation a réussi : `ls -l build/index.js`
2. Redémarrez complètement Claude Desktop : `pkill -f claude`
3. Attendez 10 secondes et relancez Claude Desktop

### Problème : "Moodle API error"

**Solution :**
1. Vérifiez votre configuration dans `~/.config/Claude/claude_desktop_config.json`
2. Testez votre token API :
```bash
curl "https://formation.ec2lt.sn/webservice/rest/server.php?wstoken=dfbaccaeb0096b0375d1b8e938d9828c&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json"
```

### Problème : Compilation échoue

**Solution :**
```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📊 Commandes Utiles

```bash
# Voir les logs en temps réel
journalctl -f | grep moodle

# Vérifier les processus Claude
ps aux | grep claude

# Tester manuellement le serveur
node build/index.js

# Recompiler en mode watch (auto-rebuild)
npm run watch
```

## 🎯 Prochaines Étapes

Une fois l'installation confirmée :

1. **Testez les nouvelles fonctionnalités** avec des requêtes simples
2. **Créez un devoir test** sur Moodle pour tester la correction automatique
3. **Déposez quelques copies test** pour valider le workflow complet
4. **Générez un rapport** pour voir le format de sortie

## 💡 Astuces

### Astuce 1 : Utiliser l'Inspector pour déboguer

```bash
npm run inspector
```

L'Inspector vous permet de :
- Voir tous les outils disponibles
- Tester les appels API
- Voir les réponses en temps réel
- Déboguer les erreurs

### Astuce 2 : Vérifier la configuration Claude

```bash
cat ~/.config/Claude/claude_desktop_config.json
```

Vérifiez que :
- Le chemin vers `build/index.js` est correct
- Les variables d'environnement sont définies
- Le serveur n'est pas marqué comme `"disabled": true`

### Astuce 3 : Logs détaillés

Pour voir plus de détails lors de l'exécution :

```bash
# Ajouter DEBUG=* dans la config Claude Desktop
"env": {
  "DEBUG": "*",
  "MOODLE_API_URL": "...",
  ...
}
```

## 📞 Besoin d'Aide ?

Si vous rencontrez des problèmes :

1. ✅ Vérifiez les logs : `journalctl -f`
2. ✅ Testez avec l'Inspector : `npm run inspector`
3. ✅ Vérifiez la configuration Claude Desktop
4. ✅ Testez l'API Moodle directement avec curl
5. ✅ Revenez à la sauvegarde si nécessaire : `cp src/index.ts.backup src/index.ts`

---

**Temps estimé total : 5-10 minutes**

Bonne installation ! 🎉
