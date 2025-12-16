from typing import Dict, Any
from .base_exporter import BaseExporter

class HTMLExporter(BaseExporter):
    def export(self, data: Dict[str, Any], options: Dict[str, Any] = None) -> str:
        metadata = data.get('metadata', {})
        content = data.get('content', {})
        
        html_parts = []
        html_parts.append('<!DOCTYPE html>')
        html_parts.append('<html lang="en">')
        html_parts.append('<head>')
        html_parts.append('    <meta charset="UTF-8">')
        html_parts.append('    <meta name="viewport" content="width=device-width, initial-scale=1.0">')
        html_parts.append(f'    <title>{metadata.get("title", "Document")}</title>')
        html_parts.append('    <style>')
        html_parts.append(self._get_css())
        html_parts.append('    </style>')
        html_parts.append('</head>')
        html_parts.append('<body>')
        html_parts.append('    <div class="container">')
        
        if metadata.get('title'):
            html_parts.append(f'        <h1 class="doc-title">{metadata["title"]}</h1>')
        
        if metadata.get('author'):
            html_parts.append(f'        <p class="doc-meta">Author: {metadata["author"]}</p>')
        
        structure = content.get('structure', [])
        for element in structure:
            if isinstance(element, dict):
                html_parts.append(self._element_to_html(element))
        
        tables = content.get('tables', [])
        if tables:
            html_parts.append('        <h2>Tables</h2>')
            for i, table in enumerate(tables, start=1):
                html_parts.append(f'        <h3>Table {i}</h3>')
                html_parts.append(self._table_to_html(table))
        
        html_parts.append('    </div>')
        html_parts.append('</body>')
        html_parts.append('</html>')
        
        return '\n'.join(html_parts)
    
    def _element_to_html(self, element: Dict[str, Any]) -> str:
        element_type = element.get('type', 'paragraph')
        text = element.get('text', '')
        
        if element_type == 'heading':
            level = min(element.get('level', 1), 6)
            return f'        <h{level}>{text}</h{level}>'
        
        elif element_type == 'paragraph':
            return f'        <p>{text}</p>'
        
        elif element_type == 'list_item':
            return f'        <li>{text}</li>'
        
        elif element_type == 'bold':
            return f'        <p><strong>{text}</strong></p>'
        
        elif 'elements' in element:
            page = element.get('page', 0)
            html = ''
            if page:
                html += f'        <div class="page" data-page="{page}">'
                html += f'        <h2>Page {page}</h2>'
            
            for el in element.get('elements', []):
                html += self._element_to_html(el)
            
            if page:
                html += '        </div>'
            
            return html
        
        return ''
    
    def _table_to_html(self, table: Dict[str, Any]) -> str:
        rows = table.get('rows', [])
        if not rows:
            return ''
        
        html = ['        <table class="data-table">']
        
        html.append('            <thead>')
        html.append('                <tr>')
        for cell in rows[0]:
            html.append(f'                    <th>{cell}</th>')
        html.append('                </tr>')
        html.append('            </thead>')
        
        html.append('            <tbody>')
        for row in rows[1:]:
            html.append('                <tr>')
            for cell in row:
                html.append(f'                    <td>{cell}</td>')
            html.append('                </tr>')
        html.append('            </tbody>')
        
        html.append('        </table>')
        
        return '\n'.join(html)
    
    def _get_css(self) -> str:
        return '''
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
        }
        .doc-title {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .doc-meta {
            color: #7f8c8d;
            font-size: 0.9em;
            margin-bottom: 30px;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        p {
            margin-bottom: 1em;
        }
        .page {
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-left: 4px solid #3498db;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .data-table th {
            background-color: #3498db;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        .data-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #ddd;
        }
        .data-table tr:hover {
            background-color: #f5f5f5;
        }
        '''
    
    def get_extension(self) -> str:
        return 'html'
    
    def get_mime_type(self) -> str:
        return 'text/html'
