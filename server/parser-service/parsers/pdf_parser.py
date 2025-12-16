import fitz
from typing import Dict, Any, List
from .base_parser import BaseParser
import re

class PDFParser(BaseParser):
    def parse(self, file_path: str) -> Dict[str, Any]:
        result = self.create_result_structure()
        
        try:
            doc = fitz.open(file_path)
            
            # Расширенные метаданные
            result['metadata'] = {
                'type': 'pdf',
                'pages': len(doc),
                'title': doc.metadata.get('title', ''),
                'author': doc.metadata.get('author', ''),
                'subject': doc.metadata.get('subject', ''),
                'creator': doc.metadata.get('creator', ''),
                'producer': doc.metadata.get('producer', ''),
                'creation_date': doc.metadata.get('creationDate', ''),
                'modification_date': doc.metadata.get('modDate', ''),
                'keywords': doc.metadata.get('keywords', ''),
                'is_encrypted': doc.is_encrypted,
                'page_count': len(doc),
            }
            
            full_text = []
            structure = []
            tables = []
            images = []
            links = []
            
            for page_num, page in enumerate(doc, start=1):
                # Извлечение текста с улучшенной семантикой
                page_dict = page.get_text("dict")
                blocks = page_dict.get("blocks", [])
                
                page_structure = {
                    'page': page_num,
                    'width': page.rect.width,
                    'height': page.rect.height,
                    'elements': []
                }
                
                # Анализ блоков для семантической структуры
                for block in blocks:
                    if block.get('type') == 0:  # Текстовый блок
                        lines = block.get('lines', [])
                        block_text = []
                        
                        for line in lines:
                            spans = line.get('spans', [])
                            line_text = []
                            
                            for span in spans:
                                text = span.get('text', '').strip()
                                if text:
                                    line_text.append(text)
                                    full_text.append(text)
                                    
                                    font_size = span.get('size', 12)
                                    font_name = span.get('font', '')
                                    font_flags = span.get('flags', 0)
                                    color = span.get('color', 0)
                                    
                                    # Определение типа элемента на основе анализа
                                    element_type = self._classify_element(
                                        text, font_size, font_flags, font_name
                                    )
                                    
                                    page_structure['elements'].append({
                                        'type': element_type,
                                        'text': text,
                                        'font_size': font_size,
                                        'font_name': font_name,
                                        'bold': bool(font_flags & 2**4),
                                        'italic': bool(font_flags & 2**1),
                                        'color': color,
                                        'bbox': span.get('bbox', [])
                                    })
                            
                            if line_text:
                                block_text.append(' '.join(line_text))
                    
                    elif block.get('type') == 1:  # Изображение
                        img_info = {
                            'page': page_num,
                            'bbox': block.get('bbox', []),
                            'width': block.get('width', 0),
                            'height': block.get('height', 0),
                            'xres': block.get('xres', 0),
                            'yres': block.get('yres', 0),
                        }
                        images.append(img_info)
                
                structure.append(page_structure)
                
                # Улучшенное извлечение таблиц
                page_tables = self._extract_tables(page, page_num)
                if page_tables:
                    tables.extend(page_tables)
                
                # Извлечение ссылок
                page_links = self._extract_links(page, page_num)
                if page_links:
                    links.extend(page_links)
            
            result['content']['text'] = '\n'.join(full_text)
            result['content']['structure'] = structure
            result['content']['tables'] = tables
            result['content']['images'] = images
            result['content']['links'] = links
            
            # Статистика
            result['metadata']['word_count'] = len(' '.join(full_text).split())
            result['metadata']['character_count'] = len(' '.join(full_text))
            result['metadata']['table_count'] = len(tables)
            result['metadata']['image_count'] = len(images)
            result['metadata']['link_count'] = len(links)
            
            doc.close()
            
        except Exception as e:
            result['metadata']['error'] = str(e)
        
        return result
    
    def _classify_element(self, text: str, font_size: float, font_flags: int, font_name: str) -> str:
        """Классификация элемента на основе характеристик"""
        # Проверка заголовков
        if font_size > 18:
            return 'heading_1'
        elif font_size > 16:
            return 'heading_2'
        elif font_size > 14:
            return 'heading_3'
        
        # Проверка списков
        if re.match(r'^[\d\.\)]+\s+', text) or re.match(r'^[•\-\*]\s+', text):
            return 'list_item'
        
        # Проверка жирного текста
        if font_flags & 2**4:
            return 'bold_text'
        
        # Проверка курсива
        if font_flags & 2**1:
            return 'italic_text'
        
        # По умолчанию параграф
        return 'paragraph'
    
    def _extract_tables(self, page, page_num: int) -> List[Dict[str, Any]]:
        """Улучшенное извлечение таблиц"""
        tables = []
        try:
            tabs = page.find_tables()
            for table_idx, table in enumerate(tabs.tables):
                # Извлечение данных таблицы
                table_data = table.extract()
                
                if not table_data:
                    continue
                
                # Определение заголовков (первая строка)
                headers = table_data[0] if table_data else []
                rows = table_data[1:] if len(table_data) > 1 else []
                
                table_info = {
                    'page': page_num,
                    'table_index': table_idx,
                    'bbox': table.bbox,
                    'headers': [str(h) if h else '' for h in headers],
                    'rows': [[str(cell) if cell else '' for cell in row] for row in rows],
                    'row_count': len(table_data),
                    'col_count': len(headers) if headers else 0,
                }
                
                tables.append(table_info)
        except Exception as e:
            pass
        
        return tables
    
    def _extract_links(self, page, page_num: int) -> List[Dict[str, Any]]:
        """Извлечение ссылок и аннотаций"""
        links = []
        try:
            for link in page.get_links():
                link_info = {
                    'page': page_num,
                    'type': link.get('kind', 0),
                    'bbox': link.get('from', []),
                    'uri': link.get('uri', ''),
                    'to_page': link.get('page', None),
                }
                links.append(link_info)
        except:
            pass
        
        return links
