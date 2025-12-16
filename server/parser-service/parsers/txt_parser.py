from typing import Dict, Any
from .base_parser import BaseParser

class TXTParser(BaseParser):
    def parse(self, file_path: str) -> Dict[str, Any]:
        result = self.create_result_structure()
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            lines = content.split('\n')
            
            result['metadata'] = {
                'type': 'txt',
                'lines': len(lines),
                'chars': len(content),
            }
            
            structure = []
            for i, line in enumerate(lines, start=1):
                if line.strip():
                    structure.append({
                        'type': 'paragraph',
                        'line': i,
                        'text': line.strip()
                    })
            
            result['content']['text'] = content
            result['content']['structure'] = structure
            
        except Exception as e:
            result['metadata']['error'] = str(e)
        
        return result
