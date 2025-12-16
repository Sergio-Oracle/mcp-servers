# Configuration Rapide Claude Desktop - Mode Réseau

Ce document fournit les configurations prêtes à l'emploi pour chaque plateforme.

## 📋 Prérequis

### Informations Requises

Avant de commencer, vous devez connaître :

1. **IP du serveur Moodle MCP** : `192.168.1.181` (exemple, à adapter)
2. **Port du serveur** : `3000` (par défaut)
3. **Nom du serveur MCP** : `moodle` (personnalisable)

---

## 🪟 Configuration Windows

### Étape 1 : Installer Nmap

**Télécharger et installer :**
1. Aller sur : https://nmap.org/download.html
2. Télécharger : `nmap-X.XX-setup.exe`
3. Exécuter l'installateur
4. Cocher **toutes les options** (surtout Ncat)
5. Terminer l'installation

### Étape 2 : Vérifier l'Installation

Ouvrir PowerShell et taper :

```powershell
ncat --version
```

Si erreur "command not found", ajouter au PATH :

```powershell
# Ajouter temporairement (session actuelle)
$env:Path += ";C:\Program Files (x86)\Nmap"

# Ou ajouter définitivement
[Environment]::SetEnvironmentVariable(
    "Path",
    $env:Path + ";C:\Program Files (x86)\Nmap",
    [EnvironmentVariableTarget]::Machine
)
```

### Étape 3 : Créer la Configuration

**Emplacement** : `%APPDATA%\Claude\claude_desktop_config.json`

**Méthode 1 - Via PowerShell (Automatique)** :

```powershell
# Créer le répertoire
New-Item -ItemType Directory -Force -Path "$env:APPDATA\Claude"

# Créer le fichier de configuration
@"
{
  "mcpServers": {
    "moodle": {
      "command": "ncat",
      "args": [
        "192.168.1.181",
        "3000"
      ]
    }
  }
}
"@ | Out-File -FilePath "$env:APPDATA\Claude\claude_desktop_config.json" -Encoding UTF8

# Vérifier
Get-Content "$env:APPDATA\Claude\claude_desktop_config.json"
```

**Méthode 2 - Manuellement** :

1. Appuyer sur `Win + R`
2. Taper : `%APPDATA%\Claude`
3. Si le dossier n'existe pas, le créer
4. Créer un fichier : `claude_desktop_config.json`
5. Copier-coller le contenu suivant :

```json
{
  "mcpServers": {
    "moodle": {
      "command": "ncat",
      "args": [
        "192.168.1.181",
        "3000"
      ]
    }
  }
}
```

### Étape 4 : Tester

```powershell
# Tester la connexion
ncat 192.168.1.181 3000
# Appuyer sur Ctrl+C pour quitter

# Redémarrer Claude Desktop
Stop-Process -Name "Claude" -Force
# Relancer Claude Desktop depuis le menu Démarrer
```

### Configuration Alternative (Chemin Complet)

Si ncat n'est toujours pas trouvé, utiliser le chemin complet :

```json
{
  "mcpServers": {
    "moodle": {
      "command": "C:\\Program Files (x86)\\Nmap\\ncat.exe",
      "args": [
        "192.168.1.181",
        "3000"
      ]
    }
  }
}
```

---

## 🐧 Configuration Ubuntu/Linux

### Étape 1 : Installer Nmap

```bash
# Mettre à jour les paquets
sudo apt update

# Installer nmap (inclut nc et ncat)
sudo apt install nmap

# Vérifier l'installation
which nc
which ncat
nc --version
ncat --version
```

### Étape 2 : Créer la Configuration

**Emplacement** : `~/.config/Claude/claude_desktop_config.json`

**Méthode Automatique** :

```bash
# Créer le répertoire
mkdir -p ~/.config/Claude

# Créer le fichier de configuration avec nc
cat > ~/.config/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "moodle": {
      "command": "nc",
      "args": [
        "192.168.1.181",
        "3000"
      ]
    }
  }
}
EOF

# Vérifier
cat ~/.config/Claude/claude_desktop_config.json
```

**Alternative avec ncat** :

```bash
cat > ~/.config/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "moodle": {
      "command": "ncat",
      "args": [
        "192.168.1.181",
        "3000"
      ]
    }
  }
}
EOF
```

### Étape 3 : Vérifier les Permissions

```bash
# Vérifier les permissions
ls -l ~/.config/Claude/claude_desktop_config.json

# Corriger si nécessaire
chmod 644 ~/.config/Claude/claude_desktop_config.json
```

### Étape 4 : Tester

```bash
# Tester la connexion
nc 192.168.1.181 3000
# ou
ncat 192.168.1.181 3000
# Appuyer sur Ctrl+C pour quitter

# Redémarrer Claude Desktop
pkill -f claude
# Attendre 5 secondes
sleep 5
# Relancer Claude Desktop
```

### Configuration avec Chemin Complet

Si nc/ncat n'est pas trouvé, utiliser le chemin complet :

```bash
# Trouver le chemin
which nc
which ncat

# Exemple de configuration avec chemin complet
cat > ~/.config/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "moodle": {
      "command": "/usr/bin/nc",
      "args": [
        "192.168.1.181",
        "3000"
      ]
    }
  }
}
EOF
```

---

## 🍎 Configuration macOS

### Étape 1 : Installer Nmap via Homebrew

```bash
# Installer Homebrew si nécessaire
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Installer nmap
brew install nmap

# Vérifier l'installation
which ncat
ncat --version
```

### Étape 2 : Créer la Configuration

**Emplacement** : `~/Library/Application Support/Claude/claude_desktop_config.json`

**Méthode Automatique** :

```bash
# Créer le répertoire
mkdir -p ~/Library/Application\ Support/Claude

# Créer le fichier de configuration
cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "moodle": {
      "command": "ncat",
      "args": [
        "192.168.1.181",
        "3000"
      ]
    }
  }
}
EOF

# Vérifier
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Étape 3 : Tester

```bash
# Tester la connexion
ncat 192.168.1.181 3000
# Appuyer sur Ctrl+C pour quitter

# Redémarrer Claude Desktop
pkill -f Claude
# Attendre 5 secondes
sleep 5
# Relancer Claude Desktop depuis Applications
```

---

## 📝 Configuration Multi-Serveurs

Si vous avez plusieurs serveurs MCP, vous pouvez les configurer ensemble :

### Windows

```json
{
  "mcpServers": {
    "moodle": {
      "command": "ncat",
      "args": ["192.168.1.181", "3000"]
    },
    "autre-serveur": {
      "command": "ncat",
      "args": ["192.168.1.182", "3001"]
    }
  }
}
```

### Linux/macOS

```json
{
  "mcpServers": {
    "moodle": {
      "command": "nc",
      "args": ["192.168.1.181", "3000"]
    },
    "autre-serveur": {
      "command": "nc",
      "args": ["192.168.1.182", "3001"]
    }
  }
}
```

---

## 🔍 Vérification de la Configuration

### Test de Connectivité

**Windows** :
```powershell
# Test 1 : Ping
ping 192.168.1.181

# Test 2 : Test du port
Test-NetConnection -ComputerName 192.168.1.181 -Port 3000

# Test 3 : Connexion ncat
ncat 192.168.1.181 3000
```

**Linux/macOS** :
```bash
# Test 1 : Ping
ping -c 4 192.168.1.181

# Test 2 : Test du port
nc -zv 192.168.1.181 3000

# Test 3 : Connexion
nc 192.168.1.181 3000
```

### Vérification dans Claude Desktop

Après redémarrage de Claude Desktop, demander :

```
Claude, quels sont les serveurs MCP disponibles ?
```

Ou :

```
Claude, liste les outils Moodle disponibles
```

---

## 🐛 Dépannage Rapide

### Windows

**Problème** : ncat not found
```powershell
# Vérifier l'installation
dir "C:\Program Files (x86)\Nmap\ncat.exe"

# Si le fichier existe, vérifier le PATH
echo $env:Path

# Ajouter au PATH
$env:Path += ";C:\Program Files (x86)\Nmap"

# Ou utiliser le chemin complet dans la config
```

**Problème** : Connection refused
```powershell
# Vérifier que le serveur est accessible
Test-NetConnection -ComputerName 192.168.1.181 -Port 3000

# Vérifier l'IP dans la config
Get-Content "$env:APPDATA\Claude\claude_desktop_config.json"
```

### Linux

**Problème** : nc/ncat not found
```bash
# Installer nmap
sudo apt install nmap

# Vérifier
which nc ncat

# Utiliser le chemin complet dans la config si nécessaire
```

**Problème** : Permission denied
```bash
# Vérifier les permissions
ls -l ~/.config/Claude/claude_desktop_config.json

# Corriger
chmod 644 ~/.config/Claude/claude_desktop_config.json
```

### macOS

**Problème** : ncat not found
```bash
# Installer via Homebrew
brew install nmap

# Vérifier
which ncat

# Ajouter au PATH si nécessaire
export PATH="/usr/local/bin:$PATH"
```

---

## 📊 Récapitulatif

| Plateforme | Commande | Fichier de Config |
|------------|----------|-------------------|
| **Windows** | `ncat` | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Linux** | `nc` ou `ncat` | `~/.config/Claude/claude_desktop_config.json` |
| **macOS** | `ncat` | `~/Library/Application Support/Claude/claude_desktop_config.json` |

### Commandes Essentielles

| Action | Windows | Linux | macOS |
|--------|---------|-------|-------|
| **Installer** | Télécharger Nmap | `sudo apt install nmap` | `brew install nmap` |
| **Tester** | `ncat IP PORT` | `nc IP PORT` | `ncat IP PORT` |
| **Config** | PowerShell script | bash script | bash script |
| **Redémarrer** | `Stop-Process` | `pkill -f claude` | `pkill -f Claude` |

---

## 🎯 Checklist de Configuration

- [ ] Installer ncat/nc sur le client
- [ ] Vérifier que ncat/nc est dans le PATH
- [ ] Tester la connexion au serveur (ping + port)
- [ ] Créer le fichier de configuration JSON
- [ ] Vérifier la syntaxe JSON
- [ ] Vérifier l'IP du serveur dans la config
- [ ] Redémarrer Claude Desktop
- [ ] Tester avec une commande simple

---

## 💡 Conseils

1. **IP Statique** : Configurez une IP statique sur le serveur pour éviter les changements
2. **DNS Local** : Utilisez un nom de domaine local (ex: `moodle-mcp.local`) au lieu de l'IP
3. **Backup** : Sauvegardez votre fichier de configuration
4. **Documentation** : Documentez votre configuration spécifique

---

**Version** : 0.4.0  
**Dernière mise à jour** : Décembre 2024
