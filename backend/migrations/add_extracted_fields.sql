-- Колонка для хранения автоматически извлечённых реквизитов из вложенного документа.
-- Заполняется backend'ом в момент загрузки файла через POST /api/upload,
-- если расширение поддерживается (PDF/DOCX/XLSX/TXT). Хранится как JSON:
--   { inn: [...], kpp: [...], ogrn: [...], bik: [...], bank_accounts: [...],
--     amounts: [{ value, currency, raw }, ...], dates: [...],
--     document_numbers: [...], document_type_hint: "invoice" | "act" | ... }
-- Структура соответствует ExtractedFields из document-parser/app/extractors.

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS extracted_fields JSONB;

-- Индекс для будущего поиска по реквизитам (например, найти все сообщения
-- с конкретным ИНН в чате). JSONB GIN index поддерживает оператор @>.
CREATE INDEX IF NOT EXISTS idx_messages_extracted_fields
    ON messages USING GIN (extracted_fields);
