from typing import Dict, Any
from .base_exporter import BaseExporter

class TextExporter(BaseExporter):
    def export(self, data: Dict[str, Any], options: Dict[str, Any] = None) -> str:
        options = options or {}
        preserve_structure = options.get('preserve_structure', False)
        
        if preserve_structure:
            lines = []
            structure = data.get('content', {}).get('structure', [])
            
            for element in structure:
                if isinstance(element, dict):
                    if element.get('type') == 'heading':
                        level = element.get('level', 1)
                        lines.append('\n' + '=' * 50)
                        lines.append(element.get('text', ''))
                        lines.append('=' * 50 + '\n')
                    elif element.get('type') == 'paragraph':
                        lines.append(element.get('text', ''))
                        lines.append('')
                    elif 'elements' in element:
                        for el in element.get('elements', []):
                            if el.get('text'):
                                lines.append(el['text'])
            
            return '\n'.join(lines)
        else:
            return data.get('content', {}).get('text', '')
    
    def get_extension(self) -> str:
        return 'txt'
    
    def get_mime_type(self) -> str:
        return 'text/plain'
