#!/bin/bash

# ========================================
# Installation Automatique Complète
# Serveur MCP Moodle Étendu v0.2.0
# ========================================

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/serge/mcp-servers/moodle-mcp-server"
SOURCE_DIR="/home/claude"
BACKUP_SUFFIX=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}"
echo "================================================"
echo "  Installation MCP Moodle Étendu v0.2.0"
echo "================================================"
echo -e "${NC}"
echo ""

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Vérifier les prérequis
log_info "Vérification des prérequis..."

if ! command -v node &> /dev/null; then
    log_error "Node.js n'est pas installé"
    exit 1
fi
log_success "Node.js installé : $(node --version)"

if ! command -v npm &> /dev/null; then
    log_error "npm n'est pas installé"
    exit 1
fi
log_success "npm installé : $(npm --version)"

# Vérifier le répertoire du projet
log_info "Vérification du répertoire du projet..."

if [ ! -d "$PROJECT_DIR" ]; then
    log_error "Répertoire du projet non trouvé : $PROJECT_DIR"
    log_info "Voulez-vous le créer ? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        mkdir -p "$PROJECT_DIR"
        cd "$PROJECT_DIR"
        npm init -y
        npm install @modelcontextprotocol/sdk axios dotenv
        npm install --save-dev @types/node typescript
        mkdir -p src
        log_success "Projet créé"
    else
        exit 1
    fi
fi

cd "$PROJECT_DIR" || exit 1
log_success "Répertoire du projet : $PROJECT_DIR"

# Sauvegarde des fichiers existants
log_info "Sauvegarde des fichiers existants..."

if [ -f "src/index.ts" ]; then
    cp "src/index.ts" "src/index.ts.backup.$BACKUP_SUFFIX"
    log_success "Sauvegarde créée : src/index.ts.backup.$BACKUP_SUFFIX"
fi

if [ -f "README.md" ]; then
    cp "README.md" "README.md.backup.$BACKUP_SUFFIX"
    log_success "Sauvegarde créée : README.md.backup.$BACKUP_SUFFIX"
fi

# Copie des nouveaux fichiers
log_info "Installation des nouveaux fichiers..."

if [ -f "$SOURCE_DIR/moodle-extended-index.ts" ]; then
    cp "$SOURCE_DIR/moodle-extended-index.ts" "src/index.ts"
    log_success "Code source mis à jour : src/index.ts"
else
    log_error "Fichier source non trouvé : $SOURCE_DIR/moodle-extended-index.ts"
    log_warning "Vous devrez copier manuellement le code source"
fi

if [ -f "$SOURCE_DIR/README-EXTENDED.md" ]; then
    cp "$SOURCE_DIR/README-EXTENDED.md" "README.md"
    log_success "README mis à jour"
fi

# Copie des scripts utiles
log_info "Installation des scripts utiles..."

if [ -f "$SOURCE_DIR/test-installation.sh" ]; then
    cp "$SOURCE_DIR/test-installation.sh" .
    chmod +x test-installation.sh
    log_success "Script de test installé : test-installation.sh"
fi

# Copie de la documentation
log_info "Installation de la documentation..."

for doc in INSTALLATION-GUIDE.md COMMANDES-RECAP.md EXEMPLE-CORRECTION-AUTO.md; do
    if [ -f "$SOURCE_DIR/$doc" ]; then
        cp "$SOURCE_DIR/$doc" .
        log_success "Documentation installée : $doc"
    fi
done

# Vérifier package.json
log_info "Vérification de package.json..."

if [ ! -f "package.json" ]; then
    log_error "package.json non trouvé"
    log_info "Création d'un package.json basique..."
    
    cat > package.json << 'EOF'
{
  "name": "moodle-mcp-server",
  "version": "0.2.0",
  "description": "Moodle MCP server étendu",
  "private": true,
  "type": "module",
  "bin": {
    "moodle-mcp-server": "./build/index.js"
  },
  "files": [
    "build"
  ],
  "scripts": {
    "build": "tsc && node -e \"require('fs').chmodSync('build/index.js', '755')\"",
    "prepare": "npm run build",
    "watch": "tsc --watch",
    "inspector": "npx @modelcontextprotocol/inspector build/index.js",
    "start": "node --require dotenv/config build/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "0.6.0",
    "axios": "^1.8.2",
    "dotenv": "^16.6.1"
  },
  "devDependencies": {
    "@types/node": "^20.11.24",
    "typescript": "^5.3.3"
  }
}
EOF
    log_success "package.json créé"
fi

# Vérifier tsconfig.json
log_info "Vérification de tsconfig.json..."

if [ ! -f "tsconfig.json" ]; then
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
EOF
    log_success "tsconfig.json créé"
fi

# Installation des dépendances
log_info "Installation des dépendances npm..."

if [ -d "node_modules" ]; then
    log_warning "node_modules existe déjà, mise à jour..."
fi

npm install
log_success "Dépendances installées"

# Nettoyage de l'ancien build
log_info "Nettoyage de l'ancien build..."

if [ -d "build" ]; then
    rm -rf build
    log_success "Ancien build supprimé"
fi

# Compilation
log_info "Compilation du serveur..."

if npm run build; then
    log_success "Compilation réussie !"
else
    log_error "Erreur de compilation"
    log_warning "Vérifiez src/index.ts pour les erreurs de syntaxe"
    exit 1
fi

# Vérification du build
log_info "Vérification du build..."

if [ -f "build/index.js" ]; then
    BUILD_SIZE=$(du -h build/index.js | cut -f1)
    log_success "Fichier compilé : build/index.js ($BUILD_SIZE)"
    
    # Vérifier que les nouvelles fonctions sont présentes
    if grep -q "get_course_contents" build/index.js; then
        log_success "Nouvelles fonctionnalités détectées dans le build"
    else
        log_warning "Les nouvelles fonctionnalités ne sont peut-être pas présentes"
    fi
else
    log_error "Le fichier build/index.js n'a pas été créé"
    exit 1
fi

# Vérification de la configuration Claude Desktop
log_info "Vérification de la configuration Claude Desktop..."

CLAUDE_CONFIG="$HOME/.config/Claude/claude_desktop_config.json"

if [ -f "$CLAUDE_CONFIG" ]; then
    if grep -q "moodle-server" "$CLAUDE_CONFIG"; then
        log_success "Configuration Claude Desktop trouvée"
        
        # Vérifier le chemin dans la config
        if grep -q "$PROJECT_DIR/build/index.js" "$CLAUDE_CONFIG"; then
            log_success "Chemin vers le build correct dans la configuration"
        else
            log_warning "Le chemin dans la configuration Claude pourrait ne pas correspondre"
            log_info "Chemin attendu : $PROJECT_DIR/build/index.js"
        fi
    else
        log_warning "Configuration Claude trouvée mais serveur moodle-server non configuré"
    fi
else
    log_warning "Configuration Claude Desktop non trouvée"
    log_info "Créez le fichier : $CLAUDE_CONFIG"
fi

# Exécution des tests
log_info "Exécution des tests..."

if [ -f "test-installation.sh" ]; then
    chmod +x test-installation.sh
    ./test-installation.sh
else
    log_warning "Script de test non trouvé, tests ignorés"
fi

# Résumé final
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}     ✨ Installation Terminée avec Succès ! ✨${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

log_success "Le serveur MCP Moodle étendu v0.2.0 est installé"
echo ""

echo -e "${YELLOW}📋 Prochaines étapes :${NC}"
echo ""
echo "1. 🔄 Redémarrez Claude Desktop :"
echo "   $ pkill -f claude"
echo "   Puis relancez Claude Desktop depuis le menu"
echo ""
echo "2. 🧪 Testez l'installation dans Claude :"
echo "   'Claude, montre-moi tous les outils Moodle disponibles'"
echo ""
echo "3. 🔍 Ou utilisez l'Inspector pour déboguer :"
echo "   $ cd $PROJECT_DIR"
echo "   $ npm run inspector"
echo ""
echo "4. 📖 Consultez la documentation :"
echo "   - README.md : Documentation complète"
echo "   - INSTALLATION-GUIDE.md : Guide d'installation"
echo "   - COMMANDES-RECAP.md : Toutes les commandes"
echo "   - EXEMPLE-CORRECTION-AUTO.md : Exemple de correction"
echo ""

echo -e "${YELLOW}✨ Nouvelles fonctionnalités disponibles :${NC}"
echo ""
echo "  📚 Contenu du cours :"
echo "    • get_course_contents"
echo "    • get_course_modules"
echo "    • get_section_contents"
echo ""
echo "  📁 Fichiers :"
echo "    • get_course_files"
echo "    • download_file"
echo "    • search_files"
echo ""
echo "  ✅ Correction automatique :"
echo "    • get_all_submissions_with_files"
echo "    • batch_provide_feedback"
echo "    • generate_grades_report"
echo ""

echo -e "${BLUE}================================================${NC}"
echo ""

if [ -f "$CLAUDE_CONFIG" ] && grep -q "moodle-server" "$CLAUDE_CONFIG"; then
    log_info "Configuration Claude Desktop détectée"
    log_warning "N'oubliez pas de redémarrer Claude Desktop !"
else
    log_warning "Configuration Claude Desktop non trouvée ou incomplète"
    log_info "Créez ou mettez à jour : $CLAUDE_CONFIG"
    echo ""
    echo "Configuration recommandée :"
    echo '{'
    echo '  "mcpServers": {'
    echo '    "moodle-server": {'
    echo '      "command": "node",'
    echo "      \"args\": [\"$PROJECT_DIR/build/index.js\"],"
    echo '      "env": {'
    echo '        "MOODLE_API_URL": "https://formation.ec2lt.sn/webservice/rest/server.php",'
    echo '        "MOODLE_API_TOKEN": "votre_token",'
    echo '        "MOODLE_COURSE_ID": "400"'
    echo '      }'
    echo '    }'
    echo '  }'
    echo '}'
fi

echo ""
log_success "Installation terminée ! Bon travail avec le serveur MCP Moodle ! 🎉"
echo ""
