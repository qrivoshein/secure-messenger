#!/bin/bash

# Deploy Document Parser to Production (piglio.online)
# Run this script ON THE PRODUCTION SERVER

set -e  # Exit on error

echo "🚀 Deploying Document Parser to Production..."
echo "Server: piglio.online"
echo "Path: /home/neightn81/secure-messenger"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as correct user
if [ "$USER" != "neightn81" ]; then
    echo -e "${RED}⚠️  Please run this as user 'neightn81'${NC}"
    echo "Try: sudo -u neightn81 bash $0"
    exit 1
fi

# Navigate to project directory
cd /home/neightn81/secure-messenger

echo -e "${YELLOW}[1/10]${NC} Pulling latest code from GitHub..."
git pull origin main || {
    echo -e "${RED}✗ Git pull failed${NC}"
    echo "You may need to manually update the code"
    exit 1
}
echo -e "${GREEN}✓${NC} Code updated"

# Install Python and dependencies
echo -e "\n${YELLOW}[2/10]${NC} Installing Python dependencies..."
cd document-parser

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python 3 not found${NC}"
    echo "Installing Python 3..."
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip python3-venv
fi

# Install system dependencies
echo "Installing system dependencies..."
sudo apt-get install -y libmagic1

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate and install Python packages
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✓${NC} Python dependencies installed"

cd ..

# Update Backend
echo -e "\n${YELLOW}[3/10]${NC} Updating Backend..."
cd backend

# Install new dependencies
npm install axios form-data
echo -e "${GREEN}✓${NC} Backend dependencies installed"

# Build TypeScript
echo "Building Backend..."
npm run build
echo -e "${GREEN}✓${NC} Backend built"

cd ..

# Update Frontend
echo -e "\n${YELLOW}[4/10]${NC} Updating Frontend..."
cd frontend

# Build
echo "Building Frontend..."
npm run build
echo -e "${GREEN}✓${NC} Frontend built"

cd ..

# Update Backend .env
echo -e "\n${YELLOW}[5/10]${NC} Updating Backend environment..."
if ! grep -q "PARSER_SERVICE_URL" backend/.env; then
    echo "PARSER_SERVICE_URL=http://localhost:8000" >> backend/.env
    echo -e "${GREEN}✓${NC} Added PARSER_SERVICE_URL to backend/.env"
else
    echo -e "${GREEN}✓${NC} PARSER_SERVICE_URL already configured"
fi

# Create systemd service for Python microservice
echo -e "\n${YELLOW}[6/10]${NC} Creating systemd service for Document Parser..."

sudo tee /etc/systemd/system/document-parser.service > /dev/null <<EOF
[Unit]
Description=Document Parser Microservice
After=network.target

[Service]
Type=simple
User=neightn81
WorkingDirectory=/home/neightn81/secure-messenger/document-parser
Environment="PATH=/home/neightn81/secure-messenger/document-parser/venv/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/home/neightn81/secure-messenger/document-parser/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓${NC} Systemd service created"

# Reload systemd
echo -e "\n${YELLOW}[7/10]${NC} Reloading systemd..."
sudo systemctl daemon-reload
echo -e "${GREEN}✓${NC} Systemd reloaded"

# Enable and start Document Parser service
echo -e "\n${YELLOW}[8/10]${NC} Starting Document Parser service..."
sudo systemctl enable document-parser
sudo systemctl restart document-parser

# Wait for service to start
sleep 3

# Check status
if sudo systemctl is-active --quiet document-parser; then
    echo -e "${GREEN}✓${NC} Document Parser service started"
else
    echo -e "${RED}✗ Document Parser service failed to start${NC}"
    echo "Check logs: sudo journalctl -u document-parser -n 50"
fi

# Update Nginx configuration
echo -e "\n${YELLOW}[9/10]${NC} Updating Nginx configuration..."

# Backup current config
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Add parser proxy to nginx config if not exists
if ! sudo grep -q "location /parser" /etc/nginx/sites-available/default; then
    echo "Adding parser proxy to Nginx..."
    
    # Insert before the closing brace of server block
    sudo sed -i '/location \/ws {/i \    # Document Parser Proxy\n    location /parser/ {\n        proxy_pass http://127.0.0.1:8000/;\n        proxy_http_version 1.1;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        client_max_body_size 100M;\n    }\n' /etc/nginx/sites-available/default
    
    echo -e "${GREEN}✓${NC} Nginx configuration updated"
else
    echo -e "${GREEN}✓${NC} Nginx already configured for parser"
fi

# Test Nginx configuration
echo "Testing Nginx configuration..."
if sudo nginx -t; then
    echo -e "${GREEN}✓${NC} Nginx configuration valid"
else
    echo -e "${RED}✗ Nginx configuration invalid${NC}"
    echo "Restoring backup..."
    sudo cp /etc/nginx/sites-available/default.backup /etc/nginx/sites-available/default
    exit 1
fi

# Reload Nginx
echo "Reloading Nginx..."
sudo systemctl reload nginx
echo -e "${GREEN}✓${NC} Nginx reloaded"

# Restart Backend
echo -e "\n${YELLOW}[10/10]${NC} Restarting Backend..."
sudo systemctl restart secure-messenger-backend

# Wait for backend to start
sleep 3

if sudo systemctl is-active --quiet secure-messenger-backend; then
    echo -e "${GREEN}✓${NC} Backend restarted"
else
    echo -e "${RED}✗ Backend failed to restart${NC}"
    echo "Check logs: sudo journalctl -u secure-messenger-backend -n 50"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ Deployment Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Services Status:"
echo "  📄 Document Parser:  $(sudo systemctl is-active document-parser)"
echo "  🔧 Backend:          $(sudo systemctl is-active secure-messenger-backend)"
echo "  🌐 Nginx:            $(sudo systemctl is-active nginx)"
echo ""
echo "URLs:"
echo "  Parser API:  https://piglio.online/parser/health"
echo "  Backend API: https://piglio.online/api/parser/health"
echo "  Frontend:    https://piglio.online"
echo ""
echo "Testing..."
echo "  Parser:  curl http://localhost:8000/health"
echo "  Backend: curl http://localhost:3001/api/parser/health"
echo ""
echo "Logs:"
echo "  Parser:  sudo journalctl -u document-parser -f"
echo "  Backend: sudo journalctl -u secure-messenger-backend -f"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run health checks
echo ""
echo "Running health checks..."

# Check Python service
if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✓${NC} Python service responding"
else
    echo -e "${RED}✗${NC} Python service not responding"
fi

# Check Backend proxy
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✓${NC} Backend responding"
else
    echo -e "${RED}✗${NC} Backend not responding"
fi

echo ""
echo -e "${GREEN}🎉 Document Parser deployed successfully!${NC}"
echo "Visit https://piglio.online to test"
