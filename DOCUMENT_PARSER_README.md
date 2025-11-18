# 📑 Document Parser - Умный парсер документов

Интегрированный компонент для парсинга документов в Secure Messenger.

## ✨ Возможности

### Поддерживаемые форматы
- **PDF** - текст, метаданные, таблицы
- **DOCX** - структура документа, заголовки, таблицы
- **XLSX** - все листы, таблицы с данными
- **TXT** - plain text

### Форматы экспорта
- **Text** - форматированный текст
- **Markdown** - с заголовками и таблицами
- **JSON** - полная структура документа
- **Excel** - многолистовой XLSX файл

### UI/UX
- 🎯 Закрепленный элемент вверху списка чатов
- 🎨 Боковая панель с современным дизайном
- 📤 Drag & Drop загрузка файлов
- ⚡ Индикатор прогресса обработки
- 📊 Вкладки для разных форматов вывода
- 🌙 Темная тема в стиле мессенджера

## 🏗️ Архитектура

```
secure-messenger/
├── document-parser/              # Python микросервис (FastAPI)
│   ├── app/
│   │   ├── main.py              # API endpoints
│   │   ├── parsers/             # PDF, DOCX, XLSX, TXT парсеры
│   │   ├── exporters/           # Text, Markdown, JSON, Excel
│   │   └── utils/
│   └── requirements.txt
│
├── backend/                      # Node.js прокси
│   └── src/
│       ├── services/document-parser.service.ts
│       ├── controllers/parser.controller.ts
│       └── routes/parser.routes.ts
│
└── frontend/                     # Vanilla TypeScript UI
    └── client/src/
        ├── components/DocumentParser.ts
        └── styles/document-parser.css
```

## 🚀 Запуск

### 1. Python микросервис

```bash
cd document-parser

# Создать виртуальное окружение
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# или
venv\Scripts\activate  # Windows

# Установить зависимости
pip install -r requirements.txt

# Запустить сервис
uvicorn app.main:app --reload --port 8000
```

Сервис запустится на `http://localhost:8000`

### 2. Backend (Node.js)

```bash
cd backend

# Установить новые зависимости
npm install axios form-data

# Добавить в .env
echo "PARSER_SERVICE_URL=http://localhost:8000" >> .env

# Пересобрать (если нужно)
npm run build

# Запустить
npm run dev
```

### 3. Frontend

```bash
cd frontend

# Запустить dev server
npm run dev
```

Frontend будет доступен на `http://localhost:5173`

## 📡 API Endpoints

### Python Service (Port 8000)

- `POST /parse` - Парсинг документа
- `POST /export` - Экспорт в формат
- `GET /download/{filename}` - Скачать файл
- `DELETE /document/{documentId}` - Удалить документ
- `GET /health` - Health check

### Node.js Backend (Port 3001)

- `POST /api/parser/parse` - Прокси для парсинга (требует auth)
- `POST /api/parser/export` - Прокси для экспорта
- `GET /api/parser/download/:filename` - Скачать файл
- `DELETE /api/parser/document/:documentId` - Удалить документ
- `GET /api/parser/health` - Health check обоих сервисов

## 🔧 Использование

### В мессенджере:

1. **Откройте мессенджер** - авторизуйтесь
2. **Найдите "Умный парсер"** - закреплен вверху списка чатов
3. **Нажмите на парсер** - откроется боковая панель
4. **Загрузите документ**:
   - Перетащите файл в зону Drag & Drop
   - Или нажмите для выбора файла
5. **Дождитесь обработки** - прогресс-бар покажет статус
6. **Выберите формат** - Text, Markdown, JSON или Excel
7. **Скачайте или скопируйте** результат

### Программно:

```typescript
import { documentParser } from './components/DocumentParser';

// Создать trigger button
const button = documentParser.createTriggerButton();

// Открыть панель программно
documentParser.openPanel();

// Закрыть панель
documentParser.closePanel();
```

### cURL примеры:

```bash
# Парсинг PDF
curl -X POST "http://localhost:8000/parse" \
  -F "file=@document.pdf"

# Экспорт в Markdown
curl -X POST "http://localhost:8000/export" \
  -H "Content-Type: application/json" \
  -d '{"document_id": "uuid", "format": "markdown"}'

# Health check
curl http://localhost:8000/health
```

## 🧪 Тестирование

### 1. Проверка Python сервиса

```bash
# Health check
curl http://localhost:8000/health

# Парсинг тестового PDF
curl -X POST http://localhost:8000/parse \
  -F "file=@test.pdf"
```

### 2. Проверка Backend API

```bash
# Health check (требует auth token)
curl http://localhost:3001/api/parser/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Проверка UI

1. Откройте `http://localhost:5173`
2. Авторизуйтесь
3. Найдите "Умный парсер" в списке чатов
4. Загрузите тестовый документ

## 📊 Производительность

| Тип документа | Размер | Время обработки |
|---------------|--------|-----------------|
| PDF (10 страниц) | 2 MB | ~1-2 сек |
| DOCX (50 страниц) | 1 MB | ~0.5-1 сек |
| XLSX (5 листов) | 500 KB | ~0.3-0.5 сек |
| TXT | 100 KB | ~0.1 сек |

**Ограничения:**
- Максимальный размер файла: 100 МБ
- Timeout обработки: 60 секунд
- Concurrent requests: без ограничений (MVP)

## 🔒 Безопасность

### Текущая реализация:
- ✅ Аутентификация через JWT (backend)
- ✅ Валидация типов файлов
- ✅ Ограничение размера файлов
- ✅ Временное хранилище (auto-cleanup)

### TODO (Production):
- [ ] Rate limiting для парсинга
- [ ] Virus scanning загруженных файлов
- [ ] Шифрование файлов в хранилище
- [ ] Логирование всех операций
- [ ] HTTPS для Python сервиса

## 🐛 Troubleshooting

### Python сервис не запускается

```bash
# Проверить Python версию (требуется 3.11+)
python3 --version

# Переустановить зависимости
pip install -r requirements.txt --force-reinstall

# Проверить порт 8000
lsof -i :8000
```

### Backend не подключается к Python

```bash
# Проверить PARSER_SERVICE_URL в .env
cat backend/.env | grep PARSER_SERVICE_URL

# Проверить доступность
curl http://localhost:8000/health

# Проверить логи backend
npm run dev  # смотреть консоль
```

### Ошибка "Module not found"

```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
npm install axios form-data
```

### Файлы не загружаются

- Проверьте размер файла (<100 МБ)
- Проверьте формат (PDF, DOCX, XLSX, TXT)
- Проверьте auth token в браузере (DevTools → Application → LocalStorage)

## 📈 Roadmap

### Фаза 2 (1 неделя):
- [ ] OCR для отсканированных PDF
- [ ] Улучшенный layout analysis (camelot-py)
- [ ] Извлечение таблиц с высокой точностью
- [ ] История обработанных документов
- [ ] Batch processing (несколько файлов)

### Фаза 3 (1-2 недели):
- [ ] WebSocket для прогресса обработки
- [ ] Celery/RQ для очереди задач
- [ ] Redis кэширование результатов
- [ ] Распознавание формул
- [ ] Классификация контента (текст/код)

### Фаза 4 (Production):
- [ ] Docker Compose для всего стека
- [ ] Kubernetes deployment
- [ ] Мониторинг (Prometheus + Grafana)
- [ ] S3/MinIO для файлов
- [ ] CDN для статики

## 🤝 Contributing

Код разработан с помощью AI (Claude + Factory Droid).

## 📄 Лицензия

MIT

---

**Разработано:** Factory AI Droid  
**Дата:** 2025-11-18  
**Версия:** 1.0.0 MVP
