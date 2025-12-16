"""
ODT Parser.
Парсер ODT (OpenDocument Text) файлов.
"""

import logging
import zipfile
import xml.etree.ElementTree as ET
from typing import Dict, Any, List
from .base_parser import BaseParser

logger = logging.getLogger(__name__)


class ODTParser(BaseParser):
    """Парсер ODT файлов."""
    
    # Namespace для ODF
    NS = {
        'office': 'urn:oasis:names:tc:opendocument:xmlns:office:1.0',
        'text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0',
        'table': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
        'meta': 'urn:oasis:names:tc:opendocument:xmlns:meta:1.0',
        'dc': 'http://purl.org/dc/elements/1.1/',
    }
    
    def parse(self, file_path: str) -> Dict[str, Any]:
        """
        Парсинг ODT файла.
        
        Args:
            file_path: Путь к ODT файлу
            
        Returns:
            Структурированные данные
        """
        result = self.create_result_structure()
        
        try:
            # ODT это ZIP архив
            with zipfile.ZipFile(file_path, 'r') as odt_zip:
                # 1. Извлечение метаданных
                metadata = self._extract_metadata(odt_zip)
                result['metadata'].update(metadata)
                
                # 2. Извлечение содержимого
                content_xml = odt_zip.read('content.xml')
                tree = ET.fromstring(content_xml)
                
                # 3. Извлечение текста и структуры
                text_parts = []
                structure = []
                tables = []
                
                body = tree.find('.//office:body/office:text', self.NS)
                
                if body is not None:
                    for element in body:
                        # Параграфы
                        if element.tag == f'{{{self.NS["text"]}}}p':
                            para_text = self._extract_text_from_element(element)
                            if para_text:
                                text_parts.append(para_text)
                                structure.append({
                                    'type': 'paragraph',
                                    'text': para_text,
                                })
                        
                        # Заголовки
                        elif element.tag == f'{{{self.NS["text"]}}}h':
                            heading_text = self._extract_text_from_element(element)
                            level = element.get(f'{{{self.NS["text"]}}}outline-level', '1')
                            if heading_text:
                                text_parts.append(heading_text)
                                structure.append({
                                    'type': f'heading_{level}',
                                    'text': heading_text,
                                    'level': int(level),
                                })
                        
                        # Списки
                        elif element.tag == f'{{{self.NS["text"]}}}list':
                            list_items = self._extract_list_items(element)
                            for item in list_items:
                                text_parts.append(f"• {item}")
                                structure.append({
                                    'type': 'list_item',
                                    'text': item,
                                })
                        
                        # Таблицы
                        elif element.tag == f'{{{self.NS["table"]}}}table':
                            table_data = self._extract_table(element)
                            if table_data:
                                tables.append(table_data)
                
                # 4. Формирование результата
                result['content']['text'] = '\n'.join(text_parts)
                result['content']['structure'] = structure
                result['content']['tables'] = tables
                
                # Статистика
                result['metadata']['word_count'] = len(' '.join(text_parts).split())
                result['metadata']['character_count'] = len(' '.join(text_parts))
                result['metadata']['paragraph_count'] = sum(
                    1 for s in structure if s['type'] == 'paragraph'
                )
                result['metadata']['table_count'] = len(tables)
                
                logger.info(f"ODT parsed successfully: {result['metadata']['word_count']} words")
            
        except Exception as e:
            logger.error(f"ODT parsing error: {e}")
            result['metadata']['error'] = str(e)
        
        return result
    
    def _extract_metadata(self, odt_zip: zipfile.ZipFile) -> Dict[str, Any]:
        """Извлечение метаданных из meta.xml."""
        metadata = {'type': 'odt'}
        
        try:
            meta_xml = odt_zip.read('meta.xml')
            tree = ET.fromstring(meta_xml)
            
            meta = tree.find('.//office:meta', self.NS)
            
            if meta is not None:
                # Базовые метаданные
                metadata['title'] = self._get_text(meta, './/dc:title')
                metadata['author'] = self._get_text(meta, './/dc:creator')
                metadata['subject'] = self._get_text(meta, './/dc:subject')
                metadata['description'] = self._get_text(meta, './/dc:description')
                metadata['creation_date'] = self._get_text(meta, './/meta:creation-date')
                metadata['modification_date'] = self._get_text(meta, './/dc:date')
                
                # Статистика
                page_count = self._get_text(meta, './/meta:page-count')
                if page_count:
                    metadata['page_count'] = int(page_count)
                
                word_count = self._get_text(meta, './/meta:word-count')
                if word_count:
                    metadata['word_count_meta'] = int(word_count)
        
        except Exception as e:
            logger.warning(f"Metadata extraction failed: {e}")
        
        return metadata
    
    def _extract_text_from_element(self, element) -> str:
        """Рекурсивное извлечение текста из элемента."""
        text_parts = []
        
        if element.text:
            text_parts.append(element.text)
        
        for child in element:
            child_text = self._extract_text_from_element(child)
            if child_text:
                text_parts.append(child_text)
            
            if child.tail:
                text_parts.append(child.tail)
        
        return ''.join(text_parts).strip()
    
    def _extract_list_items(self, list_element) -> List[str]:
        """Извлечение элементов списка."""
        items = []
        
        for item in list_element.findall(f'.//{{{self.NS["text"]}}}list-item'):
            item_text = self._extract_text_from_element(item)
            if item_text:
                items.append(item_text)
        
        return items
    
    def _extract_table(self, table_element) -> Dict[str, Any]:
        """Извлечение таблицы."""
        rows = []
        
        for row_elem in table_element.findall(f'.//{{{self.NS["table"]}}}table-row'):
            row_data = []
            
            for cell_elem in row_elem.findall(f'.//{{{self.NS["table"]}}}table-cell'):
                cell_text = self._extract_text_from_element(cell_elem)
                row_data.append(cell_text if cell_text else '')
            
            if row_data:
                rows.append(row_data)
        
        if not rows:
            return None
        
        # Определение заголовков (первая строка)
        headers = rows[0] if rows else []
        data_rows = rows[1:] if len(rows) > 1 else []
        
        return {
            'headers': headers,
            'rows': data_rows,
            'row_count': len(data_rows),
            'col_count': len(headers),
        }
    
    def _get_text(self, parent, xpath: str) -> str:
        """Получение текста элемента."""
        element = parent.find(xpath, self.NS)
        return element.text if element is not None and element.text else ''
