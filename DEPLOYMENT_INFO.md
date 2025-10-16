# 🚀 Secure Messenger - Production Deployment

## ✅ СТАТУС: РАБОТАЕТ

### 🌐 Доступ
- **Frontend**: https://piglio.online
- **API**: https://piglio.online/api
- **WebSocket**: wss://piglio.online

### 🏗️ Архитектура

**Frontend (TypeScript + Vite)**
- Путь: `/home/neightn81/secure-messenger/frontend/dist`
- Чистый TypeScript без innerHTML
- Все компоненты на DOM API
- Production build оптимизирован

**Backend (Node.js + Express + WebSocket)**
- Путь: `/home/neightn81/secure-messenger/backend`
- Systemd service: `secure-messenger-backend.service`
- Порт: 3001 (внутренний)
- Автозапуск при перезагрузке: ✅

**Nginx**
- Конфиг: `/etc/nginx/sites-available/piglio.online`
- Reverse proxy для API (/api → :3001)
- WebSocket proxy (/ws → :3001)
- Статика frontend напрямую
- SSL/HTTPS: Let's Encrypt ✅

**База данных**
- PostgreSQL: 18 пользователей
- Redis: кеш и сессии
- Автозапуск: ✅

### 🔧 Управление

**Backend сервис**
```bash
# Статус
systemctl status secure-messenger-backend

# Перезапуск
systemctl restart secure-messenger-backend

# Логи
journalctl -u secure-messenger-backend -f

# Остановка
systemctl stop secure-messenger-backend
```

**Nginx**
```bash
# Перезагрузка
systemctl reload nginx

# Проверка конфига
nginx -t

# Логи
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 📦 Обновление

**Frontend**
```bash
cd /home/neightn81/secure-messenger/frontend
# Редактировать .env если нужно
npm run build
# Перезагрузить nginx
systemctl reload nginx
```

**Backend**
```bash
cd /home/neightn81/secure-messenger/backend
# Редактировать .env если нужно
systemctl restart secure-messenger-backend
```

### 🔐 Переменные окружения

**Backend** (`/home/neightn81/secure-messenger/backend/.env`):
```
DB_USER=messenger_app
DB_HOST=localhost
DB_NAME=secure_messenger
DB_PASSWORD=<your_database_password>
DB_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3001
HOST=0.0.0.0
FRONTEND_URL=https://piglio.online
```

**Frontend** (`/home/neightn81/secure-messenger/frontend/.env`):
```
VITE_API_URL=https://piglio.online/api
VITE_WS_URL=wss://piglio.online
```

### ✨ Особенности

1. **Чистый TypeScript** - 0 HTML в коде, только DOM API
2. **Продакшн-ready** - systemd автозапуск, логирование, graceful shutdown
3. **Безопасность** - HTTPS, JWT auth, rate limiting, trust proxy
4. **Real-time** - WebSocket для мгновенных сообщений
5. **Производительность** - кеширование статики, Redis для сессий

### 🧪 Тестирование

```bash
# Регистрация
curl -X POST https://piglio.online/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"your_password"}'

# Логин
curl -X POST https://piglio.online/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"your_password"}'

# Проверка frontend
curl -I https://piglio.online
```

### 📊 Мониторинг

```bash
# Все сервисы
systemctl status secure-messenger-backend nginx postgresql redis-server

# Использование порта
netstat -tlnp | grep 3001

# Процессы
ps aux | grep node

# База данных
sudo -u postgres psql -d secure_messenger -c "SELECT count(*) FROM users;"
```

---
**Дата деплоя**: 2025-10-16  
**Разработчик**: Droid (Factory AI)
