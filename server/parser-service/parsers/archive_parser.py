"""
Archive Parser.
Парсер архивов (ZIP, 7Z, RAR) с рекурсивной обработкой.
"""

import logging
import os
import tempfile
import zipfile
from typing import Dict, Any, List
from .base_parser import BaseParser

logger = logging.getLogger(__name__)

try:
    import py7zr
    PY7ZR_AVAILABLE = True
except ImportError:
    logger.warning("py7zr not available, 7Z support disabled")
    PY7ZR_AVAILABLE = False

try:
    import rarfile
    RARFILE_AVAILABLE = True
except ImportError:
    logger.warning("rarfile not available, RAR support disabled")
    RARFILE_AVAILABLE = False


class ArchiveParser(BaseParser):
    """Парсер архивов с рекурсивной обработкой содержимого."""
    
    # Поддерживаемые форматы документов внутри архивов
    PARSEABLE_EXTENSIONS = {
        'pdf', 'docx', 'xlsx', 'txt', 'html', 'htm', 'csv',
        'rtf', 'odt', 'eml', 'png', 'jpg', 'jpeg',
    }
    
    def __init__(self):
        """Инициализация парсера."""
        super().__init__()
        self.max_files = 100  # Максимум файлов для парсинга
        self.max_depth = 3    # Максимальная глубина вложенности архивов
    
    def parse(self, file_path: str, depth: int = 0) -> Dict[str, Any]:
        """
        Парсинг архива.
        
        Args:
            file_path: Путь к архиву
            depth: Глубина вложенности (для рекурсии)
            
        Returns:
            Структурированные данные
        """
        result = self.create_result_structure()
        
        # Защита от слишком глубокой вложенности
        if depth > self.max_depth:
            result['metadata']['error'] = f'Maximum depth exceeded: {depth}'
            return result
        
        try:
            # Определение типа архива
            archive_type = self._detect_archive_type(file_path)
            
            if not archive_type:
                result['metadata']['error'] = 'Unknown archive type'
                return result
            
            # Извлечение списка файлов
            file_list = self._get_file_list(file_path, archive_type)
            
            result['metadata'] = {
                'type': f'archive_{archive_type}',
                'archive_type': archive_type,
                'total_files': len(file_list),
                'depth': depth,
            }
            
            # Классификация файлов
            file_stats = self._classify_files(file_list)
            result['metadata']['file_statistics'] = file_stats
            
            # Извлечение и парсинг файлов
            extracted_files = []
            
            with tempfile.TemporaryDirectory() as temp_dir:
                # Извлечение архива
                self._extract_archive(file_path, temp_dir, archive_type)
                
                # Обработка извлеченных файлов
                parsed_count = 0
                
                for file_info in file_list:
                    if parsed_count >= self.max_files:
                        logger.warning(f"Reached max files limit: {self.max_files}")
                        break
                    
                    filename = file_info['filename']
                    file_ext = os.path.splitext(filename)[1].lower().lstrip('.')
                    
                    # Полный путь к извлеченному файлу
                    extracted_path = os.path.join(temp_dir, filename)
                    
                    if not os.path.exists(extracted_path):
                        continue
                    
                    # Информация о файле
                    file_entry = {
                        'filename': filename,
                        'size': file_info.get('size', 0),
                        'compressed_size': file_info.get('compressed_size', 0),
                        'extension': file_ext,
                    }
                    
                    # Парсинг файла если формат поддерживается
                    if file_ext in self.PARSEABLE_EXTENSIONS:
                        try:
                            parsed_data = self._parse_file(extracted_path, file_ext, depth)
                            if parsed_data:
                                file_entry['parsed'] = True
                                file_entry['content'] = parsed_data
                                parsed_count += 1
                        except Exception as e:
                            logger.warning(f"Failed to parse {filename}: {e}")
                            file_entry['parse_error'] = str(e)
                    
                    extracted_files.append(file_entry)
            
            # Формирование текста (содержимое всех файлов)
            text_parts = []
            for file_entry in extracted_files:
                if file_entry.get('parsed') and 'content' in file_entry:
                    text_parts.append(f"\n=== {file_entry['filename']} ===\n")
                    text_parts.append(file_entry['content'].get('text', ''))
            
            result['content']['text'] = '\n'.join(text_parts)
            result['content']['files'] = extracted_files
            
            # Статистика
            result['metadata']['parsed_files'] = parsed_count
            result['metadata']['total_size'] = sum(f.get('size', 0) for f in file_list)
            result['metadata']['total_size_mb'] = round(
                result['metadata']['total_size'] / (1024 * 1024), 2
            )
            
            logger.info(f"Archive parsed: {archive_type}, {len(file_list)} files, {parsed_count} parsed")
            
        except Exception as e:
            logger.error(f"Archive parsing error: {e}")
            result['metadata']['error'] = str(e)
        
        return result
    
    def _detect_archive_type(self, file_path: str) -> str:
        """Определение типа архива."""
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == '.zip':
            return 'zip'
        elif ext == '.7z' and PY7ZR_AVAILABLE:
            return '7z'
        elif ext == '.rar' and RARFILE_AVAILABLE:
            return 'rar'
        
        # Попытка определить по содержимому
        try:
            if zipfile.is_zipfile(file_path):
                return 'zip'
        except:
            pass
        
        return ''
    
    def _get_file_list(self, file_path: str, archive_type: str) -> List[Dict[str, Any]]:
        """Получение списка файлов в архиве."""
        file_list = []
        
        try:
            if archive_type == 'zip':
                with zipfile.ZipFile(file_path, 'r') as zf:
                    for info in zf.infolist():
                        if not info.is_dir():
                            file_list.append({
                                'filename': info.filename,
                                'size': info.file_size,
                                'compressed_size': info.compress_size,
                                'date': f"{info.date_time}",
                            })
            
            elif archive_type == '7z' and PY7ZR_AVAILABLE:
                with py7zr.SevenZipFile(file_path, 'r') as szf:
                    for name, info in szf.list():
                        if not info.is_directory:
                            file_list.append({
                                'filename': name,
                                'size': info.uncompressed,
                                'compressed_size': info.compressed,
                            })
            
            elif archive_type == 'rar' and RARFILE_AVAILABLE:
                with rarfile.RarFile(file_path, 'r') as rf:
                    for info in rf.infolist():
                        if not info.isdir():
                            file_list.append({
                                'filename': info.filename,
                                'size': info.file_size,
                                'compressed_size': info.compress_size,
                            })
        
        except Exception as e:
            logger.error(f"Failed to get file list: {e}")
        
        return file_list
    
    def _extract_archive(self, file_path: str, extract_to: str, archive_type: str):
        """Извлечение архива."""
        try:
            if archive_type == 'zip':
                with zipfile.ZipFile(file_path, 'r') as zf:
                    zf.extractall(extract_to)
            
            elif archive_type == '7z' and PY7ZR_AVAILABLE:
                with py7zr.SevenZipFile(file_path, 'r') as szf:
                    szf.extractall(extract_to)
            
            elif archive_type == 'rar' and RARFILE_AVAILABLE:
                with rarfile.RarFile(file_path, 'r') as rf:
                    rf.extractall(extract_to)
        
        except Exception as e:
            logger.error(f"Archive extraction failed: {e}")
            raise
    
    def _classify_files(self, file_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Классификация файлов по типам."""
        stats = {
            'by_extension': {},
            'total_size': 0,
            'parseable_count': 0,
        }
        
        for file_info in file_list:
            filename = file_info['filename']
            size = file_info.get('size', 0)
            ext = os.path.splitext(filename)[1].lower().lstrip('.')
            
            # Подсчет по расширениям
            stats['by_extension'][ext] = stats['by_extension'].get(ext, 0) + 1
            stats['total_size'] += size
            
            # Подсчет парсируемых файлов
            if ext in self.PARSEABLE_EXTENSIONS:
                stats['parseable_count'] += 1
        
        return stats
    
    def _parse_file(self, file_path: str, file_ext: str, depth: int) -> Dict[str, Any]:
        """Парсинг отдельного файла из архива."""
        # Импорт парсеров (избегаем циклических импортов)
        from .pdf_parser import PDFParser
        from .docx_parser import DOCXParser
        from .xlsx_parser import XLSXParser
        from .txt_parser import TXTParser
        from .html_parser import HTMLParser
        from .csv_parser import CSVParser
        from .rtf_parser import RTFParser
        from .odt_parser import ODTParser
        from .eml_parser import EMLParser
        from .image_parser import ImageParser
        
        # Маппинг расширений на парсеры
        parser_map = {
            'pdf': PDFParser,
            'docx': DOCXParser,
            'xlsx': XLSXParser,
            'txt': TXTParser,
            'html': HTMLParser,
            'htm': HTMLParser,
            'csv': CSVParser,
            'rtf': RTFParser,
            'odt': ODTParser,
            'eml': EMLParser,
            'png': ImageParser,
            'jpg': ImageParser,
            'jpeg': ImageParser,
        }
        
        parser_class = parser_map.get(file_ext)
        
        if not parser_class:
            return None
        
        try:
            parser = parser_class()
            result = parser.parse(file_path)
            
            # Упрощаем результат (берем только текст и основные метаданные)
            return {
                'text': result.get('content', {}).get('text', ''),
                'metadata': {
                    'type': result.get('metadata', {}).get('type', file_ext),
                    'word_count': result.get('metadata', {}).get('word_count', 0),
                },
            }
        
        except Exception as e:
            logger.error(f"Parse file error: {e}")
            return None
