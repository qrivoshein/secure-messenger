"""
CSV Parser with automatic delimiter detection.
Парсер CSV файлов с авто-определением разделителя.
"""

import csv
import logging
from typing import Dict, Any, List, Optional
import chardet
from .base_parser import BaseParser

logger = logging.getLogger(__name__)


class CSVParser(BaseParser):
    """Парсер CSV файлов с авто-определением разделителя и кодировки."""
    
    def parse(self, file_path: str) -> Dict[str, Any]:
        """
        Парсинг CSV файла.
        
        Args:
            file_path: Путь к CSV файлу
            
        Returns:
            Структурированные данные
        """
        result = self.create_result_structure()
        
        try:
            # 1. Определение кодировки
            encoding = self._detect_encoding(file_path)
            logger.info(f"Detected encoding: {encoding}")
            
            # 2. Чтение первых строк для определения разделителя
            with open(file_path, 'r', encoding=encoding, errors='replace') as f:
                sample = f.read(4096)  # Читаем первые 4KB
            
            # 3. Определение разделителя
            delimiter = self._detect_delimiter(sample)
            logger.info(f"Detected delimiter: {repr(delimiter)}")
            
            # 4. Парсинг файла
            rows = []
            with open(file_path, 'r', encoding=encoding, errors='replace', newline='') as f:
                reader = csv.reader(f, delimiter=delimiter, quotechar='"', skipinitialspace=True)
                
                for row_idx, row in enumerate(reader):
                    # Очистка пустых ячеек в конце
                    while row and not row[-1].strip():
                        row.pop()
                    
                    if row:  # Добавляем только непустые строки
                        rows.append([cell.strip() for cell in row])
            
            if not rows:
                result['metadata']['error'] = 'Empty CSV file'
                return result
            
            # 5. Определение заголовков
            headers = rows[0]
            data_rows = rows[1:] if len(rows) > 1 else []
            
            # Проверка: первая строка - заголовки или данные?
            has_headers = self._detect_headers(rows)
            
            if not has_headers:
                # Первая строка - данные, генерируем заголовки
                headers = [f'Column_{i+1}' for i in range(len(headers))]
                data_rows = rows
            
            # 6. Формирование результата
            result['metadata'] = {
                'type': 'csv',
                'encoding': encoding,
                'delimiter': delimiter,
                'has_headers': has_headers,
                'row_count': len(data_rows),
                'column_count': len(headers),
                'headers': headers,
            }
            
            # 7. Преобразование в словари
            structured_data = []
            for row in data_rows:
                # Дополняем строку пустыми значениями если нужно
                while len(row) < len(headers):
                    row.append('')
                
                row_dict = {
                    headers[i]: row[i] if i < len(row) else ''
                    for i in range(len(headers))
                }
                structured_data.append(row_dict)
            
            # 8. Текстовое представление
            text_lines = []
            text_lines.append(' | '.join(headers))
            text_lines.append('-' * (len(' | '.join(headers))))
            
            for row in data_rows[:100]:  # Первые 100 строк в текст
                text_lines.append(' | '.join(row))
            
            result['content']['text'] = '\n'.join(text_lines)
            
            # 9. Таблица
            result['content']['tables'] = [{
                'table_index': 0,
                'headers': headers,
                'rows': data_rows,
                'row_count': len(data_rows),
                'col_count': len(headers),
                'data': structured_data,
            }]
            
            # 10. Статистика
            result['metadata']['total_cells'] = len(data_rows) * len(headers)
            result['metadata']['empty_cells'] = sum(
                1 for row in data_rows for cell in row if not cell.strip()
            )
            
            logger.info(f"CSV parsed successfully: {len(data_rows)} rows, {len(headers)} columns")
            
        except Exception as e:
            logger.error(f"CSV parsing error: {e}")
            result['metadata']['error'] = str(e)
        
        return result
    
    def _detect_encoding(self, file_path: str) -> str:
        """Определение кодировки файла."""
        try:
            with open(file_path, 'rb') as f:
                raw_data = f.read(10000)  # Читаем первые 10KB
            
            detection = chardet.detect(raw_data)
            encoding = detection.get('encoding', 'utf-8')
            confidence = detection.get('confidence', 0.0)
            
            logger.info(f"Encoding detection: {encoding} (confidence: {confidence:.2f})")
            
            # Fallback для низкой уверенности
            if confidence < 0.7:
                # Пробуем стандартные кодировки
                for enc in ['utf-8', 'cp1251', 'latin-1']:
                    try:
                        with open(file_path, 'r', encoding=enc) as f:
                            f.read(1024)
                        logger.info(f"Using fallback encoding: {enc}")
                        return enc
                    except:
                        continue
            
            return encoding if encoding else 'utf-8'
            
        except Exception as e:
            logger.warning(f"Encoding detection failed: {e}, using utf-8")
            return 'utf-8'
    
    def _detect_delimiter(self, sample: str) -> str:
        """Определение разделителя CSV."""
        try:
            # Используем Sniffer из csv модуля
            sniffer = csv.Sniffer()
            dialect = sniffer.sniff(sample, delimiters=',;\t|')
            return dialect.delimiter
        except:
            # Fallback: подсчет частоты разделителей
            delimiters = [',', ';', '\t', '|']
            counts = {d: sample.count(d) for d in delimiters}
            
            # Выбираем самый частый
            max_delimiter = max(counts, key=counts.get)
            
            # Если частота очень низкая - скорее всего не CSV
            if counts[max_delimiter] < 2:
                logger.warning("Could not reliably detect delimiter, using comma")
                return ','
            
            return max_delimiter
    
    def _detect_headers(self, rows: List[List[str]]) -> bool:
        """
        Определяет, содержит ли первая строка заголовки.
        
        Эвристика:
        - Если первая строка содержит текст, а вторая - числа, то первая - заголовки
        - Если первая строка отличается по типу от остальных
        """
        if len(rows) < 2:
            return True  # По умолчанию считаем что есть заголовки
        
        first_row = rows[0]
        second_row = rows[1] if len(rows) > 1 else []
        
        # Подсчет числовых значений
        first_numeric = sum(1 for cell in first_row if self._is_numeric(cell))
        second_numeric = sum(1 for cell in second_row if self._is_numeric(cell))
        
        # Если в первой строке меньше чисел - скорее всего заголовки
        if first_numeric < second_numeric:
            return True
        
        # Если в первой строке все текст, а во второй есть числа - заголовки
        if first_numeric == 0 and second_numeric > 0:
            return True
        
        # Если первая строка похожа на остальные - нет заголовков
        return False
    
    def _is_numeric(self, value: str) -> bool:
        """Проверка, является ли значение числом."""
        if not value:
            return False
        
        # Удаляем пробелы и заменяем запятую на точку
        value_clean = value.strip().replace(',', '.').replace(' ', '')
        
        try:
            float(value_clean)
            return True
        except ValueError:
            return False
