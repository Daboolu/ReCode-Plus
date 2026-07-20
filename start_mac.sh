#!/bin/bash

set -e
set -o pipefail

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
echo "   RecallAgent - Memory-Aware Coding Review"
echo "=========================================="

if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js is not available. Install Node.js 20+ or run 'nvm use' first."
    exit 1
fi

FORCE_SETUP="${RECALL_AGENT_FORCE_SETUP:-false}"
if [ "${1:-}" = "--setup" ]; then
    FORCE_SETUP="true"
    shift
fi

if [ "$#" -gt 0 ]; then
    echo "[ERROR] Unknown option: $1"
    echo "        Usage: ./start_mac.sh [--setup]"
    exit 1
fi

case "$FORCE_SETUP" in
    1|true|TRUE|yes|YES)
        FORCE_SETUP="true"
        ;;
    *)
        FORCE_SETUP="false"
        ;;
esac

make_fingerprint() {
    (
        for file_path in "$@"; do
            if [ -f "$file_path" ]; then
                cksum "$file_path"
            else
                printf 'missing:%s\n' "$file_path"
            fi
        done
    ) | cksum | awk '{ print $1 "-" $2 }'
}

stamp_matches() {
    local stamp_path="$1"
    local expected_value="$2"
    local saved_value=""

    [ -f "$stamp_path" ] || return 1
    IFS= read -r saved_value < "$stamp_path" || true
    [ "$saved_value" = "$expected_value" ]
}

write_stamp() {
    local stamp_path="$1"
    local stamp_value="$2"
    local temporary_path="${stamp_path}.tmp.$$"

    mkdir -p "$(dirname "$stamp_path")"
    printf '%s\n' "$stamp_value" > "$temporary_path"
    mv "$temporary_path" "$stamp_path"
}

NODE_ABI="$(node -p '[process.platform, process.arch, process.versions.modules].join("-")')"
DEPENDENCY_KEY="$(make_fingerprint package.json package-lock.json)-$NODE_ABI"
CACHE_DIR="node_modules/.cache/recall-agent"
DEPENDENCY_STAMP="$CACHE_DIR/dependencies"
DEPENDENCIES_UPDATED="false"

echo "[1/4] Checking dependencies..."
if [ "$FORCE_SETUP" = "true" ] || \
   [ ! -x "node_modules/.bin/next" ] || \
   [ ! -x "node_modules/.bin/prisma" ] || \
   ! stamp_matches "$DEPENDENCY_STAMP" "$DEPENDENCY_KEY"; then
    echo "Installing dependencies (first run or package files changed)..."
    npm install --prefer-offline --no-audit --no-fund
    DEPENDENCIES_UPDATED="true"
    DEPENDENCY_KEY="$(make_fingerprint package.json package-lock.json)-$NODE_ABI"
    write_stamp "$DEPENDENCY_STAMP" "$DEPENDENCY_KEY"
else
    echo "Dependencies are unchanged; skipping npm install."
fi

ENV_CREATED="false"
if [ ! -f ".env" ]; then
    echo "Creating local environment configuration..."
    cp .env.example .env
    ENV_CREATED="true"
fi

# Read only the Agent-related keys needed by this launcher. Next.js reads the
# complete .env file itself. Values already exported by the caller take priority.
read_env_value() {
    local key="$1"
    local value

    value="$(sed -n "s/^${key}=//p" .env | tail -n 1)"
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    printf '%s' "$value"
}

if [ -z "${AGENT_PROVIDER+x}" ]; then
    AGENT_PROVIDER="$(read_env_value AGENT_PROVIDER)"
fi
if [ -z "${AGENT_BASE_URL+x}" ]; then
    AGENT_BASE_URL="$(read_env_value AGENT_BASE_URL)"
fi
if [ -z "${AGENT_API_KEY+x}" ]; then
    AGENT_API_KEY="$(read_env_value AGENT_API_KEY)"
fi
if [ -z "${AGENT_MODEL+x}" ]; then
    AGENT_MODEL="$(read_env_value AGENT_MODEL)"
fi
if [ -z "${OLLAMA_BASE_URL+x}" ]; then
    OLLAMA_BASE_URL="$(read_env_value OLLAMA_BASE_URL)"
fi
if [ -z "${OLLAMA_MODEL+x}" ]; then
    OLLAMA_MODEL="$(read_env_value OLLAMA_MODEL)"
fi
if [ -z "${AGENT_MOCK_MODE+x}" ]; then
    AGENT_MOCK_MODE="$(read_env_value AGENT_MOCK_MODE)"
fi
if [ -z "${DATABASE_URL+x}" ]; then
    DATABASE_URL="$(read_env_value DATABASE_URL)"
fi

OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://localhost:11434}"
OLLAMA_BASE_URL="${OLLAMA_BASE_URL%/}"
AGENT_PROVIDER="${AGENT_PROVIDER:-ollama}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5-coder:7b}"
AGENT_MOCK_MODE="${AGENT_MOCK_MODE:-false}"
DATABASE_URL="${DATABASE_URL:-file:./dev.db}"
export AGENT_PROVIDER AGENT_BASE_URL AGENT_API_KEY AGENT_MODEL
export OLLAMA_BASE_URL OLLAMA_MODEL AGENT_MOCK_MODE DATABASE_URL

sqlite_database_exists() {
    local database_path

    case "$DATABASE_URL" in
        file:*)
            database_path="${DATABASE_URL#file:}"
            database_path="${database_path%%\?*}"
            case "$database_path" in
                /*)
                    ;;
                *)
                    # Relative SQLite URLs are resolved from the Prisma schema.
                    database_path="$SCRIPT_DIR/prisma/$database_path"
                    ;;
            esac
            [ -f "$database_path" ]
            ;;
        *)
            # This project uses SQLite. For any future non-file datasource,
            # rely on the configuration fingerprint instead of a file check.
            return 0
            ;;
    esac
}

PRISMA_URL_KEY="$(printf '%s' "$DATABASE_URL" | cksum | awk '{ print $1 "-" $2 }')"
PRISMA_KEY="$(make_fingerprint prisma/schema.prisma prisma.config.ts node_modules/prisma/package.json node_modules/@prisma/client/package.json)-$PRISMA_URL_KEY"
PRISMA_STAMP="$CACHE_DIR/prisma"
PRISMA_CLIENT="node_modules/.prisma/client/index.js"

echo "[2/4] Checking Prisma Client and database..."
if [ "$FORCE_SETUP" = "true" ] || \
   [ "$ENV_CREATED" = "true" ] || \
   ! sqlite_database_exists || \
   ! stamp_matches "$PRISMA_STAMP" "$PRISMA_KEY"; then
    echo "Syncing the database (first run or Prisma configuration changed)..."
    # db push also generates Prisma Client, so a separate generate would be duplicate work.
    ./node_modules/.bin/prisma db push
    write_stamp "$PRISMA_STAMP" "$PRISMA_KEY"
elif [ "$DEPENDENCIES_UPDATED" = "true" ] || [ ! -f "$PRISMA_CLIENT" ]; then
    echo "Regenerating Prisma Client..."
    ./node_modules/.bin/prisma generate --no-hints
    write_stamp "$PRISMA_STAMP" "$PRISMA_KEY"
else
    echo "Prisma Client and database are unchanged; skipping setup."
fi

echo "[3/4] Checking the local review Agent..."

ollama_is_ready() {
    command -v curl >/dev/null 2>&1 && \
        curl --connect-timeout 1 --max-time 2 --fail --silent \
        "$OLLAMA_BASE_URL/api/tags" >/dev/null 2>&1
}

ollama_has_model() {
    local tags_file

    tags_file="${TMPDIR:-/tmp}/recall-agent-ollama-tags-$$.json"
    if ! curl --connect-timeout 1 --max-time 5 --fail --silent \
        "$OLLAMA_BASE_URL/api/tags" -o "$tags_file"; then
        return 1
    fi

    if grep -Fq "\"name\":\"$OLLAMA_MODEL\"" "$tags_file" || \
        grep -Fq "\"model\":\"$OLLAMA_MODEL\"" "$tags_file"; then
        rm -f "$tags_file"
        return 0
    fi

    rm -f "$tags_file"
    return 1
}

ollama_url_is_local() {
    case "$OLLAMA_BASE_URL" in
        http://localhost:*|https://localhost:*|http://127.0.0.1:*|https://127.0.0.1:*)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

install_ollama() {
    if command -v ollama >/dev/null 2>&1; then
        return 0
    fi

    if ! command -v curl >/dev/null 2>&1; then
        echo "[WARN] Ollama cannot be installed automatically because curl is unavailable."
        return 1
    fi

    echo "Ollama is not installed. Downloading the official Ollama installer..."
    echo "This installs the local runtime (about 560 MB after installation)."

    if curl -fsSL https://ollama.com/install.sh | sh; then
        hash -r
    else
        echo "[WARN] The Ollama installer failed."
        return 1
    fi

    # The official macOS installer places the CLI inside the application and
    # normally creates a command-line link. Keep the app binary as a fallback.
    if ! command -v ollama >/dev/null 2>&1 && \
       [ -x "/Applications/Ollama.app/Contents/Resources/ollama" ]; then
        export PATH="/Applications/Ollama.app/Contents/Resources:$PATH"
    fi

    command -v ollama >/dev/null 2>&1
}

start_ollama_service() {
    local attempt=0

    if ollama_is_ready; then
        return 0
    fi

    OLLAMA_LOG="${TMPDIR:-/tmp}/recall-agent-ollama.log"
    echo "Starting the local Ollama service..."
    ollama serve >"$OLLAMA_LOG" 2>&1 &

    while [ "$attempt" -lt 10 ]; do
        if ollama_is_ready; then
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done

    return 1
}

download_ollama_model() {
    echo "Model '$OLLAMA_MODEL' is not installed. Downloading it now..."
    case "$OLLAMA_MODEL" in
        qwen2.5-coder:7b|qwen2.5-coder:7b-instruct)
            echo "The model download is about 4.7 GB and supports resume."
            ;;
        *)
            echo "The download size depends on the configured model."
            ;;
    esac

    if ollama pull "$OLLAMA_MODEL"; then
        echo "Model download completed: $OLLAMA_MODEL"
        return 0
    fi

    echo "[WARN] Model download was interrupted or failed."
    echo "       Run ./start_mac.sh again to resume the download."
    return 1
}

if [[ "$AGENT_MOCK_MODE" == "true" ]]; then
    echo "Agent mock mode is enabled; Ollama is not required."
elif [[ "$AGENT_PROVIDER" == "openai-compatible" ]]; then
    if [ -z "$AGENT_BASE_URL" ] || [ -z "$AGENT_API_KEY" ] || [ -z "$AGENT_MODEL" ]; then
        echo "[WARN] Remote Agent mode requires AGENT_BASE_URL, AGENT_API_KEY, and AGENT_MODEL."
        echo "       Update .env; the regular app will still start."
    else
        echo "Remote Agent configured: $AGENT_MODEL at $AGENT_BASE_URL"
        echo "Ollama setup is skipped in remote mode."
    fi
elif [[ "$AGENT_PROVIDER" != "ollama" ]]; then
    echo "[WARN] AGENT_PROVIDER must be 'ollama' or 'openai-compatible'."
elif ! ollama_url_is_local; then
    echo "[WARN] OLLAMA_BASE_URL must point to localhost for this local-only Agent."
    echo "       Current value: $OLLAMA_BASE_URL"
    echo "       The regular app will still start; the Agent will report unavailable."
elif install_ollama; then
    if start_ollama_service; then
        if ollama_has_model; then
            echo "Ollama is ready with model: $OLLAMA_MODEL"
        elif download_ollama_model; then
            echo "Ollama is ready with model: $OLLAMA_MODEL"
        else
            echo "       Or set AGENT_MOCK_MODE=\"true\" in .env for UI development."
        fi
    else
        echo "[WARN] Ollama did not become ready at $OLLAMA_BASE_URL."
        echo "       The regular app will still start; the Agent will report unavailable."
        echo "       Ollama log: $OLLAMA_LOG"
    fi
else
    echo "[WARN] Ollama is not installed or could not be installed automatically."
    echo "       The regular app will still start; the Agent will report unavailable."
    echo "       Install it manually from https://ollama.com/download/mac"
    echo "       Or set AGENT_MOCK_MODE=\"true\" in .env for UI development."
fi

PORT="${PORT:-3000}"
APP_URL="http://localhost:$PORT"

echo "[4/4] Launching RecallAgent..."
echo "The development server stays active in this terminal. Press Control+C to stop."

if command -v lsof >/dev/null 2>&1 && \
   lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[ERROR] Port $PORT is already in use."
    echo "        If RecallAgent is already running, visit: $APP_URL"
    echo "        Otherwise stop the process using that port and try again."
    exit 1
fi

open_app() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$APP_URL" >/dev/null 2>&1 || true
    elif [[ "$OSTYPE" == "linux-gnu"* ]] && command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$APP_URL" >/dev/null 2>&1 || true
    fi
}

wait_for_app() {
    local attempt=0

    if ! command -v curl >/dev/null 2>&1; then
        sleep 2
        open_app
        return
    fi

    while [ "$attempt" -lt 60 ]; do
        if curl --connect-timeout 1 --max-time 1 --fail --silent \
            "$APP_URL" >/dev/null 2>&1; then
            echo "[READY] RecallAgent is available at: $APP_URL"
            open_app
            return
        fi
        attempt=$((attempt + 1))
        sleep 0.5
    done

    echo "[WARN] The browser was not opened because RecallAgent did not respond within 30 seconds."
}

# Keep Next.js in the foreground so Control+C still stops it normally. Only the
# small browser-opening helper runs in the background.
wait_for_app &
READY_WAITER_PID=$!

cleanup_ready_waiter() {
    local running_pid

    for running_pid in $(jobs -pr); do
        if [ "$running_pid" = "$READY_WAITER_PID" ]; then
            kill "$READY_WAITER_PID" >/dev/null 2>&1 || true
            break
        fi
    done
}

trap cleanup_ready_waiter EXIT

npm run dev -- --port "$PORT"
