#!/usr/bin/env bash
set -e

# Usage: bash scripts/release.sh [version]
# Example: bash scripts/release.sh 1.0.0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

VERSION="$1"
if [ -z "$VERSION" ]; then
  VERSION=$(node -p "require('$ROOT_DIR/desktop/package.json').version")
fi

TAG="v${VERSION}"

echo "===================================================="
echo "🚀 RELEASING KALEVALA-ZERO $TAG"
echo "===================================================="

# 1. Build Client Web Assets
echo "📦 Step 1: Compiling Client TypeScript & Vite bundle..."
cd "$ROOT_DIR/client"
npm run build

# 2. Build Desktop Executable
echo "💻 Step 2: Compiling Desktop Windows Portable Executable..."
cd "$ROOT_DIR/desktop"
npm run build:exe

# 3. Commit any pending updates
cd "$ROOT_DIR"
if [ -n "$(git status --porcelain)" ]; then
  echo "📝 Committing pending changes..."
  git add .
  git commit -m "Release $TAG: latest game updates and build distribution"
fi

# 4. Push to GitHub main branch
echo "📤 Step 3: Pushing codebase to origin/main..."
git push origin main

# 5. Tag and Push Tag (Triggers GitHub Actions Release Workflow)
echo "🏷️ Step 4: Tagging $TAG and pushing tag..."
if git rev-parse "$TAG" >/dev/null 2>&1; then
  git tag -d "$TAG"
  git push origin :refs/tags/"$TAG" || true
fi

git tag -a "$TAG" -m "Kalevala Zero $TAG Release"
git push origin "$TAG"

# 6. Upload directly via GitHub CLI if authenticated
EXE_PATH="$ROOT_DIR/desktop/release/Kalevala-Zero-v${VERSION}.exe"
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  echo "🚀 Step 5: Uploading $EXE_PATH via GitHub CLI..."
  gh release create "$TAG" "$EXE_PATH" \
    --title "Kalevala Zero $TAG" \
    --notes "Official Windows Portable Release for Kalevala-Zero $TAG." \
    --clobber || true
else
  echo "ℹ️ Note: GitHub Actions is automatically building and attaching the Windows EXE on GitHub at:"
  echo "   https://github.com/honkamies/kalevala-zero/releases/tag/$TAG"
fi

echo "===================================================="
echo "✅ RELEASE $TAG COMPLETED SUCCESSFULLY!"
echo "===================================================="
