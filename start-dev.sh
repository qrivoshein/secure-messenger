#!/bin/bash

echo "Starting Secure Messenger Development Environment (TypeScript)"
echo "================================================================"
echo ""
echo "Starting Backend (TypeScript) on port 3001..."
cd /home/neightn81/secure-messenger/backend && npm run dev &
BACKEND_PID=$!

echo "Backend started (PID: $BACKEND_PID)"
echo ""
echo "Starting Frontend (TypeScript) on port 5173..."
cd /home/neightn81/secure-messenger/frontend && npm run dev &
FRONTEND_PID=$!

echo "Frontend started (PID: $FRONTEND_PID)"
echo ""
echo "=================================================="
echo "Development servers are running:"
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "=================================================="

wait
