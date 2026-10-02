#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "=================================================="
echo " Starting CaseIntel Legal DMS & Intelligence Suite"
echo "=================================================="

# 1. Start AI Microservice (Port 8000)
echo "[1/3] Starting Python FastAPI AI Microservice on :8000..."
cd "$PROJECT_ROOT/AI"
.venv/bin/uvicorn api:app --host 127.0.0.1 --port 8000 &
AI_PID=$!

# 2. Start Node.js API & Secure Vault Gateway (Port 3001)
echo "[2/3] Starting Node.js API Gateway & Secure Vault on :3001..."
cd "$PROJECT_ROOT/BACKEND/node-service"
PORT=3001 AI_SERVICE_URL="http://127.0.0.1:8000" node server.js &
NODE_PID=$!

# 3. Start Next.js Frontend (Port 3000)
echo "[3/3] Starting Next.js Frontend on :3000..."
cd "$PROJECT_ROOT/FRONTEND"
npx next dev --webpack -p 3000 &
NEXT_PID=$!

echo "=================================================="
echo " CaseIntel Services Running:"
echo " - Next.js Frontend: http://localhost:3000"
echo " - Node.js API & Vault: http://localhost:3001 (Health: http://localhost:3001/api/v1/health)"
echo " - AI Microservice: http://localhost:8000 (Health: http://localhost:8000/health)"
echo "=================================================="
echo "Press Ctrl+C to stop all services."

trap "kill $AI_PID $NODE_PID $NEXT_PID 2>/dev/null || true; exit 0" SIGINT SIGTERM

wait
