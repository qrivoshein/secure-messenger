# Инструкция по запуску Secure Messenger

## Быстрый старт

### 1. Установка зависимостей

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Настройка окружения

#### Backend (.env)
```bash
cd backend
cp .env.example .env
# Отредактируйте .env с вашими настройками БД
```

#### Frontend (.env)
```bash
cd frontend
cp .env.example .env
# По умолчанию настроено для локальной разработки
```

### 3. Инициализация БД

```bash
cd backend

# Создайте БД PostgreSQL
psql -U postgres
CREATE DATABASE secure_messenger;
CREATE USER messenger_app WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE secure_messenger TO messenger_app;
\q

# Запустите миграции
psql -U messenger_app -d secure_messenger -f init.sql
```

### 4. Запуск приложения

#### Вариант 1: Автоматический запуск (рекомендуется для разработки)

```bash
# Из корневой директории проекта
./start-dev.sh
```

Это запустит:
- Backend на http://localhost:3001
- Frontend на http://localhost:5173

#### Вариант 2: Ручной запуск

Терминал 1 (Backend):
```bash
cd backend
npm run dev
```

Терминал 2 (Frontend):
```bash
cd frontend
npm run dev
```

### 5. Открыть в браузере

Откройте http://localhost:5173

## Production сборка

### Backend

```bash
cd backend
npm start
```

### Frontend

```bash
cd frontend
npm run build
# Файлы будут в frontend/dist/
```

Для production рекомендуется использовать nginx или другой веб-сервер для раздачи статики frontend, и reverse proxy к backend API.

## Структура проекта

```
secure-messenger/
├── backend/              # Backend сервер
│   ├── src/             # Исходный код
│   ├── migrations/      # Миграции БД
│   ├── logs/            # Логи
│   ├── uploads/         # Загруженные файлы
│   ├── server.js        # Точка входа
│   └── .env             # Конфигурация
├── frontend/            # Frontend приложение
│   ├── client/          # Исходный код
│   ├── dist/            # Production build
│   └── .env             # Конфигурация
└── start-dev.sh         # Скрипт запуска dev окружения
```

## Порты по умолчанию

- Backend API: 3001
- Frontend Dev Server: 5173
- PostgreSQL: 5432
- Redis: 6379

## Troubleshooting

### Порт занят
```bash
# Найти процесс
lsof -i :3001
# Или
netstat -tlnp | grep 3001

# Остановить
kill -9 <PID>
```

### CORS ошибки
Убедитесь что в `backend/.env` указан правильный `FRONTEND_URL`:
```
FRONTEND_URL=http://localhost:5173
```

### WebSocket не подключается
Проверьте в `frontend/.env`:
```
VITE_WS_URL=ws://localhost:3001
```

### БД не подключается
Проверьте настройки в `backend/.env` и убедитесь что PostgreSQL и Redis запущены:
```bash
# PostgreSQL
sudo systemctl status postgresql

# Redis
sudo systemctl status redis
```
