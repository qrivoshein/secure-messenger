"""
RTF Parser.
Парсер RTF (Rich Text Format) файлов.
"""

import logging
from typing import Dict, Any
from .base_parser import BaseParser

logger = logging.getLogger(__name__)

try:
    from striprtf.striprtf import rtf_to_text
    STRIPRTF_AVAILABLE = True
except ImportError:
    logger.warning("striprtf not available, RTF parsing will be limited")
    STRIPRTF_AVAILABLE = False


class RTFParser(BaseParser):
    """Парсер RTF файлов."""
    
    def parse(self, file_path: str) -> Dict[str, Any]:
        """
        Парсинг RTF файла.
        
        Args:
            file_path: Путь к RTF файлу
            
        Returns:
            Структурированные данные
        """
        result = self.create_result_structure()
        
        try:
            # Чтение файла
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                rtf_content = f.read()
            
            # Извлечение текста
            if STRIPRTF_AVAILABLE:
                text = rtf_to_text(rtf_content)
            else:
                # Fallback: простое удаление RTF команд
                text = self._simple_rtf_to_text(rtf_content)
            
            # Очистка текста
            text = text.strip()
            
            if not text:
                result['metadata']['error'] = 'Empty RTF content'
                return result
            
            # Метаданные
            result['metadata'] = {
                'type': 'rtf',
                'file_size': len(rtf_content),
                'word_count': len(text.split()),
                'character_count': len(text),
                'line_count': len(text.split('\n')),
            }
            
            # Содержимое
            result['content']['text'] = text
            
            # Структура (базовая)
            lines = text.split('\n')
            result['content']['structure'] = [{
                'type': 'paragraph',
                'text': line.strip(),
                'line_number': idx + 1,
            } for idx, line in enumerate(lines) if line.strip()]
            
            logger.info(f"RTF parsed successfully: {len(text)} characters")
            
        except Exception as e:
            logger.error(f"RTF parsing error: {e}")
            result['metadata']['error'] = str(e)
        
        return result
    
    def _simple_rtf_to_text(self, rtf_content: str) -> str:
        """
        Простое извлечение текста из RTF (fallback метод).
        Удаляет RTF команды и оставляет только текст.
        """
        import re
        
        # Удаление RTF заголовка
        text = re.sub(r'\\rtf\d', '', rtf_content)
        
        # Удаление RTF команд (начинаются с \)
        text = re.sub(r'\\[a-z]+\d*\s?', '', text)
        
        # Удаление фигурных скобок
        text = text.replace('{', '').replace('}', '')
        
        # Замена \par на перенос строки
        text = text.replace('\\par', '\n')
        
        # Удаление лишних пробелов
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\n\s+', '\n', text)
        
        return text.strip()
