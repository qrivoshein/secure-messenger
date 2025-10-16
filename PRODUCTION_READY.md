# 🚀 Secure Messenger - PRODUCTION LIVE

## ✅ СТАТУС: РАБОТАЕТ

### 🌐 URL
**https://piglio.online**

---

## ✨ ЧТО РАБОТАЕТ

### ✅ Frontend
- TypeScript без innerHTML (чистый DOM API)
- Production build оптимизирован
- HTTPS с SSL сертификатом
- Кеширование статики

### ✅ Backend API
- Endpoint: `https://piglio.online/api`
- JWT авторизация ✅
- Rate limiting ✅
- CORS настроен ✅

### ✅ WebSocket
- Endpoint: `wss://piglio.online/ws`
- Real-time чат ✅
- Auto-reconnect ✅
- Ping/pong heartbeat ✅

### ✅ База данных
- PostgreSQL: 18+ пользователей
- Redis: сессии и кеш
- Автозапуск ✅

### ✅ Инфраструктура
- Systemd сервис для backend
- Nginx reverse proxy
- SSL/HTTPS (Let's Encrypt)
- Все сервисы в автозапуске

---

## 🔧 КОНФИГУРАЦИЯ

### Environment Variables

**Frontend** (`/home/neightn81/secure-messenger/frontend/client/.env`):
```
VITE_API_URL=https://piglio.online
VITE_WS_URL=wss://piglio.online/ws
```

⚠️ **Важно**: `VITE_API_URL` БЕЗ `/api` суффикса, так как в коде эндпоинты уже содержат `/api/...`

**Backend** (`/home/neightn81/secure-messenger/backend/.env`):
```
PORT=3001
HOST=0.0.0.0
FRONTEND_URL=https://piglio.online
DB_USER=messenger_app
DB_NAME=secure_messenger
REDIS_HOST=localhost
```

### Nginx Config
- **Frontend**: Статика из `/home/neightn81/secure-messenger/frontend/dist`
- **API**: Proxy `/api/*` → `http://127.0.0.1:3001`
- **WebSocket**: Proxy `/ws` → `http://127.0.0.1:3001` (с upgrade)
- **Uploads**: Алиас `/uploads/` → backend uploads директория

---

## 📦 ОБНОВЛЕНИЕ

### Frontend
```bash
cd /home/neightn81/secure-messenger/frontend
# Отредактировать код
npm run build
systemctl reload nginx
```

### Backend
```bash
cd /home/neightn81/secure-messenger/backend
# Отредактировать код
systemctl restart secure-messenger-backend
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Регистрация
```bash
curl -X POST https://piglio.online/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","password":"password123"}'
```

### Логин
```bash
curl -X POST https://piglio.online/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}'
```

### Список пользователей (с токеном)
```bash
TOKEN="your_jwt_token_here"
curl https://piglio.online/api/users \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 МОНИТОРИНГ

```bash
# Статус сервисов
systemctl status secure-messenger-backend nginx postgresql redis-server

# Логи backend
journalctl -u secure-messenger-backend -f

# Логи nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Проверка подключений
netstat -tlnp | grep 3001

# База данных
sudo -u postgres psql -d secure_messenger -c "SELECT count(*) FROM users;"
```

---

## 🏗️ АРХИТЕКТУРА

```
Internet
    ↓
Nginx :443 (SSL)
    ├── GET / → Frontend Static (dist/)
    ├── POST /api/* → Backend :3001 (Express API)
    ├── WS /ws → Backend :3001 (WebSocket)
    └── GET /uploads/* → Static Files
         ↓
Backend :3001 (Node.js)
    ├── PostgreSQL :5432 (users, messages)
    ├── Redis :6379 (sessions, cache)
    └── WebSocket Server (real-time)
```

---

## ✨ ОСОБЕННОСТИ

1. **Чистый TypeScript** - 0 HTML в коде
2. **Production-ready** - systemd, auto-restart, logging
3. **Secure** - HTTPS, JWT, rate limiting, trust proxy
4. **Real-time** - WebSocket с auto-reconnect
5. **Scalable** - Redis для сессий, PostgreSQL для данных

---

**Дата**: 2025-10-16  
**Разработчик**: Droid (Factory AI)  
**Версия**: 1.0.0
