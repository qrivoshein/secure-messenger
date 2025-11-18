# Document Parser Microservice

FastAPI микросервис для парсинга документов (PDF, DOCX, XLSX, TXT) и экспорта в различные форматы.

## Возможности

### Поддерживаемые форматы ввода:
- **PDF** - с извлечением текста, метаданных, таблиц
- **DOCX** - с структурой (заголовки, параграфы, таблицы)
- **XLSX** - все листы как таблицы
- **TXT** - plain text

### Форматы экспорта:
- **Text** - plain text с форматированием
- **Markdown** - с заголовками, таблицами
- **JSON** - полная структура документа
- **Excel** - многолистовой XLSX файл
- **CSV** - табличные данные

## Установка

### 1. Локальный запуск

```bash
cd document-parser

# Создать виртуальное окружение
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows

# Установить зависимости
pip install -r requirements.txt

# Запустить сервер
uvicorn app.main:app --reload --port 8000
```

### 2. Docker

```bash
# Собрать образ
docker build -t document-parser .

# Запустить контейнер
docker run -d -p 8000:8000 --name doc-parser document-parser
```

## API Endpoints

### `POST /parse`
Загрузить и распарсить документ

**Request:**
```bash
curl -X POST "http://localhost:8000/parse" \
  -F "file=@document.pdf"
```

**Response:**
```json
{
  "status": "completed",
  "document_id": "uuid",
  "structure": { ... },
  "text_content": "...",
  "processing_time": 1.23
}
```

### `POST /export`
Экспортировать документ в нужный формат

**Request:**
```json
{
  "document_id": "uuid",
  "format": "markdown"
}
```

**Response:**
```json
{
  "status": "success",
  "format": "markdown",
  "content": "# Document..."
}
```

### `GET /download/{filename}`
Скачать экспортированный файл (для Excel)

### `DELETE /document/{document_id}`
Удалить документ и очистить кэш

### `GET /health`
Проверка здоровья сервиса

## Архитектура

```
document-parser/
├── app/
│   ├── main.py              # FastAPI приложение
│   ├── config.py            # Конфигурация
│   ├── models/
│   │   └── schemas.py       # Pydantic модели
│   ├── parsers/
│   │   ├── pdf_parser.py    # PyMuPDF парсер
│   │   ├── docx_parser.py   # python-docx парсер
│   │   ├── xlsx_parser.py   # pandas/openpyxl парсер
│   │   └── txt_parser.py    # Plain text парсер
│   ├── exporters/
│   │   ├── text_exporter.py
│   │   ├── markdown_exporter.py
│   │   ├── json_exporter.py
│   │   └── excel_exporter.py
│   └── utils/
│       ├── file_utils.py
│       └── cache_manager.py
├── temp/                    # Временные файлы
├── cache/                   # Кэш результатов
├── requirements.txt
├── Dockerfile
└── README.md
```

## Ограничения

- Максимальный размер файла: 100 МБ (настраивается)
- OCR для изображений: пока не реализовано (Фаза 2)
- Сложный layout analysis PDF: базовый (улучшения в Фазе 2)

## Производительность

- PDF (10 страниц): ~1-2 сек
- DOCX (50 страниц): ~0.5-1 сек
- XLSX (5 листов): ~0.3-0.5 сек

## Roadmap

### Фаза 2:
- [ ] OCR с tesseract
- [ ] Улучшенный layout analysis (camelot-py)
- [ ] Извлечение формул
- [ ] Классификация контента

### Фаза 3:
- [ ] Очередь задач (Celery/RQ)
- [ ] Redis для кэширования
- [ ] WebSocket для прогресса
- [ ] Batch processing

## Лицензия

MIT
