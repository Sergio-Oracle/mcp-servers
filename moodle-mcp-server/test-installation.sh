#!/bin/bash

# Script de test du serveur MCP Moodle étendu
# Vérifie que toutes les fonctionnalités sont disponibles

echo "================================================"
echo "🧪 Test du Serveur MCP Moodle Étendu"
echo "================================================"
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
TESTS_PASSED=0
TESTS_FAILED=0

# Fonction de test
test_check() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "🔍 Test: $test_name ... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "📋 Vérification de l'environnement"
echo "-----------------------------------"

# Test 1: Node.js installé
test_check "Node.js installé" "which node"
if [ $? -eq 0 ]; then
    NODE_VERSION=$(node --version)
    echo "   Version: $NODE_VERSION"
fi

# Test 2: npm installé
test_check "npm installé" "which npm"
if [ $? -eq 0 ]; then
    NPM_VERSION=$(npm --version)
    echo "   Version: $NPM_VERSION"
fi

# Test 3: Répertoire du projet
echo ""
echo "📁 Vérification des fichiers du projet"
echo "---------------------------------------"

test_check "package.json existe" "[ -f package.json ]"
test_check "tsconfig.json existe" "[ -f tsconfig.json ]"
test_check "src/index.ts existe" "[ -f src/index.ts ]"
test_check "node_modules/ existe" "[ -d node_modules ]"

# Test 4: Code source contient les nouvelles fonctions
echo ""
echo "🔍 Vérification du code source"
echo "--------------------------------"

test_check "get_course_contents présent" "grep -q 'get_course_contents' src/index.ts"
test_check "get_course_files présent" "grep -q 'get_course_files' src/index.ts"
test_check "download_file présent" "grep -q 'download_file' src/index.ts"
test_check "batch_provide_feedback présent" "grep -q 'batch_provide_feedback' src/index.ts"
test_check "generate_grades_report présent" "grep -q 'generate_grades_report' src/index.ts"
test_check "search_files présent" "grep -q 'search_files' src/index.ts"

# Test 5: Compilation
echo ""
echo "🔨 Test de compilation"
echo "----------------------"

if [ -d "build" ]; then
    test_check "build/index.js existe" "[ -f build/index.js ]"
    
    if [ -f "build/index.js" ]; then
        BUILD_SIZE=$(du -h build/index.js | cut -f1)
        echo "   Taille du build: $BUILD_SIZE"
        
        # Vérifier que le build contient les nouvelles fonctions
        test_check "Build contient get_course_contents" "grep -q 'get_course_contents' build/index.js"
        test_check "Build contient batch_provide_feedback" "grep -q 'batch_provide_feedback' build/index.js"
    fi
else
    echo -e "   ${YELLOW}⚠ Dossier build/ n'existe pas - Lancez 'npm run build'${NC}"
    ((TESTS_FAILED++))
fi

# Test 6: Configuration Claude Desktop
echo ""
echo "⚙️  Vérification de la configuration Claude Desktop"
echo "----------------------------------------------------"

CLAUDE_CONFIG="$HOME/.config/Claude/claude_desktop_config.json"

if [ -f "$CLAUDE_CONFIG" ]; then
    test_check "Configuration Claude existe" "true"
    test_check "Configuration contient moodle-server" "grep -q 'moodle-server' $CLAUDE_CONFIG"
    test_check "Configuration contient MOODLE_API_URL" "grep -q 'MOODLE_API_URL' $CLAUDE_CONFIG"
    test_check "Configuration contient MOODLE_API_TOKEN" "grep -q 'MOODLE_API_TOKEN' $CLAUDE_CONFIG"
    test_check "Configuration contient MOODLE_COURSE_ID" "grep -q 'MOODLE_COURSE_ID' $CLAUDE_CONFIG"
else
    echo -e "   ${YELLOW}⚠ Fichier de configuration Claude Desktop non trouvé${NC}"
    echo "   Chemin attendu: $CLAUDE_CONFIG"
    ((TESTS_FAILED++))
fi

# Test 7: Variables d'environnement (si disponibles)
echo ""
echo "🔐 Vérification des variables d'environnement"
echo "----------------------------------------------"

if [ -n "$MOODLE_API_URL" ]; then
    echo -e "   ${GREEN}✓${NC} MOODLE_API_URL: $MOODLE_API_URL"
else
    echo -e "   ${YELLOW}⚠${NC} MOODLE_API_URL non définie (normal si dans config Claude)"
fi

if [ -n "$MOODLE_API_TOKEN" ]; then
    TOKEN_PREVIEW="${MOODLE_API_TOKEN:0:10}..."
    echo -e "   ${GREEN}✓${NC} MOODLE_API_TOKEN: $TOKEN_PREVIEW"
else
    echo -e "   ${YELLOW}⚠${NC} MOODLE_API_TOKEN non définie (normal si dans config Claude)"
fi

if [ -n "$MOODLE_COURSE_ID" ]; then
    echo -e "   ${GREEN}✓${NC} MOODLE_COURSE_ID: $MOODLE_COURSE_ID"
else
    echo -e "   ${YELLOW}⚠${NC} MOODLE_COURSE_ID non définie (normal si dans config Claude)"
fi

# Résumé final
echo ""
echo "================================================"
echo "📊 Résumé des Tests"
echo "================================================"
echo ""
echo -e "Tests réussis: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests échoués: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✨ Tous les tests sont passés avec succès !${NC}"
    echo ""
    echo "🎉 Le serveur MCP Moodle étendu est prêt à l'emploi !"
    echo ""
    echo "📋 Prochaines étapes :"
    echo "   1. Redémarrez Claude Desktop"
    echo "   2. Testez avec : 'Claude, montre-moi les outils Moodle'"
    echo "   3. Utilisez : npm run inspector (pour déboguer)"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Certains tests ont échoué${NC}"
    echo ""
    echo "🔧 Actions recommandées :"
    echo ""
    
    if [ ! -d "build" ] || [ ! -f "build/index.js" ]; then
        echo "   • Compiler le projet : npm run build"
    fi
    
    if [ ! -f "$CLAUDE_CONFIG" ]; then
        echo "   • Créer la configuration Claude Desktop"
        echo "     Fichier: $CLAUDE_CONFIG"
    fi
    
    if ! grep -q "get_course_contents" src/index.ts 2>/dev/null; then
        echo "   • Copier le nouveau code source dans src/index.ts"
    fi
    
    echo ""
    echo "📖 Consultez le guide d'installation : INSTALLATION-GUIDE.md"
    echo ""
    exit 1
fi
