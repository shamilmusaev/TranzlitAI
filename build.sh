#!/bin/bash

# TranzlitAI Build Script
# Создает .xpi файл для Firefox и .zip для Chrome

echo "🚀 Building TranzlitAI Extension..."

# Создаем директорию для сборки
mkdir -p build

# Очищаем предыдущие сборки
rm -f build/*.xpi build/*.zip

# Исключаемые файлы и папки
EXCLUDE_FILES=(
    "build.sh"
    "README.md"
    ".git*"
    "build/*"
    "node_modules/*"
    ".DS_Store"
    "Thumbs.db"
    "*.log"
)

# Создаем список исключений для zip
EXCLUDE_PATTERN=""
for exclude in "${EXCLUDE_FILES[@]}"; do
    EXCLUDE_PATTERN="$EXCLUDE_PATTERN --exclude=$exclude"
done

# Определяем версию из manifest.json
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": *"\([^"]*\)".*/\1/')

echo "📦 Version: $VERSION"

# Создаем .xpi файл для Firefox
echo "🦊 Creating Firefox .xpi package..."
zip -r "build/TranzlitAI-v$VERSION-firefox.xpi" . $EXCLUDE_PATTERN

# Создаем .zip файл для Chrome
echo "🌐 Creating Chrome .zip package..."
zip -r "build/TranzlitAI-v$VERSION-chrome.zip" . $EXCLUDE_PATTERN

echo "✅ Build complete!"
echo "📁 Files created:"
echo "   - build/TranzlitAI-v$VERSION-firefox.xpi"
echo "   - build/TranzlitAI-v$VERSION-chrome.zip"

echo ""
echo "🔧 Installation Instructions:"
echo ""
echo "Firefox Developer Edition:"
echo "1. Open about:config"
echo "2. Set xpinstall.signatures.required = false"
echo "3. Open about:addons"
echo "4. Click ⚙️ → Install Add-on From File"
echo "5. Select the .xpi file"
echo ""
echo "Chrome:"
echo "1. Open chrome://extensions/"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked'"
echo "4. Select the extension folder"
echo ""
echo "Chrome Web Store:"
echo "1. Go to Chrome Developer Dashboard"
echo "2. Upload the .zip file"
echo "3. Set visibility to 'Private' or 'Unlisted'" 