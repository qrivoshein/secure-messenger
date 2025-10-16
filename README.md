# Secure Messenger

Защищенный веб-мессенджер с end-to-end шифрованием.

## Структура проекта

```
secure-messenger/
├── backend/         # Backend (Node.js + Express + WebSocket)
│   ├── src/        # Исходный код backend
│   ├── migrations/ # Миграции БД
│   ├── server.js   # Точка входа
│   └── package.json
├── frontend/        # Frontend (TypeScript + Vite)
│   ├── client/     # Исходный код frontend
│   └── package.json
└── README.md
```

## Установка

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

## Конфигурация

### Backend

Создайте файл `backend/.env`:

```env
# Database Configuration
DB_USER=messenger_app
DB_HOST=localhost
DB_NAME=secure_messenger
DB_PASSWORD=your_password
DB_PORT=5432

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Server Configuration
PORT=3001
HOST=0.0.0.0
FRONTEND_URL=http://localhost:5173
```

### Frontend

Создайте файл `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## Запуск

### Backend

```bash
cd backend
npm start          # Production
npm run dev        # Development (с nodemon)
```

Backend запустится на порту 3001 (или указанном в .env).

### Frontend

```bash
cd frontend
npm run dev        # Development сервер
npm run build      # Production build
npm run preview    # Preview production build
```

Frontend dev сервер запустится на порту 5173.

## Разработка

### Backend

- `npm start` - запуск production сервера
- `npm run dev` - запуск dev сервера с hot reload

### Frontend

- `npm run dev` - запуск dev сервера с hot reload
- `npm run build` - сборка production версии
- `npm run preview` - предпросмотр production сборки

## Технологии

### Backend
- Node.js + Express
- PostgreSQL
- Redis
- WebSocket (ws)
- bcrypt для хеширования паролей

### Frontend
- TypeScript
- Vite
- Vanilla JS/TS (без фреймворков)

## API Endpoints

- `POST /api/register` - Регистрация
- `POST /api/login` - Вход
- `GET /api/users` - Список пользователей
- `GET /api/users/search?q=query` - Поиск пользователей
- `GET /api/messages/:username` - Получить сообщения с пользователем
- `POST /api/messages` - Отправить сообщение
- `POST /api/upload` - Загрузить файл

## WebSocket Events

### Client → Server
- `auth` - Аутентификация
- `message` - Отправка сообщения
- `typing` - Статус набора текста
- `ping` - Проверка соединения

### Server → Client
- `authenticated` - Успешная аутентификация
- `new_message` - Новое сообщение
- `typing` - Пользователь печатает
- `user_online` - Пользователь онлайн
- `user_offline` - Пользователь оффлайн
- `pong` - Ответ на ping

## Лицензия

MIT
