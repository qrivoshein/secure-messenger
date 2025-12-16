from bs4 import BeautifulSoup
from typing import Dict, Any, List
from .base_parser import BaseParser
import re

class HTMLParser(BaseParser):
    def parse(self, file_path: str) -> Dict[str, Any]:
        result = self.create_result_structure()
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            soup = BeautifulSoup(content, 'lxml')
            
            # Расширенное извлечение метаданных
            title = soup.find('title')
            meta_tags = {}
            for meta in soup.find_all('meta'):
                name = meta.get('name') or meta.get('property')
                content_val = meta.get('content')
                if name and content_val:
                    meta_tags[name] = content_val
            
            result['metadata'] = {
                'type': 'html',
                'title': title.text if title else '',
                'author': meta_tags.get('author', ''),
                'description': meta_tags.get('description', ''),
                'keywords': meta_tags.get('keywords', ''),
                'og_title': meta_tags.get('og:title', ''),
                'og_description': meta_tags.get('og:description', ''),
                'viewport': meta_tags.get('viewport', ''),
                'charset': soup.find('meta', charset=True).get('charset', 'utf-8') if soup.find('meta', charset=True) else 'utf-8',
            }
            
            text_parts = []
            structure = []
            tables = []
            links = []
            images = []
            lists = []
            
            # Извлечение основного контента
            body = soup.find('body') or soup
            
            # Обход всех элементов в порядке появления
            for element in body.descendants:
                if isinstance(element, str):
                    continue
                    
                if element.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                    level = int(element.name[1])
                    text = element.get_text(strip=True)
                    if text:
                        text_parts.append(text)
                        structure.append({
                            'type': f'heading_{level}',
                            'level': level,
                            'text': text,
                            'id': element.get('id', ''),
                            'class': element.get('class', [])
                        })
                
                elif element.name == 'p':
                    text = element.get_text(strip=True)
                    if text:
                        text_parts.append(text)
                        structure.append({
                            'type': 'paragraph',
                            'text': text,
                            'class': element.get('class', [])
                        })
                
                elif element.name in ['ul', 'ol']:
                    list_items = []
                    for li in element.find_all('li', recursive=False):
                        li_text = li.get_text(strip=True)
                        if li_text:
                            list_items.append(li_text)
                            text_parts.append(li_text)
                    
                    if list_items:
                        lists.append({
                            'type': 'ordered' if element.name == 'ol' else 'unordered',
                            'items': list_items,
                            'count': len(list_items)
                        })
                
                elif element.name == 'table':
                    table_data = self._extract_table(element)
                    if table_data['rows']:
                        tables.append(table_data)
                
                elif element.name == 'a':
                    href = element.get('href', '')
                    text = element.get_text(strip=True)
                    if href:
                        links.append({
                            'href': href,
                            'text': text,
                            'title': element.get('title', ''),
                            'external': href.startswith('http')
                        })
                
                elif element.name == 'img':
                    images.append({
                        'src': element.get('src', ''),
                        'alt': element.get('alt', ''),
                        'title': element.get('title', ''),
                        'width': element.get('width', ''),
                        'height': element.get('height', '')
                    })
            
            result['content']['text'] = '\n'.join(text_parts)
            result['content']['structure'] = structure
            result['content']['tables'] = tables
            result['content']['links'] = links
            result['content']['images'] = images
            result['content']['lists'] = lists
            
            # Статистика
            result['metadata']['heading_count'] = len([s for s in structure if s['type'].startswith('heading')])
            result['metadata']['paragraph_count'] = len([s for s in structure if s['type'] == 'paragraph'])
            result['metadata']['table_count'] = len(tables)
            result['metadata']['link_count'] = len(links)
            result['metadata']['image_count'] = len(images)
            result['metadata']['list_count'] = len(lists)
            result['metadata']['word_count'] = len(' '.join(text_parts).split())
            
        except Exception as e:
            result['metadata']['error'] = str(e)
        
        return result
    
    def _extract_table(self, table_element) -> Dict[str, Any]:
        """Улучшенное извлечение таблиц"""
        rows = []
        headers = []
        
        # Проверка наличия thead
        thead = table_element.find('thead')
        if thead:
            header_row = thead.find('tr')
            if header_row:
                headers = [cell.get_text(strip=True) for cell in header_row.find_all(['th', 'td'])]
        
        # Если нет thead, попробовать первую строку
        if not headers:
            first_row = table_element.find('tr')
            if first_row and first_row.find('th'):
                headers = [cell.get_text(strip=True) for cell in first_row.find_all(['th', 'td'])]
        
        # Извлечение данных
        tbody = table_element.find('tbody') or table_element
        for row in tbody.find_all('tr'):
            # Пропустить строку с заголовками
            if headers and row == table_element.find('tr'):
                continue
            
            cells = [cell.get_text(strip=True) for cell in row.find_all(['td', 'th'])]
            if cells:
                rows.append(cells)
        
        return {
            'headers': headers,
            'rows': rows,
            'row_count': len(rows),
            'col_count': len(headers) if headers else (len(rows[0]) if rows else 0)
        }
