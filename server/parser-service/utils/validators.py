"""
Validation utilities.
Валидация данных и файлов.
"""

import os
import logging
from typing import Optional, Dict, Any
import magic

logger = logging.getLogger(__name__)


class FileValidator:
    """Валидация файлов."""
    
    # Разрешенные MIME types
    ALLOWED_MIME_TYPES = {
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/html',
        'text/csv',
        'text/rtf',
        'application/rtf',
        'application/vnd.oasis.opendocument.text',
        'application/zip',
        'application/x-7z-compressed',
        'application/x-rar-compressed',
        'image/png',
        'image/jpeg',
        'image/bmp',
        'image/tiff',
        'message/rfc822',  # EML
    }
    
    # Максимальные размеры файлов (в байтах)
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB
    MAX_IMAGE_SIZE = 20 * 1024 * 1024   # 20 MB
    
    def __init__(self):
        """Инициализация валидатора."""
        try:
            self.magic = magic.Magic(mime=True)
        except:
            logger.warning("python-magic not available, file type detection will be limited")
            self.magic = None
    
    def validate_file(self, file_path: str) -> Dict[str, Any]:
        """
        Полная валидация файла.
        
        Args:
            file_path: Путь к файлу
            
        Returns:
            Dict с результатами валидации
        """
        result = {
            'is_valid': False,
            'errors': [],
            'warnings': [],
            'file_info': {},
        }
        
        # 1. Проверка существования
        if not os.path.exists(file_path):
            result['errors'].append('File does not exist')
            return result
        
        # 2. Проверка размера
        file_size = os.path.getsize(file_path)
        result['file_info']['size'] = file_size
        
        if file_size == 0:
            result['errors'].append('File is empty')
            return result
        
        if file_size > self.MAX_FILE_SIZE:
            result['errors'].append(f'File too large: {file_size} bytes (max: {self.MAX_FILE_SIZE})')
            return result
        
        # 3. Определение MIME type
        mime_type = self._detect_mime_type(file_path)
        result['file_info']['mime_type'] = mime_type
        
        if mime_type and mime_type not in self.ALLOWED_MIME_TYPES:
            result['errors'].append(f'Unsupported file type: {mime_type}')
            return result
        
        # 4. Проверка расширения
        file_ext = os.path.splitext(file_path)[1].lower()
        result['file_info']['extension'] = file_ext
        
        # 5. Дополнительные проверки для изображений
        if mime_type and mime_type.startswith('image/'):
            if file_size > self.MAX_IMAGE_SIZE:
                result['warnings'].append(f'Large image file: {file_size} bytes')
        
        # 6. Проверка читаемости
        try:
            with open(file_path, 'rb') as f:
                f.read(1024)  # Читаем первые 1KB
        except Exception as e:
            result['errors'].append(f'File is not readable: {e}')
            return result
        
        # Если нет ошибок - файл валиден
        if not result['errors']:
            result['is_valid'] = True
        
        return result
    
    def _detect_mime_type(self, file_path: str) -> Optional[str]:
        """Определение MIME type файла."""
        if self.magic:
            try:
                return self.magic.from_file(file_path)
            except Exception as e:
                logger.error(f"MIME detection error: {e}")
        
        # Fallback: определение по расширению
        ext = os.path.splitext(file_path)[1].lower()
        ext_to_mime = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.txt': 'text/plain',
            '.html': 'text/html',
            '.htm': 'text/html',
            '.csv': 'text/csv',
            '.rtf': 'text/rtf',
            '.odt': 'application/vnd.oasis.opendocument.text',
            '.zip': 'application/zip',
            '.7z': 'application/x-7z-compressed',
            '.rar': 'application/x-rar-compressed',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.bmp': 'image/bmp',
            '.tiff': 'image/tiff',
            '.eml': 'message/rfc822',
        }
        
        return ext_to_mime.get(ext)
    
    def validate_text(self, text: str, min_length: int = 10, max_length: int = 10000000) -> Dict[str, Any]:
        """
        Валидация текста.
        
        Args:
            text: Текст
            min_length: Минимальная длина
            max_length: Максимальная длина
            
        Returns:
            Результат валидации
        """
        result = {
            'is_valid': False,
            'errors': [],
            'warnings': [],
        }
        
        if not text:
            result['errors'].append('Text is empty')
            return result
        
        if not isinstance(text, str):
            result['errors'].append('Text must be a string')
            return result
        
        text_length = len(text)
        
        if text_length < min_length:
            result['errors'].append(f'Text too short: {text_length} chars (min: {min_length})')
            return result
        
        if text_length > max_length:
            result['errors'].append(f'Text too long: {text_length} chars (max: {max_length})')
            return result
        
        # Проверка на наличие непечатаемых символов
        non_printable = sum(1 for c in text if ord(c) < 32 and c not in '\n\r\t')
        if non_printable > text_length * 0.1:  # Больше 10% непечатаемых
            result['warnings'].append(f'High ratio of non-printable characters: {non_printable}/{text_length}')
        
        result['is_valid'] = True
        return result


# Глобальный экземпляр
file_validator = FileValidator()
