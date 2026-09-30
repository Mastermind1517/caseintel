#!/usr/bin/env bash
# ==============================================================================
# CASEINTEL - Full Stack Website Orchestrator
# Starts:
#   1. AI Document Intelligence Microservice (Port 8000)
#   2. Secure Legal DMS Backend & Vault API (Port 3001)
#   3. Next.js Frontend Dashboard (Port 3000)
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "--------------------------------------------------------"
echo "  🚀 Starting CASEINTEL Full-Stack System"
echo "  Root: ${PROJECT_ROOT}"
echo "--------------------------------------------------------"

# 1. Check AI Environment
echo "[1/3] Preparing AI Microservice (Port 8000)..."
AI_PYTHON="${PROJECT_ROOT}/AI/.venv/bin/python"
if [ ! -f "$AI_PYTHON" ]; then
    if command -v python3.11 &>/dev/null; then
        python3.11 -m venv "${PROJECT_ROOT}/AI/.venv"
    else
        python3 -m venv "${PROJECT_ROOT}/AI/.venv"
    fi
    "${AI_PYTHON}" -m pip install -r "${PROJECT_ROOT}/AI/requirements.txt"
fi

# 2. Check Backend Node Dependencies
echo "[2/3] Preparing Backend Storage & API Service (Port 3001)..."
if [ ! -d "${PROJECT_ROOT}/BACKEND/node-service/node_modules" ]; then
    echo "Installing backend node modules..."
    (cd "${PROJECT_ROOT}/BACKEND/node-service" && npm install)
fi

# 3. Check Frontend Node Dependencies
echo "[3/3] Preparing Next.js Frontend (Port 3000)..."
if [ ! -d "${PROJECT_ROOT}/FRONTEND/node_modules" ]; then
    echo "Installing frontend node modules..."
    (cd "${PROJECT_ROOT}/FRONTEND" && npm install)
fi

# Function to clean up on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down all CASEINTEL services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start AI Service
echo ""
echo "▶ Starting AI Service (Uvicorn on :8000)..."
(cd "${PROJECT_ROOT}/AI" && "${AI_PYTHON}" -m uvicorn api:app --host 127.0.0.1 --port 8000 --reload) &
AI_PID=$!

# Wait for AI service health check
echo "Waiting for AI service to become ready..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:8000/health >/dev/null 2>&1; then
        echo "✅ AI Service is READY on http://127.0.0.1:8000"
        break
    fi
    sleep 1
done

# Start Backend Service
echo ""
echo "▶ Starting Backend API & KMS Vault (:3001)..."
(cd "${PROJECT_ROOT}/BACKEND/node-service" && node server.js) &
BACKEND_PID=$!

# Wait for Backend service health check
echo "Waiting for Backend API to become ready..."
for i in {1..20}; do
    if curl -s http://127.0.0.1:3001/api/v1/health >/dev/null 2>&1; then
        echo "✅ Backend API is READY on http://127.0.0.1:3001"
        break
    fi
    sleep 1
done

# Start Frontend
echo ""
echo "▶ Starting Next.js Frontend (:3000)..."
echo "--------------------------------------------------------"
echo "  🌟 Access CASEINTEL Web Application: http://localhost:3000"
echo "  📄 AI Swagger Docs: http://localhost:8000/docs"
echo "  🔒 Backend Health API: http://localhost:3001/api/v1/health"
echo "--------------------------------------------------------"

(cd "${PROJECT_ROOT}/FRONTEND" && npm run dev)
