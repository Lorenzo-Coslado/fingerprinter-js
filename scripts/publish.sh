#!/bin/bash

# Script pour publier sur NPM et GitHub Packages
# Usage: ./scripts/publish.sh [patch|minor|major]

set -e

VERSION_TYPE=${1:-patch}

echo "🚀 Publication de fingerprinter-js sur NPM et GitHub Packages"
echo "Type de version: $VERSION_TYPE"

# Vérifier les tokens
if [ -z "$NODE_AUTH_TOKEN" ]; then
    echo "⚠️  Variable NODE_AUTH_TOKEN non définie."
    echo "💡 Pour publier sur GitHub Packages, créé un token sur:"
    echo "   https://github.com/settings/tokens (avec permission 'write:packages')"
    echo ""
    read -p "🔑 Entre ton token GitHub (ghp_...): " GITHUB_TOKEN
    if [ -z "$GITHUB_TOKEN" ]; then
        echo "❌ Token requis pour publier sur GitHub Packages"
        exit 1
    fi
    export NODE_AUTH_TOKEN="$GITHUB_TOKEN"
fi

# Vérifier que tout est commité
if [[ -n $(git status --porcelain) ]]; then
    echo "❌ Il y a des fichiers non commités. Veuillez commiter avant de publier."
    exit 1
fi

# Build du projet
echo "📦 Build du projet..."
npm run build

# Tests
echo "🧪 Exécution des tests..."
npm test

# Mise à jour de la version
echo "📈 Mise à jour de la version ($VERSION_TYPE)..."
npm version $VERSION_TYPE

# Publication sur NPM (sans scope)
echo "📤 Publication sur NPM..."

# Sauvegarder le package.json original
cp package.json package-original.json

# Modifier temporairement le package.json pour NPM
sed -i '' 's/"@lorenzo-coslado\/fingerprinter-js"/"fingerprinter-js"/' package.json
sed -i '' '/"publishConfig"/,+2d' package.json

# Publier sur NPM
npm config set registry https://registry.npmjs.org
npm publish

# Restaurer le package.json original
mv package-original.json package.json

# Publication sur GitHub Packages (avec scope)
echo "📤 Publication sur GitHub Packages..."
npm config set registry https://npm.pkg.github.com
npm publish

# Restaurer le registre NPM par défaut
npm config set registry https://registry.npmjs.org

# Push des tags
echo "🏷️  Push des tags..."
git push origin main --tags

echo "✅ Publication terminée avec succès !"
echo "📦 NPM: https://www.npmjs.com/package/fingerprinter-js"
echo "📦 GitHub: https://github.com/Lorenzo-Coslado/fingerprinter-js/packages"
