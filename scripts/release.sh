#!/usr/bin/env bash
set -e

# Usage: bash scripts/release.sh [version|auto] [commit_message]
# Examples:
#   bash scripts/release.sh auto "Fixed boss projectiles and combat balance"
#   bash scripts/release.sh 1.0.1 "New level design"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

USER_VERSION="$1"
COMMIT_MSG="$2"

CURRENT_VERSION=$(node -p "require('$ROOT_DIR/desktop/package.json').version")

if [ -z "$USER_VERSION" ] || [ "$USER_VERSION" = "auto" ] || [ "$USER_VERSION" = "patch" ]; then
  # If tag already exists on git for the current version, automatically increment patch version
  if git rev-parse "v${CURRENT_VERSION}" >/dev/null 2>&1; then
    VERSION=$(node -e "
      const cur = '$CURRENT_VERSION';
      const p = cur.split('.').map(Number);
      p[2] = (p[2] || 0) + 1;
      console.log(p.join('.'));
    ")
  else
    VERSION="$CURRENT_VERSION"
  fi
else
  VERSION="$USER_VERSION"
fi

TAG="v${VERSION}"

echo "===================================================="
echo "🚀 RELEASING KALEVALA-ZERO $TAG (current was $CURRENT_VERSION)"
echo "===================================================="

# Sync package.json versions
node -e "
  const fs = require('fs');
  const files = ['$ROOT_DIR/package.json', '$ROOT_DIR/client/package.json', '$ROOT_DIR/desktop/package.json'];
  for (const f of files) {
    const pkg = JSON.parse(fs.readFileSync(f, 'utf8'));
    pkg.version = '$VERSION';
    fs.writeFileSync(f, JSON.stringify(pkg, null, 2) + '\n');
  }
"

# 1. Build Client Web Assets
echo "📦 Step 1: Compiling Client TypeScript & Vite bundle..."
cd "$ROOT_DIR/client"
npm run build

# 2. Build Desktop Executable (Local)
echo "💻 Step 2: Compiling Desktop Windows Portable Executable..."
cd "$ROOT_DIR/desktop"
npm run build:exe

# 3. Commit any pending updates
cd "$ROOT_DIR"
if [ -n "$(git status --porcelain)" ]; then
  MSG="${COMMIT_MSG:-Release $TAG: game updates and build distribution}"
  echo "📝 Committing pending changes: '$MSG'..."
  git add .
  git commit -m "$MSG"
fi

# 4. Push to GitHub main branch
echo "📤 Step 3: Pushing codebase to origin/main..."
git push origin main

# 5. Tag and Push Tag (Triggers GitHub Actions Release Workflow)
echo "🏷️ Step 4: Tagging $TAG and pushing tag..."
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists locally, updating..."
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
    --notes "${COMMIT_MSG:-Official Windows Portable Release for Kalevala-Zero $TAG.}" \
    --clobber || true
else
  echo "ℹ️ Note: GitHub Actions is automatically building and attaching the Windows EXE on GitHub at:"
  echo "   https://github.com/honkamies/kalevala-zero/releases/tag/$TAG"
fi

echo "===================================================="
echo "✅ RELEASE $TAG COMPLETED SUCCESSFULLY!"
echo "===================================================="
