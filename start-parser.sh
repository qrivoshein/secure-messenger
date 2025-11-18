#!/bin/bash

# Start all services for Document Parser

echo "🚀 Starting Document Parser Services..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Start Python microservice
echo -e "${YELLOW}[1/3]${NC} Starting Python microservice..."
cd document-parser
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

# Start in background
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
PYTHON_PID=$!
echo -e "${GREEN}✓${NC} Python service started (PID: $PYTHON_PID) - http://localhost:8000"
cd ..

# Wait for Python service to start
sleep 3

# 2. Start Backend (if not running)
echo -e "\n${YELLOW}[2/3]${NC} Checking Backend..."
if ! lsof -i :3001 > /dev/null; then
    echo "Installing backend dependencies..."
    cd backend
    npm install axios form-data 2>&1 | grep -v "^npm WARN"
    
    echo "Starting backend..."
    npm run dev &
    BACKEND_PID=$!
    echo -e "${GREEN}✓${NC} Backend started (PID: $BACKEND_PID) - http://localhost:3001"
    cd ..
else
    echo -e "${GREEN}✓${NC} Backend already running on port 3001"
fi

# Wait for backend to start
sleep 3

# 3. Start Frontend (if not running)
echo -e "\n${YELLOW}[3/3]${NC} Checking Frontend..."
if ! lsof -i :5173 > /dev/null; then
    echo "Starting frontend..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    echo -e "${GREEN}✓${NC} Frontend started (PID: $FRONTEND_PID) - http://localhost:5173"
    cd ..
else
    echo -e "${GREEN}✓${NC} Frontend already running on port 5173"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ All services started!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Services:"
echo "  📄 Python Parser:  http://localhost:8000"
echo "  🔧 Backend API:    http://localhost:3001"
echo "  🎨 Frontend:       http://localhost:5173"
echo ""
echo "Health checks:"
echo "  Python:  curl http://localhost:8000/health"
echo "  Backend: curl http://localhost:3001/api/parser/health"
echo ""
echo "Press Ctrl+C to stop all services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Wait for Ctrl+C
trap "echo -e '\n\n${YELLOW}Stopping services...${NC}'; kill $PYTHON_PID 2>/dev/null; exit" INT
wait
