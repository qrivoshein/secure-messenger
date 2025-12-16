"""
Data Cleaning utilities.
Очистка и нормализация данных: исправление опечаток, объединение строк, удаление мусора.
"""

import re
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

try:
    import ftfy
    FTFY_AVAILABLE = True
except ImportError:
    logger.warning("ftfy not available, text fixing will be limited")
    FTFY_AVAILABLE = False


class DataCleaner:
    """Очистка и нормализация текстовых данных."""
    
    # Паттерны для удаления
    PATTERNS_TO_REMOVE = [
        r'\x00',  # Null bytes
        r'[\x01-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]',  # Control characters
    ]
    
    # Паттерны колонтитулов (часто повторяющиеся элементы)
    HEADER_FOOTER_PATTERNS = [
        r'Страница\s+\d+\s+из\s+\d+',
        r'Page\s+\d+\s+of\s+\d+',
        r'Конфиденциально',
        r'Confidential',
        r'\d{1,2}[./-]\d{1,2}[./-]\d{2,4}',  # Даты в колонтитулах
    ]
    
    def __init__(self):
        """Инициализация очистителя."""
        self.compiled_patterns = {
            'remove': [re.compile(p) for p in self.PATTERNS_TO_REMOVE],
            'headers': [re.compile(p, re.IGNORECASE) for p in self.HEADER_FOOTER_PATTERNS],
        }
    
    def clean_text(self, text: str, aggressive: bool = False) -> str:
        """
        Очистка текста от артефактов и мусора.
        
        Args:
            text: Исходный текст
            aggressive: Агрессивная очистка (удаление большего количества элементов)
            
        Returns:
            Очищенный текст
        """
        if not text or not isinstance(text, str):
            return ""
        
        try:
            cleaned = text
            
            # 1. Исправление кодировки (если доступен ftfy)
            if FTFY_AVAILABLE:
                cleaned = ftfy.fix_text(cleaned)
            
            # 2. Удаление control characters
            for pattern in self.compiled_patterns['remove']:
                cleaned = pattern.sub('', cleaned)
            
            # 3. Нормализация пробелов
            cleaned = self._normalize_whitespace(cleaned)
            
            # 4. Объединение разорванных строк
            cleaned = self._merge_broken_lines(cleaned)
            
            # 5. Удаление колонтитулов (если агрессивная очистка)
            if aggressive:
                cleaned = self._remove_headers_footers(cleaned)
            
            # 6. Удаление пустых строк
            cleaned = self._remove_empty_lines(cleaned)
            
            return cleaned.strip()
            
        except Exception as e:
            logger.error(f"Text cleaning error: {e}")
            return text
    
    def _normalize_whitespace(self, text: str) -> str:
        """Нормализация пробелов."""
        # Замена множественных пробелов на один
        text = re.sub(r' +', ' ', text)
        
        # Замена множественных переносов строк
        text = re.sub(r'\n\n+', '\n\n', text)
        
        # Удаление пробелов в начале и конце строк
        lines = [line.strip() for line in text.split('\n')]
        
        return '\n'.join(lines)
    
    def _merge_broken_lines(self, text: str) -> str:
        """
        Объединение разорванных строк (когда слово разбито переносом).
        Например: "програм-\nмирование" -> "программирование"
        """
        # Паттерн для переноса слов
        text = re.sub(r'([а-яёa-z])-\s*\n\s*([а-яёa-z])', r'\1\2', text, flags=re.IGNORECASE)
        
        # Объединение строк, которые явно не завершены (нет точки в конце)
        lines = text.split('\n')
        merged_lines = []
        i = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            # Если строка не пустая и не заканчивается на знак препинания
            if line and i < len(lines) - 1:
                next_line = lines[i + 1].strip()
                
                # Если следующая строка начинается с маленькой буквы - вероятно продолжение
                if next_line and next_line[0].islower():
                    merged_lines.append(line + ' ' + next_line)
                    i += 2
                    continue
            
            if line:
                merged_lines.append(line)
            i += 1
        
        return '\n'.join(merged_lines)
    
    def _remove_headers_footers(self, text: str) -> str:
        """Удаление колонтитулов."""
        for pattern in self.compiled_patterns['headers']:
            text = pattern.sub('', text)
        
        return text
    
    def _remove_empty_lines(self, text: str) -> str:
        """Удаление пустых строк."""
        lines = [line for line in text.split('\n') if line.strip()]
        return '\n'.join(lines)
    
    def clean_table_data(self, table_data: List[List[str]]) -> List[List[str]]:
        """
        Очистка данных таблицы.
        
        Args:
            table_data: Таблица (список списков)
            
        Returns:
            Очищенная таблица
        """
        if not table_data:
            return []
        
        try:
            cleaned_table = []
            
            for row in table_data:
                cleaned_row = []
                for cell in row:
                    if cell is None:
                        cleaned_row.append('')
                    elif isinstance(cell, str):
                        # Очистка каждой ячейки
                        cleaned_cell = self.clean_text(cell, aggressive=False)
                        cleaned_row.append(cleaned_cell)
                    else:
                        cleaned_row.append(str(cell))
                
                # Добавляем строку только если не пустая
                if any(cell.strip() for cell in cleaned_row):
                    cleaned_table.append(cleaned_row)
            
            return cleaned_table
            
        except Exception as e:
            logger.error(f"Table cleaning error: {e}")
            return table_data
    
    def normalize_value(self, value: str, value_type: str = 'auto') -> Optional[any]:
        """
        Нормализация значения (даты, суммы, числа).
        
        Args:
            value: Значение
            value_type: Тип ('date', 'money', 'number', 'auto')
            
        Returns:
            Нормализованное значение
        """
        if not value or not isinstance(value, str):
            return None
        
        value = value.strip()
        
        try:
            if value_type == 'auto':
                # Автоопределение типа
                if re.match(r'\d+[.,]\d+', value):
                    value_type = 'number'
                elif any(c in value for c in ['руб', '₽', 'USD', 'EUR']):
                    value_type = 'money'
                elif re.match(r'\d{1,2}[./-]\d{1,2}[./-]\d{2,4}', value):
                    value_type = 'date'
            
            if value_type == 'number':
                # Замена запятой на точку
                value_clean = value.replace(',', '.').replace(' ', '')
                return float(value_clean)
            
            elif value_type == 'money':
                # Извлечение числа
                match = re.search(r'(\d+[.,]?\d*)', value)
                if match:
                    num_str = match.group(1).replace(',', '.')
                    return float(num_str)
            
            return value
            
        except Exception as e:
            logger.error(f"Value normalization error: {e}")
            return value


# Глобальный экземпляр
data_cleaner = DataCleaner()
