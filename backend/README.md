# Backend - Secure Messenger

Backend сервер для Secure Messenger.

## Установка

```bash
npm install
```

## Конфигурация

Создайте `.env` файл:

```env
# Database
DB_USER=messenger_app
DB_HOST=localhost
DB_NAME=secure_messenger
DB_PASSWORD=your_password
DB_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3001
HOST=0.0.0.0
FRONTEND_URL=http://localhost:5173
```

## Запуск

```bash
npm start       # Production
npm run dev     # Development
```

## Структура

```
backend/
├── src/
│   ├── config/          # Конфигурация
│   ├── controllers/     # Контроллеры
│   ├── database/        # БД (PostgreSQL, Redis)
│   ├── middleware/      # Middleware
│   ├── routes/          # API роуты
│   ├── services/        # Бизнес-логика
│   ├── utils/           # Утилиты
│   └── websocket/       # WebSocket обработчики
├── migrations/          # Миграции БД
├── logs/               # Логи
├── uploads/            # Загруженные файлы
└── server.js           # Точка входа
```
