# Frontend - Secure Messenger

Frontend приложение для Secure Messenger.

## Установка

```bash
npm install
```

## Конфигурация

Создайте `.env` файл:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## Запуск

```bash
npm run dev         # Development сервер (порт 5173)
npm run build       # Production build
npm run preview     # Preview production build
```

## Структура

```
frontend/
├── client/
│   ├── src/
│   │   ├── api/            # HTTP клиент
│   │   ├── components/     # UI компоненты
│   │   ├── services/       # Сервисы (WebSocket, Auth, etc.)
│   │   ├── utils/          # Утилиты
│   │   ├── types/          # TypeScript типы
│   │   ├── config.ts       # Конфигурация
│   │   └── app.ts          # Главный файл приложения
│   ├── public/            # Статические файлы
│   └── index.html         # HTML шаблон
├── dist/                  # Production build (генерируется)
├── vite.config.js        # Vite конфигурация
└── tsconfig.json         # TypeScript конфигурация
```

## Технологии

- TypeScript
- Vite
- Vanilla JS/TS (без UI фреймворков)
- WebSocket для real-time коммуникации
