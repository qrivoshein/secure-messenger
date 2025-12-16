from typing import Dict, Any, List
from .base_exporter import BaseExporter

class MarkdownExporter(BaseExporter):
    def export(self, data: Dict[str, Any], options: Dict[str, Any] = None) -> str:
        lines = []
        
        metadata = data.get('metadata', {})
        if metadata.get('title'):
            lines.append(f"# {metadata['title']}\n")
        
        content = data.get('content', {})
        structure = content.get('structure', [])
        
        for element in structure:
            if isinstance(element, dict):
                element_type = element.get('type', 'paragraph')
                text = element.get('text', '')
                
                if element_type == 'heading':
                    level = element.get('level', 1)
                    lines.append(f"{'#' * level} {text}\n")
                
                elif element_type == 'paragraph':
                    lines.append(f"{text}\n")
                
                elif element_type == 'list_item':
                    lines.append(f"- {text}")
                
                elif element_type == 'bold':
                    lines.append(f"**{text}**")
                
                elif 'elements' in element:
                    page = element.get('page', 0)
                    if page:
                        lines.append(f"\n## Page {page}\n")
                    
                    for el in element.get('elements', []):
                        el_text = el.get('text', '')
                        el_type = el.get('type', 'paragraph')
                        
                        if el_type == 'heading':
                            lines.append(f"### {el_text}\n")
                        elif el_type == 'bold':
                            lines.append(f"**{el_text}**\n")
                        else:
                            lines.append(f"{el_text}\n")
        
        tables = content.get('tables', [])
        if tables:
            lines.append("\n## Tables\n")
            for i, table in enumerate(tables, start=1):
                lines.append(f"\n### Table {i}\n")
                lines.append(self._table_to_markdown(table))
        
        return '\n'.join(lines)
    
    def _table_to_markdown(self, table: Dict[str, Any]) -> str:
        rows = table.get('rows', [])
        if not rows:
            return ''
        
        md_lines = []
        
        if rows:
            header = rows[0]
            md_lines.append('| ' + ' | '.join(str(cell) for cell in header) + ' |')
            md_lines.append('| ' + ' | '.join(['---'] * len(header)) + ' |')
            
            for row in rows[1:]:
                md_lines.append('| ' + ' | '.join(str(cell) for cell in row) + ' |')
        
        return '\n'.join(md_lines)
    
    def get_extension(self) -> str:
        return 'md'
    
    def get_mime_type(self) -> str:
        return 'text/markdown'
