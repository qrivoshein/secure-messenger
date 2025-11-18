# 🚀 Production Deployment Guide

## Деплой Document Parser на piglio.online

---

## Вариант 1: Через GitHub (Рекомендуется)

### 1. Запушить код на GitHub

**Локально:**
```bash
cd /Users/eq/secure-messenger

# Если еще не запушено
git push origin main
```

**На сервере:**
```bash
ssh neightn81@piglio.online

cd /home/neightn81/secure-messenger

# Подтянуть изменения
git pull origin main

# Запустить deployment скрипт
bash deploy-parser-to-production.sh
```

---

## Вариант 2: Через архив (Альтернатива)

Если GitHub недоступен, можно передать изменения через архив.

### 1. Создать архив изменений

**Локально:**
```bash
cd /Users/eq/secure-messenger

# Создать архив только новых файлов
tar -czf document-parser-deploy.tar.gz \
  document-parser/ \
  backend/src/controllers/parser.controller.ts \
  backend/src/routes/parser.routes.ts \
  backend/src/services/document-parser.service.ts \
  backend/src/routes/index.ts \
  backend/package.json \
  backend/.env.example \
  frontend/client/src/components/DocumentParser.ts \
  frontend/client/src/styles/document-parser.css \
  frontend/client/src/app.ts \
  frontend/client/src/utils/icons.ts \
  frontend/client/index.html \
  deploy-parser-to-production.sh \
  DOCUMENT_PARSER_README.md

echo "✓ Archive created: document-parser-deploy.tar.gz"
```

### 2. Передать на сервер

```bash
# Передать через SCP
scp document-parser-deploy.tar.gz neightn81@piglio.online:/home/neightn81/

# Или через другой метод (rsync, FTP, etc.)
```

### 3. Развернуть на сервере

```bash
ssh neightn81@piglio.online

cd /home/neightn81/secure-messenger

# Распаковать архив
tar -xzf ../document-parser-deploy.tar.gz

# Запустить deployment
bash deploy-parser-to-production.sh
```

---

## Вариант 3: Ручной деплой (Пошагово)

Если автоматический скрипт не работает:

### 1. Подключиться к серверу

```bash
ssh neightn81@piglio.online
cd /home/neightn81/secure-messenger
```

### 2. Обновить код (если через Git)

```bash
git pull origin main
```

### 3. Установить Python зависимости

```bash
cd document-parser

# Установить системные пакеты
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv libmagic1

# Создать виртуальное окружение
python3 -m venv venv
source venv/bin/activate

# Установить зависимости
pip install -r requirements.txt

cd ..
```

### 4. Обновить Backend

```bash
cd backend

# Установить новые зависимости
npm install axios form-data

# Собрать
npm run build

# Добавить env variable
echo "PARSER_SERVICE_URL=http://localhost:8000" >> .env

cd ..
```

### 5. Обновить Frontend

```bash
cd frontend
npm run build
cd ..
```

### 6. Создать systemd service для Python

```bash
sudo nano /etc/systemd/system/document-parser.service
```

**Вставить:**
```ini
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
```

**Сохранить:** Ctrl+O, Enter, Ctrl+X

### 7. Запустить Python сервис

```bash
sudo systemctl daemon-reload
sudo systemctl enable document-parser
sudo systemctl start document-parser

# Проверить статус
sudo systemctl status document-parser

# Проверить логи
sudo journalctl -u document-parser -n 50
```

### 8. Обновить Nginx

```bash
# Backup
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Редактировать конфиг
sudo nano /etc/nginx/sites-available/default
```

**Добавить перед `location /ws {`:**
```nginx
# Document Parser Proxy
location /parser/ {
    proxy_pass http://127.0.0.1:8000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 100M;
}
```

**Сохранить:** Ctrl+O, Enter, Ctrl+X

### 9. Протестировать и перезапустить Nginx

```bash
# Тест конфигурации
sudo nginx -t

# Если OK, перезапустить
sudo systemctl reload nginx
```

### 10. Перезапустить Backend

```bash
sudo systemctl restart secure-messenger-backend

# Проверить статус
sudo systemctl status secure-messenger-backend
```

---

## ✅ Проверка работы

### 1. Проверка сервисов

```bash
# Статус всех сервисов
sudo systemctl status document-parser
sudo systemctl status secure-messenger-backend
sudo systemctl status nginx
```

### 2. Health Checks

```bash
# Python service (локально на сервере)
curl http://localhost:8000/health

# Backend proxy (локально на сервере)
curl http://localhost:3001/api/parser/health

# Через Nginx (публично)
curl https://piglio.online/parser/health
```

### 3. Тест парсинга

**Создать тестовый файл:**
```bash
echo "Hello, Document Parser!" > /tmp/test.txt
```

**Загрузить через API:**
```bash
# Получить токен (залогиниться)
TOKEN=$(curl -s -X POST https://piglio.online/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}' | jq -r '.token')

# Отправить файл на парсинг
curl -X POST https://piglio.online/api/parser/parse \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test.txt"
```

### 4. Проверка в браузере

1. Открыть https://piglio.online
2. Залогиниться
3. Найти "Умный парсер 📑" вверху списка чатов
4. Нажать - должна открыться панель
5. Загрузить тестовый документ

---

## 🐛 Troubleshooting

### Python service не запускается

```bash
# Проверить логи
sudo journalctl -u document-parser -n 100 --no-pager

# Попробовать запустить вручную
cd /home/neightn81/secure-messenger/document-parser
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Проверить порт
sudo lsof -i :8000
```

### Backend не видит Python сервис

```bash
# Проверить .env
cat /home/neightn81/secure-messenger/backend/.env | grep PARSER

# Должно быть:
# PARSER_SERVICE_URL=http://localhost:8000

# Проверить доступность
curl http://localhost:8000/health

# Перезапустить backend
sudo systemctl restart secure-messenger-backend
```

### Nginx 502 Bad Gateway

```bash
# Проверить, что все сервисы запущены
sudo systemctl status document-parser secure-messenger-backend

# Проверить Nginx логи
sudo tail -f /var/log/nginx/error.log

# Проверить конфигурацию
sudo nginx -t
```

### Файлы не загружаются

```bash
# Проверить размер лимита в Nginx
sudo grep client_max_body_size /etc/nginx/sites-available/default

# Должно быть: client_max_body_size 100M;

# Проверить директории
ls -la /home/neightn81/secure-messenger/document-parser/temp
ls -la /home/neightn81/secure-messenger/document-parser/cache

# Создать если не существуют
mkdir -p /home/neightn81/secure-messenger/document-parser/temp
mkdir -p /home/neightn81/secure-messenger/document-parser/cache
chmod 755 /home/neightn81/secure-messenger/document-parser/temp
chmod 755 /home/neightn81/secure-messenger/document-parser/cache
```

---

## 📊 Мониторинг

### Логи в реальном времени

```bash
# Python service
sudo journalctl -u document-parser -f

# Backend
sudo journalctl -u secure-messenger-backend -f

# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Использование ресурсов

```bash
# Процессы
ps aux | grep uvicorn
ps aux | grep node

# Память
free -h

# Диск
df -h
```

---

## 🔄 Откат изменений (Rollback)

Если что-то пошло не так:

### 1. Остановить Python service

```bash
sudo systemctl stop document-parser
sudo systemctl disable document-parser
```

### 2. Восстановить Nginx

```bash
sudo cp /etc/nginx/sites-available/default.backup /etc/nginx/sites-available/default
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Откатить Backend

```bash
cd /home/neightn81/secure-messenger
git log --oneline -5
git checkout <previous-commit>

cd backend
npm run build
sudo systemctl restart secure-messenger-backend
```

---

## 📞 Контакты

**Разработчик:** Factory AI Droid  
**Дата:** 2025-11-18  
**Документация:** DOCUMENT_PARSER_README.md

---

**Удачного деплоя! 🚀**
