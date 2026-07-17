#!/bin/bash

set -e

# Always run from the project root, even when the script is invoked elsewhere.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Load NVM when Node.js is installed through NVM but is not yet on PATH.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if ! command -v node >/dev/null 2>&1; then
    if [ -s "/opt/homebrew/opt/nvm/libexec/nvm.sh" ]; then
        source "/opt/homebrew/opt/nvm/libexec/nvm.sh"
    elif [ -s "$NVM_DIR/nvm.sh" ]; then
        source "$NVM_DIR/nvm.sh"
    fi
fi

echo "=========================================="
echo "   ReCode - Professional Coding Notebook"
echo "=========================================="

if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js is not available. Install Node.js 20+ or run 'nvm use' first."
    exit 1
fi

echo "[1/3] Installing and checking dependencies..."
npm install

if [ ! -f ".env" ]; then
    echo "Creating local environment configuration..."
    printf 'DATABASE_URL="file:./dev.db"\n' > .env
fi

echo "[2/3] Generating Prisma Client and syncing the database..."
npx prisma generate
npx prisma db push

echo "[3/3] Launching ReCode..."
echo "Please visit: http://localhost:3000"

if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux (Ubuntu, Debian, etc.)
  xdg-open http://localhost:3000 &> /dev/null &
fi

npm run dev
