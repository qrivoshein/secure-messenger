import json
from typing import Dict, Any
from .base_exporter import BaseExporter

class JSONExporter(BaseExporter):
    def export(self, data: Dict[str, Any], options: Dict[str, Any] = None) -> str:
        options = options or {}
        indent = options.get('indent', 2)
        
        return json.dumps(data, ensure_ascii=False, indent=indent)
    
    def get_extension(self) -> str:
        return 'json'
    
    def get_mime_type(self) -> str:
        return 'application/json'
